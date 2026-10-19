'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {PROFILES,districtAt,presentationFrame}=require('../src/rendering/DistrictGeography.cjs');
const ctx={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),ctx);const T=ctx.THREE;
const {ROUTE_MODELS,createLandmarkGeometry,createLandmarkMaterials}=require('../src/rendering/TaipeiLandmarks.cjs');
const {build}=require('../tools/export-taipei-landmarks.cjs');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/landmarks/manifest.json')));
assert.equal(manifest.models.length,28);
for(const item of manifest.models){
 const data=fs.readFileSync(path.join(__dirname,'../assets/landmarks',item.file));assert.deepEqual(data,build(item.kind),'export matches the live geometry source');
 assert.equal(data.readUInt32LE(0),0x46546c67);assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);
 const jsonLength=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+jsonLength));
 assert.equal(json.asset.version,'2.0');assert.equal(data.readUInt32LE(24+jsonLength),0x004e4942);
 assert(json.meshes[0].primitives.length<=6);assert.equal(json.materials[1].pbrMetallicRoughness.roughnessFactor,.21);
 const bin=data.subarray(28+jsonLength),indexView=json.bufferViews[3];
 for(const p of json.meshes[0].primitives){const a=json.accessors[p.indices];assert(a.count%3===0);
  for(let i=0;i<a.count;i++)assert(bin.readUInt32LE(indexView.byteOffset+(a.byteOffset||0)+i*4)<json.accessors[0].count);
 }
 const g=createLandmarkGeometry(T,item.kind);
 assert.equal(g.groups.reduce((n,x)=>n+x.count,0),g.attributes.position.count);
 for(const group of g.groups)assert(group.materialIndex>=0&&group.materialIndex<6&&group.count%3===0);
 const p=g.attributes.position,n=g.attributes.normal;
 for(let i=0;i<p.count;i+=3){
  const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);
  const cross=b.sub(a).cross(c.sub(a));if(cross.lengthSq()<1e-12)continue;
  const normal=new T.Vector3().fromBufferAttribute(n,i);assert(cross.dot(normal)>-1e-6,'triangle winding and shading normals agree');
 }
 g.dispose();
}
const mats=createLandmarkMaterials(T);assert(mats[1].roughness<mats[0].roughness);assert(mats[2].metalness>mats[0].metalness);for(const m of mats)m.dispose();
for(const id of Object.keys(PROFILES)){
 const frame={routeId:id,stageEnd:1500,segment:700,archetype:'urban',hills:Array(126).fill(10),deckHeights:Array(126).fill(0)};
 const saved=JSON.stringify(frame),shown=presentationFrame(frame);assert.equal(JSON.stringify(frame),saved);
 if(['1A','3C','4D','5D'].includes(id))assert(shown.hills.every(y=>y===0),'urban streets are visually level');
}
for(const id of ['1A','2B','3C','4D','5D'])assert.equal(districtAt({routeId:id},200).waterSide,0);
const river=districtAt({routeId:'3A',stageEnd:1000},220),spring=districtAt({routeId:'3A',stageEnd:1000},700);
assert.equal(river.waterSide,-1);assert(river.waterWidth>80);assert.equal(spring.waterSide,0);
assert(districtAt({routeId:'4A'},0).waterWidth<180,'river has an opposite bank');
assert.equal(districtAt({routeId:'5B'},0).kind,'ocean-coast');
let scene;T.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}render(s){scene=s;}dispose(){}};
const world=require('../src/rendering/Full3DScene.cjs').createFull3DScene(T,{style:{},addEventListener(){},removeEventListener(){}});
for(const [id,index] of [['2B',300],['3C',300],['3A',220],['3A',700],['4A',300],['5E',300]]){
 const profile=districtAt({routeId:id,stageEnd:1000},index),frame={routeId:id,stageEnd:1000,segment:index,curves:Array(126).fill(.2),hills:Array(126).fill(0),deckHeights:Array(126).fill(profile.deck?1500:0),archetype:profile.deck?'expressway':'urban'};
 world.render(frame,0);
 const water=scene.getObjectByName('V95_DistrictWater'),shells=scene.getObjectByName('V89_BuildingShells');
 if(profile.waterSide===0)assert.equal(water.geometry.drawRange.count,0,'dry districts never get a water ribbon');
 else assert(water.geometry.drawRange.count>0);
 if(id==='2B'){assert(shells.count>0,'Civic expressway has city buildings');assert(scene.getObjectByName('V95_BelowDeckRoad').geometry.drawRange.count>0);
  const m=new T.Matrix4(),pos=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3();shells.getMatrixAt(0,m);m.decompose(pos,q,scale);assert(Math.abs(pos.y-scale.y/2+.15+1500/260)<1e-4,'buildings are grounded below the deck');}
 if(id==='3C')assert.equal(scene.getObjectByName('Race_ExpresswayDeck').geometry.drawRange.count,0,'Songshan remains on ground');
}
world.dispose();
const game=require('./canvas-harness.cjs').load(path.join(__dirname,'../index.html'));
const civic=JSON.parse(game.run(`(()=>{selectedRoute=routeForId('1A');v34Mode='cruise';resetGame();return JSON.stringify(stageLandmarkPlan.map(h=>({seg:h.seg,side:h.side})));})()`));
assert.equal(civic[0].seg,civic[1].seg,'Gate and Office share the Ketagalan axis');assert.equal(civic[0].side,1);assert.equal(civic[1].side,-1);assert(civic[2].seg<civic[1].seg&&civic[2].side===1,'Liberty Square is southeast in the northbound corridor');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const from=html.indexOf('function stepBrakeDrift('),to=html.indexOf('function playerVisualTransform(',from);
assert.equal(crypto.createHash('sha256').update(html.slice(from,to)).digest('hex'),'d7adbcddf475df819c9cbe59a1ef57f8267f893e37d47d229a7e8f905d8e9c6c','V94 drift and fine-control physics remain byte-identical');
console.log('V95: 28 deterministic GLBs, valid indices/material groups/winding, 15 district profiles, city/river/deck transitions, civic axis and unchanged V94 handling passed (GPU mocked).');
