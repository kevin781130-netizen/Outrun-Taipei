#!/usr/bin/env python3
"""Validate pinned ODbL reference data without loading any third-party code."""
import argparse
import collections
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

def audit(input_dir):
    catalog = json.loads((ROOT / 'data/world-v59/source-catalog.json').read_text())
    source = next(s for s in catalog['sources'] if s['id'] == 'gat-xinyi-data')
    loaded, receipts = {}, []
    for entry in source['files']:
        name = Path(entry['path']).name
        raw = (Path(input_dir) / name).read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        blob = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
        if digest != entry['sha256'] or blob != entry['gitBlob']:
            raise ValueError('Pinned source checksum mismatch: ' + name)
        loaded[name] = json.loads(raw)
        receipts.append(dict(path=entry['path'], bytes=len(raw), sha256=digest, gitBlob=blob))
    city, roads = loaded['city.json'], loaded['roads.json']
    if city.get('license') != 'https://opendatacommons.org/licenses/odbl/1-0/':
        raise ValueError('Unexpected source data license')
    bounds = city['bounds']
    if len(bounds) != 4 or not all(map(finite, bounds)) or bounds[0] >= bounds[2] or bounds[1] >= bounds[3]:
        raise ValueError('Invalid local metre bounds')
    footprints = 0
    for building in city['buildings']:
        if not finite(building['height']) or building['height'] <= 0 or not finite(building['base']):
            raise ValueError('Invalid building height/base')
        positions = building['position']
        if len(positions) % 9 or not all(map(finite, positions)):
            raise ValueError('Invalid triangle positions')
        if len(building['normal']) != len(positions) or not all(map(finite, building['normal'])):
            raise ValueError('Invalid triangle normals')
        for ring in building['footprints']:
            if len(ring) < 3 or any(len(p) != 2 or not all(map(finite, p)) for p in ring):
                raise ValueError('Invalid local footprint')
            footprints += 1
    for road in roads:
        if len(road['points']) < 2 or any(len(p) != 2 or not all(map(finite, p)) for p in road['points']):
            raise ValueError('Invalid road points')
    return {
        'status': 'reference-data-validated; not runtime integrated',
        'upstreamRepository': source['repository'], 'upstreamCommit': source['commit'],
        'license': source['dataLicense'], 'attribution': source['attribution'],
        'receipts': receipts,
        'measured': {'buildingElements': len(city['buildings']), 'footprintRings': footprints,
                     'roadGeometrySegments': len(roads), 'localBoundsMetres': bounds,
                     'roadKinds': dict(sorted(collections.Counter(r['kind'] for r in roads).items())),
                     'heightMethods': dict(sorted(collections.Counter(b['method'] for b in city['buildings']).items()))},
        'upstreamReportedStats': city['stats'],
        'limitations': source['limitations'],
        'runtimeSafeToLoadAsRaceCourse': False,
        'note': 'Reference geometry is usable for offline scenery work. It is not enough to infer road access, bridges, routing, acquisition date or WGS84 origin.'
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    report = audit(args.input_dir)
    text = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding='utf-8')
        print(json.dumps({'status': report['status'], 'measured': report['measured']}, ensure_ascii=False))
    else:
        print(text, end='')

if __name__ == '__main__':
    main()
