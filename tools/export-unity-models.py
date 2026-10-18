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
from PIL import Image
from unity_art_materials import pack_standard

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
        mr = pbr.get('metallicRoughnessTexture')
        ao = m.get('occlusionTexture')
        def texture_uri(binding):
            if binding is None: return ''
            if binding.get('texCoord', 0) != 0 or binding.get('extensions'):
                raise ValueError('Only untransformed primary UV textures supported')
            uri = g['images'][g['textures'][binding['index']]['source']]['uri']
            local_path(path.parent, uri)
            return uri
        texture_uri(texture)  # Validate the base-color UV set as well.
        mr_uri, ao_uri = texture_uri(mr), texture_uri(ao)
        signature = {'metallic': float(pbr.get('metallicFactor', 1)),
                     'roughness': float(pbr.get('roughnessFactor', 1)),
                     'strength': float(ao.get('strength', 1) if ao else 1),
                     'mr': hashlib.sha256(local_path(path.parent, mr_uri).read_bytes()).hexdigest() if mr_uri else '',
                     'ao': hashlib.sha256(local_path(path.parent, ao_uri).read_bytes()).hexdigest() if ao_uri else ''}
        key = hashlib.sha256(json.dumps(signature, sort_keys=True).encode()).hexdigest()[:20]
        materials.append({'name': m['name'], 'color': pbr.get('baseColorFactor', [1, 1, 1, 1]),
                          'texture': uri, 'metallic': pbr.get('metallicFactor', 1),
                          'roughness': pbr.get('roughnessFactor', 1),
                          'mrSource': mr_uri, 'aoSource': ao_uri,
                          'aoStrength': ao.get('strength', 1) if ao else 1,
                          'packedTexture': f'PBR_{key}_Mask.png' if mr or ao else '',
                          'transparent': m.get('alphaMode') == 'BLEND',
                          'doubleSided': m.get('doubleSided', False)})
    return {'name': path.stem, 'parts': parts, 'materials': materials}


def main():
    TARGET.mkdir(parents=True, exist_ok=True)
    provenance = []
    packed_written = set()
    for name in MODELS:
        path = SOURCE / (name + '.gltf')
        model = convert(path)
        (TARGET / (name + '.json')).write_text(json.dumps(model, separators=(',', ':'), allow_nan=False) + '\n')
        for m in model['materials']:
            if m['texture']:
                shutil.copy2(local_path(SOURCE, m['texture']), TARGET / m['texture'])
            if m['packedTexture'] and m['packedTexture'] not in packed_written:
                # Preserve explicit glTF bindings; none of the current files binds AO.
                with Image.open(local_path(SOURCE, m['mrSource'] or m['aoSource'])) as reference:
                    mr = Image.open(local_path(SOURCE, m['mrSource'])) if m['mrSource'] else Image.new('RGB', reference.size, (255, 255, 255))
                    ao = Image.open(local_path(SOURCE, m['aoSource'])) if m['aoSource'] else None
                    try:
                        packed = pack_standard(mr, m['metallic'], m['roughness'], ao, m['aoStrength'])
                        packed.save(TARGET / m['packedTexture'])
                        packed_written.add(m['packedTexture'])
                    finally:
                        mr.close()
                        if ao is not None: ao.close()
        provenance.append({'name': name, 'source': str(path.relative_to(ROOT)),
                           'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                           'dependencies': {file.name: hashlib.sha256(file.read_bytes()).hexdigest()
                                            for file in sorted({local_path(SOURCE, uri) for material in model['materials']
                                                               for uri in (material['texture'], material['mrSource'], material['aoSource']) if uri}
                                                              | {local_path(SOURCE, b['uri']) for b in json.loads(path.read_text())['buffers']})},
                           'license': 'CC0-1.0'})
    shutil.copy2(SOURCE / 'QUATERNIUS_LICENSE.txt', TARGET / 'QUATERNIUS_LICENSE.txt')
    (TARGET / 'provenance.json').write_text(json.dumps({'models': provenance}, indent=2) + '\n')
    print(f'Exported {len(MODELS)} CC0 modules sharing {len(packed_written)} packed metallic/smoothness maps.')


if __name__ == '__main__':
    main()
