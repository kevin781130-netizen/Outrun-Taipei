'use strict';
// Export the exact authored model source as independent glTF 2.0 binary assets.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ctx={};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/vendor/three-r149.min.js'),'utf8'),ctx);
const T=ctx.THREE,{ROUTE_MODELS,createLandmarkGeometry,createLandmarkMaterials}=require('../src/rendering/TaipeiLandmarks.cjs');
function build(kind){
 const g=createLandmarkGeometry(T,kind),mats=createLandmarkMaterials(T),unique=new Map(),verts=[],indices=[];
 const p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color;
 for(let i=0;i<p.count;i++){
  const row=[p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),c.getX(i),c.getY(i),c.getZ(i)].map(x=>Math.round(x*1e5)/1e5);
  const key=row.join(',');let index=unique.get(key);
  if(index===undefined){index=verts.length;unique.set(key,index);verts.push(row);}indices.push(index);
 }
 const chunks=[0,3,6].map(start=>{const a=new Float32Array(verts.length*3);verts.forEach((v,i)=>a.set(v.slice(start,start+3),i*3));return Buffer.from(a.buffer);});
 const idx=new Uint32Array(indices);chunks.push(Buffer.from(idx.buffer));
 const bin=Buffer.concat(chunks),views=[];let offset=0;
 for(let i=0;i<chunks.length;i++){views.push({buffer:0,byteOffset:offset,byteLength:chunks[i].length,target:i===3?34963:34962});offset+=chunks[i].length;}
 const b=g.boundingBox,accessors=[{bufferView:0,componentType:5126,count:verts.length,type:'VEC3',min:b.min.toArray().map(x=>Math.floor(x*1e5)/1e5),max:b.max.toArray().map(x=>Math.ceil(x*1e5)/1e5)},{bufferView:1,componentType:5126,count:verts.length,type:'VEC3'},{bufferView:2,componentType:5126,count:verts.length,type:'VEC3'}];
 const primitives=g.groups.map(group=>{const a=accessors.length;accessors.push({bufferView:3,byteOffset:group.start*4,componentType:5125,count:group.count,type:'SCALAR'});return {attributes:{POSITION:0,NORMAL:1,COLOR_0:2},indices:a,material:group.materialIndex};});
 const json={asset:{version:'2.0',generator:'Outrun Taipei V95 original landmark builder',copyright:'Original project geometry; see repository LICENSE'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:kind}],meshes:[{name:kind,primitives}],materials:mats.map((m,i)=>({name:['masonry','glass','metal','roof','light','foliage'][i],pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:m.metalness,roughnessFactor:m.roughness},emissiveFactor:i===4?[.25,.16,.08]:[0,0,0]})),buffers:[{byteLength:bin.length}],bufferViews:views,accessors,extras:{revision:'V95',authored:true,unit:'model-local; runtime uses catalog height'}};
 let data=Buffer.from(JSON.stringify(json));data=Buffer.concat([data,Buffer.alloc((4-data.length%4)%4,32)]);
 const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+data.length+8+bin.length,8);jh.writeUInt32LE(data.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
 const out=Buffer.concat([header,jh,data,bh,bin]);g.dispose();for(const m of mats)m.dispose();return out;
}
if(require.main===module){const dir=path.join(root,'assets/landmarks');fs.mkdirSync(dir,{recursive:true});const manifest=[];
 for(const kind of new Set(Object.values(ROUTE_MODELS).flat())){const bytes=build(kind);fs.writeFileSync(path.join(dir,kind+'.glb'),bytes);manifest.push({kind,file:kind+'.glb',bytes:bytes.length});}
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({revision:'V95',format:'glTF 2.0 binary',models:manifest},null,2)+'\n');console.log(JSON.stringify({models:manifest.length,bytes:manifest.reduce((n,x)=>n+x.bytes,0)}));}
module.exports={build};
