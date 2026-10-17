'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const g=load(path.join(__dirname,'../index.html'));
const results=JSON.parse(g.run(`(()=>{
 function make(mode){
  return {schema:'taipei-driving.v76.player-drive.1',mode,route:'4D',
   sampleRateHz:60,frames:Array.from({length:120},(_,i)=>({
    mode,route:'4D',z:12000+65*i,kmh:185,lat:mode==='v68'?.35:.27,
    steer:.25,rawSteer:.25,x:i*.02,curve:1.35,
    state:i%3===0?'entry':i%3===1?'drift':'grip',drift:i%3!==2}))};
 }
 const a=v78ValidateClip(make('v68'),'v68');
 const original=v78ValidateClip(make('v69'),'v69');
 const baseline=v78AnalyzePair(a,original);
 const same=v79AnalyzeBins(baseline,a,original);
 const mutated=make('v69');
 for(const row of mutated.frames){
  if(row.z>=12800&&row.z<13200)row.kmh+=32;
  if(row.z>=13600&&row.z<14000)row.curve=-1.35;
  if(row.z>=14400&&row.z<14800)row.steer=-.8;
  if(row.z>=15200&&row.z<15600)row.drift=false;
 }
 const bad=v78ValidateClip(mutated,'v69');
 const gated=v79AnalyzeBins(v78AnalyzePair(a,bad),a,bad);
 v78Clips={v68:a,v69:original};v78LastError='';v78RenderComparison();
 const ui={
  shown:!document.getElementById('v79-bins').hidden,
  summary:document.getElementById('v79-bin-summary').textContent,
  lines:document.getElementById('v79-bin-list').children.map(c=>c.textContent)
 };
 v78ClearImports();
 const cleared={hidden:document.getElementById('v79-bins').hidden,
  empty:v78Clips.v68===null&&v78Clips.v69===null};
 return JSON.stringify({same,gated,ui,cleared,
  fail:v79AnalyzeBins(v78AnalyzePair(a,null),a,null)});
})()`));
assert.equal(results.same.ok,true);
assert(results.same.total>=12,'multiple physical road intervals');
assert.equal(results.same.eligible,results.same.total,'identical sampled conditions should stay eligible');
assert.equal(results.same.excluded,0);
assert.equal(results.same.causal,false);
assert(results.same.bins.every(b=>b.eligible&&b.type==='右彎'));
assert(results.same.bins.some(b=>b.v68.absLat>b.v69.absLat));
assert.equal(results.gated.ok,true);
assert(results.gated.eligible>0,'exclude only invalid segments, preserve other road sections');
assert(results.gated.excluded>=3,'speed/curve/steer mismatches should each exclude local sections');
for(const msg of ['車速','方向','轉向'])assert(results.gated.bins.some(b=>!b.eligible&&b.reason.includes(msg)),'missing exclusion '+msg);
assert.equal(results.ui.shown,true);
assert.match(results.ui.summary,/合格描述/);
assert(results.ui.lines.length>0);
assert(results.ui.lines.some(l=>l.includes('|側滑| V68')));
assert.deepEqual(results.cleared,{hidden:true,empty:true});
assert.equal(results.fail.ok,false);
console.log('V79: road-position bins, local speed/curve/steer exclusion, coverage counts, clear and non-causal display passed');
