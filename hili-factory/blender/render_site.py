"""Render stills of the Hili smart-factory site with Cycles.
   blender-python render_site.py -- <shot> [samples] [WxH] [out.png] [night]"""
import sys, os, math, bpy
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import hili_aircraft as HA, hili_site as HS
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
shot = args[0] if args else 'aerial'; samples = int(args[1]) if len(args) > 1 else 64
res = args[2] if len(args) > 2 else '1280x720'; out = args[3] if len(args) > 3 else os.path.join(HERE, 'renders', shot + '.png')
mode = args[4] if len(args) > 4 else 'day'
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
M = HS.materials()
site = HS.build_site(M)

def place(res_, loc, yaw=0.0, pitch=0.0, roll=0.0):
    e = res_['empty']; e.location = loc; e.rotation_euler = (roll, pitch, yaw)

# station 3: x-ray aircraft on its assembly cart
ghost = HA.build_aircraft('ghost'); place(ghost, (36, 0, 0.31))
cart = HS.Builder('AssemblyCart', [M['slate'], M['green']]); cart.box((36, 0, 0.2), (8.6, 3.8, 0.22)); cart.box((36, 1.88, 0.3), (8.6, 0.1, 0.08), m=1); cart.box((36, -1.88, 0.3), (8.6, 0.1, 0.08), m=1)
for sx in (-3.6, 3.6):
    for sy in (-1.5, 1.5): cart.cyl((36 + sx, sy, 0.1), 0.14, 0.14, m=0, axis='Y')
cart.finish(site, bevel=0.02)
# the finished aircraft on the VTOL pad (hovering during the landing)
solid = HA.build_aircraft('solid')
hover = shot in ('helipad', 'landing', 'hero')
place(solid, (98, 6, 4.2 if hover else 0.55), yaw=math.radians(25 if hover else 0))
if hover:
    sc.frame_start, sc.frame_end, sc.frame_current = 0, 2, 1
    for key, piv in solid['rotors'].items():
        piv.rotation_euler = (0, 0, 0); piv.keyframe_insert('rotation_euler', frame=0)
        piv.rotation_euler = (0, 0, (1 if (hash(key) % 2) else -1) * 3.2); piv.keyframe_insert('rotation_euler', frame=2)
        for fc in piv.animation_data.action.fcurves if hasattr(piv.animation_data.action, 'fcurves') else []:
            for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
    sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = 0.5

# lighting
if mode == 'night':
    HS.sky_and_sun(-4, -35, 0.12)
else:
    HS.sky_and_sun(float(os.environ.get('SUN', '30')), -50, 1.0)
HS.hall_lights(site)

# cameras
CAM = {
 'aerial':    ((-52, -105, 78), (42, 2, 3), 30),
 'hall':      ((12, -15, 4.0), (40, 0, 2.2), 24),
 'closeup':   ((29, -7.5, 3.0), (36, 0, 1.6), 42),
 'warehouse': ((-8, -9, 3.2), (-30, 6, 2.5), 22),
 'helipad':   ((84, -12, 3.2), (98, 6, 4.6), 38),
 'hero':      ((122, -58, 28), (82, 4, 3), 30),
 'road':      ((-6, -62, 3.0), (50, -42, 1.6), 32),
 'trucks':    ((60, -56, 2.4), (85, -42, 1.8), 40),
 'noon':      ((-40, -90, 60), (40, 0, 3), 30),
 'people':    ((29.5, -3.8, 1.5), (26.5, -8.1, 1.2), 55),
 'cars':      ((6, -52, 1.6), (18, -41, 1.4), 45),
 'racks':     ((-14, -2.5, 2.2), (-30, 5.5, 2.2), 32),
}
loc, tgt, f = CAM.get(shot, CAM['aerial'])
cam = bpy.data.cameras.new('Cam'); co = bpy.data.objects.new('Cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = loc; cam.lens = f; co.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
cam.dof.use_dof = shot in ('closeup', 'helipad', 'trucks'); cam.dof.focus_distance = (Vector(tgt) - Vector(loc)).length; cam.dof.aperture_fstop = 4.0

sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 8; sc.cycles.transmission_bounces = 10; sc.cycles.transparent_max_bounces = 16; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.02
sc.cycles.sample_clamp_indirect = 8
w, h = map(int, res.split('x')); sc.render.resolution_x, sc.render.resolution_y = w, h; sc.render.resolution_percentage = 100
sc.view_settings.view_transform = 'AgX'; sc.view_settings.exposure = float(os.environ.get('EXPOSURE', '-1.6'))
for look in ('AgX - Medium High Contrast', 'Medium High Contrast'):
    try:
        sc.view_settings.look = look; break
    except TypeError:
        pass
sc.render.filepath = out; sc.render.image_settings.file_format = 'PNG'
bpy.ops.render.render(write_still=True)
if '--save-blend' in sys.argv:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'Hili_Factory.blend'))
try:
    import grade as G
    raw = out.replace('.png', '_raw.png'); os.replace(out, raw); G.grade(raw, out); os.remove(raw)
except Exception as e:   # grading is optional
    print('grade skipped:', e)
print('RENDERED', out)
