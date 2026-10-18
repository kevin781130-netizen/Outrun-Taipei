"""Validate the cross-engine geometry boundary, not Unity rendering."""
import importlib.util
import json
from pathlib import Path
import struct
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('exporter', ROOT / 'tools/export-unity-models.py')
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class ModelExportTests(unittest.TestCase):
    def test_checked_in_geometry_survives_handedness_conversion(self):
        for name in exporter.MODELS:
            with self.subTest(model=name):
                path = exporter.SOURCE / (name + '.gltf')
                source = json.loads(path.read_text())
                blobs = [(path.parent / b['uri']).read_bytes() for b in source['buffers']]
                result = exporter.convert(path)
                self.assertEqual(len(result['parts']), len(source['meshes'][0]['primitives']))
                for old, new in zip(source['meshes'][0]['primitives'], result['parts']):
                    positions = exporter.read_accessor(source, blobs, old['attributes']['POSITION'])
                    indices = [i[0] for i in exporter.read_accessor(source, blobs, old['indices'])]
                    self.assertEqual(len(new['vertices']), len(positions))
                    self.assertEqual(len(new['triangles']), len(indices))
                    for original, vertex in zip(positions, new['vertices']):
                        self.assertEqual(tuple(vertex.values()), (original[0], original[1], -original[2]))
                    # Reversed winding must agree with reflected normals, rather than
                    # making front faces disappear when back-face culling is enabled.
                    for i in range(0, len(indices), 3):
                        self.assertEqual(new['triangles'][i:i+3], [indices[i], indices[i+2], indices[i+1]])
                    self.assertLess(new['material'], len(result['materials']))
                self.assertEqual(result, exporter.convert(path), 'export must be deterministic')

    def test_interleaved_accessor_and_offsets(self):
        blob = b'HEAD' + struct.pack('<ffff', 1, 2, 99, 99) + struct.pack('<ffff', 3, 4, 99, 99)
        g = {'accessors': [{'bufferView': 0, 'componentType': 5126, 'type': 'VEC2', 'count': 2}],
             'bufferViews': [{'buffer': 0, 'byteOffset': 4, 'byteLength': 32, 'byteStride': 16}]}
        self.assertEqual(exporter.read_accessor(g, [blob], 0), [(1, 2), (3, 4)])
        g['bufferViews'][0]['byteLength'] = 12
        with self.assertRaises(ValueError):
            exporter.read_accessor(g, [blob], 0)

    def test_reject_external_or_traversal_uris(self):
        for uri in ('../../index.html', 'https://example.com/asset.bin', '/etc/passwd'):
            with self.subTest(uri=uri), self.assertRaises(ValueError):
                exporter.local_path(exporter.SOURCE, uri)

    def test_reject_sparse_and_normalized_data(self):
        for extra in ({'sparse': {}}, {'normalized': True}):
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                exporter.read_accessor({'accessors': [extra]}, [], 0)


if __name__ == '__main__':
    unittest.main()
