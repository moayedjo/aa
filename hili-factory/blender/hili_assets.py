"""High-detail props for the Hili site: technicians (articulated), cars / trucks, pallets, wrapped loads and racks.
All meshes are lofted / subdivided like the aircraft so they hold up in close-ups.  Functions take the material dict `M`
from hili_site.materials() so the look stays consistent."""
import math
import random
import bpy
import bmesh
from mathutils import Vector, Matrix
import os
import hili_aircraft as HA

LIGHT = bool(os.environ.get('SITE_LIGHT'))


# ----------------------------------------------------------------------------- shared helpers
def empty(name, coll, parent=None, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None); coll.objects.link(e); e.location = loc
    if parent:
        e.parent = parent
    return e


def cube(name, size, loc, coll, mat, bevel=0.01, parent=None, rot=(0, 0, 0)):
    if LIGHT and bevel < 0.03:
        bevel = 0.0   # web export: flat boxes keep the file small
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    o = HA._mesh_obj(name, bm, coll, mat, smooth=False, bevel=bevel)
    o.scale = size; o.location = loc; o.rotation_euler = rot
    if parent:
        o.parent = parent
    return o


def ball(name, c, s, coll, mat, parent=None, seg=24):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=1.0)
    bmesh.ops.scale(bm, vec=s, verts=bm.verts)
    o = HA._mesh_obj(name, bm, coll, mat, smooth=True)
    o.location = c
    if parent:
        o.parent = parent
    return o


def cylinder(name, r, h, loc, coll, mat, axis='Z', seg=32, parent=None, bevel=0.0):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=h)
    rot = {'Z': Matrix.Identity(4), 'X': Matrix.Rotation(math.pi / 2, 4, 'Y'), 'Y': Matrix.Rotation(math.pi / 2, 4, 'X')}[axis]
    bm.transform(rot)
    o = HA._mesh_obj(name, bm, coll, mat, smooth=True, bevel=bevel)
    o.location = loc
    if parent:
        o.parent = parent
    return o


def tube(name, pts, radii, coll, mat, squash=1.0, N=16, sub=1, parent=None, n=2.0):
    """Tapered tube through points (parallel-ish frames) — arms, legs, torso, hoses."""
    rings = []
    P = [Vector(p) for p in pts]
    for i, (c, r) in enumerate(zip(P, radii)):
        t = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized()
        up = Vector((0, 0, 1)) if abs(t.z) < 0.95 else Vector((1, 0, 0))
        a = t.cross(up).normalized(); b = t.cross(a).normalized()
        ring = []
        for k in range(N):
            th = 2 * math.pi * k / N
            ct, st = math.cos(th), math.sin(th)
            ring.append(c + a * (r * math.copysign(abs(ct) ** (2 / n), ct)) + b * (r * squash * math.copysign(abs(st) ** (2 / n), st)))
        rings.append(ring)
    o = HA.loft(name, rings, coll, mat, cap=True, subsurf=sub)
    if parent:
        o.parent = parent
    return o


# ----------------------------------------------------------------------------- technicians
POSES = {
    #        shoulder flex (L, R)   elbow flex (L, R)   hip flex (L, R)  knee (L, R)  spine lean  head
    'work':  ((-1.15, -0.95), (-0.9, -1.2), (0.0, 0.0), (0.0, 0.0), 0.12),
    'stand': ((0.08, -0.05), (-0.18, -0.12), (0.0, -0.04), (0.0, 0.06), 0.0),
    'walk':  ((0.45, -0.45), (-0.25, -0.35), (-0.35, 0.35), (0.35, 0.05), 0.04),
    'neutral': ((0.0, 0.0), (0.0, 0.0), (0.0, 0.0), (0.0, 0.0), 0.0),
    'point': ((-0.2, -1.5), (-0.2, -0.1), (0.0, 0.0), (0.0, 0.0), 0.0),
}


