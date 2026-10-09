'use strict';
// Static-only checks. Does not render gameplay or claim browser/WebGL validation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const base = path.join(root,'assets/third_party/quaternius-downtown');
const names = ['Brick_RedWhite_DoubleWindow','Brick_Plain_1','Metal_Window','DoorFrame_Trim'];
const preview = fs.readFileSync(path.join(root,'previews/quaternius-downtown/preview.js'),'utf8');
const html = fs.readFileSync(path.join(root,'previews/quaternius-downtown/index.html'),'utf8');
const shim = fs.readFileSync(path.join(root,'assets/vendor/three-r149-esm-shim.js'),'utf8');
const vendorPaths = [
  'assets/vendor/three-r149/jsm/loaders/GLTFLoader.js',
  'assets/vendor/three-r149/jsm/utils/BufferGeometryUtils.js',
  'assets/vendor/three-r149/jsm/controls/OrbitControls.js'
];
for (const name of names) {
  const modelPath = path.join(base,name+'.gltf');
  const obj = JSON.parse(fs.readFileSync(modelPath,'utf8'));
  assert.equal(obj.asset.version,'2.0');
  assert(obj.meshes?.length > 0, name+' must contain geometry');
  assert(obj.scenes?.length > 0, name+' must have a scene');
  assert(preview.includes(name), name+' must be selectable');
  for (const buffer of obj.buffers || []) {
    assert(!path.isAbsolute(buffer.uri) && !buffer.uri.includes('..'));
    assert.equal(fs.statSync(path.join(base,buffer.uri)).size,buffer.byteLength, name+' GLB buffer length');
  }
  for (const image of obj.images || []) {
    assert(!path.isAbsolute(image.uri) && !image.uri.includes('..'));
    assert(fs.existsSync(path.join(base,image.uri)),image.uri+' missing');
  }
  for (const texture of obj.textures || []) assert(texture.source >= 0 && texture.source < obj.images.length);
  for (const material of obj.materials || []) {
    const p = material.pbrMetallicRoughness || {};
    for (const prop of ['baseColorTexture','metallicRoughnessTexture']) if (p[prop]) {
      assert(p[prop].index >= 0 && p[prop].index < obj.textures.length);
    }
  }
}
for (const vendorPath of vendorPaths) {
  const source=fs.readFileSync(path.join(root,vendorPath),'utf8');
  assert(source.length > 20000, vendorPath+' missing/incomplete');
  for (const match of source.matchAll(/import\s*{([\s\S]*?)}\s*from\s*'three'/g)) {
    const names=match[1].split(',').map(x=>x.trim()).filter(Boolean);
    for (const name of names) assert(shim.includes('export const '+name+' = core.'+name+';'), 'ESM shim missing '+name);
  }
}
assert(html.includes('three-r149.min.js') && html.includes('type="importmap"'));
assert(html.includes('preview.js'));
assert(preview.includes('GLTFLoader') && preview.includes('OrbitControls'));
assert(!preview.includes('Full3DScene.cjs') && !preview.includes('updatePlayer') && !preview.includes('roadCorridors('));
assert(fs.existsSync(path.join(base,'QUATERNIUS_LICENSE.txt')));
console.log('P2 Quaternius standalone preview: four models, buffer sizes, textures, loader imports and isolated entry verified (static checks only).');
