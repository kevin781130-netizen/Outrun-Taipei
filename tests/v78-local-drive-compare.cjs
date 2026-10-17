'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const out=JSON.parse(game.run(`(()=>{
 function make(mode,opts={}){
  const len=opts.len??90,route=opts.route||'4D';
  return {schema:'taipei-driving.v76.player-drive.1',
   route,mode,sampleRateHz:60,frames:Array.from({length:len},(_,i)=>({
    route,mode,z:12000+i*(opts.step??65),kmh:opts.kmh??185,
    lat:mode==='v69'?.22:.31,steer:mode==='v69'?.25:.32,
    rawSteer:0,curve:opts.curve??1.2,x:i*.01,
    drift:i%3===0,state:i%3===0?'entry':i%3===1?'recover':'grip'}))};
 }
 const v68=make('v68'),v69=make('v69');
 const a=v78ValidateClip(v68,'v68'),b=v78ValidateClip(v69,'v69');
 const matched=v78AnalyzePair(a,b);
 const route=v78AnalyzePair(a,v78ValidateClip(make('v69',{route:'4C'}),'v69'));
 const speed=v78AnalyzePair(a,v78ValidateClip(make('v69',{kmh:260}),'v69'));
 const straight=v78AnalyzePair(a,v78ValidateClip(make('v69',{curve:0}),'v69'));
 const tooShort=v78AnalyzePair(a,v78ValidateClip(make('v69',{len:31,step:15}),'v69'));
 const invalids={};
 for(const [name,fn] of Object.entries({
  schema:()=>v78ValidateClip({...v68,schema:'unknown'},'v68'),
  reversedMode:()=>v78ValidateClip(v68,'v69'),
  short:()=>v78ValidateClip(make('v68',{len:29}),'v68'),
  long:()=>v78ValidateClip(make('v68',{len:5401}),'v68'),
  nonfinite:()=>{const x=make('v68');x.frames[9].lat=Infinity;v78ValidateClip(x,'v68');},
  routeChange:()=>{const x=make('v68');x.frames[12].route='5C';v78ValidateClip(x,'v68');},
  decreasingZ:()=>{const x=make('v68');x.frames[35].z=0;v78ValidateClip(x,'v68');},
  invalidState:()=>{const x=make('v68');x.frames[0].state='hidden';v78ValidateClip(x,'v68');}
 })){
  try{fn();invalids[name]='accepted';}catch(e){invalids[name]='rejected';}
 }
 v78Clips={v68:a,v69:b};v78LastError='';v78RenderComparison();
 const visible={status:document.getElementById('v78-compare-status').textContent,
  hidden:document.getElementById('v78-compare-results').hidden,
  lateral:document.getElementById('v78-compare-lateral').textContent};
 v78ClearImports();
 const deleted={hidden:document.getElementById('v78-compare-results').hidden,
  clipsEmpty:!v78Clips.v68&&!v78Clips.v69};
 return JSON.stringify({matched,route,speed,straight,tooShort,invalids,visible,deleted});
})()`));
assert.equal(out.matched.ok,true);
assert.equal(out.matched.v68.samples,90);
assert.equal(out.matched.v69.samples,90);
assert(out.matched.v68.meanAbsLateral>out.matched.v69.meanAbsLateral);
assert.equal(out.route.ok,false);assert.match(out.route.message,/不同路線/);
assert.equal(out.speed.ok,false);assert.match(out.speed.message,/車速/);
assert.equal(out.straight.ok,false);assert.match(out.straight.message,/彎道/);
assert.equal(out.tooShort.ok,false);assert.match(out.tooShort.message,/不足/);
for(const [name,value] of Object.entries(out.invalids)){
 assert.equal(value,'rejected','must reject '+name);
}
assert.equal(out.visible.hidden,false);
assert.match(out.visible.status,/不是嚴格配對/);
assert.match(out.visible.lateral,/V68/);
assert.deepEqual(out.deleted,{hidden:true,clipsEmpty:true});
console.log('V78: strict import validation, overlap/route/speed/bend gates, non-causal metrics and in-memory delete passed');