def make_worker(M, coll, name, vest='vest_green', pose='work', loc=(0, 0, 0), yaw=0.0, scale=1.0, skin='skin_tone', helmet='helmet'):
    """Articulated technician (1.78 m).  Nodes: legL/legR, armL/armR, head so the web viewer can animate them."""
    root = empty(name, coll, loc=loc); root.rotation_euler = (0, 0, yaw); root.scale = (scale,) * 3
    sh, el, hp, kn, lean = POSES[pose]
    over, vestm, skinm, boot, glove = M['overall'], M[vest], M[skin], M['rubber'], M['slate']
    # pelvis + torso (lofted, slightly leaning)
    spine = empty('spine', coll, root, (0, 0, 0.95)); spine.rotation_euler = (0, lean, 0)
    tube('Torso', [(0, 0, -0.02), (0, 0, 0.08), (0, 0, 0.2), (0, 0, 0.33), (0, 0, 0.45), (0, 0, 0.54), (0, 0, 0.6), (0, 0, 0.64)],
         [0.13, 0.168, 0.158, 0.17, 0.2, 0.205, 0.13, 0.05], coll, over, squash=0.62, N=20, sub=1, parent=spine)
    tube('Vest', [(0, 0, 0.1), (0, 0, 0.22), (0, 0, 0.35), (0, 0, 0.47), (0, 0, 0.54)], [0.176, 0.166, 0.178, 0.208, 0.212], coll, vestm, squash=0.66, N=20, sub=1, parent=spine)
    for z in (0.18, 0.4):
        tube('VestStripe', [(0, 0, z - 0.022), (0, 0, z + 0.022)], [0.182 if z < 0.3 else 0.2, 0.182 if z < 0.3 else 0.2], coll, M['reflective'], squash=0.66, N=24, sub=0, parent=spine)
    for s in (-1, 1):
        ball('ShoulderCap', (0, s * 0.2, 0.52), (0.062, 0.062, 0.062), coll, over, spine, 14)
        cube('VestPocket', (0.02, 0.1, 0.09), (0.112, s * 0.07, 0.16), coll, M['reflective'], 0.006, spine)
    cube('Belt', (0.27, 0.34, 0.03), (0, 0, 0.0), coll, M['rubber'], 0.008, spine)
    cube('Badge', (0.012, 0.07, 0.04), (0.113, 0.1, 0.43), coll, M['white'], 0.003, spine)
    tube('Neck', [(0, 0, 0.58), (0, 0, 0.7)], [0.052, 0.05], coll, skinm, parent=spine)
    head = empty('head', coll, spine, (0, 0, 0.75))
    ball('Head', (0.005, 0, 0.03), (0.098, 0.088, 0.118), coll, skinm, head)
    ball('Jaw', (0.02, 0, -0.03), (0.075, 0.07, 0.07), coll, skinm, head, 18)
    ball('Nose', (0.092, 0, 0.0), (0.02, 0.016, 0.024), coll, skinm, head, 12)
    for s in (-1, 1):
        ball('Ear', (0, s * 0.08, 0.02), (0.016, 0.01, 0.03), coll, skinm, head, 10)
        ball('Eye', (0.07, s * 0.032, 0.035), (0.012, 0.012, 0.012), coll, M['dark_eye'], head, 8)
    ball('Glasses', (0.074, 0, 0.034), (0.012, 0.075, 0.022), coll, M['glass_dark'], head, 12)
    # hard hat (dome + brim)
    dome = []
    prof = [(0.0, 0.178, 0.001), (0.02, 0.17, 0.062), (0.09, 0.145, 0.108), (0.14, 0.12, 0.119), (0.185, 0.09, 0.126), (0.215, 0.115, 0.13)]
    for (z, rr, rb) in [(0.215, 0.002, 0.002), (0.205, 0.07, 0.07), (0.17, 0.105, 0.098), (0.11, 0.122, 0.112), (0.045, 0.128, 0.118), (0.0, 0.13, 0.12), (-0.012, 0.15, 0.125)]:
        dome.append([Vector((0.01 + px, py, 0.03 + z - 0.03)) for (px, py) in HA.superellipse(0, 0, rb * 1.05, rr, 2.2, 24)])
    h = HA.loft('Helmet', dome, coll, M[helmet], cap=True, subsurf=1); h.parent = head
    cube('HelmetRidge', (0.2, 0.03, 0.012), (0.0, 0, 0.215), coll, M[helmet], 0.004, head)
    # arms
    for side, i in ((1, 0), (-1, 1)):
        arm = empty('armL' if side == 1 else 'armR', coll, spine, (0, side * 0.215, 0.5))
        arm.rotation_euler = (side * 0.05, sh[i], 0)
        tube('UpperArm', [(0, 0, 0.0), (0, 0, -0.14), (0, 0, -0.29)], [0.062, 0.055, 0.047], coll, over, parent=arm)
        ball('Elbow', (0, 0, -0.29), (0.05, 0.05, 0.05), coll, over, arm, 14)
        fore = empty('fore', coll, arm, (0, 0, -0.29)); fore.rotation_euler = (0, el[i], 0)
        tube('Forearm', [(0, 0, 0.0), (0, 0, -0.14), (0, 0, -0.27)], [0.05, 0.042, 0.034], coll, over, parent=fore)
        ball('Hand', (0.012, 0, -0.325), (0.042, 0.03, 0.058), coll, glove, fore, 14)
        cube('Cuff', (0.1, 0.1, 0.03), (0, 0, -0.28), coll, M['slate'], 0.008, fore)
        ball('Thumb', (0.035, 0, -0.3), (0.014, 0.012, 0.03), coll, glove, fore, 8)
    # legs
    for side, i in ((1, 0), (-1, 1)):
        leg = empty('legL' if side == 1 else 'legR', coll, root, (0, side * 0.095, 0.93)); leg.rotation_euler = (0, hp[i], 0)
        tube('Thigh', [(0, 0, 0.0), (0, 0, -0.2), (0, 0, -0.43)], [0.105, 0.088, 0.066], coll, over, parent=leg)
        ball('Hip', (0, 0, 0.0), (0.1, 0.1, 0.1), coll, over, leg, 14)
        ball('Knee', (0, 0, -0.43), (0.068, 0.068, 0.068), coll, over, leg, 14)
        shin = empty('shin', coll, leg, (0, 0, -0.43)); shin.rotation_euler = (0, -kn[i], 0)
        tube('Shin', [(0, 0, 0.0), (0, 0, -0.2), (0, 0, -0.41)], [0.07, 0.058, 0.048], coll, over, parent=shin)
        b = tube('Boot', [(-0.04, 0, -0.45), (0.02, 0, -0.49), (0.12, 0, -0.5)], [0.062, 0.06, 0.05], coll, boot, squash=1.3, sub=1, parent=shin)
        cube('KneePad', (0.05, 0.12, 0.1), (0.07, 0, -0.02), coll, M['rubber'], 0.01, leg if False else shin)
        cube('BootSole', (0.3, 0.1, 0.03), (0.06, 0, -0.505), coll, M['dark_eye'], 0.01, shin)
    return root


