"""Hili hybrid VTOL cargo UAV — procedural Blender model (units: metres, +X nose, +Y right wing, +Z up, wheels on Z=0).

Proportions follow the supplied renders: span 11.95 m, length 8.93 m, height 3.1 m, tail width 3.56 m, 4 booms with
8 lift rotors (dia ~2.1 m), straight high wing, inverted-U twin tail, pusher propeller, tricycle gear.

build_aircraft(skin='solid'|'ghost') returns a dict of named collections so every assembly stage can be shown / animated.
"""
import math
import os
import bpy
import bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')


# ----------------------------------------------------------------------------- helpers
def _link(obj, coll):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    coll.objects.link(obj)
    return obj


def _mesh_obj(name, bm, coll, mat=None, smooth=True, subsurf=0, bevel=0.0):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    coll.objects.link(obj)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    if mat:
        obj.data.materials.append(mat)
    if bevel:
        m = obj.modifiers.new('Bevel', 'BEVEL'); m.width = bevel; m.segments = 3; m.limit_method = 'ANGLE'; m.angle_limit = math.radians(35)
    if subsurf:
        m = obj.modifiers.new('Subsurf', 'SUBSURF'); m.levels = subsurf; m.render_levels = subsurf + 1
    return obj


def loft(name, rings, coll, mat=None, cap=True, subsurf=0, smooth=True, bevel=0.0):
    bm = bmesh.new()
    V = [[bm.verts.new(v) for v in ring] for ring in rings]
    n = len(rings[0])
    for i in range(len(rings) - 1):
        for j in range(n):
            bm.faces.new((V[i][j], V[i][(j + 1) % n], V[i + 1][(j + 1) % n], V[i + 1][j]))
    if cap:
        bm.faces.new(V[0][::-1])
        bm.faces.new(V[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _mesh_obj(name, bm, coll, mat, smooth, subsurf, bevel)


def superellipse(cx, cy, a, b, n=2.4, N=28):
    pts = []
    for k in range(N):
        t = 2 * math.pi * k / N
        c, s = math.cos(t), math.sin(t)
        pts.append((cx + a * math.copysign(abs(c) ** (2 / n), c), cy + b * math.copysign(abs(s) ** (2 / n), s)))
    return pts


def naca(t=0.15, N=18):
    """Closed symmetric airfoil outline, x in [0,1], from trailing edge over the top to the LE and back under."""
    xs = [(1 - math.cos(math.pi * i / N)) / 2 for i in range(N + 1)]
    th = lambda x: 5 * t * (0.2969 * math.sqrt(x) - 0.126 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4)
    up = [(x, th(x)) for x in reversed(xs)]
    lo = [(x, -th(x)) for x in xs[1:-1]]
    return up + lo


AF = naca()


def airfoil_loft(name, stations, coll, mat=None, t=0.15, subsurf=0):
    """stations: list of (origin Vector at LE, chord, twist_rad, thickness_scale); span axis = +Y; chord axis = -X (LE at +X)."""
    rings = []
    af = naca(t)
    for (o, c, tw, ts) in stations:
        ring = []
        for (x, z) in af:
            px = (0.5 - x) * c        # chord coordinate (LE at +0.5c)
            pz = z * c * ts
            cx, cz = px * math.cos(tw) - pz * math.sin(tw), px * math.sin(tw) + pz * math.cos(tw)
            ring.append(Vector((o.x + cx, o.y, o.z + cz)))
        rings.append(ring)
    return loft(name, rings, coll, mat, cap=True, subsurf=subsurf)


# ----------------------------------------------------------------------------- materials
def _principled(name, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    for k, v in kw.items():
        if k in bsdf.inputs:
            bsdf.inputs[k].default_value = v
    return m, bsdf


def make_materials(skin='solid'):
    M = {}
    # --- champagne / olive-gold metallic skin with orange-peel micro bump
    m, b = _principled('Skin_Solid', **{'Base Color': (0.78, 0.68, 0.44, 1), 'Metallic': 0.72, 'Roughness': 0.26,
                                         'Coat Weight': 1.0, 'Coat Roughness': 0.04, 'Specular IOR Level': 0.6})
    nt = m.node_tree
    noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 900; noise.inputs['Detail'].default_value = 3
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.015
    nt.links.new(noise.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    M['skin_solid'] = m
    # --- x-ray skin: clear glass at the middle, visible silhouette edges (Fresnel mix)
    m = bpy.data.materials.new('Skin_Ghost'); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    glass = nt.nodes.new('ShaderNodeBsdfGlass'); glass.inputs['Color'].default_value = (0.86, 0.9, 0.92, 1); glass.inputs['Roughness'].default_value = 0.03; glass.inputs['IOR'].default_value = 1.2
    trans = nt.nodes.new('ShaderNodeBsdfTransparent')
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.55
    glossy = nt.nodes.new('ShaderNodeBsdfGlossy'); glossy.inputs['Roughness'].default_value = 0.05; glossy.inputs['Color'].default_value = (0.95, 0.97, 0.98, 1)
    mix1 = nt.nodes.new('ShaderNodeMixShader'); mix2 = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lw.outputs['Facing'], mix1.inputs['Fac']); nt.links.new(glass.outputs[0], mix1.inputs[1]); nt.links.new(glossy.outputs[0], mix1.inputs[2])
    mix2.inputs['Fac'].default_value = 0.78
    nt.links.new(trans.outputs[0], mix2.inputs[1]); nt.links.new(mix1.outputs[0], mix2.inputs[2])
    nt.links.new(mix2.outputs[0], out.inputs['Surface'])
    M['skin_ghost'] = m
    M['skin'] = M['skin_ghost'] if skin == 'ghost' else M['skin_solid']
    # control-surface tint
    M['surface'], _ = _principled('ControlSurface', **{'Base Color': (0.62, 0.78, 0.70, 1), 'Metallic': 0.3, 'Roughness': 0.3, 'Coat Weight': 1.0})
    # carbon (weave bump + coat)
    m, b = _principled('Carbon', **{'Base Color': (0.012, 0.013, 0.015, 1), 'Metallic': 0.2, 'Roughness': 0.32, 'Coat Weight': 1.0, 'Coat Roughness': 0.08})
    nt = m.node_tree; chk = nt.nodes.new('ShaderNodeTexChecker'); chk.inputs['Scale'].default_value = 260
    bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.12
    nt.links.new(chk.outputs['Fac'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], b.inputs['Normal'])
    M['carbon'] = m
    M['green'], _ = _principled('LODD_Green', **{'Base Color': (0.0, 0.40, 0.19, 1), 'Roughness': 0.28, 'Coat Weight': 1.0, 'Coat Roughness': 0.05})
    M['slate'], _ = _principled('Slate', **{'Base Color': (0.058, 0.08, 0.095, 1), 'Roughness': 0.45, 'Metallic': 0.3})
    M['dark'], _ = _principled('DarkMetal', **{'Base Color': (0.03, 0.035, 0.04, 1), 'Roughness': 0.38, 'Metallic': 0.8})
    M['metal'], _ = _principled('Metal', **{'Base Color': (0.62, 0.64, 0.66, 1), 'Roughness': 0.28, 'Metallic': 1.0})
    M['brass'], _ = _principled('Brass', **{'Base Color': (0.72, 0.5, 0.2, 1), 'Roughness': 0.3, 'Metallic': 1.0})
    M['rubber'], _ = _principled('Rubber', **{'Base Color': (0.012, 0.012, 0.014, 1), 'Roughness': 0.85})
    M['white'], _ = _principled('WhitePlastic', **{'Base Color': (0.8, 0.82, 0.83, 1), 'Roughness': 0.35, 'Coat Weight': 0.5})
    M['amber'], _ = _principled('Amber', **{'Base Color': (0.8, 0.46, 0.08, 1), 'Roughness': 0.4, 'Metallic': 0.6})
    M['orange'], _ = _principled('OrangeHose', **{'Base Color': (0.9, 0.25, 0.02, 1), 'Roughness': 0.45})
    M['card'], _ = _principled('Cardboard', **{'Base Color': (0.5, 0.33, 0.17, 1), 'Roughness': 0.85})
    M['wood'], _ = _principled('Wood', **{'Base Color': (0.42, 0.28, 0.14, 1), 'Roughness': 0.8})
    for key, col in (('led_green', (0.0, 1.0, 0.55)), ('led_red', (1.0, 0.04, 0.02)), ('led_white', (1.0, 0.95, 0.85))):
        m, b = _principled('LED_' + key, **{'Base Color': (1, 1, 1, 1)})
        b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = 6.0
        M[key] = m
    M['decal_red'], _ = _principled('DecalRed', **{'Base Color': (0.8, 0.02, 0.02, 1), 'Roughness': 0.5})
    M['decal_dark'], _ = _principled('DecalDark', **{'Base Color': (0.03, 0.03, 0.03, 1), 'Roughness': 0.5})
    # image decals
    def img_mat(name, path, rough=0.35):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough; b.inputs['Coat Weight'].default_value = 0.5
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path); t.extension = 'CLIP'
        nt.links.new(t.outputs['Color'], b.inputs['Base Color']); nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
        m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
        return m
    M['flag'] = img_mat('UAE_Flag', os.path.join(TEX, 'uae_flag.png'))
    M['logo'] = img_mat('Hili_Logo', os.path.join(TEX, 'hili_logo_color.png'))
    return M


def quad(name, w, h, coll, mat, loc, rot):
    me = bpy.data.meshes.new(name)
    me.from_pydata([(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name='UV')
    for i, c in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[i].uv = c
    o = bpy.data.objects.new(name, me); coll.objects.link(o); o.location = loc; o.rotation_euler = rot; me.materials.append(mat)
    return o


def text_obj(name, body, size, coll, mat, loc, rot=(0, 0, 0), extrude=0.0005):
    c = bpy.data.curves.new(name, 'FONT'); c.body = body; c.size = size; c.extrude = extrude; c.align_x = 'CENTER'; c.align_y = 'CENTER'
    o = bpy.data.objects.new(name, c); coll.objects.link(o); o.location = loc; o.rotation_euler = rot; o.data.materials.append(mat)
    return o


# ----------------------------------------------------------------------------- the aircraft
FUS = [  # x, zbot, ztop, half-width   (side-view proportions measured on the supplied render)
    (3.55, 0.95, 1.45, 0.05), (3.42, 0.72, 1.75, 0.30), (3.15, 0.42, 1.90, 0.48), (2.6, 0.30, 2.0, 0.58),
    (1.8, 0.48, 2.03, 0.62), (0.8, 0.55, 2.05, 0.63), (-0.2, 0.58, 2.05, 0.62), (-1.0, 0.60, 2.0, 0.58),
    (-1.8, 0.68, 1.92, 0.48), (-2.4, 0.78, 1.75, 0.34), (-2.8, 0.92, 1.5, 0.18), (-2.95, 1.02, 1.35, 0.05)]
MOTOR_X = (1.55, -1.63)
BOOM_Z = (1.78, -1.78, 4.17, -4.17)


def fuselage_height_at(x):
    for a, b in zip(FUS, FUS[1:]):
        if b[0] <= x <= a[0]:
            u = (x - b[0]) / (a[0] - b[0])
            return (b[1] + (a[1] - b[1]) * u, b[2] + (a[2] - b[2]) * u, b[3] + (a[3] - b[3]) * u)
    return (1.0, 1.3, 0.1)


def fus_y(x, z):
    zb, zt, w = fuselage_height_at(x)
    zc, h = (zb + zt) / 2, (zt - zb) / 2
    v = max(-1.0, min(1.0, (z - zc) / h))
    return w * (max(0.0, 1 - abs(v) ** 2.7)) ** (1 / 2.7)


def build_aircraft(skin='solid', scene_coll=None):
    scene_coll = scene_coll or bpy.context.scene.collection
    tag = '_g' if skin == 'ghost' else ''
    root = bpy.data.collections.new('Hili' + tag); scene_coll.children.link(root)
    C = {}
    for key in ('frame', 'fuselage', 'gear', 'battery', 'ice', 'cargo', 'avionics', 'c2', 'wing', 'booms', 'tail', 'surfaces', 'motorsF', 'motorsR', 'pusher', 'livery'):
        C[key] = bpy.data.collections.new('Hili' + tag + '_' + key); root.children.link(C[key])
    M = make_materials(skin)
    skinM = M['skin']

    # ---- fuselage skin (lofted superellipse sections, subdivided)
    rings = []
    for (x, zb, zt, w) in FUS:
        zc, h = (zb + zt) / 2, (zt - zb) / 2
        rings.append([Vector((x, y, z)) for (y, z) in superellipse(0, zc, w, h, 2.7, 32)])
    fus = loft('Fuselage', rings, C['fuselage'], skinM, cap=True, subsurf=2)

    # ---- frame / floor rails (visible in x-ray)
    def box(name, size, loc, coll, mat, bevel=0.01, rot=(0, 0, 0)):
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
        o = _mesh_obj(name, bm, coll, mat, smooth=False, bevel=bevel)
        o.scale = size; o.location = loc; o.rotation_euler = rot
        return o
    for y in (-0.42, 0.42):
        box('RailLow', (4.8, 0.045, 0.045), (0.2, y, 0.85), C['frame'], M['dark'], 0.01)
        box('RailHigh', (4.8, 0.045, 0.045), (0.2, y, 1.58), C['frame'], M['dark'], 0.01)
    box('Floor', (4.6, 0.9, 0.05), (0.2, 0, 0.66), C['frame'], M['dark'], 0.01)
    for x in (-1.9, -0.8, 0.3, 1.4, 2.5):
        for y in (-0.46, 0.46):
            box('Post', (0.045, 0.045, 0.95), (x, y, 1.12), C['frame'], M['dark'], 0.01)
        box('Cross', (0.045, 0.92, 0.045), (x, 0, 1.58), C['frame'], M['dark'], 0.01)

    # ---- wing (lofted airfoil, tapered tips, slight rearward tip sweep)
    st = []
    ys = [i * 11.95 / 2 / 20 for i in range(-20, 21)]
    for y in ys:
        a = abs(y)
        chord = 1.32 if a < 4.3 else 1.32 - 0.78 * ((a - 4.3) / 1.675) ** 1.8
        le = 0.3 - (0 if a < 4.3 else 0.35 * ((a - 4.3) / 1.675) ** 2)   # chord-centre x of the section
        st.append((Vector((le, y, 2.15 + 0.04 * (a / 5.975) ** 2)), max(chord, 0.22), 0.0, 1.0))
    wing = airfoil_loft('Wing', st, C['wing'], skinM, t=0.14)
    for i in range(-5, 6):
        box('Rib', (1.05, 0.02, 0.1), (0.35, i * 1.05, 2.15), C['wing'], M['dark'], 0.0)
    box('Spar', (0.04, 11.0, 0.1), (0.55, 0, 2.15), C['wing'], M['dark'], 0.0)

    # ---- booms (4): lofted tubes with pods under each rotor
    def boom(name, y, x_front, x_rear):
        rings = []
        N = 40
        for i in range(N + 1):
            x = x_front + (x_rear - x_front) * i / N
            r = 0.16
            for mx in MOTOR_X:
                r += 0.12 * math.exp(-((x - mx) / 0.55) ** 2)
            f = (x_front - x)
            if f < 0.5:
                r *= 0.35 + 0.65 * math.sin(f / 0.5 * math.pi / 2)  # rounded nose
            tail = x - x_rear
            if tail < 0.4:
                r *= 0.25 + 0.75 * (tail / 0.4)
            rings.append([Vector((x, y + ry, 2.00 + rz)) for (ry, rz) in superellipse(0, 0, r * 1.08, r * 0.95, 2.2, 20)])
        return loft(name, rings, C['booms'], skinM, cap=True, subsurf=1)
    boom('BoomIL', 1.78, 2.05, -5.05); boom('BoomIR', -1.78, 2.05, -5.05)
    boom('BoomOL', 4.17, 2.05, -2.4); boom('BoomOR', -4.17, 2.05, -2.4)

    # ---- tail: swept fins + tailplane
    fin_st = []
    for i in range(0, 9):
        u = i / 8
        z = 2.0 + u * 1.05
        chord = 1.15 - 0.45 * u
        le = -4.1 - 0.6 * u
        fin_st.append((Vector((le, 0, z)), chord, 0.0, 1.0))
    # fin built with span axis Z -> make with a rotated station set
    def fin(name, y):
        rings = []
        for (o, c, tw, ts) in fin_st:
            rings.append([Vector((o.x - xa * c, y + zz * c * 0.9, o.z)) for (xa, zz) in naca(0.1)])
        return loft(name, rings, C['tail'], skinM, cap=True)
    fin('FinL', 1.78); fin('FinR', -1.78)
    tp = [(Vector((-4.55 - 0.0, y, 3.05)), 0.95 if abs(y) < 1.6 else 0.95 - 0.2 * ((abs(y) - 1.6) / 0.3), 0.0, 1.0) for y in [i * 0.1 for i in range(-19, 20)]]
    airfoil_loft('TailPlane', tp, C['tail'], skinM, t=0.09)

    # ---- control surfaces (flaperons / ailerons / elevator / rudders) as raised panels
    for (y0, y1) in ((0.5, 2.5), (-2.5, -0.5), (2.8, 4.0), (-4.0, -2.8), (4.8, 5.6), (-5.6, -4.8)):   # hinge lines of flaperons / ailerons
        for (y, ln) in ((y0, 0.012), (y1, 0.012)):
            pass
        box('HingeLine', (0.012, (y1 - y0), 0.006), (-0.12, (y0 + y1) / 2, 2.19), C['surfaces'], M['decal_dark'], 0.0)
        box('GapLine', (0.012, 0.004, 0.006), (-0.12, y0, 2.19), C['surfaces'], M['decal_dark'], 0.0)
    box('Elevator', (0.3, 3.4, 0.05), (-5.05, 0, 3.04), C['surfaces'], M['surface'], 0.015)
    for y in (1.78, -1.78):
        box('Rudder', (0.28, 0.07, 0.8), (-5.1, y, 2.5), C['surfaces'], M['surface'], 0.015)

    # ---- lift motors + ESCs + 2-blade carbon rotors
    def blade(name, coll, sgn):
        stl = []
        for i in range(0, 14):
            r = 0.12 + i * 0.07
            chord = 0.20 - 0.11 * (r / 1.05) ** 1.4 if r < 0.9 else 0.075 * (1.05 - r) / 0.15 + 0.03
            tw = math.radians(22 - 18 * r / 1.05)
            stl.append((Vector((0, sgn * r, 0)), max(chord, 0.035), tw, 1.0))
        return airfoil_loft(name, stl, coll, M['carbon'], t=0.06)
    rotors = {}
    for idx, (xm, key) in enumerate(((MOTOR_X[0], 'motorsF'), (MOTOR_X[1], 'motorsR'))):
        for k, y in enumerate(BOOM_Z):
            coll = C[key]
            ctr = Vector((xm, y, 2.34))
            bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=0.17, radius2=0.15, depth=0.18)
            bm.transform(Matrix.Translation(ctr))
            _mesh_obj('MotorBell', bm, coll, M['dark'], bevel=0.01)
            bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=0.09, radius2=0.07, depth=0.07)
            bm.transform(Matrix.Translation(ctr + Vector((0, 0, 0.13))))
            _mesh_obj('Hub', bm, coll, M['green'], bevel=0.008)
            # blades parented to an empty so they can spin
            pivot = bpy.data.objects.new('Rotor_%s_%d' % (key, k), None); coll.objects.link(pivot); pivot.location = ctr + Vector((0, 0, 0.17))
            for sgn, nm in ((1, 'A'), (-1, 'B')):
                b = blade('Blade' + nm, coll, sgn); b.parent = pivot
            rotors[(key, k)] = pivot
            # ESC below the motor, inside the pod (red indicator strip like the x-ray render)
            box('ESC', (0.5, 0.28, 0.16), (xm, y, 1.98), coll, M['metal'], 0.02)
            box('ESC_LED', (0.34, 0.012, 0.05), (xm, y + 0.145, 1.98), coll, M['led_red'], 0.0)
            box('ESC_LED', (0.34, 0.012, 0.05), (xm, y - 0.145, 1.98), coll, M['led_red'], 0.0)
    # CAUTION PROPELLER decals on the booms
    for y in BOOM_Z:
        for x in MOTOR_X:
            sgn = 1 if y > 0 else -1
            text_obj('Caution', '◄ CAUTION PROPELLER ►', 0.055, C['livery'], M['decal_red'], (x + 0.0, y + sgn * 0.215, 2.0), rot=(math.pi / 2, 0, math.pi if sgn < 0 else 0))
    for y in (-4.0, -2.2, -0.9, 0.9, 2.2, 4.0):
        text_obj('NoHand', 'NO HAND HOLD', 0.04, C['livery'], M['decal_dark'], (0.05, y, 2.15 + 0.1), rot=(0, 0, math.pi / 2))

    # ---- pusher engine / nacelle / 3-blade propeller
    rings = []
    for i, (x, r) in enumerate(((-2.6, 0.3), (-2.9, 0.4), (-3.25, 0.42), (-3.55, 0.3), (-3.72, 0.12), (-3.78, 0.02))):
        rings.append([Vector((x, 0 + ry, 1.08 + rz)) for (ry, rz) in superellipse(0, 0, r, r, 2.0, 24)])
    loft('PusherNacelle', rings, C['pusher'], skinM, subsurf=1)
    pp = bpy.data.objects.new('PusherProp', None); C['pusher'].objects.link(pp); pp.location = (-3.82, 0, 1.08)
    for i in range(3):
        stl = []
        for j in range(0, 14):
            r = 0.12 + j * 0.065
            chord = 0.16 - 0.07 * (r / 0.98) ** 1.3
            stl.append((Vector((0, r, 0)), max(chord, 0.04), math.radians(30 - 20 * r / 0.98), 1.0))
        b = airfoil_loft('PushBlade%d' % i, stl, C['pusher'], M['carbon'], t=0.07)
        b.parent = pp
        b.matrix_basis = Matrix.Rotation(i * 2 * math.pi / 3, 4, 'X')   # span axis is +Y; 120 deg steps about the prop axis (X)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=0.12, radius2=0.02, depth=0.3)
    bm.transform(Matrix.Rotation(math.pi / 2, 4, 'Y') @ Matrix.Identity(4)); bm.transform(Matrix.Translation((-3.92, 0, 1.08)))
    _mesh_obj('Spinner', bm, C['pusher'], M['green'])

    # ---- ICE engine, fuel tank, exhaust, hoses
    box('EngineBlock', (0.9, 0.55, 0.5), (-2.4, 0, 0.98), C['ice'], M['dark'], 0.04)
    for i in range(4):
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.09, radius2=0.09, depth=0.34)
        bm.transform(Matrix.Translation((-2.7 + i * 0.28, 0, 1.35))); _mesh_obj('Cylinder', bm, C['ice'], M['metal'], bevel=0.01)
        for s in (-1, 1):
            box('Fin', (0.05, 0.62, 0.16), (-2.7 + i * 0.28, 0, 1.2), C['ice'], M['brass'], 0.0)
    for (pts, mat) in (([(-2.0, -0.18, 0.95), (-1.6, -0.3, 1.3), (-1.1, -0.15, 0.9)], 'green'), ([(-2.0, 0.18, 0.95), (-1.55, 0.3, 1.25), (-1.1, 0.15, 0.85)], 'orange')):
        cu = bpy.data.curves.new('Hose', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.03; cu.bevel_resolution = 4
        sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
        for p, c in zip(sp.points, pts):
            p.co = (*c, 1)
        o = bpy.data.objects.new('Hose', cu); C['ice'].objects.link(o); o.data.materials.append(M[mat])
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.05, radius2=0.05, depth=1.0)
    bm.transform(Matrix.Rotation(math.pi / 2, 4, 'Y')); bm.transform(Matrix.Translation((-2.85, 0.24, 0.72))); _mesh_obj('Exhaust', bm, C['ice'], M['metal'])
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=0.3); bmesh.ops.scale(bm, vec=(1.6, 1.0, 1.0), verts=bm.verts)
    bm.transform(Matrix.Translation((-0.95, 0, 0.78))); _mesh_obj('FuelTank', bm, C['ice'], M['amber'])

    # ---- battery with Hili label, BMS
    for z in (0.82, 1.36):
        box('BatteryPack', (1.0, 0.82, 0.52), (2.3, 0, z), C['battery'], M['slate'], 0.03)
    box('BatteryLabel', (0.8, 0.005, 0.36), (2.3, 0.415, 1.36), C['battery'], M['logo'], 0.0)
    box('BatteryLabel', (0.8, 0.005, 0.36), (2.3, -0.415, 1.36), C['battery'], M['logo'], 0.0)
    box('BMS', (0.45, 0.5, 0.28), (1.5, 0, 0.88), C['battery'], M['white'], 0.03)
    box('BMS_LED', (0.08, 0.08, 0.02), (1.5, 0, 1.03), C['battery'], M['led_green'], 0.0)

    # ---- cargo bay: two euro pallets with cartons and tie-down rails
    for x in (-0.15, 1.3):
        box('Pallet', (1.2, 0.8, 0.12), (x, 0, 0.72), C['cargo'], M['wood'], 0.01)
        for i, (px, py) in enumerate(((-0.28, -0.2), (0.28, -0.2), (-0.28, 0.2), (0.28, 0.2))):
            box('Carton', (0.52, 0.36, 0.44), (x + px, py, 1.0), C['cargo'], M['card'], 0.02)
    for y in (-0.55, 0.55):
        box('TieRail', (3.8, 0.03, 0.03), (0.65, y, 0.76), C['cargo'], M['metal'], 0.0)

    # ---- avionics, flight computers A/B, GNSS antennas, C2 radios and wiring
    box('AvionicsBox', (1.2, 0.7, 0.45), (0.6, 0, 1.45), C['avionics'], M['dark'], 0.05)
    box('AvionicsFace', (0.5, 0.65, 0.25), (1.35, 0, 1.4), C['avionics'], M['white'], 0.03)
    for y in (-0.28, 0.28):
        box('FCC', (0.4, 0.34, 0.2), (-0.35, y, 1.4), C['avionics'], M['slate'], 0.03)
        box('FCC_LED', (0.05, 0.05, 0.02), (-0.15, y, 1.51), C['avionics'], M['led_green'], 0.0)
    for (x, y) in ((0.1, 0.1), (0.85, -0.12)):
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=0.2, radius2=0.2, depth=0.05)
        bm.transform(Matrix.Translation((x, y, 1.97))); _mesh_obj('GNSS', bm, C['avionics'], M['brass'], bevel=0.008)
    box('C2Radio', (0.4, 0.45, 0.25), (-0.95, 0, 0.92), C['c2'], M['white'], 0.03)
    for y in (-0.4, 0.4):
        box('C2Antenna', (0.3, 0.02, 0.17), (-2.0, y, 1.78), C['c2'], M['white'], 0.0)
    cu = bpy.data.curves.new('Harness', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.022; cu.bevel_resolution = 4
    pts = [(2.2, 0.1, 0.9), (1.2, 0.1, 1.1), (0.5, 0.05, 1.3), (-0.6, 0.05, 1.15), (-1.8, 0, 1.15), (-2.5, 0, 1.0)]
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts):
        p.co = (*c, 1)
    ho = bpy.data.objects.new('Harness', cu); C['c2'].objects.link(ho); ho.data.materials.append(M['led_green'])
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.012, radius2=0.012, depth=0.5)
    bm.transform(Matrix.Rotation(math.pi / 2, 4, 'Y')); bm.transform(Matrix.Translation((3.8, 0, 1.12))); _mesh_obj('PitotTube', bm, C['c2'], M['metal'])

    # ---- landing gear: main pods with wheels, nose wheel
    def wheel(name, loc, r=0.21, w=0.16):
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=r, radius2=r, depth=w)
        bm.transform(Matrix.Rotation(math.pi / 2, 4, 'X')); bm.transform(Matrix.Translation(loc))
        o = _mesh_obj(name, bm, C['gear'], M['rubber'], bevel=0.03)
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.11, radius2=0.11, depth=w + 0.01)
        bm.transform(Matrix.Rotation(math.pi / 2, 4, 'X')); bm.transform(Matrix.Translation(loc)); _mesh_obj(name + 'Hub', bm, C['gear'], M['metal'])
    for s in (1, -1):
        rings = []
        for (z, rx, ry) in ((0.10, 0.12, 0.08), (0.2, 0.22, 0.12), (0.5, 0.27, 0.15), (0.85, 0.26, 0.15), (1.0, 0.2, 0.1)):
            rings.append([Vector((-1.4 + px, s * 0.95 + py, z)) for (px, py) in superellipse(0, 0, rx, ry, 2.2, 20)])
        loft('MainPod', rings, C['gear'], skinM, subsurf=1)
        box('MainStrut', (0.5, 0.5, 0.12), (-1.4, s * 0.72, 0.95), C['gear'], skinM, 0.03)
        wheel('MainWheel', (-1.4, s * 0.95, 0.21))
    wheel('NoseWheel', (2.7, 0, 0.21)); box('NoseStrut', (0.1, 0.1, 0.2), (2.7, 0, 0.32), C['gear'], M['dark'], 0.01)

    # ---- livery (green swoosh, Hili logo, UAE flags) — visible only with the closed skin
    for s in (1, -1):
        pts = []
        for i in range(0, 60):
            x = 3.1 - i * 0.105
            zb, zt, w = fuselage_height_at(x)
            zline = 1.18 if x < 0.9 else 1.18 - 0.7 * ((x - 0.9) / 2.2) ** 1.6
            if x > 3.1:
                continue
            # pick the point on the superellipse surface at height zline
            zc, h = (zb + zt) / 2, (zt - zb) / 2
            v = max(-1, min(1, (zline - zc) / h))
            y = w * (max(0.0, 1 - abs(v) ** 2.7)) ** (1 / 2.7)
            pts.append((x, s * (y + 0.004), zline))
        cu = bpy.data.curves.new('Swoosh', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.035; cu.bevel_resolution = 3
        sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
        for p, c in zip(sp.points, pts):
            p.co = (*c, 1)
        o = bpy.data.objects.new('Swoosh', cu); C['livery'].objects.link(o); o.data.materials.append(M['green'])
        # logo decal
        zb, zt, w = fuselage_height_at(2.1)
        quad('Logo', 0.9, 0.45, C['livery'], M['logo'], (2.05, s * (fus_y(2.05, 1.38) + 0.012), 1.38), (math.pi / 2, 0, math.pi) if s > 0 else (math.pi / 2, 0, 0))
        quad('Flag', 0.7, 0.44, C['livery'], M['flag'], (-4.6, s * (1.78 + 0.052), 2.45), (math.pi / 2, 0, math.pi) if s > 0 else (math.pi / 2, 0, 0))

    # nav lights
    for (y, mat) in ((5.9, 'led_red'), (-5.9, 'led_green')):
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=0.05)
        bm.transform(Matrix.Translation((0.2, y, 2.2))); _mesh_obj('NavLight', bm, C['wing'], M[mat])
    emp = bpy.data.objects.new('HiliRoot' + tag, None); scene_coll.objects.link(emp)
    for key, c in C.items():     # one empty per assembly part so web/animation code can show / hide / move whole parts
        pe = bpy.data.objects.new('part_' + key + tag, None); scene_coll.objects.link(pe); pe.parent = emp
        for o in c.objects:
            if o.parent is None and o is not pe:
                o.parent = pe
    if skin == 'ghost':
        C['livery'].hide_render = True; C['livery'].hide_viewport = True
    return {'root': root, 'C': C, 'M': M, 'rotors': rotors, 'pusher_prop': pp, 'empty': emp}
