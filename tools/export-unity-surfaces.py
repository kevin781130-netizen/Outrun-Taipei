"""Generate original repeatable asphalt/paving textures for the Unity art slice."""
import hashlib
import json
from pathlib import Path
from unity_art_materials import surface

TARGET = Path(__file__).resolve().parents[1] / 'unity/TaipeiDrive/Assets/Generated/Source'


def main():
    TARGET.mkdir(parents=True, exist_ok=True)
    files = []
    for kind in ('Asphalt', 'Pavement'):
        for channel, image in surface(kind).items():
            path = TARGET / (kind + '_' + channel + '.png')
            image.save(path)
            files.append({'path': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                          'origin': 'original procedural source: tools/unity_art_materials.py',
                          'license': 'Apache-2.0'})
    (TARGET / 'surface-provenance.json').write_text(json.dumps({'files': files}, indent=2) + '\n')
    print('Exported 6 original 512px surface maps: albedo, linear mask and tangent normal.')


if __name__ == '__main__': main()
