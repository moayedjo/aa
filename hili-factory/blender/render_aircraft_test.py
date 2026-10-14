import sys, os, math, bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, hili_aircraft; importlib.reload(hili_aircraft)
from mathutils import Vector
skin = sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'solid'
view = sys.argv[sys.argv.index('--')+2] if '--' in sys.argv else '34'
out = sys.argv[sys.argv.index('--')+3] if '--' in sys.argv else '/tmp/ac.png'
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
res = hili_aircraft.build_aircraft(skin)
# studio: floor + HDRI-less sky + softboxes
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.82, 0.86, 0.9, 1); bg.inputs['Strength'].default_value = 0.9
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, 0)); fl = bpy.context.object
fm = bpy.data.materials.new('Floor'); fm.use_nodes = True; fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.8, 0.82, 0.83, 1); fm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.35
fl.data.materials.append(fm)
def area(loc, size, e):
    bpy.ops.object.light_add(type='AREA', location=loc); l = bpy.context.object; l.data.size = size; l.data.energy = e
    d = (Vector((0, 0, 1.5)) - Vector(loc)); l.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
area((8, -9, 9), 8, 2600); area((-9, 8, 7), 6, 1400); area((0, 0, 12), 10, 1200)
cam = bpy.data.cameras.new('Cam'); co = bpy.data.objects.new('Cam', cam); sc.collection.objects.link(co); sc.camera = co
V = {'34': ((9.5, -10.5, 5.2), (0.2, 0, 1.5), 42), 'side': ((-0.5, -36, 1.5), (-0.5, 0, 1.5), 40), 'top': ((-0.5, 0.01, 40), (-0.5, 0, 0), 44), 'front': ((40, 0, 1.5), (0, 0, 1.5), 42), 'rear34': ((-9.5, 10, 4.8), (-0.5, 0, 1.6), 42), 'ghost': ((8.5, -8.5, 3.6), (0.2, 0, 1.4), 42)}
loc, tgt, f = V[view]
co.location = loc; cam.lens = 55
co.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
if view in ('side', 'front'): cam.lens = 85
if view == 'top': cam.lens = 85
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = int(os.environ.get('SAMPLES', '40')); sc.cycles.use_denoising = True
sc.render.resolution_x = 1280; sc.render.resolution_y = 720; sc.render.filepath = out
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast' if 'AgX - Medium High Contrast' in [] else 'None'
sc.cycles.max_bounces = 8; sc.cycles.transmission_bounces = 10; sc.cycles.transparent_max_bounces = 16
bpy.ops.render.render(write_still=True)
print('RENDERED', out)
