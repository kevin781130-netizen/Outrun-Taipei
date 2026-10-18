'use strict';
// V65 drills reuse V64 valid-corner history without changing V60 physics or scoring.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const d=JSON.parse(game.run(`(()=>{
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  roadGrip=1;collisionCooldown=0;isDrifting=false;
  const physics=()=>({steer,lateralVelocity,driftAngle,slipAngle,
    nitro,nitroStock,boostRemaining,playerX});
  function attempt(entry,exit,curve=2.2,segment=200){
    playerZ=segment*SEGMENT_LENGTH;speed=entry;
    v61ApexStep(1/60,curve);
    v65RenderTarget();
    const live={visible:!document.getElementById('corner-target').hidden,
      text:document.getElementById('corner-target').textContent,
      target:v65TargetForRun(v61Apex)};
    playerZ+=45*SEGMENT_LENGTH;speed=exit;
    const apex=v61ApexStep(1/60,Math.sign(curve)*.2);
    const oldScore=score,before=physics();
    const report=v64RecordCorner(apex);
    return {live,report,scoreNeutral:score===oldScore,
      physicsNeutral:JSON.stringify(physics())===JSON.stringify(before),
      attempts:v65PracticeAttempts,hits:v65PracticeHits,
      visibleAfter:!document.getElementById('corner-target').hidden,
      message:document.getElementById('corner-coach').textContent};
  }
  const first=attempt(190,175);
  const tie=attempt(190,175);
  const miss=attempt(190,160);
  const improve=attempt(200,190);
  const oldCount=v64CornerHistory.size;
  const afterReset=(()=>{resetGame();return {attempts:v65PracticeAttempts,
    hits:v65PracticeHits,count:v64CornerHistory.size,
    targetVisible:!document.getElementById('corner-target').hidden};})();
  const afterResetAttempt=attempt(195,193);
  const afterNewRoute=(()=>{
    setStage(1,0,false);
    return attempt(190,165,-2.4);
  })();
  const noEarn=(()=>{
    setStage(0,0,false);
    playerZ=200*SEGMENT_LENGTH;speed=180;
    v61ApexStep(1/60,2.2);
    roadGrip=.5;v61ApexStep(1/60,2.2);v65RenderTarget();
    const hidden=document.getElementById('corner-target').hidden;
    roadGrip=1;
    playerZ+=45*SEGMENT_LENGTH;speed=165;
    const bad=v61ApexStep(1/60,.2);
    return {hidden,bad,attempts:v65PracticeAttempts,hits:v65PracticeHits};
  })();
  return JSON.stringify({first,tie,miss,improve,oldCount,afterReset,
    afterResetAttempt,afterNewRoute,noEarn,version:COMPETITION.version,
    bestKey:bestRecordKey(),arcadeKey:arcadeBoardKey()});
})()`));
assert.equal(d.version,'90.0','non-scoring coach must preserve leaderboard version');
assert(d.bestKey.endsWith(':90.0')&&d.arcadeKey.endsWith(':90.0'));
assert.equal(d.first.live.visible,true);
assert(d.first.live.text.includes('首次過彎建立基準'));
assert.deepEqual(d.first.report,{key:'1A:1:5',entry:190,exit:175,delta:null,best:175,target:null,goalMet:null});
assert.equal(d.first.attempts,0);
assert.equal(d.tie.live.target.best,175);
assert(d.tie.live.text.includes('目標出彎 ≥ 175'));
assert.deepEqual([d.tie.report.target,d.tie.report.goalMet,d.tie.attempts,d.tie.hits],[175,true,1,1]);
assert(d.tie.message.includes('目標達成 1/1'));
assert.deepEqual([d.miss.report.target,d.miss.report.goalMet,d.miss.attempts,d.miss.hits],[175,false,2,1]);
assert(d.miss.message.includes('再練一次 1/2'));
assert.deepEqual([d.improve.report.target,d.improve.report.goalMet,d.improve.report.best,d.improve.attempts,d.improve.hits],[175,true,190,3,2]);
assert.equal(d.improve.live.target.best,175,'target is frozen until successful exit');
assert([d.first,d.tie,d.miss,d.improve,d.afterResetAttempt,d.afterNewRoute].every(a=>a.scoreNeutral&&a.physicsNeutral&&!a.visibleAfter),'no physics, score, or stale target changes');
assert.equal(d.oldCount,1);
assert.deepEqual(d.afterReset,{attempts:0,hits:0,count:1,targetVisible:false});
assert.deepEqual([d.afterResetAttempt.report.target,d.afterResetAttempt.report.goalMet],[190,true]);
assert.equal(d.afterNewRoute.report.target,null,'other stage or opposite direction uses independent target');
assert.deepEqual(d.noEarn,{hidden:true,bad:null,attempts:1,hits:1},'off-road/invalid bend cannot claim drill');
console.log('V65: live practice targets, frozen best, achieved/missed and isolated stage, reset, no-score/physics passed');
