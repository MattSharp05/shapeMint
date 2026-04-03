"""
Blender headless model hollowing script for 3D printing.

Based on the BlendShell algorithm (MIT license, github.com/oormicreations/BlendShell).
Adapted for headless operation with automatic seed placement and CLI arguments.

Usage:
    blender --background --python hollow.py -- <input> <output> <report.json> [options]

Options:
    --wall-thickness <float>    Shell wall thickness in mm (default: 2.0)
    --drain-holes <int>         Number of drain holes (default: 2, 0 to disable)
    --hole-diameter <float>     Drain hole diameter in mm (default: 3.0)
    --iterations <int>          Max expansion iterations (default: 300)
    --step-size <float>         Expansion step per iteration in mm (default: 0.2)
    --max-triangle-area <float> Max triangle area before subdivision (default: 2.0)
    --seed-subdivisions <int>   Icosphere subdivision level (default: 3)

Algorithm:
    1. Import model (GLB or STL)
    2. Join all mesh objects, clean up
    3. Calculate bounding box center and auto-size seed
    4. Create icosphere seed inside the model
    5. Iteratively expand seed outward:
       - For each unfrozen vertex, find closest point on target surface
       - If distance > wall thickness, move vertex along normal by step size
       - If distance <= wall thickness, freeze vertex
       - Subdivide large triangles to maintain mesh density
       - Smooth to prevent artifacts
       - Volume safety check
    6. Flip normals on seed (becomes inner wall)
    7. Join seed to original model
    8. Boolean-subtract drain hole cylinders
    9. Export hollowed model as STL + JSON report
"""

import bpy
import bmesh
import sys
import json
import os
import time
import math
from mathutils import Vector


def log(msg, level="INFO"):
    """Structured logging with timestamp and level."""
    ts = time.strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}", flush=True)


def log_separator(title=""):
    """Print a visual separator for log sections."""
    if title:
        print(f"\n{'='*60}", flush=True)
        print(f"  {title}", flush=True)
        print(f"{'='*60}", flush=True)
    else:
        print(f"{'─'*60}", flush=True)


# ── Argument parsing ─────────────────────────────────────────────────────

def parse_args():
    """Parse arguments after the '--' separator."""
    argv = sys.argv
    log(f"Raw argv: {argv}")

    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        log("No arguments provided after '--'", "ERROR")
        sys.exit(1)

    if len(argv) < 3:
        log(f"Expected at least 3 args, got {len(argv)}: {argv}", "ERROR")
        sys.exit(1)

    args = {
        "input_path": argv[0],
        "output_path": argv[1],
        "report_path": argv[2],
        "wall_thickness": 2.0,
        "drain_holes": 2,
        "hole_diameter": 3.0,
        "iterations": 300,
        "step_size": 0.2,
        "max_triangle_area": 2.0,
        "seed_subdivisions": 3,
    }

    i = 3
    while i < len(argv):
        key = argv[i]
        if i + 1 < len(argv):
            val = argv[i + 1]
            if key == "--wall-thickness":
                args["wall_thickness"] = float(val)
            elif key == "--drain-holes":
                args["drain_holes"] = int(val)
            elif key == "--hole-diameter":
                args["hole_diameter"] = float(val)
            elif key == "--iterations":
                args["iterations"] = int(val)
            elif key == "--step-size":
                args["step_size"] = float(val)
            elif key == "--max-triangle-area":
                args["max_triangle_area"] = float(val)
            elif key == "--seed-subdivisions":
                args["seed_subdivisions"] = int(val)
            else:
                log(f"Unknown argument: {key}", "WARN")
                i += 1
                continue
            log(f"  Parsed: {key} = {val}")
            i += 2
        else:
            log(f"Argument {key} has no value, skipping", "WARN")
            i += 1

    return args


# ── Scene helpers ────────────────────────────────────────────────────────

def clear_scene():
    """Remove all default objects from the scene."""
    obj_count = len(bpy.context.scene.objects)
    log(f"Clearing scene ({obj_count} objects)")
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    log(f"Scene cleared, {len(bpy.context.scene.objects)} objects remaining")


