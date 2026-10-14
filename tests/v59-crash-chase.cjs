'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {sampleCrashChase,createCrashChase}=require('../src/rendering/CrashChase.cjs');
const sandbox={};vm.runInNewContext(fs.readFileSync(require.resolve('../assets/vendor/three-r149.min.js'),'utf8'),sandbox);
const THREE=sandbox.THREE,scene=new THREE.Scene(),fx=createCrashChase(THREE,scene);
const anchor={y:.02,z:3.15,pitch:.12,yaw:-.04};
const snapshot=(object=fx.root)=>{const a=[];object.traverse(n=>a.push([n.name,n.visible,...n.position.toArray(),...n.rotation.toArray(),...n.scale.toArray()]));return JSON.stringify(a);};
const originalRandom=Math.random;
Math.random=()=>{throw Error('crash presentation consumed gameplay randomness');};
try{
 for(const side of [-1,1])for(const passenger of [false,true])for(let i=0;i<=410;i++){
  const t=i/100,p=sampleCrashChase(t,side,passenger),other=sampleCrashChase(t,-side,passenger);
  for(const v of [...Object.values(p.car),...Object.values(p.runner)])if(typeof v==='number')assert(Number.isFinite(v));
  assert(Math.abs(p.car.x+other.car.x)<1e-10&&Math.abs(p.car.roll+other.car.roll)<1e-10,'mirrored car presentation');
  assert(p.runner.scale>=0&&p.runner.scale<=1);
 }
 for(const [t,phase] of [[.6,'tumble'],[1.35,'dazed'],[2.4,'run'],[3.8,'board']]){
  const input={anim:t,side:1},before=JSON.stringify(input);fx.update(input,anchor);
  assert(fx.root.visible);assert.equal(fx.root.getObjectByName('V59_Driver').userData.phase,phase);
  assert.equal(JSON.stringify(input),before,'do not mutate authoritative crash clock');
  const pose=snapshot();fx.update(input,anchor);assert.equal(snapshot(),pose,'pause/repeated renders freeze pose');
 }
 const objectCount=(()=>{let n=0;fx.root.traverse(()=>n++);return n;})();
 const geometry=fx.root.getObjectByName('V59_ChaseDust').geometry;
 for(const aspect of [16/9,390/844])for(const quality of ['LOW','STANDARD']){
  fx.update({anim:2.4,side:-1},anchor,aspect,quality);
  const dust=fx.root.getObjectByName('V59_ChaseDust');assert.equal(dust.count,quality==='LOW'?4:8);
  assert.equal(dust.geometry,geometry,'reuse fixed pool');
  let n=0;fx.root.traverse(()=>n++);assert.equal(n,objectCount,'no per-frame scene allocations');
 }
 fx.update({anim:4.1,side:1},anchor);
 assert(!fx.root.getObjectByName('V59_Driver').visible&&!fx.root.getObjectByName('V59_Passenger').visible,'both board before existing recovery');
 fx.update(null,anchor);assert(!fx.root.visible,'hidden in ordinary driving/reset');
}finally{Math.random=originalRandom;}
const resources=new Set();fx.root.traverse(n=>{if(n.geometry)resources.add(n.geometry);if(n.material)resources.add(n.material);});
const disposed=new Map();for(const r of resources)r.addEventListener('dispose',()=>disposed.set(r,(disposed.get(r)||0)+1));
fx.dispose();fx.dispose();assert.equal(fx.root.parent,null);for(const r of resources)assert.equal(disposed.get(r),1,'dispose shared resources exactly once');
// Exercise actual trigger/update/frame bridge; compare crash timing and penalties across profiles.
const {load}=require('./canvas-harness.cjs');
function race(){
 v34Mode='sprint';selectedRoute=routeForId('1A');resetGame();gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
 traffic=[];collisionCooldown=0;speed=175;playerX=.1;timeLeft=100;
 triggerCrash(null,null,true);const first=crashCount;triggerCrash(null,null,true);
 const frame=v57SceneFrame(),clock=crashSequence.t;paused=true;update(1/60);
 const pause=clock===crashSequence.t;paused=false;
 let frames=0;while(crashSequence&&frames<200){update(1/60);frames++;}
 return JSON.stringify({frame:frame.crash,once:crashCount===first,pause,frames,speed,timeLeft,raceElapsed,crashCount,score,collisionCooldown});
}
const file=path.resolve(__dirname,'../index.html'),old=JSON.parse(load(file).run('('+race+')()')),fresh=JSON.parse(load(file,{search:'?handling=v59'}).run('('+race+')()'));
assert.equal(old.frame,null);assert.deepEqual(fresh.frame,{anim:0,side:-1});
assert(old.once&&fresh.once&&old.pause&&fresh.pause);
const {frame:unused1,...before}=old,{frame:unused2,...after}=fresh;assert.deepEqual(after,before,'presentation adds no interruption/time/score/collision penalty');
assert(fresh.frames>=174&&fresh.frames<=175&&fresh.speed===118);
console.log('V59 crash: phases, mirrored car, pause, 1644 clock samples, LOW pool, reuse/disposal and actual crash timing/penalty parity passed (GPU mocked)');
// Real Three hierarchy with a mocked GPU: full scene integration, car replacement and reset.
let rendered;
THREE.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}render(scene,camera){rendered={scene,camera};}dispose(){}};
const {createFull3DScene}=require('../src/rendering/Full3DScene.cjs');
const world=createFull3DScene(THREE,{style:{},addEventListener(){},removeEventListener(){}});
const frame={curves:Array(126).fill(.5),hills:Array.from({length:126},(_,i)=>i*8),fraction:.4,playerX:.2,segment:180,carColor:'#e61e2b',archetype:'urban',speedKmh:0,crash:{anim:.5,side:1}};
const prior=JSON.stringify(frame),savedRandom=Math.random;Math.random=()=>{throw Error('full crash render consumed gameplay randomness');};
try{world.render(frame,0);}finally{Math.random=savedRandom;}
const group=rendered.scene.getObjectByName('V59_CrashChase'),car=rendered.scene.getObjectByName('V55_OriginalArcadeVehicle');
assert(group.visible&&Math.abs(car.rotation.z)>.2&&car.position.y>1);
const poseBefore=snapshot(group);world.render(frame,0);assert.equal(JSON.stringify(frame),prior,'full renderer never mutates the crash');assert.equal(snapshot(group),poseBefore,'repeated scene rendering freezes character poses');
frame.carColor='#0088aa';world.render(frame,0);assert(group.visible,'changing vehicle paint does not orphan occupants');
frame.crash=null;world.render(frame,0);const restored=rendered.scene.getObjectByName('V55_OriginalArcadeVehicle');
assert(!group.visible&&Math.abs(restored.rotation.z)<1e-10&&restored.position.y===.02,'ordinary vehicle transform restored immediately');
world.dispose();assert.equal(group.parent,null);
console.log('V59 full scene: tilted road, crash car pose, paint replacement, reset and cleanup passed (GPU mocked)');
// Projection bounds use actual Three camera matrices, including narrow scene aspect.
const view=createFull3DScene(THREE,{style:{},addEventListener(){},removeEventListener(){}});
for(const [width,height] of [[960,540],[390,844]])for(const side of [-1,1])for(const t of [.6,1.35,2.4,3.78]){
 view.render({...frame,hills:Array(126).fill(0),curves:Array(126).fill(0),crash:{anim:t,side}},0,width,height);
 const root=rendered.scene.getObjectByName('V59_CrashChase');
 for(const name of ['V59_Driver','V59_Passenger']){
  const actor=root.getObjectByName(name),bounds=new THREE.Box3().setFromObject(actor);
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   const p=new THREE.Vector3(x,y,z).project(rendered.camera);
   assert(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z>-1&&p.z<1,`actor clipped ${width}x${height}/${side}/${t}/${name}: ${p.toArray()}`);
  }
 }
}
view.dispose();
console.log('V59 crash projection: both occupants stay inside desktop and narrow camera bounds at all four sampled phases');
