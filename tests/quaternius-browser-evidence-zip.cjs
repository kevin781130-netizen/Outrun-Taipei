'use strict';
// P13 archive integrity, security and independent PNG evidence contract tests.
// This never loads/render games or assumes actual screenshot quality.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
(async()=>{
 const {makeEvidenceZip,crc32}=await import(pathToFileURL(path.join(root,
  'previews/quaternius-downtown/evidence-zip.mjs')).href);
 const encoder=new TextEncoder(),decoder=new TextDecoder();
 assert.equal(crc32(encoder.encode('123456789')),0xcbf43926,'reference CRC32 must match ZIP specification');
 const content=[
  {name:'images/p13-第一張.png',data:new Uint8Array([137,80,78,71,13,10,26,10,12,13,14])},
  {name:'report.json',data:encoder.encode('{"ok":true}\n')},
  {name:'SHA256SUMS.txt',data:encoder.encode('abc123  images/p13-第一張.png\n')}
 ];
 const archive=makeEvidenceZip(content);
 assert(archive instanceof Uint8Array);
 const view=new DataView(archive.buffer,archive.byteOffset,archive.byteLength);
 let cursor=0,expectedCentral=0;
 for(const entry of content){
  assert.equal(view.getUint32(cursor,true),0x04034b50,'local header');
  assert.equal(view.getUint16(cursor+8,true),0,'ZIP STORE method');
  assert.equal(view.getUint16(cursor+6,true)&0x0800,0x0800,'UTF-8 flag');
  assert.equal(view.getUint32(cursor+14,true),crc32(entry.data));
  assert.equal(view.getUint32(cursor+18,true),entry.data.length);
  const length=view.getUint16(cursor+26,true);
  const name=decoder.decode(archive.subarray(cursor+30,cursor+30+length));
  assert.equal(name,entry.name);
  assert.deepEqual(archive.subarray(cursor+30+length,cursor+30+length+entry.data.length),entry.data);
  cursor+=30+length+entry.data.length;
 }
 expectedCentral=cursor;
 for(const [index,entry] of content.entries()){
  assert.equal(view.getUint32(cursor,true),0x02014b50,'central directory');
  assert.equal(view.getUint32(cursor+16,true),crc32(entry.data));
  const n=view.getUint16(cursor+28,true);
  const name=decoder.decode(archive.subarray(cursor+46,cursor+46+n));
  assert.equal(name,entry.name);
  assert(view.getUint32(cursor+42,true)<expectedCentral,'valid relative header offset');
  cursor+=46+n;
 }
 assert.equal(view.getUint32(cursor,true),0x06054b50,'end of central directory');
 assert.equal(view.getUint16(cursor+8,true),3);
 assert.equal(view.getUint16(cursor+10,true),3);
 assert.equal(view.getUint32(cursor+16,true),expectedCentral);
 assert.equal(view.getUint32(cursor+12,true),cursor-expectedCentral);
 assert.equal(cursor+22,archive.byteLength);
 for(const name of ['../escape.txt','/absolute.png','img\\evil.png','images/../evil.png','images/a.txt\n']){
  assert.throws(()=>makeEvidenceZip([{name,data:encoder.encode('test')}]),RangeError,
   'zip must reject unsafe names');
 }
 assert.throws(()=>makeEvidenceZip([{name:'a',data:encoder.encode('a')},
  {name:'a',data:encoder.encode('b')}]),RangeError,'duplicate names rejected');
 assert.throws(()=>makeEvidenceZip([{name:'bad',data:'string'}]),TypeError);
 const app=read('previews/quaternius-downtown/browser-review.js');
 const page=read('previews/quaternius-downtown/browser-review.html');
 assert(app.includes("import {makeEvidenceZip} from './evidence-zip.mjs';"));
 assert(app.includes('const binary=parsePNG(capture.png)'));
 assert(app.includes("crypto.subtle.digest('SHA-256',bytes)"));
 assert(app.includes("name:'SHA256SUMS.txt'"));
 assert(app.includes("name:'report.json'"));
 assert(app.includes("name:'contact-sheet.png'"));
 assert(app.includes("evidenceFiles.length!==28"));
 assert(app.includes("const diffReport=compareScenarios(samples)"));
 assert(app.includes("humanVisualApproval:false"));
 assert(app.includes("saveBundle.addEventListener('click'"));
 assert(page.includes('id="save-bundle"'));
 for(const forbidden of ['roadCorridors(','updateVehiclePose','src/rendering/','Full3DScene','netplay/'])
  assert(!app.includes(forbidden));
 console.log(JSON.stringify({test:'P13 independent browser archive',archiveBytes:archive.length,
  archiveEntries:content.length,utf8AndCRC:'PASS',securePathNames:'PASS',
  screenshotEvidenceCode:'PASS',actualWebGLTested:false,humanVisualApproval:false}));
})().catch(err=>{console.error(err);process.exitCode=1;});