def import_model(path):
    """Import a GLB or STL file and return the active object."""
    ext = os.path.splitext(path)[1].lower()
    file_size = os.path.getsize(path)
    log(f"Importing model: {path}")
    log(f"  File format: {ext}")
    log(f"  File size: {file_size:,} bytes ({file_size/1024/1024:.1f} MB)")

    import_start = time.time()

    if ext in ('.glb', '.gltf'):
        log("  Using glTF importer")
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == '.stl':
        log("  Using STL importer")
        bpy.ops.import_mesh.stl(filepath=path)
    elif ext == '.obj':
        log("  Using OBJ importer")
        bpy.ops.wm.obj_import(filepath=path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    import_time = time.time() - import_start
    log(f"  Import took {import_time:.2f}s")

    # List all objects in scene
    all_objects = list(bpy.context.scene.objects)
    log(f"  Scene objects after import: {len(all_objects)}")
    for obj in all_objects:
        log(f"    - {obj.name} (type={obj.type}, verts={len(obj.data.vertices) if obj.type == 'MESH' else 'N/A'})")

    # Select all mesh objects and join them
    mesh_objects = [obj for obj in all_objects if obj.type == 'MESH']
    if not mesh_objects:
        raise ValueError("No mesh objects found in imported file")

    log(f"  Found {len(mesh_objects)} mesh objects")

    bpy.ops.object.select_all(action='DESELECT')
    for obj in mesh_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objects[0]

    if len(mesh_objects) > 1:
        log(f"  Joining {len(mesh_objects)} mesh objects into one")
        bpy.ops.object.join()

    target = bpy.context.active_object
    target.name = "Target"

    # Apply transforms
    log("  Applying transforms (location, rotation, scale)")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    log(f"  Final target: {len(target.data.vertices):,} vertices, {len(target.data.polygons):,} faces")
    return target


def get_model_info(obj):
    """Get bounding box center, dimensions, and volume."""
    log("Calculating model bounding box and volume...")
    bme = bmesh.new()
    bme.from_mesh(obj.data)
    bme.transform(obj.matrix_world)

    volume = bme.calc_volume()
    log(f"  Raw volume from bmesh: {volume:.4f}")

    # Calculate bounding box from vertices
    coords = [v.co for v in bme.verts]
    if not coords:
        bme.free()
        raise ValueError("Mesh has no vertices")

    min_co = Vector((min(c.x for c in coords), min(c.y for c in coords), min(c.z for c in coords)))
    max_co = Vector((max(c.x for c in coords), max(c.y for c in coords), max(c.z for c in coords)))

    center = (min_co + max_co) / 2.0
    dimensions = max_co - min_co

    log(f"  Bounding box min: ({min_co.x:.3f}, {min_co.y:.3f}, {min_co.z:.3f})")
    log(f"  Bounding box max: ({max_co.x:.3f}, {max_co.y:.3f}, {max_co.z:.3f})")
    log(f"  Center: ({center.x:.3f}, {center.y:.3f}, {center.z:.3f})")
    log(f"  Dimensions: {dimensions.x:.3f} x {dimensions.y:.3f} x {dimensions.z:.3f}")
    log(f"  Volume: {abs(volume):.4f}")
    log(f"  Vertex count: {len(coords):,}")

    bme.free()
    return center, dimensions, abs(volume)


# ── Core hollowing algorithm ─────────────────────────────────────────────

def create_seed(center, dimensions, subdivisions):
    """Create an icosphere seed inside the model."""
    log("Creating seed mesh...")
    min_dim = min(dimensions.x, dimensions.y, dimensions.z)
    max_dim = max(dimensions.x, dimensions.y, dimensions.z)
    seed_radius = min_dim * 0.15  # 30% of smallest dim -> radius is half

    # Ensure a minimum seed size
    seed_radius = max(seed_radius, 0.5)

    log(f"  Model smallest dimension: {min_dim:.3f}")
    log(f"  Model largest dimension: {max_dim:.3f}")
    log(f"  Seed radius: {seed_radius:.3f} (30% of smallest dim / 2)")
    log(f"  Seed center: ({center.x:.3f}, {center.y:.3f}, {center.z:.3f})")
    log(f"  Seed subdivisions: {subdivisions}")

    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
        radius=seed_radius,
        location=center,
    )
    seed = bpy.context.active_object
    seed.name = "Seed"

    log(f"  Seed created: {len(seed.data.vertices):,} vertices, {len(seed.data.polygons):,} faces")
    return seed


