'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const data=JSON.parse(game.run(`(()=>{
 const frames=[];
 for(let i=0;i<15;i++){
  const first=i>=2&&i<=5,second=i>=9;
  frames.push({t:(i+1)/60,x:i*.025,lat:i<8?-.5:.4,
    drift:first||second||i===1,
    state:i===6||i===7||i===8?'grip':i===5||i>=12?'recover':'drift',
    steer:i>=4&&i<=5?-.5:i>=11?.5:0,
    rawSteer:first?-1:second?1:0,
    driftDirection:second?-1:1});
 }
 // Event #1: i=2 raw counter, filtered response at i=4, grip at i=6.
 // Event #2: i=9 raw counter, response at i=11, no grip yet.
 const clip={schema:'taipei-driving.v76.player-drive.1',mode:'v69',
  route:'4D',reason:'manual',summary:{driftStarts:2},frames};
 const report=v77AnalyzeClip(clip);
 const few={...clip,frames:frames.slice(0,2)};
 const missing=v77AnalyzeClip(few);
 const none=v77AnalyzeClip({...clip,frames:[]});
 const format=(()=>{v76Clip=clip;v76Recording=false;
  clip.analysisV77=report;v77RenderAnalysis();
  const ids=['v77-report-drive','v77-report-counter','v77-report-grip','v77-report-motion'];
  return {hidden:document.getElementById('v77-report').hidden,
   lines:ids.map(k=>document.getElementById(k).textContent)};
 })();
 return JSON.stringify({report,missing,none,format});
})()`));
assert.equal(data.report.schema,'taipei-driving.v77.local-analysis.1');
assert.equal(data.report.frames,15);
assert.equal(data.report.countersteerAttempts,2);
assert.equal(data.report.steerResponseObserved,2);
assert.equal(data.report.meanSteerResponseMs,50);
assert.equal(data.report.gripResponseObserved,1);
assert.equal(data.report.meanGripResponseMs,83);
assert.equal(data.report.activeSteerGrip,0);
assert.equal(data.report.recoverToGrip,1);
assert.equal(data.report.route,'4D');
assert.equal(data.report.mode,'v69');
assert.equal(data.missing.countersteerAttempts,0);
assert.equal(data.missing.meanSteerResponseMs,null);
assert.equal(data.missing.meanGripResponseMs,null);
assert.equal(data.none,null);
assert.equal(data.format.hidden,false);
assert.match(data.format.lines[1],/已觀測 2 \/ 2/);
assert.match(data.format.lines[2],/已觀測 1 \/ 2/);
assert.match(data.format.lines[3],/峰值/);
console.log('V77: consent-bound offline analysis, two real-intent counter events, censored grip, read-only UI passed');
