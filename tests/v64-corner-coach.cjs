'use strict';
// V64: real entry/exit measurements, same-corner comparison, no score changes,
// bounded transient telemetry and pause/stage/new-game display lifecycle.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const v=JSON.parse(game.run(`(()=>{
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  roadGrip=1;collisionCooldown=0;speed=190;
  const physics=()=>({speed,steer,nitro,nitroStock,lateralVelocity,driftAngle,
    slipAngle,boostRemaining});
  function earn(entry,exit,curve=2.2,stageZ=200){
    playerZ=stageZ*SEGMENT_LENGTH;speed=entry;
    v61ApexStep(1/60,curve);
    playerZ+=45*SEGMENT_LENGTH;speed=exit;
    const apex=v61ApexStep(1/60,.2*Math.sign(curve));
    const beforeScore=score,beforePhysics=physics();
    const report=v64RecordCorner(apex);
    return {apex,report,scoreNeutral:score===beforeScore,
      physicsNeutral:JSON.stringify(physics())===JSON.stringify(beforePhysics),
      hud:document.getElementById('corner-coach').textContent,
      visible:!document.getElementById('corner-coach').hidden};
  }
  const first=earn(190,170),second=earn(200,182),third=earn(190,160);
  const afterThird={timer:v64CoachTimer,
    count:v64CornerHistory.size,visible:!document.getElementById('corner-coach').hidden};
  gameStarted=true;raceActive=true;paused=true;
  update(2);
  const pauseTimer=v64CoachTimer;paused=false;
  v64CoachTick(4.6);
  const expired={timer:v64CoachTimer,visible:!document.getElementById('corner-coach').hidden};
  const left=earn(185,175,-2.4),otherRoute=(()=>{
    setStage(1,0,false);return earn(200,180,2.4);
  })();
  const afterRoute={count:v64CornerHistory.size,keys:[...v64CornerHistory.keys()]};
  const invalid=v64RecordCorner(null),invalidForeign=v64RecordCorner({
    grade:'clean',entrySpeed:170,exitSpeed:180,routeId:'1A',direction:0,cornerStart:200
  });
  const beforeNewRace=v64CornerHistory.size;
  resetGame();
  const reset={count:v64CornerHistory.size,timer:v64CoachTimer,
    visible:!document.getElementById('corner-coach').hidden};
  const again=earn(180,165);
  for(let i=0;i<90;i++)v64RecordCorner({grade:'clean',entrySpeed:190,
    exitSpeed:170,routeId:'5A',direction:1,cornerStart:i*40});
  const capped={count:v64CornerHistory.size,oldest:v64CornerHistory.has('5A:1:0'),
    newest:v64CornerHistory.has('5A:1:89')};
  return JSON.stringify({first,second,third,afterThird,pauseTimer,expired,
    left,otherRoute,afterRoute,invalid,invalidForeign,
    beforeNewRace,reset,again,capped,version:COMPETITION.version,
    scoreKey:bestRecordKey()});
})()`));
assert.equal(v.version,'60.0','score and physics rules unchanged from V63');
assert(v.scoreKey.endsWith(':60.0'));
assert.equal(v.first.apex.entrySpeed,190);
assert.equal(v.first.apex.exitSpeed,170);
assert.equal(v.first.apex.cornerStart,200);
assert.equal(v.first.apex.routeId,'1A');
assert.equal(v.first.report.delta,null);
assert.equal(v.first.report.best,170);
assert(v.first.hud.includes('入 190 → 出 170 KM/H')&&v.first.hud.includes('首次紀錄'));
assert.equal(v.second.report.delta,12);
assert.equal(v.second.report.best,182);
assert(v.second.hud.includes('較上次 +12'));
assert.equal(v.third.report.delta,-22);
assert.equal(v.third.report.best,182,'best speed survives a worse attempt');
assert(v.third.hud.includes('較上次 -22'));
assert([v.first,v.second,v.third,v.left,v.otherRoute,v.again].every(x=>x.scoreNeutral&&x.physicsNeutral&&x.visible),
  'measurements cannot affect vehicle dynamics or scores');
assert.deepEqual(v.afterThird,{timer:4.5,count:1,visible:true});
assert.equal(v.pauseTimer,4.5,'pause must freeze readout');
assert.deepEqual(v.expired,{timer:0,visible:false});
assert.equal(v.left.report.delta,null,'left bend must not compare to right bend');
assert.equal(v.otherRoute.report.delta,null,'different stage must not compare to 1A');
assert.equal(v.afterRoute.count,3);
assert.deepEqual(v.invalid,null);
assert.deepEqual(v.invalidForeign,null);
assert.equal(v.beforeNewRace,3);
assert.deepEqual(v.reset,{count:3,timer:0,visible:false},
  'new run clears popup but preserves in-session previous attempt data');
assert.equal(v.again.report.delta,5,'replayed 1A corner compares to prior recorded exit');
assert.deepEqual(v.capped,{count:64,oldest:false,newest:true},
  'bounded in-memory history must not grow forever');
console.log('V64: measured entry/exit, route/curve-key comparison, timer, reset, bounded history and neutral physics passed');
