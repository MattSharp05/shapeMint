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
    .add_local_file("hollow.py", "/app/hollow.py")
    .add_local_file("scale_and_hollow.py", "/app/scale_and_hollow.py")
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


@app.function(
    image=blender_image,
    timeout=600,
    memory=2048,
    cpu=2.0,
)
@modal.concurrent(max_inputs=4)
@modal.fastapi_endpoint(method="POST", label="hollow-model")
async def hollow_model(request: Request):
    """
    Accept a model URL, run Blender headless hollowing, return hollowed STL + report.

    Accepts JSON:
      {
        "model_url": "https://...",             // URL to download GLB/STL from
        "wall_thickness": 2.0,                  // optional, default 2.0mm
        "drain_holes": 2,                       // optional, default 2
        "hole_diameter": 3.0,                   // optional, default 3.0mm
        "iterations": 300,                      // optional
        "step_size": 0.2,                       // optional
        "upload_url": "https://...",            // optional, signed Supabase upload URL
        "stl_public_url": "https://..."         // optional, public URL for DB
      }

    Returns JSON:
      {
        "success": bool,
        "stl_base64": "<base64 STL>" (if no upload_url),
        "report": { ... },
        "error": "..." (on failure)
      }
    """
    import httpx

    body = await request.json()
    model_url = body.get("model_url")
    model_base64 = body.get("model_base64")

    if not model_url and not model_base64:
        return JSONResponse(
            {"success": False, "error": "Provide either 'model_url' or 'model_base64'"},
            status_code=400,
        )

    # Extract params with defaults
    wall_thickness = body.get("wall_thickness", 2.0)
    drain_holes = body.get("drain_holes", 2)
    hole_diameter = body.get("hole_diameter", 3.0)
    iterations = body.get("iterations", 300)
    step_size = body.get("step_size", 0.2)

    with tempfile.TemporaryDirectory() as tmpdir:
        # Determine file extension from URL
        ext = ".glb"
        if model_url:
            url_lower = model_url.lower().split("?")[0]
            if url_lower.endswith(".stl"):
                ext = ".stl"
            elif url_lower.endswith(".obj"):
                ext = ".obj"

        input_path = os.path.join(tmpdir, f"input{ext}")
        output_path = os.path.join(tmpdir, "hollowed.stl")
        report_path = os.path.join(tmpdir, "report.json")

        # Download or decode the model
        if model_url:
            print(f"Downloading model from: {model_url}")
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    resp = await client.get(model_url, follow_redirects=True)
                    resp.raise_for_status()
                    model_data = resp.content
            except Exception as e:
                return JSONResponse(
                    {"success": False, "error": f"Failed to download model: {str(e)}"},
                    status_code=400,
                )
        else:
            model_data = base64.b64decode(model_base64)

        with open(input_path, "wb") as f:
            f.write(model_data)

        print(f"Model ready: {len(model_data)} bytes ({ext})")
        print(f"Options: wall={wall_thickness}mm, holes={drain_holes}x{hole_diameter}mm, iters={iterations}, step={step_size}")

        # Run Blender headless with the hollowing script
        print("Starting Blender hollow subprocess...")
        try:
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            result = subprocess.run(
                [
                    "blender",
                    "--background",
                    "--python", "/app/hollow.py",
                    "--",
                    input_path,
                    output_path,
                    report_path,
                    "--wall-thickness", str(wall_thickness),
                    "--drain-holes", str(drain_holes),
                    "--hole-diameter", str(hole_diameter),
                    "--iterations", str(iterations),
                    "--step-size", str(step_size),
                ],
                capture_output=True,
                text=True,
                timeout=480,
                env=env,
            )

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

                return JSONResponse(
                    {
                        "success": False,
                        "error": f"Blender process exited with code {result.returncode}",
                        "stderr": result.stderr[-2000:] if result.stderr else "",
                        "report": report,
                    },
                    status_code=500,
                )

        except subprocess.TimeoutExpired:
            print("ERROR: Blender hollow timed out after 480s")
            return JSONResponse(
                {"success": False, "error": "Hollowing timed out after 480 seconds"},
                status_code=504,
            )
        except Exception as e:
            print(f"ERROR: Blender subprocess exception: {type(e).__name__}: {e}")
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
                {"success": False, "error": "Hollowed STL was not generated", "report": report},
                status_code=500,
            )

        with open(output_path, "rb") as f:
            stl_data = f.read()

        print(f"Hollowing complete: STL={len(stl_data)} bytes, material_saved={report.get('material_saved_percent', '?')}%")

        # Upload to Supabase Storage if URL provided
        upload_url = body.get("upload_url")
        if upload_url:
            print(f"Uploading hollowed STL ({len(stl_data)} bytes) to Supabase Storage...")
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
                print("Hollowed STL uploaded successfully")
            except Exception as e:
                print(f"Failed to upload hollowed STL: {e}")
                return JSONResponse({
                    "success": True,
                    "uploaded": False,
                    "upload_error": str(e),
                    "report": report,
                }, status_code=200)

            return JSONResponse({
                "success": True,
                "uploaded": True,
                "report": report,
                "stl_size_bytes": len(stl_data),
                "stl_public_url": body.get("stl_public_url", ""),
            })

        # Fallback: return base64
        stl_base64 = base64.b64encode(stl_data).decode("ascii")
        return JSONResponse({
            "success": True,
            "stl_base64": stl_base64,
            "report": report,
        })


