#!/usr/bin/env python3
"""
Stand-in sign-in panel texture for the Meezan tenant: dark charcoal stone with
fine gold veins, written to public/brand/meezan/auth-stone.webp.

PLACEHOLDER. The client's own marble has not been supplied (the copy inside
their mockup is a 1240px screenshot with the M baked into it). When it is,
replace the .webp, or point `theme.authPanel.texture` in fixtures/firm.ts at
the new file. This script is not part of the build.

How it is made, so it can be re-run or tuned:
  * Every noise field is filtered white noise in the frequency domain, so each
    field is periodic and the image tiles seamlessly in both directions.
  * Frequencies are squeezed horizontally, so features run vertically, like a
    slab cut along the bed.
  * Veins are the classic marble function, the zero crossings of
    sin(direction + turbulence): long diagonal lines that wander and fade.
  * Colours are the tenant's tokens: `ink` (#464648) darkened to stone, and
    `ornament` (#b0935b) for the veins, with `action-pressed` (#6f572f) for the
    fainter ones. No other colour is introduced.

Usage:  python3 scripts/generate-auth-stone.py  [--seed N]
Needs numpy and Pillow (with WebP support).
"""
import argparse
import io
from pathlib import Path

import numpy as np
from PIL import Image

W, H = 800, 1800
OUT = Path(__file__).resolve().parent.parent / 'public/brand/meezan/auth-stone.webp'
MAX_BYTES = 150 * 1024

INK = np.array([0x46, 0x46, 0x48], dtype=np.float64)
GOLD = np.array([0xB0, 0x93, 0x5B], dtype=np.float64)
BRONZE = np.array([0x6F, 0x57, 0x2F], dtype=np.float64)


def field(rng, beta, stretch=1.0, low=0.0):
    """Periodic 1/f^beta noise, zero mean, unit std. `stretch` > 1 elongates vertically."""
    noise = rng.standard_normal((H, W))
    fy = np.fft.fftfreq(H)[:, None] * H / W  # same units as fx, so features stay round at stretch 1
    fx = np.fft.fftfreq(W)[None, :]
    f = np.sqrt((fx * stretch) ** 2 + fy ** 2)
    f[0, 0] = 1.0
    amp = 1.0 / f ** beta
    if low:
        amp[f < low] = 0.0
    amp[0, 0] = 0.0
    out = np.real(np.fft.ifft2(np.fft.fft2(noise) * amp))
    return (out - out.mean()) / out.std()


def sample(img, x, y):
    """Bilinear sample with wrap-around, so warping keeps the tile seamless."""
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    tx, ty = x - x0, y - y0
    x0 %= W
    y0 %= H
    x1, y1 = (x0 + 1) % W, (y0 + 1) % H
    top = img[y0, x0] * (1 - tx) + img[y0, x1] * tx
    bottom = img[y1, x0] * (1 - tx) + img[y1, x1] * tx
    return top * (1 - ty) + bottom * ty


def veins(rng, kx, ky, turbulence, width, stretch, presence):
    """
    Classic marble: the zero crossings of sin(direction + turbulence). The
    direction completes whole cycles across the tile (kx across, ky down), so
    the lines stay seamless; turbulence bends them off the straight. Faded in
    and out along their length so they break, as real veins do.
    """
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    bend = field(rng, 2.8, stretch) + 0.3 * field(rng, 2.1, stretch)
    phase = 2 * np.pi * (kx * xx / W + ky * yy / H) + turbulence * bend
    wave = np.sin(phase)
    # Distance to the zero crossing in pixels, so the line width is constant.
    gy, gx = np.gradient(wave)
    distance = np.abs(wave) / (np.sqrt(gx ** 2 + gy ** 2) + 1e-6)
    line = np.exp(-((distance / width) ** 2))
    fade = np.clip(field(rng, 2.4, stretch) * 0.7 + presence, 0.0, 1.0)
    return line * fade


def render(seed):
    rng = np.random.default_rng(seed)

    # Stone: `ink` taken down to charcoal, with broad clouding and fine grain.
    cloud = field(rng, 2.2, stretch=2.2)
    grain = field(rng, 0.6)
    tone = 0.56 + 0.07 * cloud + 0.02 * grain
    stone = INK[None, None, :] * tone[:, :, None]

    # `presence` sets how much of each family survives the fading.
    major = veins(rng, kx=1, ky=1, turbulence=2.6, width=1.2, stretch=1.6, presence=0.55)
    minor = veins(rng, kx=1, ky=3, turbulence=3.0, width=0.7, stretch=1.4, presence=0.2)
    hair = veins(rng, kx=-2, ky=3, turbulence=3.5, width=0.5, stretch=1.2, presence=0.1)

    out = stone
    for mask, colour, alpha in ((hair, BRONZE, 0.55), (minor, BRONZE, 0.8), (major, GOLD, 0.8)):
        a = (mask * alpha)[:, :, None]
        out = out * (1 - a) + colour[None, None, :] * a
    return np.clip(out, 0, 255).astype(np.uint8)


def encode(pixels):
    img = Image.fromarray(pixels, 'RGB')
    for quality in range(82, 30, -4):
        buffer = io.BytesIO()
        img.save(buffer, 'WEBP', quality=quality, method=6)
        if buffer.tell() <= MAX_BYTES:
            return buffer.getvalue(), quality
    raise SystemExit('Could not fit the texture under 150 KB.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seed', type=int, default=1959)
    args = parser.parse_args()
    data, quality = encode(render(args.seed))
    OUT.write_bytes(data)
    print(f'{OUT.relative_to(OUT.parents[3])}: {W}x{H}, quality {quality}, {len(data) / 1024:.1f} KB')


if __name__ == '__main__':
    main()
