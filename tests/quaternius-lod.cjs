'use strict';
// P6 independent facade LOD policy and preservation checks.
// Not a browser/GPU visual acceptance test.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const src=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assets='assets/third_party/quaternius-downtown/';
const geos={
 brickWindow:'Brick_RedWhite_DoubleWindow',
 brickWall:'Brick_Plain_1',
 metalWindow:'Metal_Window',
 door:'DoorFrame_Trim'
};
function trianglesOf(name){
 const d=JSON.parse(src(assets+name+'.gltf'));
 return (d.meshes||[]).reduce((sum,mesh)=>sum+mesh.primitives.reduce((a,p)=>{
  assert.equal(p.mode??4,4,'only indexed/triangle glTF expected');
  const access=d.accessors[p.indices??p.attributes.POSITION];
  assert(access?.count>0,'missing triangle accessor');
  assert.equal(access.count%3,0,'incomplete triangles');
  return a+access.count/3;
 },0),0);
}
(async()=>{
 const {decideFacadeLod,FACADE_LOD_THRESHOLDS}=await import(
  pathToFileURL(path.join(root,'previews/quaternius-downtown/lod-policy.mjs')).href);
 const d=(distance,previous='near',mode='auto')=>decideFacadeLod({distance,previous,mode});
 assert.deepEqual(FACADE_LOD_THRESHOLDS,{enterFar:28,exitFar:23});
 assert.equal(d(0),'near');
 assert.equal(d(27.99),'near');
 assert.equal(d(28),'far');
 assert.equal(d(27,'far'),'far'); // hysteresis, no rapid flicker
 assert.equal(d(23.01,'far'),'far');
 assert.equal(d(23,'far'),'near');
 assert.equal(d(500,'near','near'),'near'); // manual pin
 assert.equal(d(0,'near','far'),'far'); // manual proxy inspection
 assert.throws(()=>d(-1),RangeError);
 assert.throws(()=>d(Infinity),RangeError);
 assert.throws(()=>decideFacadeLod({distance:10,mode:'unsupported'}),RangeError);
 assert.throws(()=>decideFacadeLod({distance:10,enterFar:20,exitFar:30}),RangeError);
 const count={
  brickWindow:trianglesOf(geos.brickWindow),
  brickWall:trianglesOf(geos.brickWall),
  metalWindow:trianglesOf(geos.metalWindow),
  door:trianglesOf(geos.door)
 };
 assert.deepEqual(count,{brickWindow:794,brickWall:4,metalWindow:578,door:860});
 const predicted={
   mixed:2*count.brickWindow+2*count.metalWindow+count.door+3*count.brickWall+36,
   metal:4*count.metalWindow+count.door+3*count.brickWall+36,
   brick:4*count.brickWindow+count.door+3*count.brickWall+36
 };
 assert.deepEqual(predicted,{mixed:3652,metal:3220,brick:4084});
 const proxy=7*12;
 for(const n of Object.values(predicted)){
  assert(proxy<n/10,'proxy should be below 10% of detailed facade polygon count');
 }
 const js=src('previews/quaternius-downtown/assembly.js');
 const html=src('previews/quaternius-downtown/assembly.html');
 assert(js.includes("import {decideFacadeLod,FACADE_LOD_THRESHOLDS} from './lod-policy.mjs';"));
 assert(js.includes("facade.name='P4_VisualOnlyFacade'"));
 assert(js.includes("nearFacade.visible=currentLod==='near'"));
 assert(js.includes("farFacade.visible=currentLod==='far'"));
 assert(js.includes("farTriangles=farFacade.children.length*12"));
 assert(js.includes("get('lod-mode').addEventListener('change',updateLod)"));
 assert(js.includes("const unitBox=new THREE.BoxGeometry(1,1,1)"));
 assert(html.includes('id="lod-mode"')&&html.includes('id="visible-tris"'));
 assert(js.includes("cloneMod('door',0,0)")&&js.includes("cloneMod('brickWall',0,y)"));
 for(const forbidden of ['Full3DScene.cjs','roadCorridors(','updateVehiclePose','src/rendering/','COMPETITION.version']){
  assert(!js.includes(forbidden),'preview must not touch gameplay: '+forbidden);
 }
 console.log({scope:'P6 preview-only LOD',policy:'passed',models:count,
  detailedTriangles:predicted,proxyTriangles:proxy,visualAcceptance:'not performed'});
})().catch(e=>{console.error(e);process.exitCode=1;});