def expand_shell(seed, target, wall_thickness, step_size, max_triangle_area, iterations):
    """Iteratively expand the seed toward the target surface."""
    log_separator("Shell Expansion")

    # Validate
    if step_size >= wall_thickness:
        raise ValueError(f"Step size ({step_size}) must be less than wall thickness ({wall_thickness})")

    # Get target volume for safety check
    target_bme = bmesh.new()
    target_bme.from_mesh(target.data)
    target_volume = abs(target_bme.calc_volume())
    target_bme.free()

    log(f"Target volume: {target_volume:.2f}")
    log(f"Parameters:")
    log(f"  Wall thickness: {wall_thickness}mm")
    log(f"  Step size: {step_size}mm")
    log(f"  Max triangle area: {max_triangle_area}")
    log(f"  Max iterations: {iterations}")
    log(f"  Estimated iterations to reach wall: ~{int(wall_thickness / step_size * 2)}")
    log(f"Starting expansion loop...")

    frozen = set()
    expand_start = time.time()
    subdivisions_done = 0
    total_faces_added = 0
    min_dist_seen = float('inf')
    max_dist_seen = 0

    for it in range(iterations):
        iter_start = time.time()
        total_verts = len(seed.data.vertices)

        # Detailed progress logging every 10 iterations
        if it % 10 == 0:
            pct = len(frozen) / total_verts * 100 if total_verts > 0 else 0
            elapsed = time.time() - expand_start
            rate = it / elapsed if elapsed > 0 else 0
            remaining_iters = iterations - it
            eta = remaining_iters / rate if rate > 0 else 0
            log(f"  [Iter {it:>4}/{iterations}] frozen={len(frozen):>6}/{total_verts} ({pct:>5.1f}%) | "
                f"elapsed={elapsed:.1f}s | rate={rate:.1f} iter/s | ETA={eta:.0f}s")
            if min_dist_seen < float('inf'):
                log(f"    Distance range this batch: min={min_dist_seen:.4f} max={max_dist_seen:.4f}")
            min_dist_seen = float('inf')
            max_dist_seen = 0

        all_frozen = True
        moved_count = 0
        frozen_this_iter = 0

        # Expand unfrozen vertices
        for v in seed.data.vertices:
            if v.index in frozen:
                continue

            all_frozen = False
            result = target.closest_point_on_mesh(v.co)
            if result[0]:  # hit
                loc = result[1]
                dist = (loc - v.co).length
                min_dist_seen = min(min_dist_seen, dist)
                max_dist_seen = max(max_dist_seen, dist)
                if dist > wall_thickness:
                    v.co += step_size * v.normal
                    moved_count += 1
                else:
                    frozen.add(v.index)
                    frozen_this_iter += 1

        if all_frozen:
            log(f"  *** All {total_verts} vertices converged at iteration {it} ***")
            break

        # Log first few iterations in detail
        if it < 5:
            log(f"    Iter {it}: moved={moved_count}, newly_frozen={frozen_this_iter}, "
                f"time={time.time()-iter_start:.3f}s")

        # Subdivide large triangles periodically (every 5 iterations)
        if it % 5 == 0 and it > 0:
            bpy.ops.object.select_all(action='DESELECT')
            seed.select_set(True)
            bpy.context.view_layer.objects.active = seed
            bpy.ops.object.mode_set(mode='EDIT')

            bm = bmesh.from_edit_mesh(seed.data)
            bm.verts.ensure_lookup_table()
            bm.faces.ensure_lookup_table()

            faces_before = len(bm.faces)
            large_faces = [f for f in bm.faces if f.calc_area() > max_triangle_area]
            if large_faces:
                bmesh.ops.poke(bm, faces=large_faces)
                bmesh.update_edit_mesh(seed.data)
                bpy.ops.mesh.beautify_fill()
                subdivisions_done += 1

            bpy.ops.object.mode_set(mode='OBJECT')

            faces_after = len(seed.data.polygons)
            new_faces = faces_after - faces_before
            if new_faces > 0:
                total_faces_added += new_faces
                log(f"    Subdivision at iter {it}: {len(large_faces)} large faces split, "
                    f"{faces_before}→{faces_after} faces (+{new_faces})")

        # Volume safety check every 25 iterations
        if it % 25 == 0 and it > 0:
            seed_bme = bmesh.new()
            seed_bme.from_mesh(seed.data)
            seed_vol = abs(seed_bme.calc_volume())
            seed_bme.free()
            vol_pct = seed_vol / target_volume * 100 if target_volume > 0 else 0
            log(f"    Volume check at iter {it}: seed={seed_vol:.2f} ({vol_pct:.1f}% of target)")
            if seed_vol > target_volume:
                log(f"  WARNING: Seed volume exceeded target! Stopping expansion.", "WARN")
                break

    # Final smooth
    log("Applying final smoothing (4 iterations)...")
    bpy.ops.object.select_all(action='DESELECT')
    seed.select_set(True)
    bpy.context.view_layer.objects.active = seed
    bpy.ops.object.modifier_add(type='SMOOTH')
    bpy.context.object.modifiers["Smooth"].iterations = 4
    bpy.ops.object.modifier_apply(modifier="Smooth")

    total_verts = len(seed.data.vertices)
    total_faces = len(seed.data.polygons)
    converged = len(frozen) == total_verts
    total_time = time.time() - expand_start

    log_separator("Expansion Summary")
    log(f"  Iterations completed: {it + 1}/{iterations}")
    log(f"  Converged: {converged}")
    log(f"  Frozen vertices: {len(frozen):,}/{total_verts:,} ({len(frozen)/total_verts*100:.1f}%)")
    log(f"  Subdivisions performed: {subdivisions_done}")
    log(f"  Total faces added by subdivision: {total_faces_added:,}")
    log(f"  Final seed mesh: {total_verts:,} verts, {total_faces:,} faces")
    log(f"  Total expansion time: {total_time:.1f}s")

    return it + 1, converged


