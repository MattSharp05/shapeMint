"""
Blender headless script: Scale + Hollow a 3D model for printing.

Combines scaling to target dimensions and hollowing (based on BlendShell algorithm)
in a single Blender session. Exports both OBJ (with UVs preserved for color printing)
and STL (geometry-only for mono printing).

Usage:
    blender --background --python scale_and_hollow.py -- <input> <output.obj> <output.stl> <report.json> [options]

Options:
    --scale-value <float>       Target dimension value (e.g. 7)
    --scale-unit <str>          Unit: mm, cm, or inches (default: cm)
    --scale-target <str>        Which axis: height, width, depth, or longest (default: height)
    --wall-thickness <float>    Shell wall thickness in mm (default: 2.0, 0 to skip hollowing)
    --drain-holes <int>         Number of drain holes (default: 2)
    --hole-diameter <float>     Drain hole diameter in mm (default: 3.0)
"""

import bpy
import bmesh
import sys
import json
import os
import re
import time
import zipfile
from mathutils import Vector


def log(msg, level="INFO"):
    ts = time.strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}", flush=True)


def log_separator(title=""):
    if title:
        print(f"\n{'='*60}", flush=True)
        print(f"  {title}", flush=True)
        print(f"{'='*60}", flush=True)
    else:
        print(f"{'─'*60}", flush=True)


# ── Args ─────────────────────────────────────────────────────────────────

def parse_args():
    argv = sys.argv
    log(f"Raw argv: {argv}")
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        log("No arguments after '--'", "ERROR")
        sys.exit(1)

    if len(argv) < 4:
        log(f"Expected 4+ args (input, output_obj, output_stl, report), got {len(argv)}", "ERROR")
        sys.exit(1)

    args = {
        "input_path": argv[0],
        "output_obj": argv[1],
        "output_stl": argv[2],
        "report_path": argv[3],
        # Scale params
        "scale_value": 0,       # 0 = no scaling
        "scale_unit": "cm",
        "scale_target": "height",
        # Hollow params
        "wall_thickness": 2.0,  # 0 = no hollowing
        "drain_holes": 2,
        "hole_diameter": 3.0,
        # Face budget before hollowing (0 = no decimation). Hollowing roughly
        # doubles the face count, so 300K here ≈ 600K final ≈ 30MB STL —
        # safely under Supabase Storage's ~50MB per-file upload limit.
        "max_faces": 300000,
    }

    i = 4
    while i < len(argv):
        key = argv[i]
        if i + 1 >= len(argv):
            log(f"Arg {key} has no value, skipping", "WARN")
            i += 1
            continue
        val = argv[i + 1]
        mapping = {
            "--scale-value": ("scale_value", float),
            "--scale-unit": ("scale_unit", str),
            "--scale-target": ("scale_target", str),
            "--wall-thickness": ("wall_thickness", float),
            "--drain-holes": ("drain_holes", int),
            "--hole-diameter": ("hole_diameter", float),
            "--max-faces": ("max_faces", int),
            "--output-glb": ("output_glb", str),
            "--bundle-zip": ("bundle_zip", str),
            "--bundle-basename": ("bundle_basename", str),
        }
        if key in mapping:
            field, typ = mapping[key]
            args[field] = typ(val)
            log(f"  Parsed: {key} = {val}")
            i += 2
        else:
            log(f"Unknown arg: {key}", "WARN")
            i += 1

    return args


# ── Helpers ──────────────────────────────────────────────────────────────

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def import_model(path):
    ext = os.path.splitext(path)[1].lower()
    file_size = os.path.getsize(path)
    log(f"Importing: {path} ({ext}, {file_size:,} bytes)")

    t0 = time.time()
    if ext in ('.glb', '.gltf'):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == '.stl':
        bpy.ops.import_mesh.stl(filepath=path)
    elif ext == '.obj':
        bpy.ops.wm.obj_import(filepath=path)
    else:
        raise ValueError(f"Unsupported format: {ext}")

    log(f"  Import took {time.time()-t0:.2f}s")

    mesh_objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not mesh_objects:
        raise ValueError("No mesh objects found")

    log(f"  Found {len(mesh_objects)} mesh objects:")
    for o in mesh_objects:
        log(f"    - {o.name}: {len(o.data.vertices):,} verts, {len(o.data.polygons):,} faces")

    bpy.ops.object.select_all(action='DESELECT')
    for o in mesh_objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objects[0]

    if len(mesh_objects) > 1:
        log(f"  Joining {len(mesh_objects)} objects...")
        bpy.ops.object.join()

    target = bpy.context.active_object
    target.name = "Target"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    log(f"  Final mesh: {len(target.data.vertices):,} verts, {len(target.data.polygons):,} faces")
    return target


