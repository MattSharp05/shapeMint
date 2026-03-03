"""
Modal application for ShapeMint Blender mesh repair service.

Provides two web endpoints:
  POST /repair  — accepts a GLB URL, downloads it, runs Blender headless repair, returns STL + report
  GET  /warm    — lightweight pre-warm endpoint to avoid cold starts

Deploy:
  modal deploy modal_app.py

Test:
  curl https://matthew-77976--warm.modal.run
  curl -X POST -H "Content-Type: application/json" \
    -d '{"glb_url": "https://..."}' \
    https://matthew-77976--repair-mesh.modal.run
"""

import modal
import base64
import json
import subprocess
import tempfile
import os
import urllib.request
from datetime import datetime, timezone
from fastapi import Request
from fastapi.responses import JSONResponse

app = modal.App("shapemint-blender-repair")

# Container image with Blender installed
blender_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "wget",
        "xz-utils",
        "libgl1-mesa-glx",
        "libglib2.0-0",
        "libxrender1",
        "libxi6",
        "libxkbcommon0",
        "libxxf86vm1",
        "libxfixes3",
        "libxext6",
        "libx11-6",
        "libsm6",
    )
    .run_commands(
        # Install Blender 4.0 (stable, well-tested mesh ops)
        "wget -q https://mirror.clarkson.edu/blender/release/Blender4.0/blender-4.0.2-linux-x64.tar.xz -O /tmp/blender.tar.xz",
        "mkdir -p /opt/blender && tar -xf /tmp/blender.tar.xz -C /opt/blender --strip-components=1",
        "rm /tmp/blender.tar.xz",
        "ln -s /opt/blender/blender /usr/local/bin/blender",
    )
    .pip_install("numpy", "fastapi[standard]", "httpx")
    .add_local_file("repair.py", "/app/repair.py")
)


