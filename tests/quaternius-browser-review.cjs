'use strict';
// P12 structural checks; this does NOT execute WebGL or visually approve assets.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
(async()=>{
 const {makeBrowserReviewPlan,sheetDimensions,inspectCapturedPixels,QA_SHEET}=
  await import(pathToFileURL(path.join(root,'previews/quaternius-downtown/browser-review-matrix.mjs')).href);
 const plan=makeBrowserReviewPlan();
 assert.equal(plan.length,24);
 assert(Object.isFrozen(plan));
 assert.deepEqual([...new Set(plan.map(x=>x.count))],[3,5,7]);
 assert.deepEqual([...new Set(plan.map(x=>x.viewport))],['desktop','mobile']);
 assert.deepEqual([...new Set(plan.map(x=>x.lod))],['near','far']);
 assert.deepEqual([...new Set(plan.map(x=>x.light))],['day','night']);
 assert.equal(new Set(plan.map(x=>x.id)).size,24,'no duplicate capture');
 for(const c of plan){
  assert(Object.isFrozen(c),'cases must be immutable');
  assert.deepEqual([c.width,c.height],c.viewport==='desktop'?[1280,800]:[390,844]);
  assert.equal(c.night,c.light==='night');
  assert(!('coordinates' in c));
 }
 assert.deepEqual(sheetDimensions(),{width:1440,height:1536,columns:4,rows:6});
 assert.deepEqual(sheetDimensions(1),{width:1440,height:256,columns:4,rows:1});
 assert.throws(()=>sheetDimensions(0),RangeError);
 assert.throws(()=>sheetDimensions(25),RangeError);
 const allGray=new Uint8ClampedArray(4*4*4);
 const manyColors=new Uint8ClampedArray(32*4*4);
 for(let i=0;i<32*4;i++){
  const pos=i*4;
  manyColors[pos]=i*11%255;
  manyColors[pos+1]=i*47%255;
  manyColors[pos+2]=i*61%255;
  manyColors[pos+3]=255;
 }
 const fake=(width,height,data)=>({width,height,getContext:()=>({getImageData:()=>({data})})});
 assert.equal(inspectCapturedPixels(fake(4,4,allGray)).nonBlankHeuristic,false);
 assert.equal(inspectCapturedPixels(fake(32,4,manyColors)).nonBlankHeuristic,true);
 assert.throws(()=>inspectCapturedPixels(fake(0,1,allGray)),RangeError);
 const app=read('previews/quaternius-downtown/browser-review.js');
 const bridge=read('previews/quaternius-downtown/streetblock.js');
 const html=read('previews/quaternius-downtown/browser-review.html');
 const title=read('previews/quaternius-downtown/streetblock.html');
 assert(app.includes("import {makeBrowserReviewPlan,sheetDimensions,QA_SHEET,inspectCapturedPixels} from './browser-review-matrix.mjs';"));
 assert(app.includes('frame.contentWindow'));
 assert(app.includes('bridge.configure('));
 assert(app.includes('const capture=bridge.capture();'));
 assert(app.includes("const image=await decodePNG(capture.png)"));
 assert(app.includes('sheet.toBlob('));
 assert(app.includes("new Blob([JSON.stringify(report,null,2)]"));
 assert(app.includes("humanVisualApproval:false"));
 assert(bridge.includes('window.__quaterniusArtQA=Object.freeze({'));
 assert(bridge.includes('renderer.render(scene,camera);'));
 assert(bridge.includes("canvas.toDataURL('image/png')"));
 assert(bridge.includes('loadedMaterials'));
 assert(bridge.includes("if(![3,5,7].includes(count)"));
 assert(bridge.includes("if(!instances.length)throw new Error('Preview is not loaded')"));
 for(const id of ['preview-frame','preview-stage','contact-sheet','progress',
   'start-review','save-image','save-report','commit-sha']){
  assert(html.includes('id="'+id+'"'),'P12 HTML UI missing '+id);
 }
 assert(!html.includes('src="../../index.html"'),'No original game iframe allowed');
 assert(title.includes('id="street-canvas"'));
 const forbidden=['roadCorridors(','updateVehiclePose','src/rendering/','Full3DScene','netplay/'];
 for(const source of [app,html]){
  for(const term of forbidden)assert(!source.includes(term),'Unwanted runtime dependency: '+term);
 }
 console.log(JSON.stringify({scope:'P12 isolated in-browser real-pixel review',staticTests:'PASS',
 scenarios:plan.length,sheet:sheetDimensions(),WebGLExecuted:false,visualApproval:false},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