def flip_and_attach(seed, target):
    """Flip seed normals and join to target to create hollow shell."""
    log("Flipping seed normals...")
    seed_verts = len(seed.data.vertices)
    seed_faces = len(seed.data.polygons)
    target_verts = len(target.data.vertices)
    target_faces = len(target.data.polygons)
    log(f"  Seed: {seed_verts:,} verts, {seed_faces:,} faces")
    log(f"  Target: {target_verts:,} verts, {target_faces:,} faces")

    bpy.ops.object.select_all(action='DESELECT')
    seed.select_set(True)
    bpy.context.view_layer.objects.active = seed

    # Flip normals
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.flip_normals()
    bpy.ops.object.mode_set(mode='OBJECT')
    log("  Normals flipped on seed")

    # Join seed into target
    log("  Joining seed into target...")
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.join()

    combined_verts = len(target.data.vertices)
    combined_faces = len(target.data.polygons)
    log(f"  Combined mesh: {combined_verts:,} verts, {combined_faces:,} faces")
    log(f"  (Expected: ~{seed_verts + target_verts:,} verts, ~{seed_faces + target_faces:,} faces)")

    return target


def drill_holes(target, num_holes, hole_diameter, model_center, model_dimensions):
    """Create and boolean-subtract drain holes from the bottom of the model."""
    if num_holes <= 0:
        log("Drain holes: DISABLED (num_holes=0)")
        return

    log_separator("Drilling Drain Holes")

    # Place holes on the bottom face of the model
    drill_length = model_dimensions.z * 1.2  # slightly longer than model height
    drill_radius = hole_diameter / 2.0

    log(f"  Number of holes: {num_holes}")
    log(f"  Hole diameter: {hole_diameter}mm (radius={drill_radius}mm)")
    log(f"  Drill length: {drill_length:.1f}mm (120% of model Z height)")
    log(f"  Model center: ({model_center.x:.2f}, {model_center.y:.2f}, {model_center.z:.2f})")

    # Spread holes evenly along the X axis at the bottom
    if num_holes == 1:
        positions = [model_center.x]
    else:
        spread = model_dimensions.x * 0.4  # 40% of width
        positions = [
            model_center.x - spread / 2 + spread * i / (num_holes - 1)
            for i in range(num_holes)
        ]

    log(f"  Hole X positions: {[f'{p:.2f}' for p in positions]}")

    target_faces_before = len(target.data.polygons)

    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.context.view_layer.objects.active = target

    for i, x_pos in enumerate(positions):
        drill_start = time.time()
        log(f"  Hole {i+1}/{num_holes}: x={x_pos:.2f}")

        # Create drill cylinder pointing up through the bottom
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=24,
            radius=drill_radius,
            depth=drill_length,
            location=(x_pos, model_center.y, model_center.z),
        )
        drill = bpy.context.active_object
        drill.name = f"Drill.{i:03d}"
        log(f"    Created drill cylinder: {len(drill.data.vertices)} verts")

        # Apply boolean difference
        bpy.ops.object.select_all(action='DESELECT')
        target.select_set(True)
        bpy.context.view_layer.objects.active = target

        faces_before = len(target.data.polygons)
        mod = target.modifiers.new(name=f"Drill_{i}", type='BOOLEAN')
        mod.object = drill
        mod.operation = 'DIFFERENCE'

        log(f"    Applying boolean DIFFERENCE...")
        bpy.ops.object.modifier_apply(modifier=mod.name)
        faces_after = len(target.data.polygons)

        # Delete the drill cylinder
        bpy.ops.object.select_all(action='DESELECT')
        drill.select_set(True)
        bpy.ops.object.delete()

        drill_time = time.time() - drill_start
        log(f"    Done: {faces_before}→{faces_after} faces ({faces_after-faces_before:+d}), took {drill_time:.2f}s")

    # Reselect target
    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.context.view_layer.objects.active = target

    total_faces_after = len(target.data.polygons)
    log(f"  All {num_holes} holes drilled: {target_faces_before}→{total_faces_after} total faces")


