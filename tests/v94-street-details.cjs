'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),ctx);
const T=ctx.THREE,{createStreetDetailsTextures}=require('../src/rendering/StreetDetails.cjs');
let first,second;const random=Math.random;Math.random=()=>{throw new Error('visual texture generator used gameplay RNG');};
try{first=createStreetDetailsTextures(T);second=createStreetDetailsTextures(T);}finally{Math.random=random;}
let bytes=0;
for(const key of Object.keys(first)){
 const a=first[key],b=second[key];bytes+=a.image.data.byteLength;assert.deepEqual(a.image.data,b.image.data);
 assert.equal(a.encoding,key==='shopEmission'?T.LinearEncoding:T.sRGBEncoding);
 assert(a.generateMipmaps);assert.equal(a.minFilter,T.LinearMipmapLinearFilter);
}
assert.equal(bytes,80*1024);
const alpha=(x,y)=>first.contact.image.data[(y*64+x)*4+3];
assert(alpha(32,32)>250);assert.equal(alpha(0,0),0);assert.equal(alpha(0,32),0);
assert(alpha(32,32)>alpha(48,32)&&alpha(48,32)>alpha(58,32),'contact shadow softens toward its perimeter');
for(let x=0;x<64;x++)assert.equal(alpha(x,32),alpha(63-x,32));
for(const set of [first,second])for(const map of Object.values(set))map.dispose();
let scene;T.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}render(s){scene=s;}dispose(){}};
const world=require('../src/rendering/Full3DScene.cjs').createFull3DScene(T,{style:{},addEventListener(){},removeEventListener(){}});
const frame={curves:Array(126).fill(1.2),hills:Array(126).fill(0),fraction:.4,segment:100,archetype:'urban',seed:8,
 corridors:Array.from({length:126},()=>[{center:0,half:1.08}]),speedKmh:180,steer:.2};
world.render(frame,1/60);
const shells=scene.getObjectByName('V89_BuildingShells'),shops=scene.getObjectByName('V94_Storefronts'),awnings=scene.getObjectByName('V94_ShopAwnings');
const shadow=scene.getObjectByName('V58_ContactShadow'),tyres=scene.getObjectByName('V94_TyreContacts');
assert(shops.count>40);assert.equal(shops.count,shells.count);assert.equal(shops.count,awnings.count);assert.equal(tyres.count,4);
assert.equal(shadow.material.map,tyres.material.map);assert.equal(shadow.material.depthWrite,false);
const sm=new T.Matrix4(),am=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),q=new T.Quaternion();
for(let i=0;i<shops.count;i++){
 shells.getMatrixAt(i,sm);awnings.getMatrixAt(i,am);sm.decompose(position,q,scale);
 const local=sm.clone().invert().multiply(am);
 const box=new T.Box3().setFromBufferAttribute(awnings.geometry.attributes.position).applyMatrix4(local);
 const extension=Math.max(0,Math.abs(box.min.x)-.5,Math.abs(box.max.x)-.5)*scale.x;
 assert(extension<=.601,'awning uses at most 0.6 units of the existing two-unit building setback');
 assert(box.min.z>=-.5&&box.max.z<=.5,'no frontage expansion');
}
const car=scene.getObjectByName('V55_OriginalArcadeVehicle');
const wheels=[];car.traverse(n=>{if(/^(front|rear)-(left|right)-wheel$/.test(n.name))wheels.push(n);});assert.equal(wheels.length,4);
for(let i=0;i<4;i++){
 wheels[i].getWorldPosition(position);tyres.getMatrixAt(i,am);const contact=new T.Vector3().setFromMatrixPosition(am);
 assert(Math.abs(position.x-contact.x)<1e-6&&Math.abs(position.z-contact.z)<1e-6,'tyre patches use real posed wheel locations');
}
const maps=[shops.material.map,shops.material.emissiveMap,shadow.material.map],count=scene.children.length;
world.render({...frame,night:true},0);assert.equal(shops.material.emissiveIntensity,.65);
world.render(frame,0,960,540,'LOW');assert.equal(shops.count,0);assert.equal(awnings.count,0);assert.equal(tyres.count,0);
world.render(frame,0);assert.equal(scene.children.length,count);assert.equal(shops.material.map,maps[0]);
for(const archetype of ['mountain','coastal','expressway']){world.render({...frame,archetype},0);assert.equal(shops.count,0);assert.equal(awnings.count,0);}
let released=0;for(const map of maps)map.addEventListener('dispose',()=>released++);
world.dispose();world.dispose();assert.equal(released,3,'details released exactly once');
console.log('V94 art: 80 KiB deterministic maps, soft alpha shadow, posed tyre contacts, shop/awning setback, pooled materials, day/night/LOW/route gating and disposal passed (GPU mocked).');
