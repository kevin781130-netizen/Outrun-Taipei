"""Convert the four checked-in CC0 glTF modules into Unity JsonUtility mesh data.

Deliberately supports only the static, identity-node, triangle subset used here.
Unsupported data fails instead of silently dropping transforms or animation.
Coordinates are converted RH -> LH by reflecting Z and reversing winding.
"""
import hashlib
import json
from pathlib import Path
import shutil
import struct

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/third_party/quaternius-downtown'
TARGET = ROOT / 'unity/TaipeiDrive/Assets/Generated/Source'
MODELS = ('Brick_RedWhite_DoubleWindow', 'Metal_Window', 'DoorFrame_Trim', 'Brick_Plain_1')
COMPONENTS = {5121: ('B', 1), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
WIDTHS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def local_path(base, uri):
    result = (base / uri).resolve()
    if not result.is_relative_to(base.resolve()) or not result.is_file():
        raise ValueError(f'Invalid local asset URI: {uri}')
    return result


def read_accessor(gltf, blobs, index):
    a = gltf['accessors'][index]
    if 'sparse' in a or a.get('normalized', False):
        raise ValueError('Sparse/normalized accessor unsupported')
    view = gltf['bufferViews'][a['bufferView']]
    fmt, size = COMPONENTS[a['componentType']]
    width = WIDTHS[a['type']]
    stride = view.get('byteStride', width * size)
    offset = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    end = offset + (a['count'] - 1) * stride + width * size
    if stride < width * size or end > view.get('byteOffset', 0) + view['byteLength']:
        raise ValueError('Accessor exceeds buffer view')
    return [struct.unpack_from('<' + fmt * width, blobs[view['buffer']], offset + i * stride)
            for i in range(a['count'])]


def convert(path):
    g = json.loads(path.read_text())
    if len(g['nodes']) != 1 or g['nodes'][0].get('mesh') != 0 or any(
            k in g['nodes'][0] for k in ('matrix', 'translation', 'rotation', 'scale', 'skin', 'children')):
        raise ValueError('Expected a single identity mesh node')
    if len(g['meshes']) != 1 or g.get('animations') or g.get('extensionsRequired'):
        raise ValueError('Unsupported glTF structure')
    blobs = [local_path(path.parent, b['uri']).read_bytes() for b in g['buffers']]
    parts = []
    for p in g['meshes'][0]['primitives']:
        if p.get('mode', 4) != 4 or p.get('targets'):
            raise ValueError('Only static triangles supported')
        attrs = p['attributes']
        positions = read_accessor(g, blobs, attrs['POSITION'])
        normals = read_accessor(g, blobs, attrs['NORMAL'])
        uv = read_accessor(g, blobs, attrs['TEXCOORD_0'])
        indices = [v[0] for v in read_accessor(g, blobs, p['indices'])]
        if len(positions) != len(normals) or len(positions) != len(uv) or len(indices) % 3:
            raise ValueError('Inconsistent mesh streams')
        if any(i < 0 or i >= len(positions) for i in indices):
            raise ValueError('Triangle index out of range')
        triangles = [i for j in range(0, len(indices), 3) for i in
                     (indices[j], indices[j + 2], indices[j + 1])]
        parts.append({'material': p['material'],
                      'vertices': [{'x': x, 'y': y, 'z': -z} for x, y, z in positions],
                      'normals': [{'x': x, 'y': y, 'z': -z} for x, y, z in normals],
                      'uv': [{'x': u, 'y': 1 - v} for u, v in uv], 'triangles': triangles})
    materials = []
    for m in g['materials']:
        pbr = m.get('pbrMetallicRoughness', {})
        texture = pbr.get('baseColorTexture')
        uri = ''
        if texture is not None:
            image = g['textures'][texture['index']]['source']
            uri = g['images'][image]['uri']
            local_path(path.parent, uri)
        materials.append({'name': m['name'], 'color': pbr.get('baseColorFactor', [1, 1, 1, 1]),
                          'texture': uri, 'metallic': pbr.get('metallicFactor', 1),
                          'roughness': pbr.get('roughnessFactor', 1),
                          'transparent': m.get('alphaMode') == 'BLEND',
                          'doubleSided': m.get('doubleSided', False)})
    return {'name': path.stem, 'parts': parts, 'materials': materials}


def main():
    TARGET.mkdir(parents=True, exist_ok=True)
    provenance = []
    for name in MODELS:
        path = SOURCE / (name + '.gltf')
        model = convert(path)
        (TARGET / (name + '.json')).write_text(json.dumps(model, separators=(',', ':'), allow_nan=False) + '\n')
        for m in model['materials']:
            if m['texture']:
                shutil.copy2(local_path(SOURCE, m['texture']), TARGET / m['texture'])
        provenance.append({'name': name, 'source': str(path.relative_to(ROOT)),
                           'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                           'license': 'CC0-1.0'})
    shutil.copy2(SOURCE / 'QUATERNIUS_LICENSE.txt', TARGET / 'QUATERNIUS_LICENSE.txt')
    (TARGET / 'provenance.json').write_text(json.dumps({'models': provenance}, indent=2) + '\n')
    print(f'Exported {len(MODELS)} CC0 model modules; base color + scalar PBR (ORM maps not converted).')


if __name__ == '__main__':
    main()
