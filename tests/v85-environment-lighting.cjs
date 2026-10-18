'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const c={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),c);
const T=c.THREE,{createEnvironmentLighting}=require('../src/rendering/EnvironmentLighting.cjs');
const originalRandom=Math.random;let one,two;
Math.random=()=>{throw new Error('Lighting must not consume simulation RNG');};
try{one=createEnvironmentLighting(T);two=createEnvironmentLighting(T);}finally{Math.random=originalRandom;}
let bytes=0,disposals=0;
for(const night of [false,true]){
 const tex=one.environment(night,'HIGH');
 assert(tex.isDataTexture);assert.equal(tex.mapping,T.EquirectangularReflectionMapping);
 assert.equal(tex.encoding,T.LinearEncoding);assert.equal(tex.image.width,256);assert.equal(tex.image.height,128);
 assert.equal(tex.generateMipmaps,false);assert.equal(tex.wrapS,T.RepeatWrapping);
 assert.deepEqual(tex.image.data,two.environment(night,'HIGH').image.data,'deterministic radiance');
 for(let i=3;i<tex.image.data.length;i+=4)assert.equal(tex.image.data[i],255);
 for(let i=0;i<100;i++)assert.equal(one.environment(night,'STANDARD'),tex,'no per-frame texture replacement');
 assert.equal(one.environment(night,'LOW'),null);bytes+=tex.image.data.byteLength;
 tex.addEventListener('dispose',()=>disposals++);
}
assert.equal(bytes,256*128*4*2,'256 KiB CPU radiance budget');
const luminance=t=>{let sum=0;for(let i=0;i<t.image.data.length;i+=4)sum+=t.image.data[i]*.2126+t.image.data[i+1]*.7152+t.image.data[i+2]*.0722;return sum/(256*128);};
assert(luminance(one.environment(false,'HIGH'))>luminance(one.environment(true,'HIGH'))*3,'night has separately bounded radiance');
const seam=tex=>{let max=0;for(let y=0;y<128;y++)for(let k=0;k<3;k++)max=Math.max(max,Math.abs(tex.image.data[y*256*4+k]-tex.image.data[(y*256+255)*4+k]));return max;};
for(const night of [false,true])assert(seam(one.environment(night,'HIGH'))<=3,'panorama wraps without a strong seam');
one.dispose();one.dispose();assert.equal(disposals,2);assert.equal(one.environment(false,'HIGH'),null);two.dispose();
let scene;
T.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}render(s){scene=s;}dispose(){}};
const {createFull3DScene}=require('../src/rendering/Full3DScene.cjs');
const world=createFull3DScene(T,{style:{},addEventListener(){},removeEventListener(){}});
const frame={curves:Array(126).fill(0),hills:Array(126).fill(0),segment:200,
 speedKmh:180,carColor:'#c23441',archetype:'urban',quality:'HIGH'};
const saved=JSON.stringify(frame);
world.render(frame,1/60);const sunset=scene.environment;
assert(sunset?.isDataTexture);const car=scene.getObjectByName('V55_OriginalArcadeVehicle');
const fill=scene.getObjectByName('V85_SkyFill'),key=scene.getObjectByName('V85_KeyLight');
const daylight={fill:fill.intensity,key:key.intensity};
assert.equal(car.getObjectByName('body-lower').material.envMapIntensity,.85);
world.render({...frame,night:true},1/60);const night=scene.environment;
assert.notEqual(sunset,night);assert(fill.intensity<daylight.fill&&key.intensity<daylight.key);
for(let i=0;i<4;i++){
 world.render(frame,0,960,540,'LOW');assert(scene.environment===null,'LOW must disable environment reflection');
 world.render({...frame,night:true},0);assert.equal(scene.environment,night);
 world.render(frame,0);assert.equal(scene.environment,sunset);
}
assert.equal(JSON.stringify(frame),saved,'lighting cannot rewrite driving snapshot');
let released=0;for(const tex of [sunset,night])tex.addEventListener('dispose',()=>released++);
world.dispose();world.dispose();assert.equal(scene.environment,null);assert.equal(released,2);
console.log('V85: deterministic linear panoramas, wrap seam, CPU budget, cached mood/quality switching, material assignment and disposal passed (GPU mocked)');
