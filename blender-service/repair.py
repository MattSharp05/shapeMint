"""
Blender headless mesh repair script for SLS 3D printing.

Usage:
    blender --background --python repair.py -- <input.glb> <output.stl> <report.json> [options]

Options:
    --min-wall-thickness <float>   Minimum wall thickness in mm (default: 0.8)
    --auto-solidify <bool>         Apply solidify for thin walls (default: true)
    --voxel-fallback <bool>        Use voxel remesh if light repair fails (default: true)

Repair pipeline:
    1. Import GLB
    2. Join all mesh objects into one
    3. Remove loose geometry
    4. Merge close vertices (0.1mm threshold)
    5. Remove degenerate faces
    6. Recalculate normals outward
    7. Remove vertex outliers (extreme coordinates that cause spikes)
    8. Decimate to 100K faces (safe now that geometry is clean)
    9. Attempt manifold repair (fill holes, fix non-manifold edges)
    10. Check manifold status
    11. If still non-manifold and voxel_fallback → voxel remesh
    12. Check wall thickness against SLS minimum
    13. If thin walls and auto_solidify → apply Solidify modifier
    14. Final validation
    15. Export binary STL + write JSON report
"""

import bpy
import bmesh
import sys
import json
import os
import time
import math


def parse_args():
    """Parse arguments after the '--' separator."""
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        print("ERROR: No arguments provided after '--'", file=sys.stderr)
        sys.exit(1)

    if len(argv) < 3:
        print("ERROR: Expected at least 3 args: input_path output_path report_path", file=sys.stderr)
        sys.exit(1)

    args = {
        "input_path": argv[0],
        "output_path": argv[1],
        "report_path": argv[2],
        "min_wall_thickness": 0.8,
        "auto_solidify": True,
        "voxel_fallback": True,
    }

    i = 3
    while i < len(argv):
        if argv[i] == "--min-wall-thickness" and i + 1 < len(argv):
            args["min_wall_thickness"] = float(argv[i + 1])
            i += 2
        elif argv[i] == "--auto-solidify" and i + 1 < len(argv):
            args["auto_solidify"] = argv[i + 1].lower() in ("true", "1", "yes")
            i += 2
        elif argv[i] == "--voxel-fallback" and i + 1 < len(argv):
            args["voxel_fallback"] = argv[i + 1].lower() in ("true", "1", "yes")
            i += 2
        else:
            i += 1

    return args


def clear_scene():
    """Remove all default objects from the scene."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()


def import_glb(filepath):
    """Import a GLB/GLTF file into Blender."""
    bpy.ops.import_scene.gltf(filepath=filepath)


def join_all_meshes():
    """Select all mesh objects and join them into a single object."""
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not meshes:
        raise ValueError("No mesh objects found in the imported file")

    # Deselect everything
    bpy.ops.object.select_all(action='DESELECT')

    # Select all meshes and set first as active
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]

    # Join if multiple meshes
    if len(meshes) > 1:
        bpy.ops.object.join()

    obj = bpy.context.active_object

    # Apply all transforms so geometry is in world space
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    return obj


def remove_loose_geometry(obj):
    """Remove vertices and edges not connected to any face."""
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.delete_loose(use_verts=True, use_edges=True, use_faces=False)
    bpy.ops.object.mode_set(mode='OBJECT')


def merge_close_vertices(obj, threshold=0.0001):
    """Merge vertices within threshold distance (default 0.1mm)."""
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=threshold)
    bpy.ops.object.mode_set(mode='OBJECT')


def remove_degenerate_faces(obj):
    """Remove zero-area and degenerate geometry."""
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.dissolve_degenerate(threshold=0.0001)
    bpy.ops.object.mode_set(mode='OBJECT')


def recalculate_normals(obj):
    """Make normals consistent and point outward."""
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')


def count_non_manifold(obj):
    """Count non-manifold edges and vertices using bmesh."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    non_manifold_edges = sum(1 for e in bm.edges if not e.is_manifold)
    non_manifold_verts = sum(1 for v in bm.verts if not v.is_manifold)
    bm.free()
    return non_manifold_edges, non_manifold_verts


def check_manifold(obj):
    """Return True if the mesh is fully manifold."""
    edges, verts = count_non_manifold(obj)
    return edges == 0 and verts == 0