# ----------------------------------------------------------------------------- cars and trucks
def _wheel(M, coll, parent, x, y, z, r=0.34, w=0.24, side=1):
    c = empty('wheel', coll, parent, (x, y, z))
    cylinder('Tire', r, w, (0, 0, 0), coll, M['rubber'], axis='Y', seg=48, parent=c, bevel=0.03)
    cylinder('Rim', r * 0.68, w + 0.012, (0, 0, 0), coll, M['rim'], axis='Y', seg=36, parent=c, bevel=0.01)
    cylinder('Hub', r * 0.18, w + 0.03, (0, side * 0.0, 0), coll, M['dark_eye'], axis='Y', seg=16, parent=c)
    for k in range(5):
        a = 2 * math.pi * k / 5
        cube('Spoke', (r * 0.6, 0.02, r * 0.11), (math.cos(a) * r * 0.34, side * (w / 2 + 0.008), math.sin(a) * r * 0.34), coll, M['rim'], 0.003, c, rot=(0, -a, 0))
    cylinder('Disc', r * 0.55, 0.02, (0, side * -0.04, 0), coll, M['rim_dark'], axis='Y', seg=32, parent=c)
    return c


def make_car(M, coll, name, mat, kind='sedan', loc=(0, 0, 0), yaw=0.0):
    L, W, H = {'sedan': (4.6, 1.86, 1.46), 'suv': (4.8, 1.92, 1.74), 'van': (5.3, 1.95, 2.05)}[kind]
    root = empty(name, coll, loc=loc); root.rotation_euler = (0, 0, yaw)
    paint = M[mat]
    hx = L / 2
    belt = 0.95 if kind != 'sedan' else 0.9
    # lower body: stations (x, zbot, ztop, halfwidth)
    st = [(hx, 0.42, 0.62, 0.52), (hx - 0.12, 0.34, 0.74, 0.76), (hx - 0.45, 0.3, belt - 0.12, 0.9), (hx - 1.0, 0.28, belt - 0.05, W / 2),
          (0.2, 0.28, belt, W / 2), (-hx + 0.8, 0.28, belt, W / 2), (-hx + 0.3, 0.3, belt - 0.03, 0.86), (-hx + 0.06, 0.36, belt - 0.12, 0.72), (-hx, 0.45, belt - 0.3, 0.55)]
    rings = []
    for (x, zb, zt, w) in st:
        zc, h = (zb + zt) / 2, (zt - zb) / 2
        rings.append([Vector((x, y, z)) for (y, z) in HA.superellipse(0, zc, w, h, 3.4, 28)])
    body = HA.loft('Body', rings, coll, paint, cap=True, subsurf=2); body.parent = root
    # greenhouse (glass) + roof skin
    gx = {'sedan': (1.05, -1.2), 'suv': (0.95, -1.9), 'van': (1.6, -2.4)}[kind]
    gst = [(gx[0] + 0.55, belt - 0.05, belt + 0.02, 0.76), (gx[0], belt - 0.02, H - 0.06, 0.74), (gx[0] - 0.6, belt, H, 0.72), (gx[1] + 0.7, belt, H, 0.72), (gx[1] + 0.2, belt - 0.02, H - 0.1, 0.72), (gx[1] - 0.05, belt - 0.05, belt + 0.12, 0.74)]
    rings = []
    for (x, zb, zt, w) in gst:
        zc, h = (zb + zt) / 2, max(0.02, (zt - zb) / 2)
        rings.append([Vector((x, y, z)) for (y, z) in HA.superellipse(0, zc, w, h, 3.0, 24)])
    gh = HA.loft('Greenhouse', rings, coll, M['glass_car'], cap=True, subsurf=1); gh.parent = root
    roof = []
    for (x, zb, zt, w) in gst[1:5]:
        zc = zt + 0.005
        roof.append([Vector((x, y, z)) for (y, z) in HA.superellipse(0, zc, w * 0.86, 0.02, 3.0, 24)])
    rf = HA.loft('Roof', roof, coll, paint, cap=True, subsurf=1); rf.parent = root
    # wheels
    for x in (hx - 1.0, -hx + 0.95):
        for s in (-1, 1):
            _wheel(M, coll, root, x, s * (W / 2 - 0.13), 0.34, side=s)
    # lights, grille, plates, mirrors, handles
    for s in (-1, 1):
        ball('Headlight', (hx - 0.3, s * 0.5, 0.66), (0.04, 0.15, 0.05), coll, M['headlight'], root, 14)
        ball('Taillight', (-hx + 0.2, s * 0.56, 0.74), (0.04, 0.17, 0.06), coll, M['taillight'], root, 14)
        cube('Mirror', (0.12, 0.1, 0.07), (gx[0] - 0.15, s * (W / 2 - 0.08), belt + 0.0), coll, paint, 0.02, root)
        cube('Handle', (0.16, 0.02, 0.025), (0.0, s * (W / 2 + 0.002), belt - 0.06), coll, M['rim'], 0.005, root)
        cube('DoorLine', (0.004, 0.003, belt - 0.3), (0.45, s * (W / 2 + 0.004), 0.6), coll, M['dark_eye'], 0, root)
        cube('DoorLine', (0.004, 0.003, belt - 0.3), (-0.7, s * (W / 2 + 0.004), 0.6), coll, M['dark_eye'], 0, root)
    cube('Grille', (0.03, 0.6, 0.12), (hx - 0.03, 0, 0.52), coll, M['dark_eye'], 0.01, root)
    cube('Plate', (0.01, 0.34, 0.12), (hx + 0.003, 0, 0.4), coll, M['plate'], 0.004, root)
    cube('Plate', (0.01, 0.34, 0.12), (-hx - 0.0, 0, 0.5), coll, M['plate'], 0.004, root)
    cube('BumperF', (0.1, W - 0.4, 0.14), (hx - 0.02, 0, 0.36), coll, M['rubber'], 0.04, root)
    cube('BumperR', (0.1, W - 0.4, 0.14), (-hx + 0.01, 0, 0.4), coll, M['rubber'], 0.04, root)
    return root


