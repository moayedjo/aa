"""Export the STATIC part of the site (terrain, yard, roads, hall, annex, trees, lamps, helipad, parked cars) to glTF binary.
Dynamic things (carts, workers, forklift, robot arms, conveyor, traffic, stations, warehouse racks) stay procedural in the web page."""
import sys, os, bpy
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import hili_site as HS
bpy.ops.wm.read_factory_settings(use_empty=True)
M = HS.materials()
C = HS.coll('Site')
HS.ground_and_roads(M, C); HS.hall(M, C); HS.trees(M, C); HS.lamps(M, C); HS.annex(M, C); HS.helipad(M, C)
for i in range(8):   # parked cars
    mats = ['car_white', 'car_red', 'car_slate', 'car_silver', 'car_green', 'car_white', 'car_slate', 'car_silver']
    import math
    HS.car(M, C, 'Parked%d' % i, mats[i], (86 + i * 4.4 + 1.6, -13.8 if i % 2 else -20.4, 0), math.pi / 2 * (1 if i % 2 else -1), 'suv' if i % 3 == 0 else 'sedan')
out = os.path.join(HERE, '..', 'web', 'assets', 'hili_site.glb'); os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True, export_materials='EXPORT', use_selection=False)
print('EXPORTED', out, os.path.getsize(out) / 1e6, 'MB')
