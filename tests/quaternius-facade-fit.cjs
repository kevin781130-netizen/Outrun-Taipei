'use strict';
// P14 GLTF-SOURCED geometry audit and far signage preservation, no WebGL claims.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),dir='previews/quaternius-downtown/';
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
(async()=>{
 const m=await import(pathToFileURL(path.join(root,dir+'quaternius-facade-fit.mjs')).href);
 const {makeStreetblockPlan}=await import(pathToFileURL(path.join(root,dir+'streetblock-plan.mjs')).href);
 const {buildTaipeiStreetfrontPlan}=await import(pathToFileURL(path.join(root,dir+'taipei-streetfront.mjs')).href);
 assert.deepEqual(Object.keys(m.MODULE_BOUNDS).sort(),['brick','brickWindow','door','metalWindow']);
 assert.equal(m.FACADE_MEASUREMENTS.width,10);
 assert.equal(m.FACADE_MEASUREMENTS.height,6);
 const results={};
 for(const [key,fit] of Object.entries(m.MODULE_BOUNDS)){
  const model=JSON.parse(source('assets/third_party/quaternius-downtown/'+fit.asset+'.gltf'));
  assert.equal(model.asset.version,'2.0');
  assert(model.nodes.every(node=>!node.translation&&!node.rotation&&!node.scale&&!node.matrix),
    'P14 assumes GLTF mesh coordinates have identity node transforms');
  const boxes=[];
  for(const mesh of model.meshes)for(const primitive of mesh.primitives){
   const accessor=model.accessors[primitive.attributes.POSITION];
   assert(accessor?.min?.length===3&&accessor?.max?.length===3);
   boxes.push(accessor);
  }
  assert(boxes.length>0);
  const min=[0,1,2].map(axis=>Math.min(...boxes.map(box=>box.min[axis])));
  const max=[0,1,2].map(axis=>Math.max(...boxes.map(box=>box.max[axis])));
  const actual=[0,1,2].map(axis=>max[axis]-min[axis]);
  assert(Math.abs(actual[0]-fit.width)<0.001,'source GLTF width mismatch '+fit.asset);
  assert(Math.abs(actual[1]-fit.height)<0.001,'source GLTF storey height mismatch '+fit.asset);
  assert(Math.abs((min[0]+max[0])/2)<0.001,'GLTF horizontal origin mismatch '+fit.asset);
  assert(Math.abs(min[1])<0.001,'GLTF floor origin mismatch '+fit.asset);
  assert(Math.abs(min[2]-fit.depthMin)<0.001);
  assert(Math.abs(max[2]-fit.depthMax)<0.001);
  results[key]={asset:fit.asset,width:+actual[0].toFixed(3),height:+actual[1].toFixed(3),
    zRange:[+min[2].toFixed(3),+max[2].toFixed(3)],primitives:boxes.length};
 }
 for(const style of ['mixed','metal','brick']){
  const plan=m.makeSnappedQuaterniusFacade(style);
  assert(Object.isFrozen(plan));
  assert.equal(plan.modules.length,8);
  assert(plan.modules.every(slot=>Object.isFrozen(slot)&&slot.width>0&&slot.height>0));
  const checked=m.verifySeamlessFacade(plan);
  assert.deepEqual({passed:checked.passed,issues:checked.issues,checkedCells:checked.checkedCells},
   {passed:true,issues:[],checkedCells:12});
  assert(plan.modules.some(slot=>slot.kind==='door'&&slot.left===-1&&slot.right===1&&slot.y===0));
  assert(plan.modules.filter(slot=>slot.kind==='brick').length===3);
  assert(plan.modules.filter(slot=>slot.height===3).length===5);
  const tampered={...plan,modules:plan.modules.map((slot,i)=>i===0?{...slot,left:slot.left+.3,right:slot.right+.3}:slot)};
  assert.equal(m.verifySeamlessFacade(tampered).passed,false,'geometric gaps must be detected');
 }
 assert.throws(()=>m.makeSnappedQuaterniusFacade('unknown'),RangeError);
 assert.throws(()=>m.verifySeamlessFacade({modules:[]}),TypeError);
 assert.throws(()=>m.verifySeamlessFacade(m.makeSnappedQuaterniusFacade('mixed'),-.5),RangeError);
 const storefronts=makeStreetblockPlan(5);
 const budget=storefronts.buildings.reduce((sum,b)=>{
  const accents=buildTaipeiStreetfrontPlan(b.style);
  return sum+(7+accents.farBoxes.length+2)*12+accents.signs.length*2+(b.rooftop==='tank'?12:0);
 },0);
 assert.equal(budget,1076,'P14 5-shop proxy estimate includes awning and Chinese signs');
 const app=source(dir+'streetblock.js'),html=source(dir+'streetblock.html');
 assert(app.includes("import {makeSnappedQuaterniusFacade,verifySeamlessFacade} from './quaternius-facade-fit.mjs';"));
 assert(app.includes('for(const m of snapped.modules)'));
 assert(app.includes('proxy.add(shopSigns.makeShopSign(building,plan.signs))'));
 assert(app.includes("farSignProtected:()=>instances.length>0"));
 assert(app.includes("farSignPreserved:instances.every("));
 assert(app.includes('const farAwning=['));
 assert(html.includes('id="facade-snap"')&&html.includes('id="far-sign"'));
 for(const forbidden of ['roadCorridors(','updateVehiclePose','src/rendering/','Full3DScene.cjs'])
  assert(!app.includes(forbidden),'P14 may not import game source '+forbidden);
 console.log(JSON.stringify({P14:'STATIC PASS',sourceGLTFBounds:results,facadeTiling:'12 cells with no gap/overlap',
  nearSourceModules:8,farFiveShopTriangles:budget,previewLODTextPreserved:true,
  WebGLVerified:false,productionMapChanged:false},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
