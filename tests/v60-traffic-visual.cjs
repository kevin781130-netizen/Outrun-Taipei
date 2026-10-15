'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Browser pixels are verified in Playwright; this suite isolates the renderer's
// directional response using real pinned Three.js scene classes and a mocked GPU.
const vendor=fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8');
const sandbox={};vm.runInNewContext(vendor,sandbox,{timeout:5000});
const T=sandbox.THREE;
let scene=null;
T.WebGLRenderer=class{
  setPixelRatio(){}setClearColor(){}setSize(){}
  render(s){scene=s;}dispose(){}
};
const {createFull3DScene}=require('../src/rendering/Full3DScene.cjs');
const canvas={style:{},addEventListener(){},removeEventListener(){}};
const world=createFull3DScene(T,canvas);
const traffic={sourceIndex:0,eligible:true,distance:15,x:0.25,halfWidth:.10,color:'#ffb800'};
const frame={curves:Array(126).fill(0),hills:Array(126).fill(0),
  corridors:Array.from({length:126},()=>[{center:0,half:1}]),
  playerX:0,fraction:0,traffic:[traffic],carColor:'#181c24',
  archetype:'urban',seed:9,speedKmh:150,direction:1,night:false};
const snap=JSON.stringify(frame);
assert.equal(world.render(frame,1/60,960,540,'STANDARD'),true);
const car=scene.children.find(obj=>obj.userData?.trafficIndex===0);
assert(car&&car.isGroup,'traffic mesh is linked to source vehicle index');
const initial=car.rotation.y;
assert(Math.abs(initial)<1e-9,'plain scene follows straight road; no preview steering');
const turn={...frame,traffic:[{...traffic,turnYawRad:-.115}]};
assert.equal(world.render(turn,1/60,960,540,'STANDARD'),true);
assert(Math.abs(car.rotation.y+.115)<1e-9,'leftward lane motion visibly rotates actual Three group');
assert.equal(car.userData.trafficIndex,0,'stable mesh identity; no allocations');
assert.equal(scene.children.find(obj=>obj.userData?.trafficIndex===0),car,'reuse the same traffic mesh');
assert.equal(world.render({...frame,traffic:[{...traffic,turnYawRad:.12}]},1/60,960,540,'STANDARD'),true);
assert(Math.abs(car.rotation.y-.12)<1e-9,'rightward lane motion mirrors the turn');
assert.equal(world.render({...frame,traffic:[{...traffic,turnYawRad:2}]},1/60,960,540,'STANDARD'),true);
assert(Math.abs(car.rotation.y-.16)<1e-9,'visual turn is capped at 0.16 radians');
assert.equal(world.render({...frame,traffic:[{...traffic,turnYawRad:Infinity}]},1/60,960,540,'STANDARD'),true);
assert.equal(car.rotation.y,0,'invalid preview angle must fall back to road heading');
assert.equal(world.render(frame,1/60,960,540,'STANDARD'),true);
assert.equal(car.rotation.y,initial,'default render stays unchanged after opt-in rendering');
assert.equal(JSON.stringify(frame),snap,'presentation must not mutate game state');
// V70 verifies shared near-field visuals do not leak to ranked/default or
// distant cars. These are real Three.js groups, only the GPU is mocked.
const details=car.getObjectByName('V70_TrafficDetails');
assert(details&&details.isGroup,'V70 mesh group attached to original traffic car');
assert.equal(details.children.length,7,'exactly seven shared-material detailing meshes');
assert.equal(details.visible,false,'default/ranked renderer must hide all V70 accents');
const preview={...frame,trafficVisual70:true};
assert.equal(world.render(preview,1/60,960,540,'STANDARD'),true);
assert.equal(details.visible,true,'only near preview vehicle receives styling');
const baselineYaw=car.rotation.y;
assert.equal(world.render({...preview,traffic:[{...traffic,distance:65}]},1/60,960,540,'STANDARD'),true);
assert.equal(details.visible,false,'far preview traffic must cull accent draw calls');
assert.equal(world.render(frame,1/60,960,540,'STANDARD'),true);
assert.equal(details.visible,false,'switching preview off restores the original visuals');
assert.equal(car.rotation.y,baselineYaw,'visual styling never alters vehicle yaw');
assert.equal(JSON.stringify(frame),snap,'no frame or collision state changes from styling');
world.dispose();
console.log('V60 traffic visual: 3D mirrored heading, clamp, invalid fallback, stable mesh, default parity (GPU mocked)');
