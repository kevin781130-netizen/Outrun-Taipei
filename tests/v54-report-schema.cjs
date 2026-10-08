'use strict';
// Protect V54 against forged/missing scenes and invalid cold-start evidence.
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {readReport}=require('../tools/compare-performance.cjs');
const ids=['1A','2A','2B','3A','3B','3C','4A','4B','4C','4D','5A','5B','5C','5D','5E'];
const rows=ids.flatMap(id=>['sunset','neon'].map(mood=>({
  id,mood,segment:200,speed:220,renderMeanMs:12,renderP95Ms:15,
  frameP95Ms:17,rafFps:60,sceneSetupMs:20,coldRenderMs:8
})));
const report={schema:1,sourceSHA256:'a'.repeat(64),
  rows,memory:[{cycle:0},{cycle:1},{cycle:2}]};
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'v54-evidence-'));
function read(value){
  const file=path.join(temp,'report.json');
  fs.writeFileSync(file,JSON.stringify(value));
  return readReport(file);
}
try{
  assert.equal(read(report).rows.length,30,'valid 30-scene evidence');
  const badRoute=structuredClone(report);badRoute.rows[0].id='1B';
  assert.throws(()=>read(badRoute),/invalid scene ID or mood|incomplete 15-route scene matrix/);
  const duplicate=structuredClone(report);duplicate.rows[1]=duplicate.rows[0];
  assert.throws(()=>read(duplicate),/duplicate scene/);
  const missing=structuredClone(report);missing.rows.pop();
  assert.throws(()=>read(missing),/expected schema 1 with 30/);
  const badCold=structuredClone(report);badCold.rows[0].coldRenderMs=-1;
  assert.throws(()=>read(badCold),/invalid coldRenderMs/);
  const badMean=structuredClone(report);badMean.rows[0].renderMeanMs=Infinity;
  assert.throws(()=>read(badMean),/invalid renderMeanMs/);
  const badHash=structuredClone(report);badHash.sourceSHA256='a';
  assert.throws(()=>read(badHash),/source hash is missing or invalid/);
  console.log('V54 benchmark report schema: PASS (valid 30-route matrix and six rejection cases)');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
