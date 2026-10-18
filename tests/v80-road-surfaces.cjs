'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const box={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),box);
const T=box.THREE,{createRoadSurfaceTextures}=require('../src/rendering/RoadSurface.cjs');
const random=Math.random;Math.random=()=>{throw new Error('Material generation consumed simulation RNG');};
let first,second;try{first=createRoadSurfaceTextures(T);second=createRoadSurfaceTextures(T);}finally{Math.random=random;}
assert.equal(Object.keys(first).length,6);
let bytes=0;
for(const [key,texture] of Object.entries(first)){
 assert.equal(texture.encoding,key.endsWith('_color')?T.sRGBEncoding:T.LinearEncoding);
 assert.equal(texture.image.width,128);assert.equal(texture.image.height,128);
 assert.equal(texture.wrapS,T.RepeatWrapping);assert.equal(texture.wrapT,T.RepeatWrapping);
 assert.equal(texture.repeat.x,4);assert.equal(texture.repeat.y,4);
 assert.deepEqual(texture.image.data,second[key].image.data,'textures repeat exactly');
 bytes+=texture.image.data.byteLength;
 for(let i=3;i<texture.image.data.length;i+=4)assert.equal(texture.image.data[i],255);
 if(key.endsWith('_normal'))for(let i=2;i<texture.image.data.length;i+=4)assert(texture.image.data[i]>245,'bounded normal perturbations');
 if(key.endsWith('_rough'))for(let i=1;i<texture.image.data.length;i+=4)assert(texture.image.data[i]>=224,'dry rough surface');
}
assert.equal(bytes,6*128*128*4,'fixed startup texture memory budget');
for(const size of [0,17,512,NaN])assert.throws(()=>createRoadSurfaceTextures(T,size),RangeError);
let released=0;for(const t of Object.values(first)){t.addEventListener('dispose',()=>released++);t.dispose();}
assert.equal(released,6);for(const t of Object.values(second))t.dispose();
console.log('V80: deterministic 6-map surfaces, linear/sRGB channels, normals, roughness, memory budget and disposal passed');
