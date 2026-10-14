"""Photographic finishing for the Cycles stills: filmic S-curve, split-toning, highlight bloom, lens vignette and fine grain."""
import numpy as np
from PIL import Image, ImageFilter


def grade(src, dst, vignette=0.22, bloom=0.10, grain=0.010, contrast=1.10, warmth=0.035, seed=3):
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255.0
    # bloom: blur the bright parts and add them back (soft glow around lights / specular highlights)
    lum = a.mean(axis=2, keepdims=True)
    hi = np.clip((lum - 0.72) / 0.28, 0, 1) * a
    hi_img = Image.fromarray((np.clip(hi, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=max(im.size) / 90))
    a = a + bloom * np.asarray(hi_img).astype(np.float32) / 255.0
    # filmic S-curve around mid-grey
    m = 0.5
    a = np.clip(a, 0, 1)
    a = m + (a - m) * contrast
    a = np.clip(a, 0, 1)
    a = a * a * (3 - 2 * a) * 0.35 + a * 0.65
    # split-tone: cool shadows, warm highlights
    shadow = 1 - np.clip(lum * 1.6, 0, 1)
    a[..., 2] += shadow[..., 0] * warmth * 0.9
    a[..., 0] += (1 - shadow[..., 0]) * warmth * 0.6
    a[..., 2] -= (1 - shadow[..., 0]) * warmth * 0.5
    # vignette
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    a *= (1 - vignette * np.clip(r - 0.35, 0, 1.2) ** 1.6)[..., None]
    # grain
    rng = np.random.default_rng(seed)
    a += rng.normal(0, grain, a.shape[:2])[..., None]
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst)