def get_dimensions(obj):
    """Return bounding box center, dimensions vector, and volume."""
    bme = bmesh.new()
    bme.from_mesh(obj.data)
    bme.transform(obj.matrix_world)
    volume = abs(bme.calc_volume())

    coords = [v.co for v in bme.verts]
    min_co = Vector((min(c.x for c in coords), min(c.y for c in coords), min(c.z for c in coords)))
    max_co = Vector((max(c.x for c in coords), max(c.y for c in coords), max(c.z for c in coords)))
    center = (min_co + max_co) / 2.0
    dims = max_co - min_co
    bme.free()
    return center, dims, volume


def to_meters(value, unit):
    if unit == "mm":
        return value / 1000.0
    elif unit == "cm":
        return value / 100.0
    elif unit == "inches":
        return value * 0.0254
    return value / 100.0


# ── Scale ────────────────────────────────────────────────────────────────

def scale_model(obj, target_value, unit, target_axis):
    """Apply uniform scale so that target_axis matches target_value."""
    log_separator("Scaling Model")

    center, dims, volume = get_dimensions(obj)
    log(f"  Before scale: {dims.x:.4f} x {dims.y:.4f} x {dims.z:.4f} (meters)")
    log(f"  Volume: {volume:.6f} m³")

    target_m = to_meters(target_value, unit)
    log(f"  Target: {target_value} {unit} = {target_m:.6f} m ({target_axis})")

    # Get current dimension for the target axis
    if target_axis == "height":
        current = dims.z  # Blender Z = up = height
    elif target_axis == "width":
        current = dims.x
    elif target_axis == "depth":
        current = dims.y
    elif target_axis == "longest":
        current = max(dims.x, dims.y, dims.z)
    else:
        current = dims.z

    if current <= 0:
        raise ValueError(f"Current {target_axis} dimension is {current}, cannot scale")

    scale_factor = target_m / current
    log(f"  Current {target_axis}: {current:.6f} m")
    log(f"  Scale factor: {scale_factor:.6f}")

    # Apply uniform scale
    obj.scale = (scale_factor, scale_factor, scale_factor)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Verify
    _, new_dims, new_volume = get_dimensions(obj)
    log(f"  After scale: {new_dims.x:.4f} x {new_dims.y:.4f} x {new_dims.z:.4f} (meters)")
    log(f"  Volume: {new_volume:.6f} m³")

    return {
        "scale_factor": round(scale_factor, 6),
        "before_dimensions_m": [round(dims.x, 6), round(dims.y, 6), round(dims.z, 6)],
        "after_dimensions_m": [round(new_dims.x, 6), round(new_dims.y, 6), round(new_dims.z, 6)],
        "before_volume_m3": round(volume, 8),
        "after_volume_m3": round(new_volume, 8),
    }


# ── Hollow (from hollow.py) ─────────────────────────────────────────────

def prepare_mesh(target):
    """Clean up mesh before hollowing: merge duplicates, fix normals, make manifold."""
    log("Preparing mesh for hollowing...")
    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.mode_set(mode='EDIT')

    bpy.ops.mesh.select_all(action='SELECT')
    # Merge vertices that are very close together
    bpy.ops.mesh.remove_doubles(threshold=0.00001)
    # Recalculate normals to ensure they all point outward
    bpy.ops.mesh.normals_make_consistent(inside=False)
    # Fill any small holes that might cause solidify issues
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.mesh.select_non_manifold()
    bpy.ops.mesh.fill()

    bpy.ops.object.mode_set(mode='OBJECT')
    log(f"  Prepared: {len(target.data.vertices):,} verts, {len(target.data.polygons):,} faces")