def attempt_manifold_repair(obj):
    """Try to make the mesh manifold by filling holes and fixing edges."""
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')

    # Pass 1: Select non-manifold geometry and try to fill holes
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.mesh.select_non_manifold(
        extend=False,
        use_wire=True,
        use_boundary=True,
        use_multi_face=True,
        use_non_contiguous=True,
        use_verts=True,
    )
    try:
        bpy.ops.mesh.fill_holes(sides=64)
    except RuntimeError:
        pass

    # Pass 2: Try edge-face add on remaining non-manifold
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.mesh.select_non_manifold(
        extend=False,
        use_wire=True,
        use_boundary=True,
        use_multi_face=False,
        use_non_contiguous=False,
        use_verts=False,
    )
    try:
        bpy.ops.mesh.edge_face_add()
    except RuntimeError:
        pass

    # Pass 3: Remove any interior faces that may have been created
    bpy.ops.mesh.select_all(action='SELECT')
    try:
        bpy.ops.mesh.delete_loose(use_verts=True, use_edges=True, use_faces=False)
    except RuntimeError:
        pass

    bpy.ops.object.mode_set(mode='OBJECT')


def voxel_remesh(obj, voxel_size=None):
    """
    Apply voxel remesh to guarantee a manifold mesh.
    Destructive but reliable — loses fine detail at low resolution.
    """
    if voxel_size is None:
        # Auto-calculate: ~0.5% of longest bounding box dimension
        dims = obj.dimensions
        longest = max(dims.x, dims.y, dims.z)
        # Clamp: at least 0.0005m (0.5mm), at most 0.005m (5mm)
        voxel_size = max(0.0005, min(longest * 0.005, 0.005))

    bpy.context.view_layer.objects.active = obj
    obj.data.remesh_voxel_size = voxel_size
    bpy.ops.object.voxel_remesh()

    return voxel_size


