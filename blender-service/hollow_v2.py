"""
Blender headless script: Hollow a 3D model for printing (v2).

New approach: Voxel Remesh -> Solidify Modifier -> Drain Holes.
This avoids the seed expansion issues from v1 by converting AI-generated
meshes to clean manifold geometry before hollowing.

Usage:
    blender --background --python hollow_v2.py -- <input> <output.stl> <report.json> [options]

Options:
    --wall-thickness <float>    Shell wall thickness in mm (default: 2.0)
    --drain-holes <int>         Number of drain holes (default: 2, 0 to disable)
    --hole-diameter <float>     Drain hole diameter in mm (default: 3.0)
    --voxel-size <float>        Voxel remesh resolution in mm (default: 0.5, 0 to skip)
"""

import bpy
import bmesh
import sys
import json
import os
import time
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

    if len(argv) < 3:
        log(f"Expected 3+ args (input, output_stl, report), got {len(argv)}", "ERROR")
        sys.exit(1)

    args = {
        "input_path": argv[0],
        "output_stl": argv[1],
        "report_path": argv[2],
        "wall_thickness": 2.0,   # mm
        "drain_holes": 2,
        "hole_diameter": 3.0,    # mm
        "voxel_size": 0.5,       # mm (0 = skip remesh)
    }

    i = 3
    while i < len(argv):
        key = argv[i]
        if i + 1 >= len(argv):
            log(f"Arg {key} has no value, skipping", "WARN")
            i += 1
            continue
        val = argv[i + 1]
        mapping = {
            "--wall-thickness": ("wall_thickness", float),
            "--drain-holes": ("drain_holes", int),
            "--hole-diameter": ("hole_diameter", float),
            "--voxel-size": ("voxel_size", float),
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


# ── Step 1: Clean up mesh ────────────────────────────────────────────────

def clean_mesh(target):
    """Basic mesh cleanup: merge doubles, fix normals, fill small holes."""
    log_separator("Step 1: Clean Mesh")

    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.context.view_layer.objects.active = target

    verts_before = len(target.data.vertices)
    faces_before = len(target.data.polygons)

    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')

    # Merge close vertices
    bpy.ops.mesh.remove_doubles(threshold=0.00001)
    # Fix normals
    bpy.ops.mesh.normals_make_consistent(inside=False)
    # Remove degenerate geometry
    bpy.ops.mesh.dissolve_degenerate(threshold=0.00001)
    bpy.ops.mesh.delete_loose()

    # Try to fill non-manifold edges (small holes)
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.mesh.select_non_manifold()
    # Count non-manifold before fill
    bpy.ops.object.mode_set(mode='OBJECT')
    non_manifold_count = sum(1 for v in target.data.vertices if v.select)
    bpy.ops.object.mode_set(mode='EDIT')

    if non_manifold_count > 0:
        log(f"  Found {non_manifold_count} non-manifold vertices, attempting fill...")
        try:
            bpy.ops.mesh.fill()
        except RuntimeError:
            log("  Fill failed (expected for complex non-manifold edges)", "WARN")

    bpy.ops.object.mode_set(mode='OBJECT')

    verts_after = len(target.data.vertices)
    faces_after = len(target.data.polygons)
    log(f"  Before: {verts_before:,} verts, {faces_before:,} faces")
    log(f"  After:  {verts_after:,} verts, {faces_after:,} faces")
    log(f"  Non-manifold vertices found: {non_manifold_count}")

    return non_manifold_count


# ── Step 2: Voxel Remesh ────────────────────────────────────────────────

def voxel_remesh(target, voxel_size_m):
    """Voxel remesh to convert to clean manifold mesh.

    This is the key step that makes hollowing work on AI-generated meshes.
    Voxel remesh creates a completely new, watertight, manifold mesh from
    the volume of the original — fixing all topology issues.
    """
    log_separator("Step 2: Voxel Remesh")

    verts_before = len(target.data.vertices)
    faces_before = len(target.data.polygons)

    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.context.view_layer.objects.active = target

    # Use Blender's built-in voxel remesh
    target.data.remesh_voxel_size = voxel_size_m
    target.data.use_remesh_fix_poles = True
    target.data.use_remesh_smooth_normals = True
    target.data.use_remesh_preserve_volume = True

    log(f"  Voxel size: {voxel_size_m*1000:.2f}mm ({voxel_size_m:.6f}m)")
    log(f"  Before: {verts_before:,} verts, {faces_before:,} faces")

    t0 = time.time()
    bpy.ops.object.voxel_remesh()
    remesh_time = time.time() - t0

    verts_after = len(target.data.vertices)
    faces_after = len(target.data.polygons)
    log(f"  After:  {verts_after:,} verts, {faces_after:,} faces")
    log(f"  Remesh took {remesh_time:.2f}s")

    # Verify the mesh is now manifold
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.mesh.select_non_manifold()
    bpy.ops.object.mode_set(mode='OBJECT')
    remaining_non_manifold = sum(1 for v in target.data.vertices if v.select)
    log(f"  Non-manifold vertices after remesh: {remaining_non_manifold}")

    # Smooth out voxel staircase artifacts
    log("  Applying smooth pass...")
    mod = target.modifiers.new(name="Smooth", type='SMOOTH')
    mod.iterations = 5
    mod.factor = 0.5
    bpy.ops.object.modifier_apply(modifier="Smooth")

    log(f"  Final: {len(target.data.vertices):,} verts, {len(target.data.polygons):,} faces")

    return {
        "voxel_size_mm": round(voxel_size_m * 1000, 2),
        "before_verts": verts_before,
        "before_faces": faces_before,
        "after_verts": len(target.data.vertices),
        "after_faces": len(target.data.polygons),
        "non_manifold_remaining": remaining_non_manifold,
        "time": round(remesh_time, 2),
    }


# ── Step 3: Solidify (Hollow) ───────────────────────────────────────────

def hollow_with_solidify(target, wall_thickness_m):
    """Hollow the model using Blender's Solidify modifier.

    With clean manifold input from voxel remesh, Solidify works reliably.
    Offset=-1 means the outer surface stays in place and the inner wall
    is created inward.
    """
    log_separator("Step 3: Solidify (Hollow)")
    log(f"  Wall thickness: {wall_thickness_m*1000:.1f}mm ({wall_thickness_m:.6f}m)")

    verts_before = len(target.data.vertices)
    faces_before = len(target.data.polygons)

    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.context.view_layer.objects.active = target

    # Apply Solidify modifier
    mod = target.modifiers.new(name="Solidify", type='SOLIDIFY')
    mod.thickness = wall_thickness_m
    mod.offset = -1.0              # Fully inward — outer surface stays put
    mod.use_even_offset = True     # Even thickness on angled surfaces
    mod.use_quality_normals = True # Better normal calculation
    mod.use_rim = True             # Close the shell at open edges

    t0 = time.time()
    bpy.ops.object.modifier_apply(modifier="Solidify")
    solidify_time = time.time() - t0

    verts_after = len(target.data.vertices)
    faces_after = len(target.data.polygons)
    log(f"  Before: {verts_before:,} verts, {faces_before:,} faces")
    log(f"  After:  {verts_after:,} verts, {faces_after:,} faces")
    log(f"  Solidify took {solidify_time:.2f}s")

    # Post-solidify cleanup
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.mesh.dissolve_degenerate(threshold=0.00001)
    bpy.ops.mesh.delete_loose()
    bpy.ops.object.mode_set(mode='OBJECT')

    final_verts = len(target.data.vertices)
    final_faces = len(target.data.polygons)
    log(f"  After cleanup: {final_verts:,} verts, {final_faces:,} faces")

    return {
        "before_verts": verts_before,
        "before_faces": faces_before,
        "after_verts": final_verts,
        "after_faces": final_faces,
        "time": round(solidify_time, 2),
    }


# ── Step 4: Drill Drain Holes ───────────────────────────────────────────

def drill_holes(target, num_holes, hole_diameter_m, center, dims):
    """Boolean-subtract cylinders to create drain holes at the bottom."""
    if num_holes <= 0:
        log("  Drain holes: disabled")
        return {"status": "skipped"}

    log_separator("Step 4: Drill Drain Holes")

    drill_length = dims.z * 1.2
    drill_radius = hole_diameter_m / 2.0
    log(f"  {num_holes} holes, diameter={hole_diameter_m*1000:.1f}mm, length={drill_length*1000:.1f}mm")

    # Spread holes evenly along X axis
    if num_holes == 1:
        positions = [center.x]
    else:
        spread = dims.x * 0.4
        positions = [center.x - spread/2 + spread * i / (num_holes - 1) for i in range(num_holes)]

    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.context.view_layer.objects.active = target

    for i, xp in enumerate(positions):
        # Create drill cylinder
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=32,
            radius=drill_radius,
            depth=drill_length,
            location=(xp, center.y, center.z),
        )
        drill = bpy.context.active_object
        drill.name = f"Drill.{i:03d}"

        # Boolean difference
        bpy.ops.object.select_all(action='DESELECT')
        target.select_set(True)
        bpy.context.view_layer.objects.active = target

        mod = target.modifiers.new(name=f"Drill_{i}", type='BOOLEAN')
        mod.object = drill
        mod.operation = 'DIFFERENCE'
        mod.solver = 'EXACT'

        t0 = time.time()
        bpy.ops.object.modifier_apply(modifier=mod.name)
        drill_time = time.time() - t0

        # Delete drill cylinder
        bpy.ops.object.select_all(action='DESELECT')
        drill.select_set(True)
        bpy.ops.object.delete()

        log(f"    Hole {i+1}/{num_holes} drilled at x={xp:.4f} ({drill_time:.2f}s)")

    # Cleanup after booleans
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
    return {"status": "ok", "holes_drilled": num_holes}


