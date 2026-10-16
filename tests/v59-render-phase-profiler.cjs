'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const sandbox={Math};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),sandbox);
const T=sandbox.THREE;
const {createFull3DScene}=require('../src/rendering/Full3DScene.cjs');
const game=load(path.join(__dirname,'../index.html'));
const results=[];
T.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}render(){}dispose(){}};
const canvas=()=>({style:{},addEventListener(){},removeEventListener(){}});
const profiled=createFull3DScene(T,canvas(),{onPhaseProfile:r=>results.push(r)});
const names=['previewRoad','viewport','roadGeometry','environment','landmarks','roadSigns',
 'nextRoutePrewarm','trafficMeshes','vehicleCamera','visibilityEffects','webglSubmit'];
const frame=()=>JSON.parse(game.run('JSON.stringify(v57SceneFrame())'));
function verify(r){
 assert.deepEqual(Object.keys(r.phases),names);
 assert(Number.isFinite(r.totalMs)&&r.totalMs>=0);
 const total=Object.values(r.phases).reduce((sum,x)=>{assert(Number.isFinite(x)&&x>=0);return sum+x;},0);
 assert(Math.abs(total-r.totalMs)<.25,'subphase timings partition total');
}
const stable=game.run('JSON.stringify({speed,isDrifting,nitro,playerX,playerZ})');
profiled.render(frame(),1/60);
assert.equal(results.length,1);assert.equal(results[0].firstRouteFrame,false);verify(results[0]);
assert.equal(game.run('JSON.stringify({speed,isDrifting,nitro,playerX,playerZ})'),stable);
profiled.render(frame(),0);assert.equal(results.length,2);assert.equal(results[1].firstRouteFrame,false);
game.run("v34Mode='arcade';setStage(1,0,false);");
profiled.render(frame(),1/60);
assert.equal(results.length,3);assert.equal(results[2].routeId,'2A');
assert.equal(results[2].firstRouteFrame,true);verify(results[2]);profiled.dispose();
const original=createFull3DScene(T,canvas());assert.equal(original.render(frame(),1/60),true);original.dispose();
console.log('V59.6: 11 opt-in WebGL phases, correct route flag and untouched gameplay');
