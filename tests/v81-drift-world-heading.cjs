'use strict';
// Check actual transformed nose/tail and front-wheel directions, not Euler signs.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),context);
const T=context.THREE;
const {createFull3DScene,previewPoints,sampleRoadPoint}=require('../src/rendering/Full3DScene.cjs');
const {createDrivingVisualSnapshot}=require('../src/rendering/DrivingVisualSnapshot.cjs');
let scene;
T.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}render(s){scene=s;}dispose(){}};
const world=createFull3DScene(T,{style:{},addEventListener(){},removeEventListener(){}});
for(const side of [-1,1])for(const curve of [side*1.5,0])for(const yaw of [8,28,40]){
 const frame={curves:Array(126).fill(curve),hills:Array(126).fill(0),fraction:.4,
  playerX:0,segment:200,speedKmh:180,archetype:'urban',quality:'HIGH',
  yawDeg:side*yaw,steer:side*.75,carColor:'#c23441',
  driving:{...createDrivingVisualSnapshot(),driftState:'drift',isDrifting:true,
   driftDirection:side,driftAngleDeg:side*yaw,slipAngleDeg:side*15,
   lateralVelocity:-side*.5,yawDeg:side*yaw}};
 const saved=JSON.stringify(frame);
 world.render(frame,1/60);scene.updateMatrixWorld(true);
 const scaled=scene.getObjectByName('V55_OriginalArcadeVehicle');
 assert(Math.abs(scaled.scale.x/.92-.97)<1e-12&&Math.abs(scaled.scale.y/.83-.97)<1e-12&&Math.abs(scaled.scale.z/.92-.97)<1e-12,'V84 model is exactly 3% smaller on every axis');
 const contact=scene.getObjectByName('V58_ContactShadow');
 assert(Math.abs(contact.scale.x/1.12-.97)<1e-12&&Math.abs(contact.scale.y/1.95-.97)<1e-12,'road shadow follows the smaller model');
 const car=scene.getObjectByName('V55_OriginalArcadeVehicle');
 const nose=car.getObjectByName('nose').getWorldPosition(new T.Vector3());
 const tail=car.getObjectByName('trunk').getWorldPosition(new T.Vector3());
 const axis=nose.clone().sub(tail).normalize();
 const road=sampleRoadPoint(previewPoints(frame),frame.fraction);
 const roadRight=new T.Vector3(Math.cos(road.heading),0,Math.sin(road.heading));
 assert(axis.dot(roadRight)*side>0,'nose must face intended turn, even while lateral momentum points outward');
 assert.equal(JSON.stringify(frame),saved,'rendering cannot rewrite inertia, position or simulation yaw');
 const pivot=car.getObjectByName('front-left-steer');
 const bodyRight=new T.Vector3(1,0,0).transformDirection(car.children[0].matrixWorld);
 const wheelForward=new T.Vector3(0,0,-1).transformDirection(pivot.matrixWorld);
 assert(wheelForward.dot(bodyRight)*side>0,'front wheel must steer into the commanded direction');
 frame.steer=-side*.75;world.render(frame,0);scene.updateMatrixWorld(true);
 const counterWheel=new T.Vector3(0,0,-1).transformDirection(pivot.matrixWorld);
 assert(counterWheel.dot(bodyRight)*side<0,'countersteer changes wheel direction, not the chassis heading or inertia');
 const counterAxis=car.getObjectByName('nose').getWorldPosition(new T.Vector3()).sub(car.getObjectByName('trunk').getWorldPosition(new T.Vector3())).normalize();
 assert(counterAxis.dot(roadRight)*side>0,'countersteer must not instantly reverse body heading');
}
world.dispose();
console.log('V81: 12 world-space heading cases; inward nose, outward retained momentum, correct wheels and countersteer passed');
