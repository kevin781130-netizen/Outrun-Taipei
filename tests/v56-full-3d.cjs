'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

// Exercise the real pinned Three.js scene/geometry classes, with only the GPU
// renderer mocked. Browser pixels are checked separately on the deployed build.
const vendor=fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8');
const sandbox={};
vm.runInNewContext(vendor,sandbox,{timeout:5000});
const THREE=sandbox.THREE;
assert.equal(THREE.REVISION,'149');
let last=null,renderCalls=0,disposeCalls=0;
THREE.WebGLRenderer=class {
 constructor(options){assert.equal(options.alpha,false);this.options=options;}
 setPixelRatio(r){assert(r>0);}
 setClearColor(){}
 setSize(w,h){assert(w>0&&h>0);}
 render(scene,camera){last={scene,camera};renderCalls++;}
 dispose(){disposeCalls++;}
};
const {createFull3DScene,previewPoints}=require('../src/rendering/Full3DScene.cjs');
const pts=previewPoints({curves:Array(126).fill(0),hills:Array(126).fill(0),playerX:0});
assert.equal(pts.length,126);
assert.equal(pts[0].x,0);
assert(pts[125].z<pts[0].z,'forward road is -Z');
const curved=previewPoints({curves:Array(126).fill(2),playerX:.3});
assert(Math.abs(curved[60].x-curved[1].x)>10,'curve affects actual 3D centerline');
const events={};
const canvas={style:{},addEventListener:(n,fn)=>events[n]=fn,removeEventListener:n=>delete events[n]};
const world=createFull3DScene(THREE,canvas);
const build=()=>({
 curves:Array(126).fill(0.12),
 hills:Array(126).fill(0),
 corridors:Array.from({length:126},()=>[{center:0,half:1}]),
 traffic:[{distance:13,x:0.3,color:0xffc920}],
 segment:44,playerX:0,carColor:'#181c24',archetype:'urban',
 seed:11,yawDeg:0,rollDeg:0,pitchDeg:0,steer:0,
 speedKmh:140,direction:1,braking:false,boosting:false
});
const frame=build();
assert.equal(world.ready,false);
assert.equal(world.render(frame,1/60,960,540,'STANDARD'),true);
assert.equal(world.ready,true);
assert.equal(canvas.style.visibility,'visible');
assert.equal(renderCalls,1);
assert.equal(last.camera.isPerspectiveCamera,true,'must be perspective 3D, not ortho 2.5D');
const vehicles=[];const meshTypes=new Set(),instanced=[];
last.scene.traverse(n=>{
 if(n.name==='V55_OriginalArcadeVehicle')vehicles.push(n);
 if(n.isInstancedMesh)instanced.push(n);
 if(n.isMesh)meshTypes.add(n.type);
});
assert.equal(vehicles.length,1);
const car=vehicles[0];
assert(last.camera.position.z>car.position.z,'camera must remain behind car');
let tailZ=null,headZ=null;
car.traverse(o=>{
 if(o.name==='taillight-1')tailZ=o.position.z;
 if(o.name==='headlight-1')headZ=o.position.z;
});
assert(tailZ>headZ,'rear lights face chase camera; no 180 degree inversion');
assert.equal(car.rotation.y,0,'do not rotate body backwards');
assert(instanced.length>=4,'actual 3D roadside/landscape instances');
assert(meshTypes.has('Mesh'));
// V56.1: the actual 3D chassis MUST use the visual sway and the chase camera
// must follow, not merely compute a drift value that nobody applies.
const driftFrame={...frame,isDrifting:true,driftState:'drift',driftAngle:30,
 slipAngle:16,driftDirection:1,lateralVelocity:1.6,yawDeg:34,boosting:true};
for(let i=0;i<25;i++)assert.equal(world.render(driftFrame,1/60,960,540,'STANDARD'),true);
assert(car.position.x>.14,'the real vehicle has visible rear sway');
assert(last.camera.position.x>.03,'the rear camera responds to the actual drift');
assert(car.children[0].rotation.y>.25,'damped yaw is applied to the 3D model');
const haze=[];const cityDetails=[];
last.scene.traverse(n=>{
 if(n.isInstancedMesh&&n.material?.transparent&&n.material.opacity<.5)haze.push(n);
 if(n.isInstancedMesh&&n.count>=20)cityDetails.push(n);
});
assert(haze.some(n=>n.count>0),'instanced tyre smoke appears while drifting');
assert(cityDetails.length>=4,'urban scene renders many dressed building instances');
for(let i=0;i<80;i++)world.render({...frame,driftState:'grip',driftAngle:0,slipAngle:0,
 lateralVelocity:0,isDrifting:false},1/60,960,540,'STANDARD');
assert(Math.abs(car.position.x)<.004,'3D vehicle returns to lane center');
assert.equal(world.render({...frame,playerX:.7,carColor:'#f0f4f8',speedKmh:220},1/60,720,405,'LOW'),true);
assert(renderCalls>=107);
let prevented=false;
events.webglcontextlost({preventDefault(){prevented=true;}});
assert(prevented);
assert.equal(world.ready,false);
assert.equal(world.render(frame,0,720,405,'LOW'),false);
events.webglcontextrestored();
assert.equal(world.render(frame,0,960,540,'HIGH'),true);
world.dispose();
assert.equal(disposeCalls,1);
assert.equal(Object.keys(events).length,0);
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert(html.includes('const v56Full3D='));
assert(html.includes('window.TaipeiHybrid.createFull3DScene'));
assert(html.includes('canvas.style.visibility=\'hidden\';'));
const mainRender=html.slice(html.indexOf('function render(dt){'),html.indexOf('function presentArcade('));
assert(mainRender.indexOf('if(v56Full3D)')<mainRender.indexOf('drawRoad();'),'3D scene must be selected before 2D draw');
assert.equal(html.includes('v55LoadExperimentalOverlay();'),false);
console.log('V56 full 3D: geometry, perspective camera, orientation, traffic, context loss and visible-only-WebGL passed');
