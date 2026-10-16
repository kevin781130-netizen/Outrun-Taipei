'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const sandbox={};vm.runInNewContext(fs.readFileSync(require.resolve('../assets/vendor/three-r149.min.js'),'utf8'),sandbox);
const T=sandbox.THREE;
const {ROUTE_MODELS,createTaipeiLandmarks}=require('../src/rendering/TaipeiLandmarks.cjs');
const {previewPoints,sampleRoadPoint,streetOffset,createFull3DScene}=require('../src/rendering/Full3DScene.cjs');
const game=load(path.join(__dirname,'../index.html'));
const scene=new T.Scene(),marks=createTaipeiLandmarks(T,scene,sampleRoadPoint,streetOffset);
const frame=routeId=>({routeId,segment:0,
 landmarks:ROUTE_MODELS[routeId].map((kind,i)=>({id:routeId+':'+i,modelIndex:i,seg:42+i*12,side:i%2?-1:1,heightWorld:6000})),
 corridors:Array.from({length:126},()=>[{center:0,half:1}])});
const road=previewPoints({curves:Array(126).fill(.15)});
const NativeBox=T.BoxGeometry;let boxes=0;
T.BoxGeometry=class extends NativeBox{constructor(...args){super(...args);boxes++;}};
try{
 marks.update(frame('1A'),road);
 const originalMeshes=[...scene.children];
 assert.equal(originalMeshes.length,3);
 assert.equal(marks.preparedModels.length,3);
 const start=boxes;
 assert.equal(marks.prewarm('2A'),true);
 assert.deepEqual(marks.pendingGpuModels,['hotel'],'next model queued for GPU upload');
 const firstUpload=marks.takeGpuWarmupMesh('2A');
 assert(firstUpload&&firstUpload.geometry,'uses real geometry cache');
 assert.equal(firstUpload.name,'V59_BufferPreload_hotel');
 assert.equal(firstUpload.material.colorWrite,false);
 assert.equal(firstUpload.material.depthWrite,false);
 assert.equal(firstUpload.material.depthTest,false);
 assert.equal(firstUpload.frustumCulled,false);
 assert.equal(marks.takeGpuWarmupMesh('2A'),null,'one upload receipt per model');
 firstUpload.material.dispose();
 assert.equal(marks.preparedModels.length,4,'one new model in first frame');
 assert(boxes>start,'prewarm builds model geometry');
 assert.equal(marks.prewarm('2A'),true);
 assert.deepEqual(marks.pendingGpuModels,['trail']);
 const secondUpload=marks.takeGpuWarmupMesh('2A');
 assert.equal(secondUpload.name,'V59_BufferPreload_trail');
 secondUpload.material.dispose();
 assert.equal(marks.prewarm('2A'),false,'route fully prewarmed');
 assert.equal(marks.takeGpuWarmupMesh('2A'),null,'no repeated GPU uploads');
 const beforeSwitch=boxes;
 marks.update(frame('2A'),road);
 assert.equal(boxes,beforeSwitch,'prewarmed route transition builds no new box geometry');
 assert.equal(scene.children.length,2);
 for(const mesh of scene.children)assert(mesh.geometry.boundingBox&&!mesh.geometry.boundingBox.isEmpty());
 for(const old of originalMeshes)assert.equal(old.parent,null,'previous meshes removed');
 for(const id of Object.keys(ROUTE_MODELS)){
  for(let i=0;i<ROUTE_MODELS[id].length;i++)marks.prewarm(id);
  marks.update(frame(id),road);
  assert(marks.preparedModels.length<=8,'bounded geometry cache');
 }
 let disposed=0;
 for(const mesh of scene.children)mesh.geometry.addEventListener('dispose',()=>disposed++);
 marks.dispose();
 assert.equal(scene.children.length,0);
 assert(disposed>0,'geometry disposed on teardown');
 assert.equal(marks.preparedModels.length,0);
 assert.equal(marks.prewarm('2A'),false,'prewarm does not restart after disposal');
 assert.equal(marks.takeGpuWarmupMesh('2A'),null,'disposed scenes cannot stage draws');
}finally{T.BoxGeometry=NativeBox;}

game.run("v34Mode='arcade';setStage(0,0,false);choiceLocked=false;stageTransition=null;");
assert.equal(game.run('v57SceneFrame().nextRouteId'),null,'no prewarm before fork lock');
for(const choice of ['left','right']){
 game.run(`pendingChoice='${choice}';choiceLocked=true;`);
 assert.equal(game.run('v57SceneFrame().nextRouteId'),choice==='left'?'2A':'2B');
}
const sceneFrame=JSON.parse(game.run('JSON.stringify(v57SceneFrame())'));
let renders=0,ghostCount=0,drawnKinds=[];
T.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}
 render(scene){renders++;
  const temporary=scene.children.filter(mesh=>mesh.name?.startsWith('V59_BufferPreload_'));
  assert(temporary.length<=1,'at most one warm draw per frame');
  for(const mesh of temporary){
   assert.equal(mesh.material.colorWrite,false);
   assert.equal(mesh.material.depthWrite,false);
   assert.equal(mesh.material.depthTest,false);
   ghostCount++;drawnKinds.push(mesh.name);
  }
 }dispose(){}};

const world=createFull3DScene(T,{style:{},addEventListener(){},removeEventListener(){}});
const savedRandom=Math.random;Math.random=()=>{throw new Error('visual warm-up consumed driving RNG');};
try{world.render(sceneFrame,1/60);}finally{Math.random=savedRandom;}
assert(renders>0,'renderer stays operational');
assert.equal(ghostCount,1,'first chosen landmark submitted once, invisibly');
world.render(sceneFrame,1/60);
assert.equal(ghostCount,1,'single-model 2B needs only one warm draw');
world.render(sceneFrame,1/60);
assert.equal(ghostCount,1,'GPU geometry submissions exhausted before route switch');
assert.deepEqual(drawnKinds,['V59_BufferPreload_digital']);
world.dispose();
console.log('V59 landmark prewarm: one model per frame, cached route switch, cache cap, disposal, fork gating and RNG isolation passed');
