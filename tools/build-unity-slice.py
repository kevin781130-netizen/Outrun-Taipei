"""Local Unity art build driver. No installation, deployment or license changes."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / 'unity/TaipeiDrive'
METHOD = 'TaipeiDrive.Editor.StreetSliceBuilder.BuildWebGL'


def expected_version(project=PROJECT):
    for line in (project / 'ProjectSettings/ProjectVersion.txt').read_text().splitlines():
        if line.startswith('m_EditorVersion:'):
            return line.split(':', 1)[1].strip()
    raise ValueError('ProjectVersion.txt has no editor version')


def editor_candidates(version):
    # Only the declared editor version is auto-selected; custom installs use --editor.
    yield Path(os.environ.get('ProgramFiles', 'C:/Program Files')) / 'Unity/Hub/Editor' / version / 'Editor/Unity.exe'
    yield Path('/Applications/Unity/Hub/Editor') / version / 'Unity.app/Contents/MacOS/Unity'
    yield Path.home() / 'Unity/Hub/Editor' / version / 'Editor/Unity'


def module_path(editor):
    if editor.parent.name == 'MacOS':
        return editor.parent.parent / 'PlaybackEngines/WebGLSupport'
    return editor.parent / 'Data/PlaybackEngines/WebGLSupport'


def preflight(editor=None, font=None):
    errors = []
    version = expected_version()
    if sys.version_info < (3, 10):
        errors.append('Python 3.10+ required')
    if shutil.which('node') is None:
        errors.append('Node.js not found on PATH')
    for module, package in (('PIL', 'Pillow'), ('fontTools', 'fontTools')):
        if importlib.util.find_spec(module) is None:
            errors.append(f'Missing Python package: {package}')
    selected = Path(editor).expanduser().resolve() if editor else next((p for p in editor_candidates(version) if p.is_file()), None)
    if selected is None or not selected.is_file():
        errors.append(f'Unity {version} not found; install with Unity Hub or pass --editor <Unity executable>')
    elif not module_path(selected).is_dir():
        errors.append('WebGL Build Support module not found: ' + str(module_path(selected)))
    selected_font = Path(font).expanduser().resolve() if font else Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts/msjh.ttc'
    if not selected_font.is_file():
        errors.append('Traditional Chinese font not found; pass --font <CJK TTF/OTF/TTC>')
    if (PROJECT / 'Temp/UnityLockfile').exists():
        errors.append('Unity project appears open; close that Editor before a batch build')
    return selected, selected_font, errors


def build_command(editor, output, log, commit):
    return [str(editor), '-batchmode', '-quit', '-buildTarget', 'WebGL',
            '-projectPath', str(PROJECT), '-executeMethod', METHOD, '-logFile', str(log),
            '-taipeiOutput', str(output), '-taipeiCommit', commit]


def verify_output(output, commit, version):
    receipt_path = output / 'unity-build-receipt.json'
    receipt = json.loads(receipt_path.read_text(encoding='utf-8'))
    if receipt.get('result') != 'Succeeded' or receipt.get('commit') != commit or receipt.get('unityVersion') != version:
        raise ValueError('Build receipt does not match this source/editor or reports failure')
    build = output / 'Build'
    groups = [[output / 'index.html'], list(build.glob('*.loader.js')), list(build.glob('*.framework.js')),
              list(build.glob('*.wasm')), list(build.glob('*.data'))]
    if any(not group or not any(p.is_file() and p.stat().st_size > 0 for p in group) for group in groups):
        raise ValueError('WebGL output is incomplete: need index, loader, framework, wasm and data')
    # Hash every generated runtime file so a preview can be tied to this exact build.
    artifacts = {str(p.relative_to(output)).replace('\\', '/'): file_hash(p)
                 for p in sorted(output.rglob('*')) if p.is_file() and p != receipt_path}
    return {'commit': commit, 'unityVersion': version, 'buildStatus': 'verified-files',
            'visualStatus': 'not-verified', 'artifacts': artifacts}


def file_hash(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def run_build(editor, font, timeout=3600):
    # A fresh output directory and matching editor receipt prevent stale-build success.
    status = subprocess.run(['git', 'status', '--porcelain'], cwd=ROOT, capture_output=True, text=True, check=True)
    if status.stdout.strip():
        raise ValueError('Commit source changes before building so preview provenance is reproducible')
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    output = PROJECT / 'Builds' / ('ArtSlice-' + stamp)
    output.mkdir(parents=True, exist_ok=False)
    # Unity may clean the build destination; keep its open log outside that folder.
    log = PROJECT / 'Builds/Logs' / (output.name + '.log')
    log.parent.mkdir(parents=True, exist_ok=True)
    steps = [[shutil.which('node'), str(ROOT / 'tools/export-unity-streetfront.mjs')],
             [sys.executable, str(ROOT / 'tools/export-unity-models.py')],
             [sys.executable, str(ROOT / 'tools/export-unity-surfaces.py')],
             [sys.executable, str(ROOT / 'tools/export-unity-signs.py'), '--font', str(font)]]
    for step in steps:
        subprocess.run(step, cwd=ROOT, check=True, timeout=120)
    # Unity's complete log stays on disk; do not block waiting on a stdout pipe.
    print('BUILD_LOG=' + str(log), flush=True)
    print('Unity is building; first import can take several minutes.', flush=True)
    subprocess.run(build_command(editor, output, log, commit), cwd=ROOT, check=True, timeout=timeout)
    result = verify_output(output, commit, expected_version())
    (output / 'build-provenance.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print('BUILD_FILES_VERIFIED=' + str(output))
    print('VISUAL_STATUS=NOT_VERIFIED')
    print('Preview: ' + subprocess.list2cmdline([sys.executable, '-m', 'http.server', '8765', '--bind', '127.0.0.1', '--directory', str(output)]))
    print('Then open http://127.0.0.1:8765/ and inspect the scene.')
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Read-only prerequisites check; no exports or editor launch')
    parser.add_argument('--editor', help='Unity Editor executable; actual version is checked inside Unity')
    parser.add_argument('--font', help='Locally licensed Traditional Chinese font')
    args = parser.parse_args()
    editor, font, errors = preflight(args.editor, args.font)
    if errors:
        print('PREFLIGHT_BLOCKED\n' + '\n'.join('- ' + e for e in errors))
        return 2
    print('PREFLIGHT_OK\nEDITOR=' + str(editor) + '\nFONT=' + str(font))
    if args.check:
        print('Editor version, license, C# compilation and rendering have not been tested.')
        return 0
    try:
        run_build(editor, font)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print('BUILD_FAILED: ' + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