async def _update_db(body: dict, report: dict, stl_url: str | None):
    """Update the generated_models table via Supabase REST API."""
    import httpx

    supabase_url = body.get("supabase_url")
    supabase_key = body.get("supabase_service_key")
    model_id = body.get("model_id")

    if not supabase_url or not supabase_key or not model_id:
        print("Skipping DB update: missing supabase_url, supabase_service_key, or model_id")
        return

    db_url = f"{supabase_url}/rest/v1/generated_models?id=eq.{model_id}"
    update_payload = {
        "repair_report": report,
        "print_ready": report.get("print_ready", False),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if stl_url:
        update_payload["stl_url"] = stl_url

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.patch(
                db_url,
                json=update_payload,
                headers={
                    "Authorization": f"Bearer {supabase_key}",
                    "apikey": supabase_key,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
            )
            resp.raise_for_status()
        print(f"DB updated: model_id={model_id}, stl_url={'set' if stl_url else 'not set'}, print_ready={report.get('print_ready')}")
    except Exception as e:
        print(f"Failed to update DB: {e}")


@app.function(
    image=blender_image,
    timeout=600,
    memory=2048,
    cpu=2.0,
)
@modal.concurrent(max_inputs=4)
@modal.fastapi_endpoint(method="POST", label="repair-mesh")
async def repair_mesh(request: Request):
    """
    Accept a GLB URL (or base64 data), run Blender mesh repair, return STL + report.

    Accepts JSON:
      {
        "glb_url": "https://...",          // URL to download GLB from
        "min_wall_thickness": 0.8,         // optional, default 0.8mm
        "auto_solidify": true,             // optional
        "voxel_fallback": true             // optional
      }

    Returns JSON:
      {
        "success": bool,
        "stl_base64": "<base64 STL>" (on success),
        "report": { ... validation report ... },
        "error": "..." (on failure)
      }
    """
    import httpx

    body = await request.json()
    glb_url = body.get("glb_url")
    glb_base64 = body.get("glb_base64")
    min_wall = body.get("min_wall_thickness", 0.8)
    auto_solidify = body.get("auto_solidify", True)
    voxel_fallback = body.get("voxel_fallback", True)

    if not glb_url and not glb_base64:
        return JSONResponse(
            {"success": False, "error": "Provide either 'glb_url' or 'glb_base64'"},
            status_code=400,
        )

    # Process in a temp directory
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, "input.glb")
        output_path = os.path.join(tmpdir, "output.stl")
        report_path = os.path.join(tmpdir, "report.json")

        # Download or decode the GLB
        if glb_url:
            print(f"Downloading GLB from: {glb_url}")
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    resp = await client.get(glb_url, follow_redirects=True)
                    resp.raise_for_status()
                    glb_data = resp.content
            except Exception as e:
                return JSONResponse(
                    {"success": False, "error": f"Failed to download GLB: {str(e)}"},
                    status_code=400,
                )
        else:
            glb_data = base64.b64decode(glb_base64)

        with open(input_path, "wb") as f:
            f.write(glb_data)

        print(f"GLB ready: {len(glb_data)} bytes")
        print(f"Options: min_wall={min_wall}mm, auto_solidify={auto_solidify}, voxel_fallback={voxel_fallback}")

        # Run Blender headless with the repair script
        # NOTE: Trimesh pre-decimation was removed — its API is unreliable across
        # versions and can corrupt mesh geometry (exploding spike triangles).
        # All decimation is now handled inside Blender after topology cleanup.
        print("Starting Blender subprocess...")
        try:
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            result = subprocess.run(
                [
                    "blender",
                    "--background",
                    "--python", "/app/repair.py",
                    "--",
                    input_path,
                    output_path,
                    report_path,
                    "--min-wall-thickness", str(min_wall),
                    "--auto-solidify", str(auto_solidify),
                    "--voxel-fallback", str(voxel_fallback),
                ],
                capture_output=True,
                text=True,
                timeout=480,
                env=env,
            )

            # ALWAYS log Blender output for debugging
            print(f"Blender exited with code: {result.returncode}")
            if result.stdout:
                print("Blender stdout:", result.stdout[-3000:])
            if result.stderr:
                print("Blender stderr:", result.stderr[-2000:])

            if result.returncode != 0:
                report = {}
                if os.path.exists(report_path):
                    with open(report_path) as f:
                        report = json.load(f)

                print(f"ERROR: Blender failed with code {result.returncode}")
                await _update_db(body, report, None)
                return JSONResponse(
                    {
                        "success": False,
                        "error": f"Blender process exited with code {result.returncode}",
                        "stderr": result.stderr[-2000:] if result.stderr else "",
                        "report": report,
                    },
                    status_code=500,
                )

        except subprocess.TimeoutExpired as e:
            print(f"ERROR: Blender timed out after 480s")
            # Log any partial output
            if hasattr(e, 'stdout') and e.stdout:
                print("Partial stdout:", e.stdout[-2000:] if isinstance(e.stdout, str) else e.stdout.decode('utf-8', errors='replace')[-2000:])
            if hasattr(e, 'stderr') and e.stderr:
                print("Partial stderr:", e.stderr[-2000:] if isinstance(e.stderr, str) else e.stderr.decode('utf-8', errors='replace')[-2000:])
            await _update_db(body, {"error": "Blender timed out", "print_ready": False}, None)
            return JSONResponse(
                {"success": False, "error": "Blender repair timed out after 480 seconds"},
                status_code=504,
            )
        except Exception as e:
            print(f"ERROR: Blender subprocess exception: {type(e).__name__}: {e}")
            await _update_db(body, {"error": str(e), "print_ready": False}, None)
            return JSONResponse(
                {"success": False, "error": f"Blender subprocess failed: {str(e)}"},
                status_code=500,
            )

        # Read the report
        report = {}
        if os.path.exists(report_path):
            with open(report_path) as f:
                report = json.load(f)

        # Check that STL was produced
        if not os.path.exists(output_path):
            return JSONResponse(
                {
                    "success": False,
                    "error": "STL file was not generated",
                    "report": report,
                },
                status_code=500,
            )

        # Read the STL file
        with open(output_path, "rb") as f:
            stl_data = f.read()

        print(f"Repair complete: STL={len(stl_data)} bytes, print_ready={report.get('print_ready')}")

        # If a signed upload URL was provided, upload directly to Supabase Storage
        upload_url = body.get("upload_url")
        if upload_url:
            print(f"Uploading STL ({len(stl_data)} bytes) directly to Supabase Storage...")
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    upload_resp = await client.put(
                        upload_url,
                        content=stl_data,
                        headers={
                            "Content-Type": "application/octet-stream",
                            "x-upsert": "true",
                        },
                    )
                    upload_resp.raise_for_status()
                print("STL uploaded to Supabase Storage successfully")
            except Exception as e:
                print(f"Failed to upload STL to storage: {e}")
                # Still try to update DB with report even if upload failed
                await _update_db(body, report, None)
                return JSONResponse({
                    "success": True,
                    "uploaded": False,
                    "upload_error": str(e),
                    "report": report,
                }, status_code=200)

            # Update database with STL URL and repair report
            stl_public_url = body.get("stl_public_url")
            await _update_db(body, report, stl_public_url)

            return JSONResponse({
                "success": True,
                "uploaded": True,
                "report": report,
                "stl_size_bytes": len(stl_data),
            })

        # Fallback: return base64-encoded STL (for backward compatibility / small files)
        stl_base64 = base64.b64encode(stl_data).decode("ascii")

        return JSONResponse({
            "success": True,
            "stl_base64": stl_base64,
            "report": report,
        })


@app.function(image=blender_image)
@modal.fastapi_endpoint(method="GET", label="warm")
async def warm():
    """
    Pre-warm endpoint. Called when model generation starts so the container
    is hot by the time Meshy finishes (1-5 minutes later).
    """
    return {
        "status": "warm",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