def decimate_to_budget(target, max_faces):
    """Reduce face count to max_faces via collapse decimation (preserves UVs).

    Runs BEFORE hollowing: solidify roughly doubles the face count, and
    multi-million-face Meshy outputs otherwise produce STL/OBJ files that
    exceed Supabase Storage's per-file upload limit (~50MB). Collapse
    decimation keeps UV coordinates so textured color bundles stay valid.
    """
    faces = len(target.data.polygons)
    if max_faces <= 0 or faces <= max_faces:
        log(f"  Decimation: SKIPPED ({faces:,} faces <= budget {max_faces:,})")
        return {"status": "skipped", "faces_before": faces, "faces_after": faces}

    ratio = max_faces / faces
    log(f"  Decimating: {faces:,} faces -> target {max_faces:,} (ratio {ratio:.4f})")

    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.context.view_layer.objects.active = target

    mod = target.modifiers.new(name="Decimate_Budget", type='DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = ratio
    bpy.ops.object.modifier_apply(modifier="Decimate_Budget")

    faces_after = len(target.data.polygons)
    log(f"  After decimation: {len(target.data.vertices):,} verts, {faces_after:,} faces")
    return {"status": "ok", "faces_before": faces, "faces_after": faces_after, "ratio": round(ratio, 4)}


def hollow_with_solidify(target, wall_thickness_m):
    """Hollow the model using Blender's Solidify modifier — clean, reliable shell generation."""
    log_separator("Hollowing with Solidify")
    log(f"  Wall thickness: {wall_thickness_m*1000:.1f}mm ({wall_thickness_m:.6f}m)")

    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.context.view_layer.objects.active = target

    # Solidify: offset inward to create a shell
    mod = target.modifiers.new(name="Solidify", type='SOLIDIFY')
    mod.thickness = wall_thickness_m
    mod.offset = -1.0           # Fully inward (outer surface stays in place)
    mod.use_even_offset = True  # Even thickness on angled surfaces
    mod.use_quality_normals = True
    mod.use_rim = True          # Close the shell at open edges (creates a sealed bottom)

    bpy.ops.object.modifier_apply(modifier="Solidify")

    verts_after = len(target.data.vertices)
    faces_after = len(target.data.polygons)
    log(f"  After solidify: {verts_after:,} verts, {faces_after:,} faces")

    # Clean up any artifacts from solidify
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    # Remove degenerate geometry
    bpy.ops.mesh.dissolve_degenerate(threshold=0.00001)
    bpy.ops.mesh.delete_loose()
    bpy.ops.object.mode_set(mode='OBJECT')

    log(f"  After cleanup: {len(target.data.vertices):,} verts, {len(target.data.polygons):,} faces")
    return True


def drill_holes(target, num_holes, hole_diameter_m, center, dims):
    if num_holes <= 0:
        log("  Drain holes: disabled")
        return

    log_separator("Drilling Drain Holes")
    drill_length = dims.z * 1.2
    drill_radius = hole_diameter_m / 2.0
    log(f"  {num_holes} holes, diameter={hole_diameter_m*1000:.1f}mm, length={drill_length*1000:.1f}mm")

    if num_holes == 1:
        positions = [center.x]
    else:
        spread = dims.x * 0.4
        positions = [center.x - spread/2 + spread * i / (num_holes - 1) for i in range(num_holes)]

    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.context.view_layer.objects.active = target

    for i, xp in enumerate(positions):
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=drill_radius, depth=drill_length, location=(xp, center.y, center.z))
        drill = bpy.context.active_object
        drill.name = f"Drill.{i:03d}"

        bpy.ops.object.select_all(action='DESELECT')
        target.select_set(True)
        bpy.context.view_layer.objects.active = target

        mod = target.modifiers.new(name=f"Drill_{i}", type='BOOLEAN')
        mod.object = drill
        mod.operation = 'DIFFERENCE'
        mod.solver = 'EXACT'  # More reliable than FAST for complex meshes
        bpy.ops.object.modifier_apply(modifier=mod.name)

        bpy.ops.object.select_all(action='DESELECT')
        drill.select_set(True)
        bpy.ops.object.delete()
        log(f"    Hole {i+1}/{num_holes} drilled at x={xp:.4f}")

    # Clean up after booleans
    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.mesh.dissolve_degenerate(threshold=0.00001)
    bpy.ops.mesh.delete_loose()
    bpy.ops.object.mode_set(mode='OBJECT')

    log(f"  All holes drilled. Final: {len(target.data.polygons):,} faces")


# ── Texture Extraction ───────────────────────────────────────────────────

