"""Build orchestration checks with synthetic files; never claims a Unity build."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location('driver', Path(__file__).resolve().parents[1] / 'tools/build-unity-slice.py')
driver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(driver)


class BuildDriverTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='Taipei build with spaces ')
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name)
        self.commit = 'a' * 40
        self.version = '6000.0.65f1'

    def complete(self):
        (self.output / 'Build').mkdir()
        (self.output / 'index.html').write_text('<html>synthetic fixture</html>')
        for name in ('study.loader.js', 'study.framework.js', 'study.wasm', 'study.data'):
            (self.output / 'Build' / name).write_bytes(b'fixture')
        self.receipt()

    def receipt(self, **overrides):
        data = dict(result='Succeeded', commit=self.commit, unityVersion=self.version)
        data.update(overrides)
        (self.output / 'unity-build-receipt.json').write_text(json.dumps(data))

    def test_complete_files_are_not_visual_verification(self):
        self.complete()
        result = driver.verify_output(self.output, self.commit, self.version)
        self.assertEqual(result['visualStatus'], 'not-verified')
        self.assertEqual(len(result['artifacts']), 5)
        self.assertTrue(all(len(h) == 64 for h in result['artifacts'].values()))

    def test_rejects_stale_commit_wrong_editor_or_failure(self):
        self.complete()
        for change in ({'commit': 'old'}, {'unityVersion': 'wrong'}, {'result': 'Failed'}):
            self.receipt(**change)
            with self.subTest(change=change), self.assertRaises(ValueError):
                driver.verify_output(self.output, self.commit, self.version)

    def test_rejects_each_missing_output_class(self):
        self.complete()
        for file in (self.output / 'Build').iterdir():
            data = file.read_bytes()
            file.unlink()
            with self.subTest(file=file.name), self.assertRaises(ValueError):
                driver.verify_output(self.output, self.commit, self.version)
            file.write_bytes(data)

    def test_rejects_empty_html(self):
        self.complete()
        (self.output / 'index.html').write_bytes(b'')
        with self.assertRaises(ValueError): driver.verify_output(self.output, self.commit, self.version)

    def test_rejects_missing_receipt(self):
        with self.assertRaises(FileNotFoundError): driver.verify_output(self.output, self.commit, self.version)

    def test_no_shell_interpolation_for_paths_with_spaces(self):
        editor = self.output / 'Unity Editor/Unity.exe'
        command = driver.build_command(editor, self.output, self.output / 'unity.log', self.commit)
        self.assertEqual(command[0], str(editor))
        self.assertEqual(command[command.index('-taipeiOutput') + 1], str(self.output))
        self.assertEqual(command[command.index('-buildTarget') + 1], 'WebGL')
        self.assertNotIn('-nographics', command, 'material generation needs graphics support')

    def test_dirty_source_stops_before_exports_or_editor(self):
        with mock.patch.object(driver.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, ' M source.cs\n')) as run:
            with self.assertRaisesRegex(ValueError, 'Commit source'):
                driver.run_build(self.output / 'Unity.exe', self.output / 'font.ttf')
            self.assertEqual(run.call_count, 1)

    def test_editor_failure_never_writes_verified_provenance(self):
        clean = subprocess.CompletedProcess([], 0, '')
        failed = subprocess.CalledProcessError(1, ['Unity'])
        with mock.patch.object(driver, 'PROJECT', self.output), \
             mock.patch.object(driver.subprocess, 'check_output', return_value=self.commit), \
             mock.patch.object(driver.subprocess, 'run', side_effect=[clean, clean, clean, clean, clean, failed]):
            with self.assertRaises(subprocess.CalledProcessError):
                driver.run_build(self.output / 'Unity.exe', self.output / 'font.ttf')
        self.assertEqual(list(self.output.rglob('build-provenance.json')), [])


if __name__ == '__main__': unittest.main()
