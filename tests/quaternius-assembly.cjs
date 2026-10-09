'use strict';
// P4 checks that the standalone facade preview cannot affect gameplay/map.
// Static-only: a real WebGL render still requires browser verification.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const html=read('previews/quaternius-downtown/assembly.html');
const js=read('previews/quaternius-downtown/assembly.js');
const names=['Brick_RedWhite_DoubleWindow','Brick_Plain_1','Metal_Window','DoorFrame_Trim'];
const p='assets/third_party/quaternius-downtown/';
let total=0;
for (const n of names) {
 const asset=JSON.parse(read(p+n+'.gltf'));
 assert.equal(asset.asset.version,'2.0');
 assert(asset.scenes?.length===1);
 assert(asset.meshes?.length>0);
 let local=0;
 for (const mesh of asset.meshes)for(const primitive of mesh.primitives||[]){
  const v=primitive.indices === undefined ?
    asset.accessors[primitive.attributes.POSITION].count :
    asset.accessors[primitive.indices].count;
  assert.equal(v%3,0);
  local+=v/3;
 }
 assert(local>0);total+=local;
 assert(js.includes("'"+n+"'"),n+' must remain in composition');
}
assert.equal(total,2236,'do not inadvertently swap Quaternius geometry');
assert(html.includes('assembly.js')&&html.includes('three-r149.min.js'));
assert(html.includes('type="importmap"')&&html.includes('PBR')===false);
assert(js.includes('cloneMod(')&&js.includes("facade.name='P4_VisualOnlyFacade'"));
assert(js.includes("cloneMod('door',0,0)")&&js.includes("cloneMod('brickWall',0,y)"));
assert(js.includes("renderer.info.render.calls")&&js.includes("requestAnimationFrame(tick)"));
const forbidden=['../index.html','src/rendering/','v56Full3D','roadCorridors(','updateVehiclePose','COMPETITION.version','routes.push'];
for(const x of forbidden)assert(!js.includes(x),'assembly script must not touch runtime: '+x);
console.log('P4 Quaternius facade staging: four CC0 models, composition, metrics and gameplay isolation (static only) passed');
