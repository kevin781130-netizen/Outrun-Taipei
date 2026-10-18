'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const data=JSON.parse(game.run(`(()=>{
 const gain=v88DriftAuthorityGain,modern=v90DriftCommand;
 // Keep this historical V88 gain-isolation regression; V90 has its own old/new replay.
 v90DriftCommand=v84DriftCommand;
 function run(side,kmh,hz,old=false,grip=false){
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
  traffic=[];timeLeft=9999;collisionCooldown=100;speed=kmh;
  playerX=0;playerZ=180*SEGMENT_LENGTH;currentGear='HIGH';driveGear='D';motionDirection=1;roadGrip=1;
  isDrifting=!grip;driftState=grip?'grip':'drift';driftDirection=grip?0:side;driftAge=1;
  steer=side*.8;driftAngle=grip?0:side*28;slipAngle=grip?0:side*12;
  v88DriftAuthorityGain=old?()=>1:gain;const rows=[];
  try{for(let i=0;i<hz;i++){
   for(const seg of segments)seg.curve=side*1.2;
   keys.KeyW=true;keys.KeyS=false;keys.ShiftLeft=false;
   gamepadInput.steer=i<hz*.4?side*.8:i<hz*.6?0:-side*.8;
   update(1/hz);rows.push({x:playerX,lv:lateralVelocity,yaw:driftAngle,slip:slipAngle,speed,state:driftState});
  }}finally{v88DriftAuthorityGain=gain;gamepadInput.steer=0;}
  return rows;
 }
 const cases=[];for(const kmh of [110,180,240])for(const side of [-1,1])for(const hz of [30,60,120])
  cases.push({kmh,side,hz,before:run(side,kmh,hz,true),after:run(side,kmh,hz)});
 const gripBefore=run(1,180,60,true,true),gripAfter=run(1,180,60,false,true);
 speed=180;isDrifting=true;driftAge=1;driftDirection=1;driftState='drift';
 const neutral=v84DriftCommand(0,.4),counter=v84DriftCommand(-1,.4),active=v84DriftCommand(1,.4);
 driftState='recover';const recovery=v84DriftCommand(1,.4);
 v90DriftCommand=modern;
 return JSON.stringify({cases,gripBefore,gripAfter,neutral,counter,active,recovery});
})()`));
assert.deepEqual(data.gripAfter,data.gripBefore);
assert.equal(data.neutral,0);assert.equal(data.counter,-.4);
assert(Math.abs(data.active/data.recovery-1.08)<1e-12);
for(const c of data.cases){
 const i=Math.round(c.hz*.3)-1,a=c.after[i],b=c.before[i];
 assert(a.lv*c.side>b.lv*c.side,'inward road-relative speed must actually increase');
 assert(a.x*c.side>b.x*c.side,'held correction must move farther inward');
 assert(Math.abs(a.x-b.x)<.008,'extra movement remains modest during a short dodge');
 for(let j=0;j<c.after.length;j++){
  const r=c.after[j];assert(Math.abs(r.x)<.5,'reference dodge remains within road');
  assert.equal(r.yaw,c.before[j].yaw,'body turn remains unchanged');
  assert.equal(r.slip,c.before[j].slip);assert.equal(r.speed,c.before[j].speed);
  assert(Object.values(r).every(v=>typeof v!=='number'||Number.isFinite(v)));
 }
}
const sample=data.cases.find(c=>c.kmh===180&&c.side===1&&c.hz===60);
console.log('V88 correction replay:',JSON.stringify({at300ms:{before:sample.before[17],after:sample.after[17]}}));
// Real geometry and scene lifecycle; only WebGLRenderer is replaced.
const ctx={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),ctx);
const T=ctx.THREE;let scene;
T.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}render(s){scene=s;}dispose(){}};
const {createFull3DScene}=require('../src/rendering/Full3DScene.cjs');
const world=createFull3DScene(T,{style:{},addEventListener(){},removeEventListener(){}});
const frame={curves:Array(126).fill(0),hills:Array(126).fill(0),segment:200,speedKmh:180,
 traffic:[{distance:10,x:.2,halfWidth:.1,color:'#446688',eligible:true}]};
const snapshot=JSON.stringify(frame);world.render(frame,1/60);
const car=scene.getObjectByName('V88_Traffic_0'),other=scene.getObjectByName('V88_Traffic_1');
assert(car.visible&&!other.visible);assert.equal(car.children.length,11,'bounded pooled geometry budget');
const body=car.getObjectByName('traffic-body'),glass=car.getObjectByName('traffic-glass'),cap=car.getObjectByName('traffic-roof-cap');
assert.equal(body.material,cap.material,'paint updates cover the roof');
assert.equal(body.geometry,other.getObjectByName('traffic-body').geometry,'pool shares coachwork geometry');
for(const mesh of [body,glass]){
 const g=mesh.geometry;assert(g.attributes.position.count>8);g.computeBoundingBox();
 assert(g.boundingBox.min.x>=-.851&&g.boundingBox.max.x<=.851);
 // Closed lofts must have positive signed volume (outward winding).
 let volume=0;const p=g.attributes.position,idx=g.index;
 for(let i=0;i<idx.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,idx.getX(i)),b=new T.Vector3().fromBufferAttribute(p,idx.getX(i+1)),c=new T.Vector3().fromBufferAttribute(p,idx.getX(i+2));volume+=a.dot(b.cross(c))/6;}
 assert(volume>0,'coachwork faces point outward');
}
const savedPosition=car.position.clone(),savedScale=car.scale.clone(),savedRotation=car.rotation.clone();
car.position.set(0,0,0);car.scale.set(1,1,1);car.rotation.set(0,0,0);car.updateMatrixWorld(true);
const box=new T.Box3().setFromObject(car);
for(const [key,oldMin,oldMax] of [['x',-1,1],['y',.04,1.275],['z',-1.8,1.865]]){
 assert(Math.abs(box.min[key]-oldMin)<1e-6&&Math.abs(box.max[key]-oldMax)<1e-6,'old projected envelope retained: '+key);
}
car.position.copy(savedPosition);car.scale.copy(savedScale);car.rotation.copy(savedRotation);
assert.equal(JSON.stringify(frame),snapshot);
const geometries=new Set(car.children.map(m=>m.geometry));let disposed=0;
for(const g of geometries)g.addEventListener('dispose',()=>disposed++);
world.render({...frame,traffic:[]},1/60);assert(!car.visible);
world.dispose();world.dispose();assert.equal(disposed,geometries.size,'shared traffic resources disposed exactly once');
console.log('V88: 18 old/new update replays, unchanged grip/heading/recovery/counter limits; shared traffic silhouettes, winding, original bounds and disposal passed (GPU mocked).');
