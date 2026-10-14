'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const sandbox={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),sandbox);
const T=sandbox.THREE;
const {ROUTE_MODELS,createLandmarkGeometry,createTaipeiLandmarks}=require('../src/rendering/TaipeiLandmarks.cjs');
const {previewPoints,sampleRoadPoint,streetOffset,createFull3DScene}=require('../src/rendering/Full3DScene.cjs');
let total=0,vertices=0,last;
T.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}render(scene,camera){last={scene,camera};}dispose(){}};
const canvas={style:{},addEventListener(){},removeEventListener(){}};
const world=createFull3DScene(T,canvas);
for(const [id,models] of Object.entries(ROUTE_MODELS)){
 game.run(`v34Mode='arcade';setStage(...Object.values(routeForId('${id}')),false);`);
 const names=JSON.parse(game.run('JSON.stringify(STAGE_LANDMARKS[currentNode.id].map(h=>h.name))'));
 assert.equal(models.length,names.length,id+' covers all 2D landmarks');
 for(let j=0;j<models.length;j++){
  const g=createLandmarkGeometry(T,models[j]);vertices+=g.attributes.position.count;
  for(const name of ['position','normal','color'])assert(Array.from(g.attributes[name].array).every(Number.isFinite),models[j]+' finite '+name);
  assert(g.boundingBox.max.y>g.boundingBox.min.y&&g.boundingBox.max.x>g.boundingBox.min.x,models[j]+' nonempty actual 3D volume');g.dispose();
  game.run(`playerZ=(stageLandmarkPlan[${j}].seg-60)*SEGMENT_LENGTH-PLAYER_DEPTH;playerX=0;`);
  const frame=JSON.parse(game.run('JSON.stringify(v57SceneFrame())'));
  assert.equal(frame.landmarks[j].name,names[j]);
  assert.equal(frame.landmarks[j].seg,game.run(`stageLandmarkPlan[${j}].seg`));
  const before=JSON.stringify(frame);world.render(frame,1/60);
  last.scene.updateMatrixWorld(true);last.scene.traverse(object=>assert(object.matrixWorld.elements.every(Number.isFinite),object.name+' finite world transform'));
  const mesh=last.scene.getObjectByName('Taipei_'+id+':'+j+'_'+models[j]);
  assert(mesh?.visible,id+'/'+models[j]+' appears before its original anchor');
  const box=new T.Box3().setFromObject(mesh);assert(!box.isEmpty());
  const geometries=last.scene.children.filter(c=>c.name.startsWith('Taipei_')).map(c=>c.geometry);
  world.render(frame,0);assert.deepEqual(last.scene.children.filter(c=>c.name.startsWith('Taipei_')).map(c=>c.geometry),geometries,'paused render reuses geometry');
  assert.equal(JSON.stringify(frame),before,'presentation must not mutate gameplay state');total++;
 }
}
// Broad fork envelopes, both directions, several approach distances and hull sizes.
const scene=new T.Scene(),marks=createTaipeiLandmarks(T,scene,sampleRoadPoint,streetOffset);
for(const side of [-1,1])for(const modelIndex of [0,1,2])for(const distance of [8,30,90]){
 const frame={routeId:'1A',segment:100,fraction:.4,playerX:side*.5,curves:Array(126).fill(side*2),hills:Array(126).fill(0),
  corridors:Array.from({length:126},()=>[{center:-2,half:.8},{center:2,half:.8}]),
  landmarks:[{id:'1A:'+modelIndex,modelIndex,seg:100+distance,side,heightWorld:6000}]};
 const receipts=marks.update(frame,previewPoints(frame));assert.equal(receipts.length,1);
 for(const p of receipts)assert(side*p.lateral-p.halfWidth>=2.8*8+4.99,'landmark clears both branches');
}
let released=0;for(const m of scene.children)m.geometry.addEventListener('dispose',()=>released++);
marks.dispose();assert.equal(released,1);assert.equal(scene.children.length,0);marks.dispose();
const forkFrame={curves:Array(126).fill(0),hills:Array(126).fill(0),archetype:'expressway',
 corridors:Array.from({length:126},()=>[{center:-2,half:.8},{center:2,half:.8}]),deckHeights:Array(126).fill(1000)};
world.render(forkFrame,1/60);
assert.equal(last.scene.getObjectByName('Race_ExpresswayDeck').geometry.drawRange.count,125*4*6,'both fork decks remain complete to draw distance');
world.dispose();
assert.equal(total,27);assert(vertices<500000,'bounded merged landmark geometry budget');
// Input calibration is continuous at the dead zone and symmetric; digital full
// lock remains unchanged and keyboard driving remains covered by replay tests.
const axis=x=>game.run(`v58SteeringAxis(${x})`);
assert.equal(axis('NaN'),0);assert.equal(axis('Infinity'),0);assert.equal(axis(.08),0);assert.equal(axis(-.08),0);
assert(axis(.08001)<.00002);assert.equal(axis(1),1);assert.equal(axis(-1),-1);
let previous=0;for(let i=0;i<=100;i++){const x=i/100,y=axis(x);assert(y>=previous&&y<=1);assert(Math.abs(y+axis(-x))<1e-12);previous=y;}
const button=(pressed=false)=>({pressed,value:pressed?1:0});
let gp={connected:true,axes:[.54],buttons:Array.from({length:16},()=>button())};
const padGame=load(path.join(__dirname,'../index.html'),{navigator:{getGamepads:()=>[null,null,null,gp]}});
padGame.run('pollGamepads()');assert(Math.abs(padGame.run('gamepadInput.steer')-.5)<1e-12,'slot four controller supported');
gp.buttons[14]=button(true);padGame.run('pollGamepads()');assert.equal(padGame.run('gamepadInput.steer'),-1,'D-pad left supported');
gp=null;padGame.run('pollGamepads()');assert.equal(padGame.run('gamepadInput.steer'),0,'disconnect releases input');
console.log(`V58: ${total} authored landmarks across 15 routes, ${vertices} merged vertices, fork clearance, reuse/disposal and gamepad calibration passed (GPU mocked)`);