def _sanitize_filename(name):
    """Strip path separators and problematic chars from a texture filename."""
    name = os.path.basename(name or "")
    name = re.sub(r'[^A-Za-z0-9._-]', '_', name)
    return name or "texture"


def _extension_for(img):
    fmt = (img.file_format or "").upper()
    if fmt == "JPEG":
        return ".jpg"
    if fmt == "PNG":
        return ".png"
    if fmt == "TARGA":
        return ".tga"
    if fmt == "BMP":
        return ".bmp"
    # Fall back to whatever is on img.name, else default PNG
    cur = os.path.splitext(img.name or "")[1].lower()
    return cur if cur in (".jpg", ".jpeg", ".png", ".tga", ".bmp") else ".png"


def extract_textures(textures_dir):
    """
    Save all packed/loaded images to `textures_dir` and rewrite each image's
    filepath to a relative `//textures/<name>` path so the OBJ exporter emits
    clean relative texture references in the MTL.

    Returns list of dicts: [{name, size}, ...].
    """
    log_separator("Extracting Textures")
    os.makedirs(textures_dir, exist_ok=True)

    extracted = []
    used_names = set()

    for idx, img in enumerate(bpy.data.images):
        # Skip Blender's built-in render result / viewer images
        if img.name in ("Render Result", "Viewer Node"):
            continue
        # Skip images with no data (broken references, etc.)
        if not getattr(img, "has_data", False):
            log(f"  Skip image '{img.name}': no data", "WARN")
            continue

        # Choose a stable filename. GLB textures often come in named "Image_0" etc.
        base = _sanitize_filename(os.path.splitext(img.name)[0] or f"Image_{idx}")
        ext = _extension_for(img)
        candidate = f"{base}{ext}"
        n = 1
        while candidate in used_names:
            candidate = f"{base}_{n}{ext}"
            n += 1
        used_names.add(candidate)

        out_path = os.path.join(textures_dir, candidate)

        try:
            # Point the image at the target location and save to disk
            img.filepath_raw = out_path
            img.save()
        except Exception as e:
            log(f"  Failed to save '{img.name}' → {candidate}: {e}", "ERROR")
            continue

        # Rewrite the in-scene filepath to a relative one so OBJ export writes
        # `map_Kd textures/<candidate>` (not an absolute /tmp path).
        img.filepath = f"//textures/{candidate}"

        size = os.path.getsize(out_path) if os.path.exists(out_path) else 0
        extracted.append({"name": candidate, "size": size, "format": img.file_format})
        log(f"  Extracted: {candidate} ({size:,} bytes, format={img.file_format})")

    if not extracted:
        log("  No textures extracted — color bundle will ship without texture files", "WARN")
    else:
        log(f"  Total textures extracted: {len(extracted)}")

    return extracted


def validate_mtl(mtl_path, extracted):
    """Read the emitted MTL, assert it has map_Kd and that referenced textures exist."""
    if not os.path.exists(mtl_path):
        log(f"  MTL MISSING at {mtl_path}", "ERROR")
        return {"ok": False, "reason": "mtl_missing"}

    with open(mtl_path, "r", encoding="utf-8", errors="replace") as f:
        mtl_text = f.read()

    log(f"  MTL size: {os.path.getsize(mtl_path):,} bytes")
    log(f"  MTL contents:\n{mtl_text}")

    map_refs = re.findall(r'^\s*map_\w+\s+(?:-\S+\s+\S+\s+)*(.+)$', mtl_text, re.MULTILINE)
    map_refs = [m.strip() for m in map_refs if m.strip()]

    if not map_refs:
        log("  MTL has NO map_* lines — color will not print", "ERROR")
        return {"ok": False, "reason": "no_map_refs"}

    log(f"  MTL references {len(map_refs)} texture(s): {map_refs}")

    # Every referenced texture should exist in our extracted set
    extracted_names = {e["name"] for e in extracted}
    missing = [r for r in map_refs if os.path.basename(r) not in extracted_names]
    if missing:
        log(f"  MTL references missing textures: {missing}", "ERROR")
        return {"ok": False, "reason": "missing_refs", "missing": missing}

    return {"ok": True, "refs": map_refs}


# ── Export ───────────────────────────────────────────────────────────────

