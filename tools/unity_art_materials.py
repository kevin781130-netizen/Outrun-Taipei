"""Offline, deterministic material data. No runtime texture generation.

glTF: metallic=B, roughness=G, explicit occlusion=R (linear).
Unity Standard: metallic=R, occlusion=G, smoothness=A (linear).
Do not infer occlusion from an ORM filename when glTF does not bind it.
"""
import math
from PIL import Image


def pack_standard(metallic_roughness, metallic=1.0, roughness=1.0, occlusion=None, strength=1.0):
    if not all(math.isfinite(v) and 0 <= v <= 1 for v in (metallic, roughness, strength)):
        raise ValueError('Material factors must be finite values in [0,1]')
    image = metallic_roughness.convert('RGB')
    ao = occlusion.convert('RGB') if occlusion is not None else None
    if ao is not None and ao.size != image.size:
        raise ValueError('Differing AO/MR resolutions require an explicit resampling policy')
    r, g, b = image.split()
    metal = b.point([round(i * metallic) for i in range(256)])
    smooth = g.point([round(255 - i * roughness) for i in range(256)])
    ambient = (ao.getchannel('R').point([round(255 + (i - 255) * strength) for i in range(256)])
               if ao is not None else Image.new('L', image.size, 255))
    return Image.merge('RGBA', (metal, ambient, Image.new('L', image.size, 0), smooth))


def grain(x, y, seed):
    n = ((x * 374761393) ^ (y * 668265263) ^ seed) & 0xffffffff
    n = ((n ^ (n >> 13)) * 1274126177) & 0xffffffff
    return ((n ^ (n >> 16)) & 65535) / 65535


def surface(kind, size=512):
    if kind not in ('Asphalt', 'Pavement') or size < 16 or size % 4:
        raise ValueError('Expected Asphalt/Pavement and size divisible by four, >=16')
    colors, masks, heights = [], [], []
    for y in range(size):
        for x in range(size):
            noise = grain(x, y, 1729)
            broad = math.sin(2 * math.pi * x / size) * math.cos(4 * math.pi * y / size)
            if kind == 'Asphalt':
                # Dark aggregate, modest albedo variation and no painted-in shadows.
                value = round(48 + (noise - .5) * 22 + broad * 3 + (12 if noise > .97 else 0))
                colors.append((value, value + 2, value + 4))
                masks.append((0, 255, 0, round(20 + noise * 12)))
                heights.append((noise - .5) * .18)
            else:
                cell = size // 4
                grout = (x % cell < 2 or y % cell < 2)
                tile = grain(x // cell, y // cell, 99)
                value = round((99 if grout else 146 + tile * 15) + (noise - .5) * 7)
                colors.append((value, value - 3, value - 9))
                masks.append((0, 235 if grout else 255, 0, 22 if grout else 38))
                heights.append((-.3 if grout else 0) + (noise - .5) * .015)
    normals = []
    for y in range(size):
        for x in range(size):
            dx = heights[y * size + (x + 1) % size] - heights[y * size + (x - 1) % size]
            dy = heights[((y + 1) % size) * size + x] - heights[((y - 1) % size) * size + x]
            length = math.sqrt(dx * dx + dy * dy + 1)
            normals.append(tuple(round((v / length * .5 + .5) * 255) for v in (-dx, dy, 1)))
    result = {}
    for name, mode, pixels in (('BaseColor', 'RGB', colors), ('Mask', 'RGBA', masks), ('Normal', 'RGB', normals)):
        image = Image.new(mode, (size, size)); image.putdata(pixels); result[name] = image
    return result
