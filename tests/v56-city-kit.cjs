'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const vendor=fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8');
const sandbox={};vm.runInNewContext(vendor,sandbox,{timeout:5000});
const THREE=sandbox.THREE;
assert.equal(THREE.REVISION,'149');
let rendered=null;
THREE.WebGLRenderer=class {
 setPixelRatio(){} setClearColor(){} setSize(){}
 render(scene,camera){rendered={scene,camera};}
 dispose(){}
};
const {createFull3DScene}=require('../src/rendering/Full3DScene.cjs');
const version={textContent:'V56.0'};
const canvas={style:{},ownerDocument:{querySelector:()=>version},addEventListener(){},removeEventListener(){}};
const scene=createFull3DScene(THREE,canvas);
function driving(yaw=30){return {driftState:'drift',isDrifting:true,driftAngleDeg:yaw,slipAngleDeg:12,driftDirection:Math.sign(yaw),lateralVelocity:0,roadGrip:1,cleanDriftTime:.4,exitBoost:0,momentBoostWindow:0,driftCharge:30,nitroActive:false,yawDeg:yaw};}
function frame(archetype='urban',curves=Array(126).fill(0),speed=87){return {
 curves,hills:Array(126).fill(0),corridors:Array.from({length:126},()=>[{center:0,half:1}]),
 segment:110,seed:19,playerX:0,carColor:'#182231',traffic:[],
 archetype,night:true,yawDeg:30,steer:1,speedKmh:speed,rollDeg:0,pitchDeg:0,braking:false,boosting:false,driving:driving()
};}
assert.equal(scene.render(frame(),1/60,1280,800,'STANDARD'),true);
assert.equal(version.textContent,'V56.1A');
const city=rendered.scene.children.filter(x=>x.name?.startsWith('TaipeiCityKit_'));
assert.equal(city.length,6,'six instanced facade asset families');
const panes=city.find(x=>x.name==='TaipeiCityKit_glass');
const shops=city.find(x=>x.name==='TaipeiCityKit_shops');
assert(panes.count>=1200,'city must contain genuine 3D windows');
assert(shops.count>=60,'city must have roadside shops');
assert(panes.count<=3500,'window draw cap protects mobile GPU');
const boxes=rendered.scene.children.find(x=>x.isInstancedMesh&&x.material?.isMeshBasicMaterial&&!x.name?.startsWith('TaipeiCityKit_'));
assert(boxes.count>50,'visible building bodies required');
const color=Array.from(boxes.instanceColor.array.slice(0,3));
assert(color.some(v=>v<.7),'buildings may no longer all be pure white');
const roads=rendered.scene.children.filter(x=>x.isMesh&&x.material?.isMeshBasicMaterial&&x.geometry?.isBufferGeometry&&x.geometry.getAttribute('position')?.usage===THREE.DynamicDrawUsage);
assert(roads.length>=4,'asphalt road uses unlit stable dark color');
const car=rendered.scene.getObjectByName('V55_OriginalArcadeVehicle');
assert(Math.abs(car.children[0].rotation.y/Math.PI*180-11.2)<.01,'slow-straight yaw cap');
scene.render({...frame(),curves:Array(126).fill(2),speedKmh:220},1/60,844,390,'LOW');
assert(Math.abs(car.children[0].rotation.y/Math.PI*180)>23,'tight corner still has visible yaw');
scene.render(frame('mountain'),1/60,390,844,'LOW');
assert(city.every(x=>x.count===0),'no urban shopfronts on mountain road');
scene.dispose();
console.log('V56.1A full Three.js CityKit scene, facade/color/draw caps, road materials and drift yaw passed (GPU mocked)');
