'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createEffectState,updateEffectState,createDrivingEffects}=require('../src/rendering/DrivingEffects.cjs');
const frame={speedKmh:295,boosting:true,driving:{isDrifting:true,slipAngleDeg:16}};
const original=JSON.stringify(frame);
const states=[30,60,120].map(fps=>{
 const state=createEffectState();for(let i=0;i<fps;i++)updateEffectState(state,frame,1/fps);return state;
});
for(const key of ['time','speed','smoke','boost'])assert(Math.abs(states[0][key]-states[2][key])<1e-10,'FPS-independent '+key);
assert.equal(JSON.stringify(frame),original,'effects never mutate driving input');
const frozen=JSON.stringify(states[0]);updateEffectState(states[0],{},0);assert.equal(JSON.stringify(states[0]),frozen);
assert.throws(()=>updateEffectState(states[0],frame,-1),/nonnegative/);
const noSlip=createEffectState();updateEffectState(noSlip,{...frame,driving:{isDrifting:true,slipAngleDeg:2}},1/60);
assert.equal(noSlip.smoke,0,'no smoke without actual slip');
const sandbox={};vm.runInNewContext(fs.readFileSync(require.resolve('../assets/vendor/three-r149.min.js'),'utf8'),sandbox);
const THREE=sandbox.THREE;
const {createVehicle3D}=require('../src/rendering/Vehicle3D.cjs');
const car=createVehicle3D(THREE),camera=new THREE.PerspectiveCamera(66,16/9,.1,490);
const fx=createDrivingEffects(THREE);
const random=Math.random;Math.random=()=>{throw new Error('effect consumed gameplay randomness');};
try{for(let i=0;i<60;i++)fx.update(frame,1/60,'STANDARD',camera,car);}finally{Math.random=random;}
const lines=camera.getObjectByName('V57_PeripheralSpeedLines'),smoke=car.root.getObjectByName('V57_DriftSmoke');
assert(lines.visible&&smoke.visible);assert.equal(smoke.count,24);
assert(lines.material.opacity<=.24&&smoke.material.opacity<=.17,'bounded opacity');
const buffer=Array.from(lines.geometry.attributes.position.array),matrices=Array.from(smoke.instanceMatrix.array);
fx.update(frame,0,'STANDARD',camera,car);
assert.deepEqual(Array.from(lines.geometry.attributes.position.array),buffer,'pause freezes speed lines');
assert.deepEqual(Array.from(smoke.instanceMatrix.array),matrices,'pause freezes smoke');
for(const aspect of [16/9,390/844]){
 camera.aspect=aspect;fx.update(frame,0,'LOW',camera,car);
 assert.equal(smoke.count,8);assert.equal(lines.geometry.drawRange.count,12);
 const halfX=Math.tan(camera.fov*Math.PI/360)*5*aspect;
 for(let i=0;i<6;i++)assert(Math.abs(lines.geometry.attributes.position.array[i*6])>=halfX*.8,'clear central view');
}
const car2=createVehicle3D(THREE);fx.update(frame,0,'STANDARD',camera,car2);
assert.equal(car.root.getObjectByName('V57_DriftSmoke'),undefined,'reuse smoke after vehicle replacement');
for(let i=0;i<120;i++)fx.update({speedKmh:0,boosting:false},1/60,'STANDARD',camera,car2);
assert(!lines.visible&&!smoke.visible,'effects fade when driving stops');
fx.dispose();fx.dispose();assert.equal(lines.parent,null);assert.equal(smoke.parent,null);
car.dispose();car2.dispose();
console.log('V57 effects: frame-rate parity, pause, slip gating, peripheral layout, LOW pools, car replacement and disposal passed');
