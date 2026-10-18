"""Pixel/channel semantics at the glTF -> Unity material boundary."""
import importlib.util
from pathlib import Path
import unittest
from PIL import Image

spec = importlib.util.spec_from_file_location('materials', Path(__file__).resolve().parents[1] / 'tools/unity_art_materials.py')
materials = importlib.util.module_from_spec(spec)
spec.loader.exec_module(materials)


class MaterialTests(unittest.TestCase):
    def test_channel_mapping_and_scalar_factors(self):
        mr = Image.new('RGB', (1, 1), (17, 80, 200))
        ao = Image.new('RGB', (1, 1), (64, 99, 99))
        self.assertEqual(materials.pack_standard(mr, .5, .5, ao, 1).getpixel((0, 0)), (100, 64, 0, 215))

    def test_no_implicit_occlusion_from_filename_or_red_channel(self):
        mr = Image.new('RGB', (1, 1), (0, 255, 0))
        self.assertEqual(materials.pack_standard(mr).getpixel((0, 0)), (0, 255, 0, 0))

    def test_occlusion_strength_zero_is_neutral(self):
        mr = Image.new('RGB', (1, 1), (0, 0, 255))
        self.assertEqual(materials.pack_standard(mr, occlusion=mr, strength=0).getpixel((0, 0)), (255, 255, 0, 255))

    def test_reject_invalid_factors_and_mismatched_resolution(self):
        mr = Image.new('RGB', (1, 1))
        for factor in (-1, 1.1, float('nan')):
            with self.subTest(factor=factor), self.assertRaises(ValueError):
                materials.pack_standard(mr, metallic=factor)
        with self.assertRaises(ValueError): materials.pack_standard(mr, occlusion=Image.new('RGB', (2, 2)))

    def test_ground_maps_are_repeatable_nonmetallic_and_not_baked_lighting(self):
        for kind in ('Asphalt', 'Pavement'):
            first, second = materials.surface(kind, 32), materials.surface(kind, 32)
            for channel in first:
                self.assertEqual(first[channel].tobytes(), second[channel].tobytes())
            self.assertEqual(first['Mask'].getchannel('R').getextrema(), (0, 0))
            self.assertGreater(first['Normal'].getchannel('B').getextrema()[0], 240)
            self.assertLessEqual(first['Mask'].getchannel('A').getextrema()[1], 40)
            self.assertEqual(first['BaseColor'].size, first['Normal'].size)

    def test_reject_invalid_surface(self):
        for kind, size in (('unknown', 32), ('Asphalt', 17), ('Pavement', 4)):
            with self.subTest(kind=kind, size=size), self.assertRaises(ValueError): materials.surface(kind, size)


if __name__ == '__main__': unittest.main()