def export_obj(obj, path, with_materials=False, path_mode='AUTO'):
    log(f"Exporting OBJ: {path} (materials={with_materials}, path_mode={path_mode})")
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    bpy.ops.wm.obj_export(
        filepath=path,
        export_selected_objects=True,
        export_uv=True,
        export_normals=True,
        export_materials=with_materials,
        path_mode=path_mode,
    )
    size = os.path.getsize(path)
    log(f"  OBJ exported: {size:,} bytes ({size/1024/1024:.2f} MB)")
    return size


def export_stl(obj, path):
    log(f"Exporting STL: {path}")
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    # Blender 4.0 uses export_mesh.stl, 4.1+ uses wm.stl_export
    if bpy.app.version >= (4, 1, 0):
        bpy.ops.wm.stl_export(
            filepath=path,
            export_selected_objects=True,
            ascii_format=False,
        )
    else:
        bpy.ops.export_mesh.stl(
            filepath=path,
            use_selection=True,
            ascii=False,
        )
    size = os.path.getsize(path)
    log(f"  STL exported: {size:,} bytes ({size/1024/1024:.2f} MB)")
    return size


def build_color_bundle(target, bundle_zip_path, bundle_basename, scaled_glb_path):
    """
    Build the color-print bundle ZIP: OBJ + MTL + textures/ + scaled GLB.
    Structure inside the zip:
        <basename>.obj
        <basename>.mtl
        <basename>.glb
        textures/<texture_files>
    Returns dict with bundle metadata + validation result.
    """
    log_separator("Building Color Bundle")
    log(f"  Bundle path: {bundle_zip_path}")
    log(f"  Basename:    {bundle_basename}")

    bundle_dir = os.path.dirname(bundle_zip_path) or "."
    staging = os.path.join(bundle_dir, f".{bundle_basename}_staging")
    textures_dir = os.path.join(staging, "textures")
    os.makedirs(staging, exist_ok=True)

    # Extract packed textures first so OBJ export can reference them by relative path
    extracted = extract_textures(textures_dir)

    # Export OBJ with materials + relative texture paths so the MTL says
    # `map_Kd textures/Image_0.jpg` (not absolute /tmp/... paths).
    obj_path = os.path.join(staging, f"{bundle_basename}.obj")
    mtl_path = os.path.join(staging, f"{bundle_basename}.mtl")
    export_obj(target, obj_path, with_materials=True, path_mode='RELATIVE')

    # Validate MTL
    mtl_check = validate_mtl(mtl_path, extracted)

    # Copy the scaled GLB into staging so it rides along in the zip
    glb_in_bundle = os.path.join(staging, f"{bundle_basename}.glb")
    if scaled_glb_path and os.path.exists(scaled_glb_path):
        import shutil
        shutil.copy2(scaled_glb_path, glb_in_bundle)
        log(f"  GLB copied into bundle: {os.path.getsize(glb_in_bundle):,} bytes")
    else:
        log(f"  GLB missing (expected at {scaled_glb_path}) — bundle will not include GLB", "WARN")
        glb_in_bundle = None

    # Write the zip
    log(f"  Writing zip: {bundle_zip_path}")
    written = []
    with zipfile.ZipFile(bundle_zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for name in os.listdir(staging):
            p = os.path.join(staging, name)
            if name == "textures":
                continue  # handled separately below
            if os.path.isfile(p):
                z.write(p, arcname=name)
                written.append(name)
        # Add textures/ subfolder
        if os.path.isdir(textures_dir):
            for tex_name in sorted(os.listdir(textures_dir)):
                tp = os.path.join(textures_dir, tex_name)
                if os.path.isfile(tp):
                    arc = f"textures/{tex_name}"
                    z.write(tp, arcname=arc)
                    written.append(arc)

    zip_size = os.path.getsize(bundle_zip_path)
    log(f"  Zip written: {zip_size:,} bytes ({zip_size/1024/1024:.2f} MB)")
    log(f"  Zip contents ({len(written)} files):")
    for n in written:
        log(f"    - {n}")

    # Cleanup staging
    import shutil
    try:
        shutil.rmtree(staging)
    except Exception as e:
        log(f"  Failed to clean staging dir: {e}", "WARN")

    return {
        "zip_path": bundle_zip_path,
        "zip_size_bytes": zip_size,
        "file_count": len(written),
        "files": written,
        "textures_extracted": len(extracted),
        "texture_details": extracted,
        "mtl_validation": mtl_check,
        "glb_included": glb_in_bundle is not None,
    }


def export_glb(obj, path):
    log(f"Exporting GLB: {path}")
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_materials='EXPORT',
        export_colors=True,
    )
    size = os.path.getsize(path)
    log(f"  GLB exported: {size:,} bytes ({size/1024/1024:.2f} MB)")
    return size


