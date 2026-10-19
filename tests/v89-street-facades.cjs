'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),ctx);
const T=ctx.THREE,{createStreetFacadeTextures}=require('../src/rendering/StreetFacade.cjs');
const original=Math.random;let a,b;
Math.random=()=>{throw new Error('facades must not consume simulation randomness');};
try{a=createStreetFacadeTextures(T);b=createStreetFacadeTextures(T);}finally{Math.random=original;}
assert.equal(a.color.encoding,T.sRGBEncoding);assert.equal(a.emission.encoding,T.LinearEncoding);
let bytes=0,lit=0,unlit=0;
for(const key of Object.keys(a)){
 assert.deepEqual(a[key].image.data,b[key].image.data);bytes+=a[key].image.data.byteLength;
 assert(a[key].generateMipmaps,'mipmaps limit distant window shimmer');
}
assert.equal(bytes,256*1024);
for(let i=0;i<a.emission.image.data.length;i+=4){
 const e=a.emission.image.data[i];assert(e===0||e===255);if(e)lit++;else unlit++;
 assert.equal(a.emission.image.data[i+3],255);assert.equal(a.color.image.data[i+3],255);
}
assert(lit>0&&unlit>lit*2,'sparse occupied windows leave walls and unlit rooms dark');
for(const maps of [a,b])for(const tex of Object.values(maps))tex.dispose();
let scene;T.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}render(s){scene=s;}dispose(){}};
const {createFull3DScene}=require('../src/rendering/Full3DScene.cjs');
const world=createFull3DScene(T,{style:{},addEventListener(){},removeEventListener(){}});
const frame={curves:Array(126).fill(2),hills:Array(126).fill(0),segment:100,archetype:'urban',seed:8,
 corridors:Array.from({length:126},()=>[{center:-2,half:.8},{center:2,half:.8}])};
const saved=JSON.stringify(frame);world.render(frame,0);
const shells=scene.getObjectByName('V89_BuildingShells'),panes=scene.getObjectByName('V89_StreetWindows'),roofs=scene.getObjectByName('V89_RoofSetbacks'),cornices=scene.getObjectByName('V89_Cornices');
assert(shells.count>40);assert.equal(shells.count,panes.count);assert.equal(shells.count,roofs.count);assert.equal(shells.count,cornices.count);
const sm=new T.Matrix4(),pm=new T.Matrix4(),rm=new T.Matrix4(),size=new T.Vector3(),pos=new T.Vector3(),q=new T.Quaternion();
for(let i=0;i<shells.count;i++){
 shells.getMatrixAt(i,sm);panes.getMatrixAt(i,pm);roofs.getMatrixAt(i,rm);
 sm.decompose(pos,q,size);
 const relative=sm.clone().invert().multiply(pm),center=new T.Vector3().setFromMatrixPosition(relative);
 assert(Math.abs(Math.abs(center.x)-(.5+.025/size.x))<1e-5,'window panel is on the street-facing X wall');
 assert(Math.abs(center.z)<1e-5,'panels follow building street frontage');
 const paneWidth=new T.Vector3().setFromMatrixScale(pm);
 assert(Math.abs(paneWidth.x-.04)<1e-5&&Math.abs(paneWidth.z-size.z*.85)<1e-5);
 const local=sm.clone().invert().multiply(rm),roofBox=new T.Box3().setFromBufferAttribute(roofs.geometry.attributes.position).applyMatrix4(local);
 assert(roofBox.min.x>=-.5&&roofBox.max.x<=.5&&roofBox.min.z>=-.5&&roofBox.max.z<=.5,'roof retains existing footprint/fork clearance');
 assert(roofBox.max.y>.5,'setback adds a real stepped silhouette');
}
const count=scene.children.length,geometries=[shells,panes,roofs,cornices].map(m=>m.geometry),matrices=Array.from(panes.instanceMatrix.array);
const map=panes.material.map,glow=panes.material.emissiveMap;
world.render({...frame,night:true},0);assert.equal(panes.material.emissiveIntensity,.8);
world.render(frame,0,960,540,'LOW');assert.equal(roofs.count,0);assert.equal(cornices.count,0);assert.equal(panes.material.emissiveIntensity,.06);
world.render(frame,0);assert(roofs.count>0);assert.equal(scene.children.length,count);
assert.equal(panes.material.map,map);assert.equal(panes.material.emissiveMap,glow);
assert.deepEqual([shells,panes,roofs,cornices].map(m=>m.geometry),geometries);assert.deepEqual(Array.from(panes.instanceMatrix.array),matrices);
assert.equal(JSON.stringify(frame),saved,'architecture never mutates driving frame');
world.render({...frame,archetype:'mountain'},0);assert.equal(roofs.count,0);assert.equal(panes.count,0);
world.render({...frame,archetype:'expressway'},0);assert.equal(cornices.count,0);assert.equal(shells.count,0);
let released=0;for(const texture of [map,glow])texture.addEventListener('dispose',()=>released++);
world.dispose();world.dispose();assert.equal(released,2);
// Full source audit updated for the deliberate V92 progressive speed/handling change.
const after=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.equal(require('node:crypto').createHash('sha256').update(after.replace('V92 SPEED BUILD · 漸進氮氣／向內修線','V88 DRIFT CONTROL · 修線加強／車流美術')).digest('hex'),'868791eb141a80c0d05bdb400f42d66c798b6ff430f91c2f814832060cc9907e','V92 reviewed gameplay source audit');
console.log('V89: deterministic 256 KiB facade maps, occupied windows, street-facing panels, roof footprints, quality/route counts, cached resources/disposal and reviewed gameplay source audit passed (GPU mocked).');
