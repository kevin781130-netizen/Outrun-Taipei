'use strict';
// V54 acceptance policy unit tests (synthetic fixtures; NOT actual FPS claims).
const assert=require('node:assert/strict');
const {checkEvidence}=require('../tools/v54-acceptance.cjs');
const ids=['1A','2A','2B','3A','3B','3C','4A','4B','4C','4D','5A','5B','5C','5D','5E'];
const keys=ids.flatMap(id=>['sunset','neon'].map(mood=>({id,mood})));
const hashA='a'.repeat(64),hashB='b'.repeat(64);
const baseRows=keys.map(x=>({...x,segment:200,speed:220,renderMeanMs:12,
  renderP95Ms:14,frameP95Ms:16,rafFps:60,sceneSetupMs:20,coldRenderMs:10}));
const afterRows=baseRows.map(x=>({...x,renderMeanMs:9,renderP95Ms:11,
  sceneSetupMs:22,coldRenderMs:11}));
const report=(sourceSHA256,rows)=>({
  schema:1,sourceSHA256,rows,browser:'123.0.0',samples:60,warmup:20,
  device:'Headless Chromium desktop; not physical phone hardware',
  measurement:'Fixed-state render CPU; RAF cadence without game update; post-GC JS heap',
  viewport:{width:1280,height:800},memory:Array.from({length:3},(_,i)=>({cycle:i,jsHeapUsedBytes:1000000}))
});
const before=report(hashA,baseRows),after=report(hashB,afterRows);
const sceneRows=keys.map(x=>({...x,geometryMatches:true,changedPixelsPercent:8,
  meanAbsoluteRgbDifference:3}));
const scenes={
  schema:1,browser:'123.0.0',viewport:{width:1280,height:800},
  sourceSHA256:{before:hashA,after:hashB},scenes:30,
  geometryMatchesEveryScene:true,rows:sceneRows,
  quality:[
    {preset:'LOW',width:720,height:405,passed:true,pngBytes:14000},
    {preset:'STANDARD',width:960,height:540,passed:true,pngBytes:17000},
    {preset:'HIGH',width:1200,height:675,passed:true,pngBytes:21000},
    {preset:'ULTRA',width:1440,height:810,passed:true,pngBytes:24000}
  ],
  presetPersistencePassed:true,
  responsive:[{name:'phone',passed:true},{name:'landscape',passed:true}],
  runtimeErrors:[]
};
const approval={
  reviewer:'local reviewer',
  approved:true,reviewedAt:'2026-10-08T12:00:00Z',reviewedScenes:30,
  baselineSourceSHA256:hashA,candidateSourceSHA256:hashB,
  notes:'Checked all 30 screenshot pairs for occlusion and clipping.'
};
const assess=(b=before,a=after,v=scenes,r=approval)=>checkEvidence(b,a,v,r);
const result=assess();
assert.equal(result.candidateReadyForManualMerge,true,'valid synthetic proof passes');
assert.equal(result.benchmarkTargetMet,true,'synthetic 25% CPU gain');
assert.equal(result.actualMobileGameplayFpsVerified,false);
assert.equal(result.humanVisualApproval,true);
assert.equal(assess(before,after,scenes,null).candidateReadyForManualMerge,false,'signoff mandatory');

const slower=report(hashB,afterRows.map(x=>({...x,renderMeanMs:10})));
assert.equal(assess(before,slower).candidateReadyForManualMerge,false,'less than 20% gain');
const oneBad=report(hashB,afterRows.map((r,i)=>i===0?{...r,renderMeanMs:16}:r));
assert(assess(before,oneBad).blocking.some(x=>/Severe/.test(x)),'one route severe regression rejected');
const cold=report(hashB,afterRows.map(x=>({...x,sceneSetupMs:90,coldRenderMs:60})));
assert(assess(before,cold).blocking.some(x=>/setup/.test(x)),'cold route setup regression rejected');
assert(assess(before,cold).blocking.some(x=>/first render/.test(x)),'cold first render regression rejected');
const geometry={...scenes,rows:scenes.rows.map((x,i)=>i===3?{...x,geometryMatches:false}:x)};
assert.equal(assess(before,after,geometry).candidateReadyForManualMerge,false,'geometry shift rejected');
const wrongHash={...scenes,sourceSHA256:{before:hashB,after:hashB}};
assert.equal(assess(before,after,wrongHash).candidateReadyForManualMerge,false,'mixed-source reports rejected');
const noMobile={...scenes,responsive:[{name:'phone',passed:true}]};
assert.equal(assess(before,after,noMobile).candidateReadyForManualMerge,false,'missing orientation rejected');
const approvalWrong={...approval,candidateSourceSHA256:'c'.repeat(64)};
assert.equal(assess(before,after,scenes,approvalWrong).candidateReadyForManualMerge,false,'stale signoff rejected');
const missingCold=report(hashB,afterRows.map(({sceneSetupMs,coldRenderMs,...rest})=>rest));
assert.throws(()=>assess(before,missingCold),/cold-start metrics coverage/,'mismatched evidence rejected');
const wrongBrowser=report(hashB,afterRows);wrongBrowser.browser='999.0.0';
assert.throws(()=>assess(before,wrongBrowser),/Incompatible reports: browser/,'browser mismatch rejected');
console.log('V54 P4 acceptance policy: PASS (11 synthetic cases; NOT a real benchmark)');
