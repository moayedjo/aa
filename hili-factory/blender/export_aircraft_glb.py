"""Export the Hili aircraft (one node per assembly part) to glTF binary for the web viewer."""
import sys, os, bpy
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import hili_aircraft as HA
bpy.ops.wm.read_factory_settings(use_empty=True)
r = HA.build_aircraft('solid')
# glTF can't carry Cycles-only glass; the web page swaps in its own x-ray material for the skin
out = os.path.join(HERE, '..', 'web', 'assets', 'hili_aircraft.glb'); os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True, export_cameras=False, export_lights=False, export_materials='EXPORT', export_image_format='AUTO', use_selection=False)
print('EXPORTED', out, os.path.getsize(out) / 1e6, 'MB')