@app.function(
    image=blender_image,
    timeout=600,
    memory=2048,
    cpu=2.0,
)
@modal.concurrent(max_inputs=4)
@modal.fastapi_endpoint(method="POST", label="process-model")
async def process_model(request: Request):
    """
    Scale + hollow a model via Blender. Exports both OBJ (with UVs for color) and STL.

    Accepts JSON:
      {
        "obj_url": "https://...",
        "scale_value": 7, "scale_unit": "cm", "scale_target": "height",
        "wall_thickness": 2.0, "drain_holes": 2, "hole_diameter": 3.0,
        "upload_url_obj": "https://...", "upload_url_stl": "https://...",
        "obj_public_url": "https://...", "stl_public_url": "https://...",
        "supabase_url": "...", "supabase_service_key": "...", "model_id": "..."
      }
    """
    import httpx

    body = await request.json()
    # Prefer GLB input (has colors), fall back to OBJ
    input_url = body.get("glb_url") or body.get("obj_url")
    input_format = "glb" if body.get("glb_url") else "obj"

    if not input_url:
        return JSONResponse({"success": False, "error": "glb_url or obj_url is required"}, status_code=400)

    scale_value = body.get("scale_value", 0)
    scale_unit = body.get("scale_unit", "cm")
    scale_target = body.get("scale_target", "height")
    wall_thickness = body.get("wall_thickness", 2.0)
    drain_holes = body.get("drain_holes", 2)
    hole_diameter = body.get("hole_diameter", 3.0)

    print(f"[process-model] Starting: input={input_format}, scale={scale_value}{scale_unit} ({scale_target}), "
          f"wall={wall_thickness}mm, holes={drain_holes}x{hole_diameter}mm")

    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, f"input.{input_format}")
        output_obj = os.path.join(tmpdir, "output.obj")
        output_stl = os.path.join(tmpdir, "output.stl")
        output_glb = os.path.join(tmpdir, "output.glb")
        report_path = os.path.join(tmpdir, "report.json")

        # Download input model
        print(f"[process-model] Downloading {input_format.upper()}: {input_url[:80]}...")
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.get(input_url, follow_redirects=True)
                resp.raise_for_status()
                input_data = resp.content
        except Exception as e:
            return JSONResponse({"success": False, "error": f"Failed to download {input_format.upper()}: {e}"}, status_code=400)

        with open(input_path, "wb") as f:
            f.write(input_data)
        print(f"[process-model] {input_format.upper()} downloaded: {len(input_data):,} bytes")

        # Run Blender
        print("[process-model] Starting Blender...")
        try:
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            result = subprocess.run(
                [
                    "blender", "--background",
                    "--python", "/app/scale_and_hollow.py",
                    "--",
                    input_path, output_obj, output_stl, report_path,
                    "--scale-value", str(scale_value),
                    "--scale-unit", scale_unit,
                    "--scale-target", scale_target,
                    "--wall-thickness", str(wall_thickness),
                    "--drain-holes", str(drain_holes),
                    "--hole-diameter", str(hole_diameter),
                    "--output-glb", output_glb,
                ],
                capture_output=True, text=True, timeout=480, env=env,
            )

            print(f"[process-model] Blender exited: code={result.returncode}")
            if result.stdout:
                print("[process-model] stdout:", result.stdout[-4000:])
            if result.stderr:
                print("[process-model] stderr:", result.stderr[-2000:])

            if result.returncode != 0:
                report = {}
                if os.path.exists(report_path):
                    with open(report_path) as f:
                        report = json.load(f)
                return JSONResponse({
                    "success": False,
                    "error": f"Blender exited with code {result.returncode}",
                    "stderr": result.stderr[-2000:] if result.stderr else "",
                    "report": report,
                }, status_code=500)

        except subprocess.TimeoutExpired:
            print("[process-model] ERROR: Blender timed out after 480s")
            return JSONResponse({"success": False, "error": "Processing timed out"}, status_code=504)
        except Exception as e:
            print(f"[process-model] ERROR: {type(e).__name__}: {e}")
            return JSONResponse({"success": False, "error": str(e)}, status_code=500)

        # Read report
        report = {}
        if os.path.exists(report_path):
            with open(report_path) as f:
                report = json.load(f)

        if not os.path.exists(output_stl):
            return JSONResponse({
                "success": False,
                "error": "Output STL not generated",
                "report": report,
            }, status_code=500)

        obj_out_data = b""
        stl_out_data = b""
        glb_out_data = b""

        if os.path.exists(output_obj):
            with open(output_obj, "rb") as f:
                obj_out_data = f.read()
        with open(output_stl, "rb") as f:
            stl_out_data = f.read()
        if os.path.exists(output_glb):
            with open(output_glb, "rb") as f:
                glb_out_data = f.read()

        print(f"[process-model] Output: OBJ={len(obj_out_data):,}B, STL={len(stl_out_data):,}B, "
              f"GLB={len(glb_out_data):,}B, material_saved={report.get('material_saved_percent', '?')}%")

        # Upload to Supabase
        uploaded_obj = False
        uploaded_stl = False
        uploaded_glb = False

        upload_url_obj = body.get("upload_url_obj")
        upload_url_stl = body.get("upload_url_stl")
        upload_url_glb = body.get("upload_url_glb")

        async with httpx.AsyncClient(timeout=120.0) as client:
            if upload_url_obj and obj_out_data:
                print(f"[process-model] Uploading OBJ ({len(obj_out_data):,}B)...")
                try:
                    r = await client.put(upload_url_obj, content=obj_out_data,
                                         headers={"Content-Type": "application/octet-stream", "x-upsert": "true"})
                    r.raise_for_status()
                    uploaded_obj = True
                    print("[process-model] OBJ uploaded")
                except Exception as e:
                    print(f"[process-model] OBJ upload failed: {e}")

            if upload_url_stl:
                print(f"[process-model] Uploading STL ({len(stl_out_data):,}B)...")
                try:
                    r = await client.put(upload_url_stl, content=stl_out_data,
                                         headers={"Content-Type": "application/octet-stream", "x-upsert": "true"})
                    r.raise_for_status()
                    uploaded_stl = True
                    print("[process-model] STL uploaded")
                except Exception as e:
                    print(f"[process-model] STL upload failed: {e}")

            if upload_url_glb and glb_out_data:
                print(f"[process-model] Uploading GLB ({len(glb_out_data):,}B)...")
                try:
                    r = await client.put(upload_url_glb, content=glb_out_data,
                                         headers={"Content-Type": "application/octet-stream", "x-upsert": "true"})
                    r.raise_for_status()
                    uploaded_glb = True
                    print("[process-model] GLB uploaded")
                except Exception as e:
                    print(f"[process-model] GLB upload failed: {e}")

        print(f"[process-model] Done. uploaded_obj={uploaded_obj}, uploaded_stl={uploaded_stl}, uploaded_glb={uploaded_glb}")

        return JSONResponse({
            "success": True,
            "uploaded_obj": uploaded_obj,
            "uploaded_stl": uploaded_stl,
            "uploaded_glb": uploaded_glb,
            "report": report,
            "obj_size_bytes": len(obj_out_data),
            "stl_size_bytes": len(stl_out_data),
            "glb_size_bytes": len(glb_out_data),
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
