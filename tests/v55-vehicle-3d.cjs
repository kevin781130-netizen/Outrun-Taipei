'use strict';
const assert = require('node:assert/strict');
const {createVehicle3D} = require('../src/rendering/Vehicle3D.cjs');
const {createVehiclePose, updateVehiclePose} = require('../src/rendering/VehiclePoseBridge.cjs');

// API-compatible geometry/material/scene-node mock. This verifies hierarchy,
// animations, disposal and zero hot-path allocations without needing a GPU.
const registry = {geometry: [], material: [], mesh: []};
class Vector {
  constructor(x=0,y=0,z=0) { this.set(x,y,z); }
  set(x,y,z) {this.x=x; this.y=y; this.z=z; return this;}
}
class Node {
  constructor() {
    this.position = new Vector();
    this.scale = new Vector(1,1,1);
    this.rotation = new Vector();
    this.children = [];
    this.parent = null;
    this.visible = true;
    this.name = '';
  }
  add(node) {if(node.parent) node.parent.remove(node);this.children.push(node);node.parent=this;}
  remove(node) {const i=this.children.indexOf(node);if(i>=0){this.children.splice(i,1);node.parent=null;}}
  traverse(fn) {fn(this);for(const child of this.children) child.traverse(fn);}
}
class Group extends Node {}
class Geometry {
  constructor(...args){this.args=args;this.disposeCount=0;registry.geometry.push(this);}
  dispose(){this.disposeCount++;}
}
class Material {
  constructor(options) {Object.assign(this,options);this.disposeCount=0;registry.material.push(this);}
  dispose(){this.disposeCount++;}
}
class Mesh extends Node {
  constructor(geometry, material){super();this.geometry=geometry;this.material=material;registry.mesh.push(this);}
}
const THREE = {
  Group, Mesh,
  BoxGeometry:Geometry, CylinderGeometry:Geometry,
  ConeGeometry:Geometry, PlaneGeometry:Geometry,
  MeshStandardMaterial:Material, MeshBasicMaterial:Material, MeshPhysicalMaterial:Material,
  DoubleSide:2
};

assert.throws(() => createVehicle3D(null), TypeError);
const car=createVehicle3D(THREE, {color:0x123456});
assert.equal(car.root.name, 'V55_OriginalArcadeVehicle');
assert.ok(car.parts.paint.clearcoat === 1);
assert.equal(car.parts.paint.color, 0x123456);
assert.equal(car.parts.steeringPivots.length, 2);
assert.equal(car.parts.wheelSpinners.length, 4);
assert.equal(car.parts.exhaustFlames.length, 2);
assert.ok(registry.mesh.length >= 30, 'assembled detailed low-poly car');
assert.ok(registry.geometry.length <= 5, 'shared primitive geometries');

const names = [];
car.root.traverse(node=>names.push(node.name));
for (const part of ['body-lower', 'hood', 'roof', 'windshield', 'rear-glass',
  'front-left-steer', 'front-right-steer', 'rear-wing', 'contact-shadow']) {
  assert.ok(names.includes(part), `missing ${part}`);
}
assert.equal(names.filter(name=>name==='rubber-tire').length,4);
assert.equal(names.filter(name=>name==='alloy-wheel').length,4);
assert.equal(names.filter(name=>name==='headlight--1').length,1);
assert.equal(names.filter(name=>name==='taillight-1').length,1);

const frame=Object.freeze({
  screenX:490, screenY:480, yawDeg:40, rollDeg:-3, pitchDeg:1,
  steer:0.6, speedKmh:190, braking:true, boosting:true
});
const pose=createVehiclePose();
updateVehiclePose(pose,frame,1/60);
const geometryCount=registry.geometry.length, materialCount=registry.material.length, meshCount=registry.mesh.length;
car.applyPose(pose);
assert.equal(car.parts.yaw.rotation.y,pose.yawRad);
assert.equal(car.parts.roll.rotation.z,pose.rollRad);
assert.equal(car.parts.pitch.rotation.x,pose.pitchRad);
for (const p of car.parts.steeringPivots) assert.equal(p.rotation.y,pose.steerRad);
for (const w of car.parts.wheelSpinners) assert.equal(w.rotation.x,pose.wheelSpinRad);
assert.equal(car.parts.tail.emissiveIntensity,2.6);
assert.ok(car.parts.exhaustFlames.every(flame=>flame.visible));
assert.equal(car.root.position.x,0,'pose screen position is NOT world position');

for(let i=0;i<200;i++){
  updateVehiclePose(pose,{...frame,braking:false,boosting:false},1/60);
  car.applyPose(pose);
}
assert.equal(car.parts.tail.emissiveIntensity,0.45);
assert.ok(car.parts.exhaustFlames.every(flame=>!flame.visible));
assert.deepEqual([registry.geometry.length, registry.material.length, registry.mesh.length],
  [geometryCount,materialCount,meshCount], 'no allocation on hot path');

car.setQuality('LOW');
assert.equal(car.parts.paint.clearcoat,0);
assert.equal(car.parts.glazing.clearcoat,0);
car.setQuality('ULTRA');
assert.equal(car.parts.paint.clearcoat,1);
assert.equal(car.parts.glazing.clearcoat,0.8);
assert.throws(()=>car.applyPose({...pose,yawRad:Infinity}),TypeError);
assert.throws(()=>car.applyPose({...pose,scaleX:0}),RangeError);

const scene = new Group();
scene.add(car.root);
car.dispose();
assert.equal(car.root.parent,null,'detach during cleanup');
assert.ok(registry.geometry.every(g=>g.disposeCount===1),'geometries disposed once');
assert.ok(registry.material.every(m=>m.disposeCount===1),'materials disposed once');
car.dispose();
assert.ok(registry.geometry.every(g=>g.disposeCount===1),'idempotent disposal');
car.applyPose(pose);
assert.equal(frame.yawDeg,40,'source state untouched');
console.log('V55 3D vehicle: model hierarchy, steering, wheel spin, lights, quality, allocation, disposal passed');
