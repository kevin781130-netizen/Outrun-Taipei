'use strict';
const assert=require('node:assert/strict');
const {makeDriftVisualState,advanceDriftVisual}=require('../src/rendering/DriftVisualRig.cjs');
const {createCityArtKit,BODY_COLORS}=require('../src/rendering/CityArtKit.cjs');
const {createDriftSmoke}=require('../src/rendering/DriftSmoke.cjs');

const state=makeDriftVisualState();
const input=Object.freeze({isDrifting:true,driftState:'drift',speedKmh:155,
 driftAngle:34,slipAngle:18,driftDirection:1,lateralVelocity:1.5,
 visualYawDeg:36,rollDeg:2,boosting:true});
const positive=advanceDriftVisual(state,input,1/60);
assert.equal(positive,state);
for(let i=0;i<45;i++)advanceDriftVisual(state,input,1/60);
assert(state.lateral>.10&&state.lateral<.68,'drift has bounded sideways presence');
assert(state.cameraX>0,'follow camera shifts with sideways movement');
assert(state.smoke>0,'drift emits readable smoke');
assert(state.fov>66,'boost changes FOV modestly');
const negative=makeDriftVisualState();
const reverse={...input,driftDirection:-1,lateralVelocity:-1.5,visualYawDeg:-36};
for(let i=0;i<45;i++)advanceDriftVisual(negative,reverse,1/60);
assert(negative.lateral<-.10);
assert(negative.cameraX<0);
const recovering={...input,isDrifting:false,driftState:'recover',lateralVelocity:0,
 driftAngle:0,slipAngle:0,visualYawDeg:0};
for(let i=0;i<80;i++)advanceDriftVisual(state,recovering,1/60);
assert(Math.abs(state.lateral)<.003,'recover returns near center');
const grip={...recovering,driftState:'grip'};
for(let i=0;i<60;i++)advanceDriftVisual(state,grip,1/60);
assert(Math.abs(state.cameraX)<.01,'camera recenters smoothly');
assert.equal(state.smoke,0,'no smoke outside drift');
advanceDriftVisual(state,{...input,slipAngle:Infinity,lateralVelocity:Infinity},Infinity);
assert(Number.isFinite(state.lateral),'bad telemetry is clamped');
assert.equal(input.lateralVelocity,1.5,'source physics data is untouched');

class Vec {
 constructor(x=0,y=0,z=0){this.set(x,y,z);}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
}
class Node{
 constructor(){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec(1,1,1);
 this.children=[];this.parent=null;}
 add(n){this.children.push(n);n.parent=this;}
 remove(n){this.children.splice(this.children.indexOf(n),1);n.parent=null;}
 updateMatrix(){this.matrix=[...Object.values(this.position),...Object.values(this.rotation),...Object.values(this.scale)];}
}
class Geometry{dispose(){this.disposed=true;}}
class Material{constructor(v){Object.assign(this,v);this.color={setHex(){}};}dispose(){this.disposed=true;}}
class Instance extends Node{
 constructor(g,m,count){super();this.geometry=g;this.material=m;this.max=count;this.count=0;
 this.instanceMatrix={count,needsUpdate:false,setUsage(){}};
 this.instanceColor=null;this.sets=0;}
 setMatrixAt(index,m){assert(index<this.max);this.sets++;}
 setColorAt(index,c){assert(index<this.max);this.instanceColor={needsUpdate:false};}
}
const THREE={
 InstancedMesh:Instance,BoxGeometry:Geometry,SphereGeometry:Geometry,
 MeshStandardMaterial:Material,MeshBasicMaterial:Material,DynamicDrawUsage:35048,
 NormalBlending:1,Object3D:Node,Color:class{setHex(){}}
};
const scene=new Node(),geometry=[],materials=[];
const registerGeometry=g=>(geometry.push(g),g);
const registerMaterial=m=>(materials.push(m),m);
const city=createCityArtKit(THREE,scene,registerGeometry,registerMaterial);
const facades=Array.from({length:40},(_,i)=>({
 x:i*11,y:0,z:-i*8,width:6+i%4,height:10+i%12,depth:5,heading:.05,seed:i*137
}));
const day=city.update(facades,false);
assert.equal(day.buildings,40);
assert.equal(day.signboards,40,'every building gets shop signage');
assert.equal(day.awnings,40,'every building gets an awning');
assert.equal(day.roofDetails,80,'two rooftop details per building');
assert.equal(day.darkWindows,240,'six distinct panes per building');
assert(BODY_COLORS.every(c=>c!==0xffffff),'city palette is not all-white');
const night=city.update(facades,true);
assert(night.litWindows>0&&night.darkWindows>0,'night has mixed illuminated panes');
assert.equal(night.darkWindows+night.litWindows,240);
assert.equal(scene.children.length,6);
city.dispose();
assert.equal(scene.children.length,0);

const smoke=createDriftSmoke(THREE,scene,registerGeometry,registerMaterial);
for(let i=0;i<55;i++)smoke.step({smoke:.9},1/60,.3,3.15,185);
assert(smoke.emitted>0,'physical drift generates smoke particles');
assert(smoke.mesh.count>0);
assert(smoke.mesh.count<=52,'bounded smoke instance count');
for(let i=0;i<100;i++)smoke.step({smoke:0},1/60,0,3.15,0);
assert.equal(smoke.mesh.count,0,'particles fade after drift exit');
smoke.dispose();
assert.equal(scene.children.length,0);
console.log('V56.1 drift and city kit: mirrored drift, recovery, smoke, six-window facades, shop details, night lighting passed');