def check_wall_thickness(obj, min_thickness_m):
    """
    Approximate wall thickness check using ray casting.
    For each sampled vertex, cast a ray inward (negative normal).
    If it hits the opposite wall, that distance is the local wall thickness.

    Returns: (passed, min_found_m, thin_percentage)
    """
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.normal_update()

    thin_count = 0
    total_checked = 0
    min_found = float('inf')

    # Sample ~500 vertices for performance
    vert_count = len(bm.verts)
    sample_rate = max(1, vert_count // 500)

    # We need the object's evaluated depsgraph for ray_cast
    depsgraph = bpy.context.evaluated_depsgraph_get()
    obj_eval = obj.evaluated_get(depsgraph)

    for i, v in enumerate(bm.verts):
        if i % sample_rate != 0:
            continue
        total_checked += 1

        normal = v.normal
        if normal.length < 0.001:
            continue

        # Cast ray inward from slightly outside the surface
        origin = v.co + normal * 0.0001
        direction = -normal

        hit, location, _, _ = obj_eval.ray_cast(origin, direction, distance=min_thickness_m * 3)

        if hit:
            distance = (location - v.co).length
            min_found = min(min_found, distance)
            if distance < min_thickness_m:
                thin_count += 1

    bm.free()

    if total_checked == 0:
        return True, 0.0, 0.0

    thin_pct = (thin_count / total_checked) * 100
    # Allow up to 5% of sampled points below threshold
    passed = thin_pct < 5.0

    return passed, (min_found if min_found != float('inf') else 0.0), thin_pct


def apply_solidify(obj, thickness_m):
    """Apply Solidify modifier to give thin surfaces actual thickness."""
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new(name="Solidify_PrintRepair", type='SOLIDIFY')
    mod.thickness = thickness_m
    mod.offset = -1  # Grow inward
    mod.use_even_offset = True
    mod.use_quality_normals = True
    bpy.ops.object.modifier_apply(modifier="Solidify_PrintRepair")


def get_mesh_stats(obj):
    """Compute mesh statistics for the validation report."""
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.normal_update()

    # Volume (in m^3, Blender uses meters internally)
    try:
        volume = bm.calc_volume(signed=True)
    except Exception:
        volume = 0.0

    is_manifold = all(e.is_manifold for e in bm.edges)

    stats = {
        "face_count": len(bm.faces),
        "vertex_count": len(bm.verts),
        "edge_count": len(bm.edges),
        "volume_m3": volume,
        "volume_cm3": volume * 1e6,
        "is_manifold": is_manifold,
        "is_watertight": is_manifold and volume > 0,
    }

    bm.free()

    # Bounding box in mm
    dims = obj.dimensions
    stats["bounding_box_mm"] = {
        "x": round(dims.x * 1000, 2),
        "y": round(dims.y * 1000, 2),
        "z": round(dims.z * 1000, 2),
    }

    return stats


def remove_vertex_outliers(obj, multiplier=10.0):
    """
    Remove vertices that are extremely far from the mesh center.
    These outliers cause spike artifacts during decimation and export.
    Returns the number of vertices removed.
    """
    bm = bmesh.new()
    bm.from_mesh(obj.data)

    if len(bm.verts) == 0:
        bm.free()
        return 0

    # Compute bounding box center and max dimension
    coords = [v.co for v in bm.verts]
    min_co = [min(c[i] for c in coords) for i in range(3)]
    max_co = [max(c[i] for c in coords) for i in range(3)]
    center = [(min_co[i] + max_co[i]) / 2 for i in range(3)]
    max_dim = max(max_co[i] - min_co[i] for i in range(3))

    if max_dim <= 0:
        bm.free()
        return 0

    # Remove vertices more than multiplier * max_dim from center
    threshold = max_dim * multiplier
    to_remove = []
    for v in bm.verts:
        dist = math.sqrt(sum((v.co[i] - center[i]) ** 2 for i in range(3)))
        if dist > threshold:
            to_remove.append(v)

    if to_remove:
        bmesh.ops.delete(bm, geom=to_remove, context='VERTS')
        bm.to_mesh(obj.data)

    removed = len(to_remove)
    bm.free()
    return removed


def decimate_mesh(obj, max_faces=100000):
    """
    Decimate the mesh to reduce polygon count for 3D printing.
    Meshy models often have 500K+ faces; printers only need ~100K max.
    Returns the ratio used (or 1.0 if no decimation was needed).
    """
    face_count = len(obj.data.polygons)
    if face_count <= max_faces:
        print(f"Decimation skipped: {face_count} faces already under {max_faces} limit")
        return 1.0

    ratio = max_faces / face_count
    print(f"Decimating: {face_count} faces → target ~{max_faces} (ratio={ratio:.4f})")

    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new(name="Decimate_PrintOptimize", type='DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = ratio
    bpy.ops.object.modifier_apply(modifier="Decimate_PrintOptimize")

    new_count = len(obj.data.polygons)
    print(f"Decimation complete: {face_count} → {new_count} faces")
    return ratio


def export_stl(obj, filepath):
    """Export the mesh as a binary STL file."""
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    bpy.ops.export_mesh.stl(
        filepath=filepath,
        use_selection=True,
        ascii=False,
    )


def main():
    start_time = time.time()
    args = parse_args()

    input_path = args["input_path"]
    output_path = args["output_path"]
    report_path = args["report_path"]
    min_wall_mm = args["min_wall_thickness"]
    auto_solidify = args["auto_solidify"]
    voxel_fallback = args["voxel_fallback"]

    min_wall_m = min_wall_mm / 1000.0

    report = {
        "repair_steps_applied": [],
        "warnings": [],
        "print_ready": False,
        "used_voxel_remesh": False,
        "applied_solidify": False,
    }

    try:
        # Setup
        clear_scene()

        # Step 1: Import GLB
        print(f"Importing GLB: {input_path}")
        import_glb(input_path)
        report["repair_steps_applied"].append("imported_glb")

        # Step 2: Join all meshes
        obj = join_all_meshes()
        report["input_face_count"] = len(obj.data.polygons)
        report["input_vertex_count"] = len(obj.data.vertices)
        report["repair_steps_applied"].append("joined_meshes")
        print(f"Joined meshes: {report['input_face_count']} faces, {report['input_vertex_count']} vertices")

        # Step 3: Remove loose geometry (before decimation to prevent spike artifacts)
        remove_loose_geometry(obj)
        report["repair_steps_applied"].append("removed_loose_geometry")

        # Step 4: Merge close vertices
        merge_close_vertices(obj, threshold=0.0001)
        report["repair_steps_applied"].append("merged_close_vertices")

        # Step 5: Remove degenerate faces
        remove_degenerate_faces(obj)
        report["repair_steps_applied"].append("removed_degenerate_faces")

        # Step 6: Recalculate normals
        recalculate_normals(obj)
        report["repair_steps_applied"].append("recalculated_normals")

        # Step 7: Remove vertex outliers (catches extreme coordinates that cause spikes)
        outliers_removed = remove_vertex_outliers(obj)
        if outliers_removed > 0:
            report["repair_steps_applied"].append("removed_vertex_outliers")
            report["vertex_outliers_removed"] = outliers_removed
            print(f"Removed {outliers_removed} vertex outliers")

        print(f"After cleanup: {len(obj.data.polygons)} faces, {len(obj.data.vertices)} vertices")

        # Step 8: Decimate AFTER cleanup — geometry is now clean so decimation
        # won't create spike artifacts from stray vertices/degenerate faces
        pre_decimate_faces = len(obj.data.polygons)
        decimate_ratio = decimate_mesh(obj, max_faces=100000)
        if decimate_ratio < 1.0:
            report["repair_steps_applied"].append("decimated_mesh")
            report["decimate_ratio"] = round(decimate_ratio, 4)
            report["pre_decimate_face_count"] = pre_decimate_faces
            print(f"Decimated: {pre_decimate_faces} → {len(obj.data.polygons)} faces")

        # Step 9: Attempt manifold repair (now runs on reduced face count)
        attempt_manifold_repair(obj)
        report["repair_steps_applied"].append("attempted_manifold_repair")

        # Step 10: Check manifold status after light repair
        manifold_after_light = check_manifold(obj)
        report["is_manifold_after_light_repair"] = manifold_after_light
        nm_edges, nm_verts = count_non_manifold(obj)
        print(f"After light repair: manifold={manifold_after_light}, non-manifold edges={nm_edges}, verts={nm_verts}")

        # Step 11: Voxel remesh fallback if still non-manifold (runs on decimated mesh)
        if not manifold_after_light and voxel_fallback:
            print("Light repair insufficient — applying voxel remesh...")
            used_voxel_size = voxel_remesh(obj)
            report["repair_steps_applied"].append("voxel_remesh")
            report["used_voxel_remesh"] = True
            report["voxel_size_mm"] = round(used_voxel_size * 1000, 3)

            # Recalculate normals after remesh
            recalculate_normals(obj)

            manifold_after_remesh = check_manifold(obj)
            print(f"After voxel remesh: manifold={manifold_after_remesh}")
            if not manifold_after_remesh:
                report["warnings"].append(
                    "Mesh is still not fully manifold after voxel remesh"
                )

        # Step 12: Wall thickness check
        print(f"Checking wall thickness (min: {min_wall_mm}mm)...")
        wall_passed, min_wall_found_m, thin_pct = check_wall_thickness(obj, min_wall_m)
        report["min_wall_thickness_mm"] = round(min_wall_found_m * 1000, 3)
        report["wall_thickness_passed"] = wall_passed
        report["thin_wall_percentage"] = round(thin_pct, 2)
        print(f"Wall thickness: min={report['min_wall_thickness_mm']}mm, thin%={thin_pct:.1f}%, passed={wall_passed}")

        # Step 13: Apply solidify if thin walls detected
        if not wall_passed and auto_solidify:
            print(f"Applying solidify modifier (thickness: {min_wall_mm}mm)...")
            apply_solidify(obj, min_wall_m)
            report["repair_steps_applied"].append("applied_solidify")
            report["applied_solidify"] = True

            # Re-check wall thickness after solidify
            wall_passed_2, min_wall_2_m, thin_pct_2 = check_wall_thickness(obj, min_wall_m)
            report["min_wall_thickness_mm_after_solidify"] = round(min_wall_2_m * 1000, 3)
            report["wall_thickness_passed_after_solidify"] = wall_passed_2

            # Re-check manifold since solidify can break things
            if not check_manifold(obj):
                report["warnings"].append(
                    "Solidify modifier created non-manifold geometry — running repair again"
                )
                attempt_manifold_repair(obj)
                recalculate_normals(obj)

            # Use post-solidify values for final report
            wall_passed = wall_passed_2

        # Step 14: Final validation
        print("Running final validation...")
        final_stats = get_mesh_stats(obj)
        report["is_manifold"] = final_stats["is_manifold"]
        report["is_watertight"] = final_stats["is_watertight"]
        report["volume_cm3"] = round(final_stats["volume_cm3"], 4)
        report["bounding_box_mm"] = final_stats["bounding_box_mm"]
        report["output_face_count"] = final_stats["face_count"]
        report["output_vertex_count"] = final_stats["vertex_count"]

        # Determine overall print-readiness
        report["print_ready"] = (
            final_stats["is_manifold"]
            and final_stats["volume_cm3"] > 0
            and wall_passed
        )

        if not final_stats["is_manifold"]:
            report["warnings"].append("Mesh is not manifold — may cause print failures")
        if final_stats["volume_cm3"] <= 0:
            report["warnings"].append("Mesh has zero or negative volume — geometry may be inside-out")
        if not wall_passed:
            report["warnings"].append(
                f"Thin walls detected ({thin_pct:.1f}% of sampled points below {min_wall_mm}mm)"
            )

        # Step 15: Export binary STL
        print(f"Exporting STL: {output_path}")
        export_stl(obj, output_path)
        report["repair_steps_applied"].append("exported_stl")

        # File sizes
        report["input_file_size_bytes"] = os.path.getsize(input_path)
        report["output_file_size_bytes"] = os.path.getsize(output_path)

        print(f"Repair complete: print_ready={report['print_ready']}")

    except Exception as e:
        report["error"] = str(e)
        report["print_ready"] = False
        print(f"ERROR: {e}", file=sys.stderr)

    report["processing_time_seconds"] = round(time.time() - start_time, 2)

    # Write JSON report
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"Report written: {report_path}")


if __name__ == "__main__":
    main()