def make_truck(M, coll, name, loc=(0, 0, 0), yaw=0.0, semi=False):
    root = empty(name, coll, loc=loc); root.rotation_euler = (0, 0, yaw)
    bl = 12.6 if semi else 6.6
    cx = 3.5 if semi else 3.7
    bx = -3.4 if semi else -0.6
    # cab (lofted, rounded) with windscreen
    st = [(cx + 1.2, 0.5, 2.2, 1.0), (cx + 1.0, 0.45, 3.0, 1.1), (cx + 0.2, 0.45, 3.35, 1.14), (cx - 1.0, 0.45, 3.4, 1.14), (cx - 1.12, 0.5, 3.3, 1.1)]
    rings = []
    for (x, zb, zt, w) in st:
        zc, h = (zb + zt) / 2, (zt - zb) / 2
        rings.append([Vector((x, y, z)) for (y, z) in HA.superellipse(0, zc, w, h, 3.8, 28)])
    cab = HA.loft('Cab', rings, coll, M['cab'], cap=True, subsurf=1); cab.parent = root
    cube('Windscreen', (0.05, 2.0, 0.95), (cx + 0.98, 0, 2.55), coll, M['glass_car'], 0.04, root, rot=(0, -0.28, 0))
    for s in (-1, 1):
        cube('SideWin', (0.9, 0.04, 0.7), (cx + 0.2, s * 1.13, 2.65), coll, M['glass_car'], 0.03, root)
        cube('Mirror', (0.12, 0.3, 0.5), (cx + 0.9, s * 1.35, 2.6), coll, M['dark_eye'], 0.02, root)
        ball('Headlight', (cx + 1.22, s * 0.78, 1.0), (0.05, 0.22, 0.12), coll, M['headlight'], root, 14)
    cube('Grille', (0.05, 1.5, 0.7), (cx + 1.2, 0, 1.25), coll, M['dark_eye'], 0.03, root)
    cube('Bumper', (0.3, 2.3, 0.35), (cx + 1.25, 0, 0.62), coll, M['rubber'], 0.06, root)
    # cargo box with ribs, green band and logo
    cube('Box', (bl, 2.55, 3.0), (bx, 0, 2.35), coll, M['white'], 0.07, root)
    cube('BoxBase', (bl + 0.04, 2.6, 0.5), (bx, 0, 1.0), coll, M['green'], 0.06, root)
    for i in range(int(bl / 1.1)):
        x = bx - bl / 2 + 0.55 + i * 1.1
        for s in (-1, 1):
            cube('Rib', (0.06, 0.03, 2.8), (x, s * 1.285, 2.35), coll, M['panel_line'], 0.01, root)
    cube('RearDoorLine', (0.03, 0.03, 2.8), (bx - bl / 2 - 0.005, 0, 2.35), coll, M['panel_line'], 0, root)
    for s in (-1, 1):
        HA.text_obj('Logo', 'LODD', 0.9, coll, M['green'], (bx, s * 1.29, 2.55), rot=(math.pi / 2, 0, 0 if s < 0 else math.pi), extrude=0.003).parent = root
        HA.text_obj('LogoSub', 'AUTONOMOUS', 0.26, coll, M['slate'], (bx, s * 1.29, 1.95), rot=(math.pi / 2, 0, 0 if s < 0 else math.pi), extrude=0.003).parent = root
    # chassis + wheels (dual rear)
    cube('Chassis', (bl + cx - bx - bl / 2 + 0.5, 1.3, 0.28), ((bx - bl / 2 + cx + 1.2) / 2, 0, 0.7), coll, M['dark_eye'], 0.03, root)
    axles = [cx, bx - 3.4, bx - 4.7, bx + 1.3] if semi else [cx, bx - 1.9, bx - 3.0]
    for x in axles:
        for s in (-1, 1):
            _wheel(M, coll, root, x, s * 1.02, 0.5, r=0.5, w=0.32, side=s)
            if x != cx:
                _wheel(M, coll, root, x, s * 1.42, 0.5, r=0.5, w=0.32, side=s)
    for s in (-1, 1):
        cube('Taillight', (0.05, 0.3, 0.16), (bx - bl / 2 - 0.02, s * 1.0, 0.95), coll, M['taillight'], 0.02, root)
    return root