def export_stl(obj, output_path):
    """Export the object as a binary STL."""
    log(f"Exporting STL to: {output_path}")

    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    log(f"  Object: {len(obj.data.vertices):,} verts, {len(obj.data.polygons):,} faces")

    export_start = time.time()
    # Blender 4.0 uses export_mesh.stl, 4.1+ uses wm.stl_export
    if bpy.app.version >= (4, 1, 0):
        bpy.ops.wm.stl_export(
            filepath=output_path,
            export_selected_objects=True,
            ascii_format=False,
        )
    else:
        bpy.ops.export_mesh.stl(
            filepath=output_path,
            use_selection=True,
            ascii=False,
        )
    export_time = time.time() - export_start
    size = os.path.getsize(output_path)
    log(f"  Export complete: {size:,} bytes ({size/1024/1024:.2f} MB) in {export_time:.2f}s")
    return size


# ── Main ─────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    log_separator("ShapeMint Model Hollowing")
    log(f"Blender version: {bpy.app.version_string}")
    log(f"Input:            {args['input_path']}")
    log(f"Output:           {args['output_path']}")
    log(f"Report:           {args['report_path']}")
    log(f"Wall thickness:   {args['wall_thickness']}mm")
    log(f"Drain holes:      {args['drain_holes']} x {args['hole_diameter']}mm")
    log(f"Iterations:       {args['iterations']}")
    log(f"Step size:        {args['step_size']}mm")
    log(f"Max tri area:     {args['max_triangle_area']}")
    log(f"Seed subdivisions: {args['seed_subdivisions']}")

    # Verify input exists
    if not os.path.exists(args['input_path']):
        log(f"Input file does not exist: {args['input_path']}", "ERROR")
        sys.exit(1)

    start_time = time.time()
    report = {
        "success": False,
        "input_file": os.path.basename(args["input_path"]),
        "input_size_bytes": os.path.getsize(args["input_path"]),
        "params": {
            "wall_thickness": args["wall_thickness"],
            "drain_holes": args["drain_holes"],
            "hole_diameter": args["hole_diameter"],
            "iterations": args["iterations"],
            "step_size": args["step_size"],
            "max_triangle_area": args["max_triangle_area"],
            "seed_subdivisions": args["seed_subdivisions"],
        },
        "steps": {},
    }

    try:
        # Step 1: Clear and import
        log_separator("Step 1/7: Import Model")
        step_start = time.time()
        clear_scene()
        target = import_model(args["input_path"])
        step_time = time.time() - step_start
        report["steps"]["import"] = {"time_seconds": round(step_time, 2), "status": "ok"}
        log(f"Step 1 complete in {step_time:.2f}s")

        # Step 2: Analyze model
        log_separator("Step 2/7: Analyze Model")
        step_start = time.time()
        center, dimensions, volume = get_model_info(target)
        step_time = time.time() - step_start

        report["original"] = {
            "dimensions": [round(dimensions.x, 3), round(dimensions.y, 3), round(dimensions.z, 3)],
            "volume": round(volume, 4),
            "vertices": len(target.data.vertices),
            "faces": len(target.data.polygons),
            "center": [round(center.x, 3), round(center.y, 3), round(center.z, 3)],
        }
        report["steps"]["analyze"] = {"time_seconds": round(step_time, 2), "status": "ok"}
        log(f"Step 2 complete in {step_time:.2f}s")

        # Step 3: Create seed
        log_separator("Step 3/7: Create Seed Mesh")
        step_start = time.time()
        seed = create_seed(center, dimensions, args["seed_subdivisions"])
        step_time = time.time() - step_start

        report["seed"] = {
            "vertices": len(seed.data.vertices),
            "faces": len(seed.data.polygons),
        }
        report["steps"]["create_seed"] = {"time_seconds": round(step_time, 2), "status": "ok"}
        log(f"Step 3 complete in {step_time:.2f}s")

        # Step 4: Expand shell
        log_separator("Step 4/7: Expand Shell")
        step_start = time.time()
        iters_done, converged = expand_shell(
            seed, target,
            wall_thickness=args["wall_thickness"],
            step_size=args["step_size"],
            max_triangle_area=args["max_triangle_area"],
            iterations=args["iterations"],
        )
        step_time = time.time() - step_start

        report["expansion"] = {
            "iterations_completed": iters_done,
            "converged": converged,
            "time_seconds": round(step_time, 2),
            "seed_final_vertices": len(seed.data.vertices),
            "seed_final_faces": len(seed.data.polygons),
        }
        report["steps"]["expand"] = {
            "time_seconds": round(step_time, 2),
            "status": "ok" if converged else "partial",
        }
        log(f"Step 4 complete in {step_time:.2f}s")

        # Step 5: Flip and attach
        log_separator("Step 5/7: Flip & Attach")
        step_start = time.time()
        result_obj = flip_and_attach(seed, target)
        step_time = time.time() - step_start
        report["steps"]["flip_attach"] = {"time_seconds": round(step_time, 2), "status": "ok"}
        log(f"Step 5 complete in {step_time:.2f}s")

        # Step 6: Drill holes
        log_separator("Step 6/7: Drill Holes")
        step_start = time.time()
        drill_holes(result_obj, args["drain_holes"], args["hole_diameter"], center, dimensions)
        step_time = time.time() - step_start
        report["steps"]["drill"] = {
            "time_seconds": round(step_time, 2),
            "status": "ok" if args["drain_holes"] > 0 else "skipped",
        }
        log(f"Step 6 complete in {step_time:.2f}s")

        # Step 7: Export
        log_separator("Step 7/7: Export STL")
        step_start = time.time()
        stl_size = export_stl(result_obj, args["output_path"])
        step_time = time.time() - step_start
        report["steps"]["export"] = {"time_seconds": round(step_time, 2), "status": "ok"}
        log(f"Step 7 complete in {step_time:.2f}s")

        # Final metrics
        final_bme = bmesh.new()
        final_bme.from_mesh(result_obj.data)
        final_volume = abs(final_bme.calc_volume())
        final_bme.free()

        total_time = time.time() - start_time
        material_saved = max(0, (1 - final_volume / volume) * 100) if volume > 0 else 0

        report["success"] = True
        report["hollowed"] = {
            "vertices": len(result_obj.data.vertices),
            "faces": len(result_obj.data.polygons),
            "volume": round(final_volume, 4),
            "stl_size_bytes": stl_size,
        }
        report["material_saved_percent"] = round(material_saved, 1)
        report["total_time_seconds"] = round(total_time, 2)

        log_separator("HOLLOWING COMPLETE")
        log(f"Total time:        {total_time:.2f}s")
        log(f"Original volume:   {volume:.4f}")
        log(f"Hollowed volume:   {final_volume:.4f}")
        log(f"Material saved:    {material_saved:.1f}%")
        log(f"Original mesh:     {report['original']['vertices']:,} verts, {report['original']['faces']:,} faces")
        log(f"Hollowed mesh:     {len(result_obj.data.vertices):,} verts, {len(result_obj.data.polygons):,} faces")
        log(f"STL file size:     {stl_size:,} bytes ({stl_size/1024/1024:.2f} MB)")
        log(f"Converged:         {converged}")
        log(f"Drain holes:       {args['drain_holes']}")

        # Per-step timing breakdown
        log("")
        log("Step timing breakdown:")
        for step_name, step_data in report["steps"].items():
            log(f"  {step_name:.<20s} {step_data['time_seconds']:.2f}s ({step_data['status']})")

    except Exception as e:
        total_time = time.time() - start_time
        log(f"FATAL ERROR after {total_time:.2f}s: {e}", "ERROR")
        import traceback
        traceback.print_exc(file=sys.stderr)
        report["error"] = str(e)
        report["error_type"] = type(e).__name__
        report["total_time_seconds"] = round(total_time, 2)

    # Write report
    with open(args["report_path"], "w") as f:
        json.dump(report, f, indent=2)
    log(f"Report written to: {args['report_path']}")
    log(f"Report contents: {json.dumps(report, indent=2)}")


if __name__ == "__main__":
    main()
