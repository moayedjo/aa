"""Hili smart-factory site for Blender (units: metres; +X east, +Y north, +Z up).
Layout mirrors the interactive web scene: warehouse x -46..-6, assembly hall x -4..80 (5 stations on y=0, x = 8,22,36,50,64),
VTOL pad at (98, 6), access road along y = -42, parking lot east of the hall.
"""
import math
import os
import random
import bpy
import bmesh
import hili_assets as AS
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
LIGHT = bool(os.environ.get('SITE_LIGHT'))   # web export: smaller meshes and plain PBR materials (glTF cannot carry procedural nodes)
SX = (8, 22, 36, 50, 64)


# ----------------------------------------------------------------------------- generic builders
class Builder:
    """Collects many primitives into ONE mesh (with several material slots) — keeps the scene light."""

    def __init__(self, name, mats):
        self.name, self.bm, self.mats = name, bmesh.new(), list(mats)

    def _tag(self, n0, mi):
        self.bm.faces.ensure_lookup_table()
        for f in self.bm.faces[n0:]:
            f.material_index = mi

    def box(self, c, s, rz=0.0, m=0, rx=0.0):
        n0 = len(self.bm.faces)
        M = Matrix.Translation(c) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(rx, 4, 'X') @ Matrix.Diagonal((s[0], s[1], s[2], 1.0))
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=M)
        self._tag(n0, m)

    def cyl(self, c, r, h, m=0, axis='Z', seg=32, r2=None):
        n0 = len(self.bm.faces)
        rot = {'Z': Matrix.Identity(4), 'X': Matrix.Rotation(math.pi / 2, 4, 'Y'), 'Y': Matrix.Rotation(math.pi / 2, 4, 'X')}[axis]
        bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, matrix=Matrix.Translation(c) @ rot)
        self._tag(n0, m)

    def sphere(self, c, s, m=0, seg=20):
        n0 = len(self.bm.faces)
        bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(6, seg // 2), radius=1.0, matrix=Matrix.Translation(c) @ Matrix.Diagonal((s[0], s[1], s[2], 1.0)))
        self._tag(n0, m)

    def finish(self, coll, bevel=0.0, angle=28):
        bm = self.bm
        for e in bm.edges:
            if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > math.radians(angle):
                e.smooth = False
        me = bpy.data.meshes.new(self.name)
        bm.normal_update(); bm.to_mesh(me); bm.free()
        for p in me.polygons:
            p.use_smooth = True
        for mt in self.mats:
            me.materials.append(mt)
        o = bpy.data.objects.new(self.name, me); coll.objects.link(o)
        if bevel:
            b = o.modifiers.new('Bevel', 'BEVEL'); b.width = bevel; b.segments = 2; b.limit_method = 'ANGLE'; b.angle_limit = math.radians(angle)
        return o


def pbr(name, base, rough=0.5, metal=0.0, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (*base, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    for k, v in kw.items():
        if k in b.inputs:
            b.inputs[k].default_value = v
    return m


def textured(name, base, rough=0.5, metal=0.0, noise_scale=30, bump=0.1, rough_var=0.25, color_var=0.08, **kw):
    """PBR material with procedural variation (colour, roughness, micro-bump) — avoids the 'flat CG' look."""
    m = pbr(name, base, rough, metal, **kw)
    if LIGHT:
        return m
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = noise_scale; n1.inputs['Detail'].default_value = 8; n1.inputs['Roughness'].default_value = 0.6
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = noise_scale * 0.05; n2.inputs['Detail'].default_value = 3
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], n1.inputs['Vector']); nt.links.new(mp.outputs['Vector'], n2.inputs['Vector'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs['Factor'].default_value = color_var * 4
    mix.inputs['A'].default_value = (*base, 1); mix.inputs['B'].default_value = tuple(max(0, c * 0.55) for c in base) + (1,)
    nt.links.new(n2.outputs['Fac'], mix.inputs['Factor'])
    nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    rr = nt.nodes.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = max(0.05, rough - rough_var); rr.inputs['To Max'].default_value = min(1.0, rough + rough_var)
    nt.links.new(n1.outputs['Fac'], rr.inputs['Value']); nt.links.new(rr.outputs['Result'], b.inputs['Roughness'])
    bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = bump; bm.inputs['Distance'].default_value = 0.02
    nt.links.new(n1.outputs['Fac'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], b.inputs['Normal'])
    return m


def glass(name, tint=(0.8, 0.95, 0.92), rough=0.02, ior=1.45):
    m = pbr(name, tint, rough, 0.0, **{'Transmission Weight': 1.0, 'IOR': ior})
    return m


def img_alpha(name, path, rough=0.6, emit=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough; b.inputs['Subsurface Weight'].default_value = 0.1
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path)
    nt.links.new(t.outputs['Color'], b.inputs['Base Color']); nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
    return m


def coll(name, parent=None):
    c = bpy.data.collections.new(name); (parent or bpy.context.scene.collection).children.link(c); return c


def emissive(name, rgb, strength):
    m = pbr(name, (1, 1, 1)); b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Emission Color'].default_value = (*rgb, 1); b.inputs['Emission Strength'].default_value = strength
    return m


# ----------------------------------------------------------------------------- materials
def materials():
    M = {}
    M['grass'] = textured('Grass', (0.045, 0.14, 0.03), 0.85, 0, noise_scale=2.0, bump=0.8, rough_var=0.1, color_var=0.6)
    M['sand'] = textured('DesertSand', (0.38, 0.28, 0.17), 0.92, 0, noise_scale=1.2, bump=0.5, rough_var=0.05, color_var=0.7)
    M['concrete'] = textured('Concrete', (0.50, 0.50, 0.49), 0.55, 0, noise_scale=6, bump=0.15, rough_var=0.25, color_var=0.22)
    M['concrete_polish'] = textured('PolishedConcrete', (0.56, 0.56, 0.55), 0.22, 0, noise_scale=3, bump=0.03, rough_var=0.12, color_var=0.15, **{'Coat Weight': 0.35, 'Coat Roughness': 0.1})
    M['asphalt'] = textured('Asphalt', (0.045, 0.048, 0.052), 0.82, 0, noise_scale=120, bump=0.6, rough_var=0.12, color_var=0.3)
    M['line_white'] = pbr('LineWhite', (0.75, 0.76, 0.76), 0.6)
    M['line_yellow'] = pbr('LineYellow', (0.8, 0.6, 0.05), 0.6)
    M['panel'] = textured('PanelWhite', (0.80, 0.82, 0.83), 0.38, 0.1, noise_scale=20, bump=0.05, **{'Coat Weight': 0.2})
    M['steel'] = textured('SteelPaint', (0.55, 0.60, 0.63), 0.38, 0.8, noise_scale=40, bump=0.04)
    M['slate'] = pbr('SlatePaint', (0.07, 0.10, 0.12), 0.35, 0.5)
    M['green'] = pbr('LODDGreen', (0.0, 0.34, 0.17), 0.28, 0.0, **{'Coat Weight': 1.0, 'Coat Roughness': 0.05})
    M['white'] = pbr('WhitePaint', (0.8, 0.82, 0.83), 0.3, 0.0, **{'Coat Weight': 0.6})
    M['yellow'] = pbr('SafetyYellow', (0.78, 0.55, 0.02), 0.4, 0.0)
    M['rubber'] = pbr('Rubber', (0.015, 0.015, 0.017), 0.85)
    M['glass'] = glass('GlassTint')
    M['glass_dark'] = glass('GlassDark', (0.05, 0.08, 0.1), 0.02)
    M['carton'] = pbr('Carton', (0.55, 0.38, 0.2), 0.8)
    M['wood'] = textured('Wood', (0.40, 0.26, 0.12), 0.7, 0, noise_scale=60, bump=0.3)
    M['trunk'] = textured('Trunk', (0.32, 0.25, 0.17), 0.9, 0, noise_scale=25, bump=1.2)
    M['leaf1'] = textured('Leaf1', (0.08, 0.24, 0.07), 0.6, 0, noise_scale=40, bump=0.5, color_var=0.4, **{'Subsurface Weight': 0.15})
    M['leaf2'] = textured('Leaf2', (0.13, 0.30, 0.09), 0.6, 0, noise_scale=40, bump=0.5, color_var=0.4, **{'Subsurface Weight': 0.15})
    M['frond'] = img_alpha('Frond', os.path.join(TEX, 'palm_frond.png'))
    M['skin_tone'] = pbr('Skin', (0.55, 0.36, 0.25), 0.55, 0, **{'Subsurface Weight': 0.2})
    M['overall'] = textured('Overall', (0.11, 0.15, 0.19), 0.8, 0, noise_scale=300, bump=0.6, rough_var=0.1, color_var=0.15)
    M['vest_green'] = pbr('VestGreen', (0.0, 0.42, 0.22), 0.6)
    M['vest_orange'] = pbr('VestOrange', (0.9, 0.3, 0.02), 0.6)
    M['helmet'] = pbr('Helmet', (0.9, 0.9, 0.88), 0.28, 0, **{'Coat Weight': 1.0})
    M['car_white'] = pbr('CarWhite', (0.78, 0.79, 0.8), 0.22, 0.2, **{'Coat Weight': 1.0, 'Coat Roughness': 0.04})
    M['car_slate'] = pbr('CarSlate', (0.06, 0.08, 0.09), 0.25, 0.3, **{'Coat Weight': 1.0, 'Coat Roughness': 0.04})
    M['car_green'] = pbr('CarGreen', (0.0, 0.3, 0.15), 0.25, 0.3, **{'Coat Weight': 1.0, 'Coat Roughness': 0.04})
    M['car_red'] = pbr('CarRed', (0.5, 0.03, 0.02), 0.25, 0.3, **{'Coat Weight': 1.0, 'Coat Roughness': 0.04})
    M['car_silver'] = pbr('CarSilver', (0.5, 0.52, 0.54), 0.25, 0.7, **{'Coat Weight': 1.0})
    M['reflective'] = pbr('Reflective', (0.65, 0.66, 0.64), 0.3, 0.7)
    M['dark_eye'] = pbr('DarkTrim', (0.01, 0.01, 0.012), 0.6)
    M['rim'] = pbr('Alloy', (0.7, 0.72, 0.74), 0.22, 1.0)
    M['rim_dark'] = pbr('AlloyDark', (0.06, 0.06, 0.07), 0.5, 1.0)
    M['glass_car'] = glass('CarGlass', (0.03, 0.045, 0.05), 0.02)
    M['plate'] = pbr('Plate', (0.8, 0.8, 0.78), 0.4)
    M['cab'] = pbr('CabPaint', (0.06, 0.09, 0.1), 0.25, 0.5, **{'Coat Weight': 1.0, 'Coat Roughness': 0.04})
    M['panel_line'] = pbr('PanelLine', (0.45, 0.47, 0.48), 0.5)
    M['wood_dark'] = textured('WoodDark', (0.24, 0.15, 0.07), 0.75, 0, noise_scale=70, bump=0.3)
    M['carton_light'] = pbr('CartonLight', (0.68, 0.52, 0.33), 0.8)
    M['wrap'] = pbr('StretchWrap', (0.9, 0.92, 0.93), 0.12, 0.0, **{'Alpha': 0.14, 'Specular IOR Level': 1.0})
    M['drum_blue'] = pbr('DrumTeal', (0.0, 0.2, 0.17), 0.3, 0.6, **{'Coat Weight': 0.6})
    M['drum_green'] = pbr('DrumGreen', (0.0, 0.3, 0.14), 0.3, 0.6, **{'Coat Weight': 0.6})
    M['rack_blue'] = pbr('RackUpright', (0.0, 0.30, 0.15), 0.35, 0.3, **{'Coat Weight': 0.5})
    M['rack_orange'] = pbr('RackBeam', (0.85, 0.34, 0.02), 0.35, 0.3, **{'Coat Weight': 0.5})
    M['steel_plain'] = pbr('PlainSteel', (0.55, 0.57, 0.58), 0.45, 0.8)
    M['skin_tone2'] = pbr('Skin2', (0.30, 0.18, 0.12), 0.55, 0, **{'Subsurface Weight': 0.2})
    M['skin_tone3'] = pbr('Skin3', (0.68, 0.46, 0.34), 0.55, 0, **{'Subsurface Weight': 0.2})
    M['headlight'] = emissive('Headlight', (1, 0.95, 0.8), 25)
    M['taillight'] = emissive('Taillight', (1, 0.05, 0.02), 6)
    M['led_green'] = emissive('LEDGreen', (0.0, 1.0, 0.5), 8)
    M['lamp'] = emissive('Lamp', (1, 0.9, 0.7), 60)
    M['strip'] = emissive('LightStrip', (1, 0.97, 0.9), 40)
    return M


# ----------------------------------------------------------------------------- site pieces
def ground_and_roads(M, C):
    # grass plane
    bpy.ops.mesh.primitive_plane_add(size=1600, location=(30, 0, -0.02)); g = bpy.context.object; g.name = 'Desert'; g.data.materials.append(M['sand'])
    C.objects.link(g); bpy.context.scene.collection.objects.unlink(g)
    lawn = Builder('Lawns', [M['grass']])
    lawn.box((30, -29.2, -0.01), (240, 4.4, 0.04)); lawn.box((30, -55, -0.01), (300, 15, 0.04)); lawn.box((126, 3, -0.01), (14, 60, 0.04)); lawn.box((-55, 3, -0.01), (12, 60, 0.04)); lawn.box((30, 36, -0.01), (200, 20, 0.04))
    lawn.finish(C, bevel=0.02)
    rnd = random.Random(3)
    dn = Builder('Dunes', [M['sand']])
    for i in range(14):
        ang = rnd.uniform(0.15, 0.85) * math.pi + math.pi * 0.0
        dist = rnd.uniform(230, 520)
        dn.sphere((30 + math.cos(ang) * dist * 1.4, 150 + math.sin(ang) * dist * 0.5 + rnd.uniform(0, 250), -6), (rnd.uniform(70, 160), rnd.uniform(40, 90), rnd.uniform(18, 40)), seg=(10 if LIGHT else 24))
    dn.finish(C)
    sl = Builder('YardSlab', [M['concrete']]); sl.box((35, 0, -0.15), (168, 54, 0.3)); sl.finish(C, bevel=0.03)
    hs = Builder('HallFloor', [M['concrete_polish']]); hs.box((38, 4.5, 0.005), (84, 41, 0.02)); hs.finish(C)
    # asphalt road y=-42 (12 m wide) with kerbs, lane marks
    r = Builder('Road', [M['asphalt'], M['concrete'], M['line_white'], M['line_yellow']])
    r.box((30, -42, 0.01), (460, 12, 0.04), m=0)
    r.box((30, -42 + 7.4, 0.07), (460, 2.4, 0.14), m=1); r.box((30, -42 - 7.4, 0.07), (460, 2.4, 0.14), m=1)
    r.box((30, -42 + 5.6, 0.035), (460, 0.18, 0.012), m=2); r.box((30, -42 - 5.6, 0.035), (460, 0.18, 0.012), m=2)
    for i in range(-30, 70):
        r.box((i * 6.0 - 20, -42, 0.036), (2.8, 0.15, 0.012), m=3)
    r.box((30, -33.5, 0.01), (8, 14, 0.04), m=0)   # access road
    r.box((100, -17, 0.01), (36, 20, 0.04), m=0)   # parking lot
    for i in range(0, 9):
        r.box((84 + i * 4.4, -11.5, 0.036), (0.14, 5, 0.012), m=2); r.box((84 + i * 4.4, -22.5, 0.036), (0.14, 5, 0.012), m=2)
    r.finish(C, bevel=0.005)
    # sidewalks/hedges
    h = Builder('Hedge', [M['leaf1']])
    for x in range(-50, 118, 14):
        if abs(x - 30) > 6:
            h.box((x + 7, -30.5, 0.5), (13, 1.0, 1.0))
    h.finish(C, bevel=0.3)


def hall(M, C):
    X0, X1, YB, YF, H = -4, 80, 25, -16, 12.5
    b = Builder('HallWalls', [M['panel'], M['glass'], M['green'], M['slate'], M['steel']])
    for i in range(14):
        x = X0 + 3 + i * 6
        b.box((x, YB, H / 2), (5.9, 0.5, H), m=0)
        b.box((x, YB - 0.3, 9.2), (4.4, 0.14, 2.4), m=1)
    b.box(((X0 + X1) / 2, YB - 0.1, H - 0.1), (84.8, 0.9, 0.9), m=2); b.box(((X0 + X1) / 2, YB - 0.2, 0.5), (84.8, 0.7, 1.0), m=3)
    b.box((X1, YB - 8.5, H / 2), (0.5, 17, H), m=0); b.box((X1, YF + 4, H / 2), (0.5, 8, H), m=0); b.box((X1, 0, 9.2 + (H - 9.2) / 2), (0.5, 16, H - 9.2), m=0)
    b.box((X1, 0, 9.1), (0.7, 16.8, 0.45), m=2)
    for y in (8.3, -8.3):
        b.box((X1, y, 4.5), (0.7, 0.45, 9), m=2)
    for i in range(8):
        x = X0 + i * 12
        b.box((x, YF, H / 2), (0.5, 0.5, H), m=4); b.box((x, (YF + YB) / 2, H), (0.4, 41.6, 0.6), m=4)
    for y in (-20 + 0, 4, 12, 20):
        b.box(((X0 + X1) / 2, y, H + 0.25), (84.4, 0.2, 0.2), m=4)
    for y in (YF, 0, 8, YB - 1):
        pass
    for z in (YB, 10, 0, YF):
        b.box((X0, z, H / 2), (0.5, 0.5, H), m=4)
    b.finish(C, bevel=0.03)
    roof = Builder('HallRoof', [M['panel'], M['glass'], M['steel']])
    for i in range(7):
        x = X0 + 6 + i * 12
        roof.box((x, 19, H + 0.4), (11.5, 19, 0.3), m=0); roof.box((x, 22, H + 0.62), (7.5, 4.2, 0.1), m=1)
        if i % 2 == 0:
            roof.box((x - 1.5, 14, H + 1.3), (3, 2.2, 1.4), m=0); roof.cyl((x - 1.5, 14, H + 2.05), 0.75, 0.15, m=2)
    roof.finish(C, bevel=0.02)
    # ceiling light strips
    ls = Builder('HallLights', [M['strip']])
    for i in range(6):
        for y in (-6, 8):
            ls.box((X0 + 8 + i * 13, y, H - 0.4), (6, 0.5, 0.12))
    ls.finish(C)
    # sign on the back wall
    sg = Builder('HallSign', [M['green'], M['white']]); sg.box((38, YB - 0.4, 5.2), (27, 0.2, 3.6), m=0); sg.finish(C, bevel=0.05)


def station_gear(M, C, aircraft_x=None):
    """pads, gantries, benches and robot arms for the 5 stations"""
    b = Builder('Stations', [M['white'], M['green'], M['slate'], M['yellow'], M['steel'], M['led_green']])
    for x in SX:
        b.cyl((x, 0, 0.12), 7.2, 0.24, m=0, seg=96);
        # gantry
        b.box((x, 8.6, 3.7), (0.34, 0.34, 7.4), m=2); b.box((x, -8.6, 3.7), (0.34, 0.34, 7.4), m=2); b.box((x, 0, 7.5), (0.5, 17.5, 0.42), m=2)
        b.box((x, 8.6, 0.25), (0.7, 0.7, 0.5), m=1); b.box((x, -8.6, 0.25), (0.7, 0.7, 0.5), m=1)
        b.box((x + 0.1, 0, 7.2), (0.2, 15.6, 0.14), m=5)
        b.box((x + 3.8, 9.8, 0.5), (2.8, 1.1, 1.0), m=2); b.box((x + 3.8, 9.8, 1.05), (2.9, 1.2, 0.1), m=0)
    ring = Builder('PadRings', [M['led_green']])
    N = 160
    for x in SX:
        for i in range(N):
            t = 2 * math.pi * i / N
            ring.box((x + 7.25 * math.cos(t), 7.25 * math.sin(t), 0.25), (2 * math.pi * 7.25 / N * 1.05, 0.12, 0.04), rz=t + math.pi / 2)
    ring.finish(C)
    b.finish(C, bevel=0.02)


def robot_arm(M, C, loc, yaw, pose=(0.7, -1.15)):
    amber = pbr('ArmAmber', (0.85, 0.45, 0.04), 0.3, 0.2, **{'Coat Weight': 1.0})
    bd = Builder('RobotArm', [M['white'], amber, M['slate'], M['led_green']])
    bd.cyl((0, 0, 0.15), 0.95, 0.3, m=0); bd.cyl((0, 0, 0.75), 0.6, 1.0, m=0); bd.cyl((0, 0, 1.0), 0.62, 0.1, m=3)
    # shoulder at z=1.3, upper arm
    sh = Vector((0, 0, 1.3)); a1 = pose[0]; a2 = pose[1]
    d1 = Vector((math.cos(a1), 0, math.sin(a1))) * 2.6; e = sh + d1
    d2 = Vector((math.cos(a1 + a2), 0, math.sin(a1 + a2))) * 2.1; w = e + d2
    bd.cyl(sh, 0.38, 0.9, m=2, axis='Y')
    for (p, q, r) in ((sh, e, 0.26), (e, w, 0.2)):
        mid = (p + q) / 2; ln = (q - p).length; ang = math.atan2((q - p).z, (q - p).x)
        n0 = len(bd.bm.faces)
        bmesh.ops.create_cone(bd.bm, cap_ends=True, segments=24, radius1=r, radius2=r * 0.85, depth=ln, matrix=Matrix.Translation(mid) @ Matrix.Rotation(-ang, 4, 'Y') @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
        bd._tag(n0, 1)
    bd.cyl(e, 0.3, 0.8, m=2, axis='Y'); bd.sphere(w, (0.2, 0.2, 0.2), m=3)
    o = bd.finish(C, bevel=0.01); o.location = loc; o.rotation_euler = (0, 0, yaw)
    return o


def rack_unit(M, C):
    post = M['green']; beam = M['steel']
    b = Builder('RackUnit', [post, beam, M['wood'], M['carton']])
    for sx in (-3.2, 3.2):
        for sy in (-0.8, 0.8):
            b.box((sx, sy, 3.2), (0.17, 0.17, 6.4), m=0)
    for z in (0.35, 2.55, 4.75):
        b.box((0, 0.8, z), (6.4, 0.14, 0.14), m=1); b.box((0, -0.8, z), (6.4, 0.14, 0.14), m=1); b.box((0, 0, z + 0.15), (6.0, 1.3, 0.12), m=2)
        for k in range(3):
            if R.random() < 0.9:
                w, h, d = 1.3 + R.random() * 0.5, 0.8 + R.random() * 0.9, 1.0 + R.random() * 0.35
                b.box((-2.2 + k * 2.2 + (R.random() - 0.5) * 0.3, 0, z + 0.22 + h / 2), (w, d, h), m=3)
    return b.finish(C, bevel=0.015)


R = random.Random(11)


def warehouse(M, C):
    X0 = -46
    w = Builder('WarehouseShell', [M['panel'], M['glass'], M['green'], M['slate'], M['steel']])
    for i in range(10):
        x = -44 + i * 4.04
        w.box((x, 21.2, 4.8), (3.9, 0.5, 9.6), m=0); w.box((x, 20.9, 7.4), (2.9, 0.14, 1.5), m=1)
    for i in range(9):
        y = -19 + i * 4.2   # three_z -> -y
        w.box((-46.2, -y, 4.8), (0.5, 4.08, 9.6), m=0); w.box((-45.9, -y, 7.4), (0.14, 3.1, 1.5), m=1)
    w.box((-26, 21.1, 9.9), (40.8, 0.9, 0.9), m=2); w.box((-46.1, 2.4, 9.9), (0.9, 38.8, 0.9), m=2); w.box((-26, 20.9, 0.5), (40.8, 0.7, 1.0), m=3)
    for i in range(5):
        w.box((-44 + i * 9.5, 2.3, 9.4), (0.2, 37.5, 0.2), m=4)
    w.finish(C, bevel=0.03)
    rr = random.Random(5)
    masters = coll('RackMasters', C)
    variants = [AS.rack_unit(M, masters, rr, 'RackMaster%d' % v) for v in range(4)]
    def hide_tree(o):
        o.hide_render = True
        for ch in o.children:
            hide_tree(ch)
    def dup_tree(o, parent=None):
        n = o.copy(); n.hide_render = False; C.objects.link(n); n.parent = parent
        for ch in o.children:
            dup_tree(ch, n)
        return n
    rows = (16, 9, 2, -5)
    k = 0
    for ry in rows:
        for bay in range(4):
            n = dup_tree(variants[k % 4]); n.location = (-39 + bay * 7.4, ry, 0); k += 1
    for v in variants:
        hide_tree(v)
    # forklift pallets / floor markings
    fl = Builder('WarehouseMarks', [M['line_yellow']])
    for y in (12.5, 5.5, -1.5, -8.5):
        fl.box((-26, y, 0.02), (36, 0.12, 0.01))
    fl.finish(C)


def people(M, C):
    skins = ('skin_tone', 'skin_tone2', 'skin_tone3')
    for k, x in enumerate(SX):
        AS.make_worker(M, C, 'W%da' % k, 'vest_green', 'work', (x + 3.6, -8.1, 0), math.pi / 2, skin=skins[k % 3])
        AS.make_worker(M, C, 'W%db' % k, 'vest_orange', 'work', (x - 3.4, 8.2, 0), -math.pi / 2, skin=skins[(k + 1) % 3])
    AS.make_worker(M, C, 'W5c', 'vest_green', 'point', (60, -3.6, 0), math.pi, skin='skin_tone3')
    AS.make_worker(M, C, 'WH1', 'vest_orange', 'walk', (-26, -10, 0), 0.6, skin='skin_tone2'); AS.make_worker(M, C, 'WH2', 'vest_orange', 'stand', (-14, 3, 0), 2.4)
    AS.make_worker(M, C, 'Crew1', 'vest_orange', 'stand', (110, 1, 0), math.pi, skin='skin_tone3'); AS.make_worker(M, C, 'Crew2', 'vest_orange', 'walk', (88, 12, 0), -1.0)


def conveyor_and_agv(M, C):
    cv = Builder('Conveyor', [M['white'], M['green'], M['slate'], M['carton']])
    cv.box((33.5, 13.6, 0.6), (77, 1.9, 0.5), m=0); cv.box((33.5, 14.5, 0.92), (77, 0.14, 0.22), m=1); cv.box((33.5, 12.7, 0.92), (77, 0.14, 0.22), m=1); cv.box((33.5, 13.6, 0.86), (77, 1.45, 0.04), m=2)
    for x in range(-3, 71, 6):
        cv.box((x, 13.6, 0.28), (0.3, 1.7, 0.55), m=2)
    for i in range(11):
        cv.box((-1 + i * 7.0 + 1.5, 13.6, 1.27), (1.1, 0.9, 0.8), m=3)
    cv.finish(C, bevel=0.02)
    # AGVs with green crates
    for (x, y, yaw) in ((14, -10, 0), (30, -10.5, 0), (5, -10, 0), (-9, 0, math.pi / 2)):
        a = Builder('AGV', [M['slate'], M['green'], M['white']])
        a.box((0, 0, 0.34), (2.1, 1.35, 0.34), m=0); a.box((0, 0, 0.55), (2.0, 1.25, 0.07), m=1)
        for sx in (-0.7, 0.7):
            for sy in (-0.55, 0.55):
                a.cyl((sx, sy, 0.17), 0.17, 0.12, m=0, axis='Y', seg=20)
        a.box((0, 0, 1.12), (1.45, 1.05, 1.0), m=2); a.box((0, 0, 1.3), (1.5, 1.1, 0.2), m=1)
        o = a.finish(C, bevel=0.03); o.location = (x, y, 0); o.rotation_euler = (0, 0, yaw)
    # forklift
    f = Builder('Forklift', [M['white'], M['green'], M['rubber'], M['carton'], M['wood']])
    f.box((-0.1, 0, 0.8), (1.9, 1.15, 0.9), m=0); f.box((-0.1, 0, 0.55), (1.92, 1.17, 0.2), m=1); f.box((-0.3, 0, 1.9), (1.0, 1.0, 0.1), m=2)
    for (px, py) in ((-0.7, 0.55), (-0.7, -0.55), (0.1, 0.55), (0.1, -0.55)):
        f.box((px, py, 1.4), (0.07, 0.07, 1.0), m=2)
    f.box((0.95, 0, 1.6), (0.14, 0.9, 3.0), m=2)
    for sy in (0.3, -0.3):
        f.box((1.7, sy, 0.2), (1.5, 0.2, 0.08), m=2)
    for (px, py) in ((-0.7, 0.62), (0.6, 0.62), (-0.7, -0.62), (0.6, -0.62)):
        f.cyl((px, py, 0.27), 0.27, 0.22, m=2, axis='Y')
    f.box((1.8, 0, 0.37), (1.3, 1.2, 0.12), m=4); f.box((1.8, 0, 0.88), (1.15, 1.0, 0.9), m=3)
    o = f.finish(C, bevel=0.03); o.location = (-20, -1.5, 0); o.rotation_euler = (0, 0, math.pi)


def robots(M, C):
    for i, x in enumerate(SX):
        robot_arm(M, C, (x + 2.6, 6.9, 0.0), math.pi / 2 + 0.0 + 0.4, pose=(0.8 + 0.1 * i, -1.2))


def car(M, C, name, mat, loc, yaw, kind='sedan'):
    return AS.make_car(M, C, name, mat, kind, loc, yaw)


def truck(M, C, loc, yaw, semi=False):
    return AS.make_truck(M, C, 'Truck', loc, yaw, semi)


def vehicles(M, C):
    car(M, C, 'CarA', 'car_white', (-40, -45.2, 0), 0, 'sedan'); car(M, C, 'CarB', 'car_green', (8, -45.2, 0), 0, 'suv')
    car(M, C, 'CarC', 'car_slate', (52, -38.8, 0), math.pi, 'sedan'); car(M, C, 'CarD', 'car_silver', (95, -45.2, 0), 0, 'sedan')
    truck(M, C, (20, -38.8, 0), math.pi); truck(M, C, (74, -45.2, 0), 0, semi=True)
    mats = ['car_white', 'car_red', 'car_slate', 'car_silver', 'car_green', 'car_white', 'car_slate', 'car_silver']
    for i in range(8):
        car(M, C, 'Parked%d' % i, mats[i], (86 + i * 4.4 + 1.6, -13.8 if i % 2 else -20.4, 0), math.pi / 2 * (1 if i % 2 else -1), 'suv' if i % 3 == 0 else 'sedan')


def frond_mesh():
    L, W, n = 3.4, 0.9, 12
    me = bpy.data.meshes.new('Frond'); vs, fs, uvs = [], [], []
    for i in range(n + 1):
        u = i / n
        x = u * L; z = -0.55 * u * u * L * 0.5
        vs += [(x, -W / 2 * (1 - 0.3 * u), z), (x, W / 2 * (1 - 0.3 * u), z)]
    for i in range(n):
        a = i * 2; fs.append((a, a + 1, a + 3, a + 2))
    me.from_pydata(vs, [], fs); uv = me.uv_layers.new(name='UV')
    for p in me.polygons:
        for li, vi in zip(p.loop_indices, p.vertices):
            i = vi // 2; side = vi % 2
            uv.data[li].uv = (i / n, 0 if side == 0 else 1)
    return me


def trees(M, C):
    rnd = random.Random(31)
    fm = frond_mesh(); fm.materials.append(M['frond'])
    def palm(x, y, s):
        tb = Builder('PalmTrunk', [M['trunk']]); h = 0
        lean = (rnd.random() - 0.5) * 0.35
        cx = 0
        for i in range(8):
            r = 0.26 - i * 0.012
            n0 = len(tb.bm.faces)
            bmesh.ops.create_cone(tb.bm, cap_ends=False, segments=(8 if LIGHT else 12), radius1=r, radius2=r - 0.012, depth=1.1, matrix=Matrix.Translation((cx, 0, h + 0.55)) @ Matrix.Rotation(lean * 0.2, 4, 'Y'))
            h += 1.05; cx += lean * 0.45
        o = tb.finish(C); o.location = (x, y, 0); o.scale = (s, s, s); o.rotation_euler = (0, 0, rnd.random() * 6.28)
        for k in range(11):
            f = bpy.data.objects.new('Frond', fm); C.objects.link(f)
            f.location = (x + math.cos(o.rotation_euler.z) * cx * s * 0.0 + 0, y, h * s)
            f.location = (x + (cx * s) * math.cos(o.rotation_euler.z), y + (cx * s) * math.sin(o.rotation_euler.z), (h + 0.15) * s)
            f.rotation_euler = (rnd.random() * 0.2, -0.25 + rnd.random() * 0.2, k * 2 * math.pi / 11 + rnd.random() * 0.3); f.scale = (s * 1.1, s * 1.1, s * 1.1)
    def broadleaf(x, y, s):
        t = Builder('TreeTrunk', [M['trunk']]); t.cyl((0, 0, 1.4), 0.22, 2.8, m=0, seg=10, r2=0.3); o = t.finish(C); o.location = (x, y, 0); o.scale = (s, s, s)
        can = Builder('Canopy', [M['leaf1'], M['leaf2']])
        for k in range(7):
            can.sphere((rnd.uniform(-1.0, 1.0), rnd.uniform(-1.0, 1.0), 3.6 + rnd.uniform(-0.4, 1.4)), (rnd.uniform(1.2, 1.9),) * 3, m=k % 2, seg=(12 if LIGHT else 14))
        c = can.finish(C); c.location = (x, y, 0); c.scale = (s, s, s)
        if not LIGHT:
            sub = c.modifiers.new('Sub', 'SUBSURF'); sub.levels = 2; sub.render_levels = 2
            d = c.modifiers.new('Disp', 'DISPLACE'); tex = bpy.data.textures.new('lump', 'CLOUDS'); tex.noise_scale = 0.45; d.texture = tex; d.strength = 0.45
    def conifer(x, y, s):
        t = Builder('ConiferTrunk', [M['trunk'], M['leaf1']]); t.cyl((0, 0, 0.6), 0.18, 1.2, m=0, seg=8)
        for (r, hh, z) in ((1.9, 2.2, 2.0), (1.5, 2.0, 3.5), (1.0, 1.8, 4.9)):
            t.cyl((0, 0, z), r, hh, m=1, seg=18, r2=0.05)
        o = t.finish(C); o.location = (x, y, 0); o.scale = (s, s, s)
    for x in range(-52, 122, 9):
        if abs(x - 30) < 7:
            continue
        (broadleaf if (x // 9) % 3 == 0 else palm)(x + rnd.random() * 2, -28.2 - rnd.random() * 1.2, 0.95 + rnd.random() * 0.3)
    for x in range(-60, 150, 11):
        palm(x + rnd.random() * 3, -55 - rnd.random() * 4, 1.05 + rnd.random() * 0.4)
        if rnd.random() > 0.4:
            broadleaf(x + 5, -62 - rnd.random() * 6, 1 + rnd.random() * 0.5)
    for x in range(-56, 125, 8):
        (conifer if rnd.random() > 0.5 else broadleaf)(x + rnd.random() * 3, 34 + rnd.random() * 8, 1.1 + rnd.random() * 0.6)
        if rnd.random() > 0.5:
            conifer(x + 4, 46 + rnd.random() * 8, 1.4 + rnd.random() * 0.5)
    for y in range(-26, 26, 9):
        broadleaf(-54 - rnd.random() * 3, y + rnd.random() * 3, 1 + rnd.random() * 0.4)
        palm(124 + rnd.random() * 3, y + rnd.random() * 3, 1.1 + rnd.random() * 0.3)
    for i in range(14):
        palm(112 + rnd.random() * 12, 12 + rnd.random() * 12, 1 + rnd.random() * 0.3)


def lamps(M, C):
    b = Builder('Lamps', [M['steel'], M['lamp']])
    for x in range(-60, 151, 24):
        b.box((x, -34.8, 3.5), (0.25, 0.25, 7.0), m=0); b.box((x, -34.0, 7.0), (2.2, 0.2, 0.2), m=0); b.box((x, -33.2, 6.85), (0.9, 0.5, 0.22), m=1)
    b.finish(C, bevel=0.02)


def annex(M, C):
    b = Builder('Annex', [M['white'], M['green'], M['steel']])
    for (x, y) in ((22, 37), (29, 37)):
        b.cyl((x, y, 7.5), 3.2, 15, m=0, seg=48); b.cyl((x, y, 11.5), 3.25, 1.0, m=1, seg=48); b.sphere((x, y, 15), (3.2, 3.2, 1.6), m=0, seg=32)
    b.cyl((40, 36, 3.25), 4.2, 6.5, m=0, seg=48); b.cyl((40, 36, 4.5), 4.25, 0.8, m=1, seg=48)
    b.box((54, 36, 3), (14, 9, 6), m=0); b.box((54, 36, 5.2), (14.2, 9.2, 0.9), m=1)
    b.cyl((30, 32, 9), 0.28, 14, m=2, axis='X', seg=16)
    for x in (22, 29, 36):
        b.box((x, 33, 4.5), (0.3, 0.3, 9), m=2)
    b.finish(C, bevel=0.03)


def helipad(M, C):
    b = Builder('HeliPad', [M['concrete_polish'], M['white'], M['led_green'], M['line_white']])
    cx, cy = 98, 6
    b.box((cx, cy, 0.15), (18, 18, 0.3), m=0)
    b.box((cx, cy + 4.4, 0.31), (14, 3.6, 0.01), m=3); b.box((cx, cy - 4.4, 0.31), (14, 3.6, 0.01), m=3)
    for i in range(32):
        a = i / 32; side = int(a * 4); u = (a * 4 - side) * 18 - 9
        pos = [(u, -9), (9, u), (-u, 9), (-9, -u)][side]
        b.sphere((cx + pos[0], cy + pos[1], 0.34), (0.22, 0.22, 0.12), m=2, seg=10)
    for i, r in enumerate((7.6, 4.3)):
        z = 0.325 + i * 0.02
        b.cyl((cx, cy, z), r, 0.02, m=3, seg=96); b.cyl((cx, cy, z + 0.0025), r - 0.25, 0.025, m=0, seg=96)
    # windsock
    b.cyl((cx + 11.5, cy + 9, 3), 0.08, 6, m=1, seg=8)
    b.finish(C, bevel=0.02)
    # (the inner discs above only exist to carve the ring; fix: rings are simple discs)


def build_site(M):
    Cc = coll('Site')
    ground_and_roads(M, Cc); hall(M, Cc); station_gear(M, Cc); warehouse(M, Cc); people(M, Cc); conveyor_and_agv(M, Cc); robots(M, Cc)
    vehicles(M, Cc); trees(M, Cc); lamps(M, Cc); annex(M, Cc); helipad(M, Cc)
    return Cc


def sky_and_sun(elevation_deg=12, rotation_deg=-35, strength=1.0):
    w = bpy.context.scene.world or bpy.data.worlds.new('World'); bpy.context.scene.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld'); bg = nt.nodes.new('ShaderNodeBackground'); sk = nt.nodes.new('ShaderNodeTexSky')
    for t in ('MULTIPLE_SCATTERING', 'SINGLE_SCATTERING', 'NISHITA'):
        try:
            sk.sky_type = t; break
        except TypeError:
            continue
    for k, v in (('sun_elevation', math.radians(elevation_deg)), ('sun_rotation', math.radians(rotation_deg)), ('air_density', 1.2), ('aerosol_density', 1.8), ('dust_density', 2.2), ('sun_size', math.radians(0.6)), ('sun_intensity', 1.0)):
        if hasattr(sk, k):
            setattr(sk, k, v)
    bg.inputs['Strength'].default_value = strength
    nt.links.new(sk.outputs['Color'], bg.inputs['Color']); nt.links.new(bg.outputs['Background'], out.inputs['Surface'])


def hall_lights(coll_):
    for (x, y) in ((8, 0), (36, 0), (64, 0), (22, 0), (50, 0)):
        bpy.ops.object.light_add(type='AREA', location=(x, y, 11.5)); l = bpy.context.object; l.data.shape = 'RECTANGLE'; l.data.size = 14; l.data.size_y = 8; l.data.energy = 4500; l.data.color = (1.0, 0.96, 0.9)
        l.rotation_euler = (0, 0, 0)