# ----------------------------------------------------------------------------- warehouse: pallets, loads, racks
def pallet(M, coll, parent, loc, size=(1.2, 0.8)):
    root = empty('Pallet', coll, parent, loc)
    sx, sy = size
    for i in range(7):
        cube('Slat', (0.1, sy, 0.022), (-sx / 2 + 0.06 + i * (sx - 0.12) / 6, 0, 0.14), coll, M['wood'], 0.003, root)
    for x in (-sx / 2 + 0.07, 0, sx / 2 - 0.07):
        cube('Stringer', (0.09, sy, 0.1), (x, 0, 0.082), coll, M['wood_dark'], 0.004, root)
        for k in range(2):
            cube('Bottom', (0.09, 0.14, 0.02), (x, -sy / 2 + 0.08 + k * (sy - 0.16), 0.01), coll, M['wood'], 0.003, root)
    return root


def wrapped_load(M, coll, parent, loc, rnd, kind=None, size=(1.2, 0.8)):
    root = empty('Load', coll, parent, loc)
    pallet(M, coll, root, (0, 0, 0), size)
    kind = kind or rnd.choice(['cartons', 'cartons', 'wrapped', 'drums', 'crate'])
    z0 = 0.16
    sx, sy = size
    if kind in ('cartons', 'wrapped'):
        rows = rnd.randint(2, 4)
        for r in range(rows):
            for i in range(2):
                for j in range(2):
                    w, d, h = sx / 2 - 0.02, sy / 2 - 0.02, 0.3 + rnd.random() * 0.08
                    c = cube('Carton', (w, d, h), (-sx / 4 + i * sx / 2, -sy / 4 + j * sy / 2, z0 + r * 0.38 + h / 2), coll, M[rnd.choice(['carton', 'carton', 'carton_light'])], 0.012, root)
        if kind == 'wrapped':
            hh = rows * 0.38
            cube('Wrap', (sx + 0.03, sy + 0.03, hh + 0.02), (0, 0, z0 + hh / 2), coll, M['wrap'], 0.03, root)
    elif kind == 'drums':
        for i in range(2):
            for j in range(2):
                cylinder('Drum', 0.29, 0.88, (-0.3 + i * 0.6, -0.2 + j * 0.4 * 1.0, z0 + 0.44), coll, M[rnd.choice(['drum_blue', 'drum_green'])], seg=32, parent=root, bevel=0.02)
                for z in (0.25, 0.62):
                    cylinder('DrumRing', 0.296, 0.03, (-0.3 + i * 0.6, -0.2 + j * 0.4, z0 + z), coll, M['rim'], seg=32, parent=root)
    else:
        cube('Crate', (sx - 0.1, sy - 0.1, 0.9), (0, 0, z0 + 0.45), coll, M['wood'], 0.015, root)
        for k in range(5):
            cube('CrateSlat', (sx - 0.08, sy - 0.08, 0.012), (0, 0, z0 + 0.12 + k * 0.17), coll, M['wood_dark'], 0.004, root)
        for x in (-sx / 2 + 0.07, sx / 2 - 0.07):
            cube('CrateCorner', (0.06, sy - 0.06, 0.92), (x, 0, z0 + 0.45), coll, M['wood_dark'], 0.006, root)
    return root


