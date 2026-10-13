'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {approvedGeometry}=require('./clean-room-compliance.cjs');
const root=path.resolve(__dirname,'..'),rel='assets/third_party/quaternius-downtown/Brick_Plain_1.bin';
assert(approvedGeometry(root,rel));
assert(approvedGeometry(root,'playtests/quaternius-race/'+rel));
assert(!approvedGeometry(root,'assets/random.bin'));
assert(!approvedGeometry(root,rel.replace('.bin','.rom')));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'taipei-geometry-'));
try{
 const dir=path.join(tmp,path.dirname(rel));fs.mkdirSync(dir,{recursive:true});
 for(const name of ['Brick_Plain_1.bin','Brick_Plain_1.gltf','QUATERNIUS_LICENSE.txt'])fs.copyFileSync(path.join(root,path.dirname(rel),name),path.join(dir,name));
 assert(approvedGeometry(tmp,rel));
 const file=path.join(tmp,rel),bytes=fs.readFileSync(file);bytes[0]^=1;fs.writeFileSync(file,bytes);
 assert(!approvedGeometry(tmp,rel),'modified binary rejected');
 fs.copyFileSync(path.join(root,rel),file);
 fs.writeFileSync(path.join(dir,'QUATERNIUS_LICENSE.txt'),'unverified license');
 assert(!approvedGeometry(tmp,rel),'modified license rejected');
 fs.copyFileSync(path.join(root,path.dirname(rel),'QUATERNIUS_LICENSE.txt'),path.join(dir,'QUATERNIUS_LICENSE.txt'));
 const gltf=JSON.parse(fs.readFileSync(path.join(dir,'Brick_Plain_1.gltf'),'utf8'));
 gltf.buffers[0].byteLength++;fs.writeFileSync(path.join(dir,'Brick_Plain_1.gltf'),JSON.stringify(gltf));
 assert(!approvedGeometry(tmp,rel),'incorrect glTF buffer length rejected');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
console.log('Clean-room geometry: exact paths, binary/license hashes and glTF references enforced');
