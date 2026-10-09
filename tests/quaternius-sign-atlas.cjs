'use strict';
// P9: actual sign-atlas logic unit tests using a fake 2D canvas / Three geometry.
// This checks draw data and shared resources, NOT GPU color/Chinese font rendering.
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
(async()=>{
 const url=relative=>pathToFileURL(path.join(root,relative)).href;
 const {SIGN_ATLAS,atlasCell,atlasUV,describeSignAtlas}=await import(url('previews/quaternius-downtown/sign-atlas-layout.mjs'));
 const {createStreetblockSigns}=await import(url('previews/quaternius-downtown/streetblock-signs.mjs'));
 const {SHOP_SAMPLES}=await import(url('previews/quaternius-downtown/streetblock-plan.mjs'));
 const {buildTaipeiStreetfrontPlan}=await import(url('previews/quaternius-downtown/taipei-streetfront.mjs'));
 assert.deepEqual([SIGN_ATLAS.width,SIGN_ATLAS.height,SIGN_ATLAS.count],[1024,1024,7]);
 const rectangles=[];
 for(let i=0;i<7;i++)for(const kind of ['main','vertical']){
  const r=atlasCell(i,kind);const u=atlasUV(i,kind);
  assert(r.x>=0&&r.y>=0&&r.x+r.width<=1024&&r.y+r.height<=1024);
  assert(u.u0>=0&&u.u0<u.u1&&u.u1<=1);
  assert(u.v0>=0&&u.v0<u.v1&&u.v1<=1);
  rectangles.push(r);
 }
 for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){
  const a=rectangles[i],b=rectangles[j];
  const overlap=a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
  assert.equal(overlap,false,'Atlas cells must not overlap');
 }
 for(const invalid of [-1,7,1.5,NaN,'2'])assert.throws(()=>atlasCell(invalid,'main'),RangeError);
 assert.throws(()=>atlasCell(0,'unknown'),RangeError);
 assert.throws(()=>atlasUV(0,'main',300),RangeError);
 const metrics=describeSignAtlas(5);
 assert.equal(metrics.atlasTextures,1);
 assert.equal(metrics.legacyTextures,10);
 assert.equal(metrics.newRGBA8Bytes,4194304);
 assert.equal(metrics.oldRGBA8Bytes,5898240);
 assert(metrics.newRGBA8Bytes<metrics.oldRGBA8Bytes);
 assert.equal(describeSignAtlas(7).legacyTextures,14);
 assert.throws(()=>describeSignAtlas(0),RangeError);
 let textureCount=0,materialCount=0,canvasCount=0;
 const glyphs=[];
 const originalDocument=global.document;
 global.document={createElement(kind){
  assert.equal(kind,'canvas');canvasCount++;
  return {width:0,height:0,getContext(type){
   assert.equal(type,'2d');
   return {
    save(){},restore(){},beginPath(){},rect(){},clip(){},clearRect(){},
    strokeText(t){glyphs.push(String(t));},fillText(t){glyphs.push(String(t));},
    measureText(t){return {width:[...String(t)].length*74};}
   };
  }};
 }};
 class BufferGeometry {
  constructor(){this.attributes={};this.index=null;}
  setAttribute(name,data){this.attributes[name]=data;}
  setIndex(array){this.index=array;}
  computeBoundingSphere(){}
 }
 class Float32BufferAttribute {
  constructor(data,itemSize){this.array=data;this.itemSize=itemSize;}
 }
 class CanvasTexture {
  constructor(canvas){this.canvas=canvas;textureCount++;}
 }
 class MeshBasicMaterial {
  constructor(options){this.options=options;materialCount++;}
 }
 class Mesh{
  constructor(geo,material){this.geometry=geo;this.material=material;}
 }
 const THREE={
  CanvasTexture,MeshBasicMaterial,BufferGeometry,Float32BufferAttribute,Mesh,
  sRGBEncoding:3001,LinearFilter:1006,LinearMipmapLinearFilter:1008,
  DoubleSide:2
 };
 try{
  const signs=createStreetblockSigns(THREE,SHOP_SAMPLES,buildTaipeiStreetfrontPlan);
  const sprites=[];
  for(const shop of SHOP_SAMPLES){
   const plan=buildTaipeiStreetfrontPlan(shop.style);
   const mesh=signs.makeShopSign(shop,plan.signs);
   sprites.push(mesh);
   assert.equal(mesh.geometry.attributes.position.array.length,24,'8 vertices * 3 floats');
   assert.equal(mesh.geometry.attributes.uv.array.length,16,'8 vertices * 2 floats');
   assert.equal(mesh.geometry.index.length,12,'two quads, two triangles each');
   assert.equal(mesh.name,'P9_AtlasMergedChineseSigns');
   for(const component of mesh.geometry.attributes.uv.array)assert(component>=0&&component<=1);
  }
  assert.equal(canvasCount,1,'one canvas for all 7 shops');
  assert.equal(textureCount,1,'one atlas texture');
  assert.equal(materialCount,1,'one shared sign material');
  assert(sprites.every(sprite=>sprite.material===sprites[0].material));
  for(const shop of SHOP_SAMPLES)assert(glyphs.includes(shop.name),'missing horizontal name '+shop.name);
  assert.equal(signs.atlasMetrics().newTextureRGBA8KiB,4096);
 }finally{if(originalDocument===undefined)delete global.document;else global.document=originalDocument;}
 console.log('P9 PASS: 14 non-overlapping sign slots, seven combined 2-quad meshes, one canvas, one texture, one shared material, actual generated Chinese names, base RGBA8 sizing.');
})().catch(e=>{console.error(e);process.exitCode=1;});