# ── Main ─────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    log_separator("ShapeMint Scale + Hollow Pipeline")
    log(f"Blender version: {bpy.app.version_string}")
    log(f"Input:           {args['input_path']}")
    log(f"Output OBJ:      {args['output_obj']}")
    log(f"Output STL:      {args['output_stl']}")
    log(f"Scale:           {args['scale_value']} {args['scale_unit']} ({args['scale_target']})")
    log(f"Wall thickness:  {args['wall_thickness']}mm")
    log(f"Drain holes:     {args['drain_holes']} x {args['hole_diameter']}mm")

    do_scale = args["scale_value"] > 0
    do_hollow = args["wall_thickness"] > 0

    if not do_scale and not do_hollow:
        log("Neither scaling nor hollowing requested — nothing to do", "WARN")

    if not os.path.exists(args["input_path"]):
        log(f"Input file missing: {args['input_path']}", "ERROR")
        sys.exit(1)

    start_time = time.time()
    report = {
        "success": False,
        "input_file": os.path.basename(args["input_path"]),
        "input_size_bytes": os.path.getsize(args["input_path"]),
        "params": {
            "scale_value": args["scale_value"],
            "scale_unit": args["scale_unit"],
            "scale_target": args["scale_target"],
            "wall_thickness": args["wall_thickness"],
            "drain_holes": args["drain_holes"],
            "hole_diameter": args["hole_diameter"],
        },
        "steps": {},
    }

    try:
        # Import
        log_separator("Step 1: Import")
        t0 = time.time()
        clear_scene()
        target = import_model(args["input_path"])
        report["steps"]["import"] = {"time": round(time.time()-t0, 2), "status": "ok"}

        # Analyze
        log_separator("Step 2: Analyze")
        center, dims, volume = get_dimensions(target)
        log(f"  Dimensions: {dims.x:.4f} x {dims.y:.4f} x {dims.z:.4f} m")
        log(f"  Volume: {volume:.6f} m³")
        log(f"  Vertices: {len(target.data.vertices):,}, Faces: {len(target.data.polygons):,}")
        report["original"] = {
            "dimensions_m": [round(dims.x, 6), round(dims.y, 6), round(dims.z, 6)],
            "volume_m3": round(volume, 8),
            "vertices": len(target.data.vertices),
            "faces": len(target.data.polygons),
        }

        # Scale
        if do_scale:
            log_separator("Step 3: Scale")
            t0 = time.time()
            scale_info = scale_model(target, args["scale_value"], args["scale_unit"], args["scale_target"])
            report["scale"] = scale_info
            report["steps"]["scale"] = {"time": round(time.time()-t0, 2), "status": "ok"}

            # Re-measure after scale
            center, dims, volume = get_dimensions(target)
        else:
            log("  Scaling: SKIPPED (scale_value=0)")
            report["steps"]["scale"] = {"time": 0, "status": "skipped"}

        # Decimate to face budget (before hollowing, which ~doubles faces).
        # Prevents oversized STL/OBJ uploads from hi-poly Meshy outputs.
        log_separator("Step 3.5: Decimate")
        t0 = time.time()
        decimate_info = decimate_to_budget(target, args["max_faces"])
        report["decimate"] = decimate_info
        report["steps"]["decimate"] = {"time": round(time.time()-t0, 2), "status": decimate_info["status"]}

        # Hollow
        if do_hollow:
            # Convert mm to meters for Blender
            wall_m = args["wall_thickness"] / 1000.0
            hole_dia_m = args["hole_diameter"] / 1000.0

            log_separator("Step 4: Prepare Mesh")
            t0 = time.time()
            prepare_mesh(target)
            report["steps"]["prepare"] = {"time": round(time.time()-t0, 2), "status": "ok"}

            log_separator("Step 5: Solidify (Hollow)")
            t0 = time.time()
            hollow_with_solidify(target, wall_m)
            report["steps"]["solidify"] = {"time": round(time.time()-t0, 2), "status": "ok"}

            log_separator("Step 6: Drill Holes")
            t0 = time.time()
            drill_holes(target, args["drain_holes"], hole_dia_m, center, dims)
            report["steps"]["drill"] = {"time": round(time.time()-t0, 2), "status": "ok" if args["drain_holes"] > 0 else "skipped"}
        else:
            log("  Hollowing: SKIPPED (wall_thickness=0)")
            for s in ["prepare", "solidify", "drill"]:
                report["steps"][s] = {"time": 0, "status": "skipped"}

        # Export all formats
        log_separator("Step 8: Export")
        t0 = time.time()
        # Geometry-only OBJ (backward compat: scaled_obj_url consumers don't get
        # a broken MTL reference). The bundle below carries the materials version.
        obj_size = export_obj(target, args["output_obj"], with_materials=False)
        stl_size = export_stl(target, args["output_stl"])
        glb_size = 0
        if args.get("output_glb"):
            glb_size = export_glb(target, args["output_glb"])
        report["steps"]["export"] = {"time": round(time.time()-t0, 2), "status": "ok"}

        # Color bundle (OBJ+MTL+textures+GLB zipped) — for color print fulfillment
        if args.get("bundle_zip"):
            log_separator("Step 9: Color Bundle")
            t0 = time.time()
            basename = args.get("bundle_basename") or "model"
            bundle_info = build_color_bundle(
                target=target,
                bundle_zip_path=args["bundle_zip"],
                bundle_basename=basename,
                scaled_glb_path=args.get("output_glb", ""),
            )
            report["color_bundle"] = bundle_info
            bundle_ok = bundle_info.get("mtl_validation", {}).get("ok", False)
            report["steps"]["bundle"] = {
                "time": round(time.time()-t0, 2),
                "status": "ok" if bundle_ok else "invalid",
            }
            if not bundle_ok:
                log("  Bundle validation FAILED — color print quality at risk", "ERROR")
        else:
            report["steps"]["bundle"] = {"time": 0, "status": "skipped"}

        # Final metrics
        _, final_dims, final_vol = get_dimensions(target)
        material_saved = max(0, (1 - final_vol / volume) * 100) if volume > 0 and do_hollow else 0
        total_time = time.time() - start_time

        report["success"] = True
        report["final"] = {
            "dimensions_m": [round(final_dims.x, 6), round(final_dims.y, 6), round(final_dims.z, 6)],
            "volume_m3": round(final_vol, 8),
            "vertices": len(target.data.vertices),
            "faces": len(target.data.polygons),
            "obj_size_bytes": obj_size,
            "stl_size_bytes": stl_size,
            "glb_size_bytes": glb_size,
        }
        report["material_saved_percent"] = round(material_saved, 1)
        report["total_time"] = round(total_time, 2)

        log_separator("COMPLETE")
        log(f"Total time:       {total_time:.2f}s")
        if do_scale:
            log(f"Scaled to:        {args['scale_value']} {args['scale_unit']} ({args['scale_target']})")
        log(f"Final dims (m):   {final_dims.x:.4f} x {final_dims.y:.4f} x {final_dims.z:.4f}")
        if do_hollow:
            log(f"Material saved:   {material_saved:.1f}%")
            log(f"Wall thickness:   {args['wall_thickness']}mm")
        log(f"OBJ size:         {obj_size:,} bytes")
        log(f"STL size:         {stl_size:,} bytes")
        if glb_size:
            log(f"GLB size:         {glb_size:,} bytes")
        log(f"Vertices:         {len(target.data.vertices):,}")
        log(f"Faces:            {len(target.data.polygons):,}")

        log("")
        log("Step timing:")
        for name, data in report["steps"].items():
            log(f"  {name:.<20s} {data['time']:.2f}s ({data['status']})")

    except Exception as e:
        report["error"] = str(e)
        report["error_type"] = type(e).__name__
        report["total_time"] = round(time.time() - start_time, 2)
        log(f"FATAL: {e}", "ERROR")
        import traceback
        traceback.print_exc(file=sys.stderr)

    with open(args["report_path"], "w") as f:
        json.dump(report, f, indent=2)
    log(f"Report: {args['report_path']}")
    log(f"Report JSON: {json.dumps(report, indent=2)}")


if __name__ == "__main__":
    main()
