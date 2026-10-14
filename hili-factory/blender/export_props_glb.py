"""Export the detailed props for the web viewer: neutral-pose technician (animated by the page), cars, trucks, rack units."""
import sys, os, math, random, bpy
os.environ['SITE_LIGHT'] = '1'
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import hili_site as HS, hili_assets as AS
bpy.ops.wm.read_factory_settings(use_empty=True)
M = HS.materials(); C = HS.coll('Props')
AS.make_worker(M, C, 'Worker', 'vest_green', 'neutral', (0, 0, 0))
AS.make_car(M, C, 'CarSedan', 'car_white', 'sedan', (10, 0, 0))
AS.make_car(M, C, 'CarSUV', 'car_white', 'suv', (20, 0, 0))
AS.make_truck(M, C, 'TruckBox', (40, 0, 0), 0.0, False)
AS.make_truck(M, C, 'TruckSemi', (70, 0, 0), 0.0, True)
levels = (0.35, 2.55, 4.75)
rr = random.Random(5)
for v in range(4):
    r = AS.rack_unit(M, C, rr, 'Rack%d' % v, empty_slots={(z, 1, 0) for z in levels}); r.location = (v * 8 - 12, 20, 0)
out = os.path.join(HERE, '..', 'web', 'assets', 'hili_props.glb')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True, export_materials='EXPORT', use_selection=False)
print('EXPORTED', out, os.path.getsize(out) / 1e6, 'MB')
