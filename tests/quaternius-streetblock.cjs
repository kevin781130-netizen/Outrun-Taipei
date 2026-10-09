'use strict';
// P8 asset-only streetblock composition regression. No browser approval implied.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const read=filename=>fs.readFileSync(path.join(root,filename),'utf8');
(async()=>{
 const p=await import(pathToFileURL(path.join(root,'previews/quaternius-downtown/streetblock-plan.mjs')).href);
 const facade=await import(pathToFileURL(path.join(root,'previews/quaternius-downtown/taipei-streetfront.mjs')).href);
 const counts=[3,5,7];
 assert.deepEqual(p.BLOCK_COUNTS,counts);
 assert.equal(p.BLOCK_PITCH,10.85);
 assert.equal(p.FACADE_WIDTH,10.35);
 assert.equal(p.SHOP_SAMPLES.length,7);
 for(const count of counts){
  const block=p.makeStreetblockPlan(count);
  assert(Object.isFrozen(block));
  assert(Object.isFrozen(block.buildings));
  assert.equal(block.coordinateSpace,'independent-asset-preview-local');
  assert.equal(block.routeCoordinates,null);
  assert.equal(block.collisionEnabled,false);
  assert.equal(block.buildings.length,count);
  assert.equal(new Set(block.buildings.map(b=>b.id)).size,count);
  assert.equal(new Set(block.buildings.map(b=>b.shop)).size,count);
  assert(Math.abs(block.totalWidth-((count-1)*10.85+10.35))<1e-9);
  for(const [i,b]of block.buildings.entries()){
   assert(Object.isFrozen(b));
   assert.equal(b.staticOnly,true);
   assert(['brick','metal','mixed'].includes(b.style));
   assert(['tank','none'].includes(b.rooftop));
   assert.deepEqual(b.position.length,3);
   const expectedX=(i-(count-1)/2)*10.85;
   assert(Math.abs(b.position[0]-expectedX)<1e-9);
   assert(b.position[1]===0&&Math.abs(b.position[2])<.2);
   assert(b.facadeWidth===10.35);
   assert(/^.{2,8}$/.test(b.shop));
   if(i>0)assert(b.position[0]-block.buildings[i-1].position[0]>=b.facadeWidth+.45);
  }
 }
 for(const invalid of [0,1,4,6,8,NaN,'5',null]){
  assert.throws(()=>p.makeStreetblockPlan(invalid),RangeError);
 }
 assert.equal(p.makeStreetblockPlan().count,5);
 const moduleFiles=['Brick_Plain_1','Brick_RedWhite_DoubleWindow','Metal_Window','DoorFrame_Trim'];
 const tri={};
 for(const name of moduleFiles){
  const data=JSON.parse(read('assets/third_party/quaternius-downtown/'+name+'.gltf'));
  assert.equal(data.asset.version,'2.0');
  tri[name]=data.meshes.reduce((sum,mesh)=>sum+mesh.primitives.reduce((n,part)=>{
   const a=data.accessors[part.indices??part.attributes.POSITION];
   assert.equal((part.mode??4),4);
   assert(a?.count>0 && a.count%3===0);
   return n+a.count/3;
  },0),0);
 }
 assert.deepEqual(tri,{'Brick_Plain_1':4,'Brick_RedWhite_DoubleWindow':794,
  'Metal_Window':578,'DoorFrame_Trim':860});
 const nearFor=style=>{
  const first=style==='metal'?tri.Metal_Window:tri.Brick_RedWhite_DoubleWindow;
  const second=style==='brick'?tri.Brick_RedWhite_DoubleWindow:tri.Metal_Window;
  const accents=facade.buildTaipeiStreetfrontPlan(style);
  return 2*first+2*second+tri.DoorFrame_Trim+3*tri.Brick_Plain_1
    +3*12+accents.nearBoxes.length*12+accents.signs.length*2;
 };
 const farFor=style=>{
  const accents=facade.buildTaipeiStreetfrontPlan(style);
  return (7+accents.farBoxes.length)*12;
 };
 const five=p.makeStreetblockPlan();
 const baseNear=five.buildings.reduce((n,b)=>n+nearFor(b.style)+(b.rooftop==='tank'?72:0),0);
 const baseFar=five.buildings.reduce((n,b)=>n+farFor(b.style)+(b.rooftop==='tank'?12:0),0);
 assert.equal(baseNear,21124);
 assert.equal(baseFar,936);
 const app=read('previews/quaternius-downtown/streetblock.js');
 const html=read('previews/quaternius-downtown/streetblock.html');
 assert(app.includes("import {makeStreetblockPlan} from './streetblock-plan.mjs';"));
 assert(app.includes("import {buildTaipeiStreetfrontPlan} from './taipei-streetfront.mjs';"));
 assert(app.includes("import {decideFacadeLod,FACADE_LOD_THRESHOLDS} from './lod-policy.mjs';"));
 assert(app.includes('new THREE.InstancedMesh(sharedBox,'));
 assert(app.includes("buildStreetblockPlan")===false);
 assert(app.includes('const full=new THREE.Group(),proxy=new THREE.Group()'));
 assert(app.includes("item.full.visible=item.lod==='near'"));
 assert(app.includes("item.proxy.visible=item.lod==='far'"));
 assert(app.includes('renderer.info.render.calls'));
 assert(app.includes('renderer.info.render.triangles'));
 assert(html.includes('id="count"')&&html.includes('id="street-canvas"'));
 assert(html.includes('id="lod-mode"')&&html.includes('value="7"'));
 for(const illegal of ['Full3DScene.cjs','src/rendering/','roadCorridors(','updateVehiclePose','gamePhysics','routes.push']){
  assert(!app.includes(illegal),'P8 preview imported gameplay '+illegal);
 }
 console.log(JSON.stringify({status:'static PASS',counts,
   expectedFiveNearTriangles:baseNear,expectedFiveFarTriangles:baseFar,
   assets:Object.keys(tri).length,gameplayImports:0,visualApproval:false}));
})().catch(e=>{console.error(e);process.exitCode=1;});