def rack_unit(M, coll, rnd, name='RackUnit', empty_slots=()):
    root = empty(name, coll)
    bays, levels, bw = 2, (0.35, 2.55, 4.75), 3.2
    for sx in (-bw, 0.0, bw):
        for sy in (-0.8, 0.8):
            cube('Upright', (0.1, 0.07, 6.4), (sx, sy, 3.2), coll, M['rack_blue'], 0.008, root)
        for z in (0.3, 0.9, 1.5, 2.1, 2.7, 3.3, 3.9, 4.5, 5.1, 5.7, 6.3):
            cube('Brace', (0.05, 0.03, 0.04), (sx, 0.0, z), coll, M['rack_blue'], 0.004, root, rot=(0, 0, 0))
        cube('Guard', (0.22, 0.2, 0.4), (sx, -0.7, 0.2), coll, M['yellow'], 0.03, root)
    for z in levels:
        for y in (-0.8, 0.8):
            cube('Beam', (bw * 2 + 0.1, 0.06, 0.15), (0, y, z), coll, M['rack_orange'], 0.008, root)
        cube('Deck', (bw * 2 - 0.05, 1.5, 0.012), (0, 0, z + 0.08), coll, M['steel_plain'], 0.0, root)
        for b in range(bays):
            for k in range(2):
                slot = (z, b, k)
                if slot in empty_slots:
                    continue
                if rnd.random() < 0.12:
                    continue
                wrapped_load(M, coll, root, (-bw / 2 + b * bw + (-0.75 if k == 0 else 0.75), 0, z + 0.08), rnd)
    for x in (-bw * 0.5, bw * 0.5):
        pass
    return root