# ── Export ───────────────────────────────────────────────────────────────

def export_stl(obj, path):
    log(f"Exporting STL: {path}")
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

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


# ── Main ─────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    log_separator("ShapeMint Hollow v2")
    log(f"Blender version: {bpy.app.version_string}")
    log(f"Input:           {args['input_path']}")
    log(f"Output STL:      {args['output_stl']}")
    log(f"Wall thickness:  {args['wall_thickness']}mm")
    log(f"Drain holes:     {args['drain_holes']} x {args['hole_diameter']}mm")
    log(f"Voxel size:      {args['voxel_size']}mm")

    if not os.path.exists(args["input_path"]):
        log(f"Input file missing: {args['input_path']}", "ERROR")
        sys.exit(1)

    start_time = time.time()
    report = {
        "success": False,
        "version": "v2",
        "input_file": os.path.basename(args["input_path"]),
        "input_size_bytes": os.path.getsize(args["input_path"]),
        "params": {
            "wall_thickness_mm": args["wall_thickness"],
            "drain_holes": args["drain_holes"],
            "hole_diameter_mm": args["hole_diameter"],
            "voxel_size_mm": args["voxel_size"],
        },
        "steps": {},
    }

    try:
        # Import
        log_separator("Import")
        t0 = time.time()
        clear_scene()
        target = import_model(args["input_path"])
        report["steps"]["import"] = {"time": round(time.time()-t0, 2), "status": "ok"}

        # Analyze original
        center, dims, original_volume = get_dimensions(target)
        log(f"  Dimensions: {dims.x*1000:.1f} x {dims.y*1000:.1f} x {dims.z*1000:.1f} mm")
        log(f"  Volume: {original_volume:.6f} m^3")
        report["original"] = {
            "dimensions_mm": [round(dims.x*1000, 2), round(dims.y*1000, 2), round(dims.z*1000, 2)],
            "volume_m3": round(original_volume, 8),
            "vertices": len(target.data.vertices),
            "faces": len(target.data.polygons),
        }

        # Step 1: Clean mesh
        t0 = time.time()
        non_manifold = clean_mesh(target)
        report["steps"]["clean"] = {
            "time": round(time.time()-t0, 2),
            "status": "ok",
            "non_manifold_verts": non_manifold,
        }

        # Step 2: Voxel remesh (if enabled)
        if args["voxel_size"] > 0:
            t0 = time.time()
            voxel_size_m = args["voxel_size"] / 1000.0
            remesh_info = voxel_remesh(target, voxel_size_m)
            report["steps"]["remesh"] = {
                "time": round(time.time()-t0, 2),
                "status": "ok",
                **remesh_info,
            }
        else:
            log("  Voxel remesh: SKIPPED (voxel_size=0)")
            report["steps"]["remesh"] = {"time": 0, "status": "skipped"}

        # Re-measure after remesh (volume may change slightly)
        center, dims, pre_hollow_volume = get_dimensions(target)

        # Step 3: Solidify (hollow)
        wall_m = args["wall_thickness"] / 1000.0
        t0 = time.time()
        solidify_info = hollow_with_solidify(target, wall_m)
        report["steps"]["solidify"] = {
            "time": round(time.time()-t0, 2),
            "status": "ok",
            **solidify_info,
        }

        # Step 4: Drill drain holes
        hole_dia_m = args["hole_diameter"] / 1000.0
        t0 = time.time()
        drill_info = drill_holes(target, args["drain_holes"], hole_dia_m, center, dims)
        report["steps"]["drill"] = {
            "time": round(time.time()-t0, 2),
            **drill_info,
        }

        # Export
        log_separator("Export")
        t0 = time.time()
        stl_size = export_stl(target, args["output_stl"])
        report["steps"]["export"] = {"time": round(time.time()-t0, 2), "status": "ok"}

        # Final metrics
        _, final_dims, final_volume = get_dimensions(target)
        material_saved = max(0, (1 - final_volume / pre_hollow_volume) * 100) if pre_hollow_volume > 0 else 0
        total_time = time.time() - start_time

        report["success"] = True
        report["hollowed"] = {
            "dimensions_mm": [round(final_dims.x*1000, 2), round(final_dims.y*1000, 2), round(final_dims.z*1000, 2)],
            "volume_m3": round(final_volume, 8),
            "vertices": len(target.data.vertices),
            "faces": len(target.data.polygons),
            "stl_size_bytes": stl_size,
        }
        report["material_saved_percent"] = round(material_saved, 1)
        report["total_time"] = round(total_time, 2)

        log_separator("COMPLETE")
        log(f"Total time:       {total_time:.2f}s")
        log(f"Original volume:  {original_volume:.6f} m^3")
        log(f"Hollowed volume:  {final_volume:.6f} m^3")
        log(f"Material saved:   {material_saved:.1f}%")
        log(f"STL size:         {stl_size:,} bytes")
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
