"""
Test Modal application for ShapeMint hollowing experiments.

Completely separate from production modal_app.py.
Deployed as its own Modal app: shapemint-hollow-test

Deploy:
  cd blender-service && modal deploy modal_app_test.py

Test:
  curl https://<your-modal-url>--warm-test.modal.run
  curl -X POST -H "Content-Type: application/json" \
    -d '{"model_url": "https://..."}' \
    https://<your-modal-url>--hollow-v2.modal.run
"""

import modal
import base64
import json
import subprocess
import tempfile
import os
from datetime import datetime, timezone
from fastapi import Request
from fastapi.responses import JSONResponse

app = modal.App("shapemint-hollow-test")

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
        "wget -q https://mirror.clarkson.edu/blender/release/Blender4.0/blender-4.0.2-linux-x64.tar.xz -O /tmp/blender.tar.xz",
        "mkdir -p /opt/blender && tar -xf /tmp/blender.tar.xz -C /opt/blender --strip-components=1",
        "rm /tmp/blender.tar.xz",
        "ln -s /opt/blender/blender /usr/local/bin/blender",
    )
    .pip_install("numpy", "fastapi[standard]", "httpx")
    .add_local_file("hollow_v2.py", "/app/hollow_v2.py")
)


@app.function(
    image=blender_image,
    timeout=600,
    memory=2048,
    cpu=2.0,
)
@modal.concurrent(max_inputs=4)
@modal.fastapi_endpoint(method="POST", label="hollow-v2")
async def hollow_v2(request: Request):
    """
    Hollow a 3D model using the v2 pipeline (voxel remesh + solidify).

    Accepts JSON:
      {
        "model_url": "https://...",             // URL to download GLB/STL from
        "wall_thickness": 2.0,                  // optional, default 2.0mm
        "drain_holes": 2,                       // optional, default 2
        "hole_diameter": 3.0,                   // optional, default 3.0mm
        "voxel_size": 0.5,                      // optional, default 0.5mm (0 to skip)
        "upload_url": "https://...",            // optional, signed Supabase upload URL
        "stl_public_url": "https://..."         // optional, public URL after upload
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

    wall_thickness = body.get("wall_thickness", 2.0)
    drain_holes = body.get("drain_holes", 2)
    hole_diameter = body.get("hole_diameter", 3.0)
    voxel_size = body.get("voxel_size", 0.5)

    with tempfile.TemporaryDirectory() as tmpdir:
        # Determine file extension
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

        # Download or decode
        if model_url:
            print(f"Downloading model from: {model_url[:100]}")
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

        print(f"Model ready: {len(model_data):,} bytes ({ext})")
        print(f"Options: wall={wall_thickness}mm, holes={drain_holes}x{hole_diameter}mm, voxel={voxel_size}mm")

        # Run Blender headless with hollow_v2.py
        print("Starting Blender hollow v2 subprocess...")
        try:
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            result = subprocess.run(
                [
                    "blender",
                    "--background",
                    "--python", "/app/hollow_v2.py",
                    "--",
                    input_path,
                    output_path,
                    report_path,
                    "--wall-thickness", str(wall_thickness),
                    "--drain-holes", str(drain_holes),
                    "--hole-diameter", str(hole_diameter),
                    "--voxel-size", str(voxel_size),
                ],
                capture_output=True,
                text=True,
                timeout=480,
                env=env,
            )

            print(f"Blender exited with code: {result.returncode}")
            if result.stdout:
                print("Blender stdout:", result.stdout[-4000:])
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
            print("ERROR: Blender hollow v2 timed out after 480s")
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

        # Read report
        report = {}
        if os.path.exists(report_path):
            with open(report_path) as f:
                report = json.load(f)

        if not os.path.exists(output_path):
            return JSONResponse(
                {"success": False, "error": "Hollowed STL was not generated", "report": report},
                status_code=500,
            )

        with open(output_path, "rb") as f:
            stl_data = f.read()

        print(f"Hollowing v2 complete: STL={len(stl_data):,} bytes, material_saved={report.get('material_saved_percent', '?')}%")

        # Upload to Supabase Storage if URL provided
        upload_url = body.get("upload_url")
        if upload_url:
            print(f"Uploading hollowed STL ({len(stl_data):,} bytes) to Supabase Storage...")
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
            "stl_size_bytes": len(stl_data),
        })


@app.function(image=blender_image)
@modal.fastapi_endpoint(method="GET", label="warm-test")
async def warm():
    """Pre-warm endpoint for the test app."""
    return {
        "status": "warm",
        "app": "shapemint-hollow-test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
