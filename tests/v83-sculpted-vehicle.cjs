'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const c={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),c);
const T=c.THREE,{createVehicle3D}=require('../src/rendering/Vehicle3D.cjs');
const car=createVehicle3D(T),geo=new Set(),mat=new Set(),tex=new Set();let triangles=0,draws=0;
car.root.updateMatrixWorld(true);
car.root.traverse(m=>{
 if(!m.isMesh)return;draws++;geo.add(m.geometry);mat.add(m.material);
 triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;
 const pos=m.geometry.getAttribute('position'),normal=m.geometry.getAttribute('normal');
 assert(pos&&normal,'all authored surfaces need lighting normals');
 for(const v of pos.array)assert(Number.isFinite(v));
 for(let i=0;i<normal.count;i++){
  const n=new T.Vector3().fromBufferAttribute(normal,i);
  assert(Math.abs(n.length()-1)<1e-5,'finite unit face normals, no degenerate loft faces');
 }
 if(m.material.map)tex.add(m.material.map);
});
assert(triangles<=1400&&draws<=50,'bounded player model triangle/draw budgets');
const shell=car.root.getObjectByName('body-lower');
shell.geometry.computeBoundingBox();const bounds=shell.geometry.boundingBox;
assert(Math.abs(bounds.min.x+bounds.max.x)<1e-6,'symmetric body');
assert(bounds.max.z-bounds.min.z<4.0&&bounds.max.x-bounds.min.x<=2.01,'stay within old vehicle silhouette envelope');
// Each shell section must be a watertight oriented manifold, including caps.
const positions=shell.geometry.attributes.position,edges=new Map();
const key=v=>[v.x,v.y,v.z].map(n=>n.toFixed(5)).join(',');
for(let i=0;i<positions.count;i+=3){
 const p=[0,1,2].map(k=>key(new T.Vector3().fromBufferAttribute(positions,i+k)));
 for(let j=0;j<3;j++){
  const a=p[j],b=p[(j+1)%3],sorted=[a,b].sort().join('|');
  const value=edges.get(sorted)||{count:0,balance:0};value.count++;value.balance+=a<b?1:-1;edges.set(sorted,value);
 }
}
for(const edge of edges.values())assert(edge.count===2&&edge.balance===0,'closed shell without inverted seams');
const shadow=car.root.getObjectByName('contact-shadow').material.map;
assert.equal(shadow.image.data.length,64*128*4);
const alpha=(x,y)=>shadow.image.data[(y*64+x)*4+3];
assert(alpha(32,64)>200&&alpha(0,0)===0&&alpha(8,64)>0,'soft center-to-edge shadow');
let fullDraws=0,lowDraws=0;
car.root.traverse(m=>{if(m.isMesh&&m.visible)fullDraws++;});car.setQuality('LOW');
car.root.traverse(m=>{if(m.isMesh&&m.visible)lowDraws++;});
assert(lowDraws<=fullDraws-10,'LOW hides fine details to save draws');
car.setQuality('HIGH');assert(car.root.getObjectByName('rim-spokes').visible);
const attributeRefs=[...geo].map(g=>g.attributes.position);
const pose={yawRad:0,rollRad:0,pitchRad:0,steerRad:0,wheelSpinRad:0,scaleX:1};
for(let i=0;i<600;i++){pose.wheelSpinRad=i*.1;car.applyPose(pose);}
assert.deepEqual([...geo].map(g=>g.attributes.position),attributeRefs,'pose animation reuses mesh buffers');
const disposals=new Map();for(const resource of [...geo,...mat,...tex])resource.addEventListener('dispose',()=>disposals.set(resource,(disposals.get(resource)||0)+1));
car.dispose();car.dispose();
for(const resource of [...geo,...mat,...tex])assert.equal(disposals.get(resource),1,'dispose geometries/materials/textures exactly once');
console.log('V83: real Three.js closed shell, normals, bounds, shadow falloff, quality, buffer reuse and disposal passed',JSON.stringify({triangles,draws,fullDraws,lowDraws,textureBytes:shadow.image.data.byteLength}));
