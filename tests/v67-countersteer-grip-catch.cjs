'use strict';
// Original, input-driven drift-recovery audit inspired by open racing games.
// No third-party physics code or original-game coefficient is reused.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const result=JSON.parse(game.run(`(()=>{
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  const initial=()=>{v67ResetCatch();speed=165;motionDirection=1;roadGrip=1;
    isDrifting=true;driftState='drift';driftAngle=27;slipAngle=13;
    lateralVelocity=.8;steer=-.9;playerX=0;playerZ=210*SEGMENT_LENGTH;
  };
  initial();
  const first=v67CountersteerCatch(1/60,-.9);
  const afterOne=lateralVelocity;
  for(let k=0;k<10;k++)v67CountersteerCatch(1/60,-.9);
  const caught={count:v67CatchCount,hold:v67CatchHold,fired:v67CatchFired,
    velocity:lateralVelocity,visual:document.getElementById('style-main').textContent};
  const retained=v67CatchCount;
  for(let k=0;k<40;k++)v67CountersteerCatch(1/60,-.9);
  const noRepeat=v67CatchCount;
  initial();lateralVelocity=-.8;driftAngle=-27;slipAngle=-13;steer=.9;
  const mirrorRemoved=v67CountersteerCatch(1/60,.9),mirrorVelocity=lateralVelocity;
  const conditions=[];
  const attempt=(key,setup,command)=>{
    initial();setup();const old=lateralVelocity;const removed=v67CountersteerCatch(1/60,command);
    conditions.push({key,removed,velocity:lateralVelocity,old,hold:v67CatchHold});
  };
  attempt('neutral',()=>{},0);
  attempt('follow',()=>{},.8);
  attempt('low-grip',()=>{roadGrip=.6},-.9);
  attempt('recovery',()=>{driftState='recover'},-.9);
  attempt('grip-driving',()=>{isDrifting=false},-.9);
  attempt('low-speed',()=>{speed=55},-.9);
  attempt('weak-slip',()=>{slipAngle=2},-.9);
  attempt('wrong-velocity',()=>{lateralVelocity=-.8},-.9);
  attempt('reverse',()=>{motionDirection=-1},-.9);
  initial();const pauseBefore=lateralVelocity;
  const pauseRemoved=v67CountersteerCatch(0,-.9);
  const pauseAfter=lateralVelocity;
  initial();
  // Compare the actual stepArcadeMotion() with catch enabled vs the same
  // isolated physics frame with ONLY the catch call disabled.
  const runStep=(disable)=>{
    initial();const original=v67CountersteerCatch;
    if(disable)v67CountersteerCatch=()=>0;
    try{stepArcadeMotion(1/60,2.4,true,false);
      return {x:playerX,velocity:lateralVelocity,speed,nitro,nitroStock};
    }finally{v67CountersteerCatch=original;}
  };
  const integrated=runStep(false),baseline=runStep(true);
  initial();v67CountersteerCatch(1/60,-.9);
  setStage(0,0,false);
  const stage={hold:v67CatchHold,fired:v67CatchFired};
  initial();for(let k=0;k<11;k++)v67CountersteerCatch(1/60,-.9);
  resetGame();
  const reset={hold:v67CatchHold,fired:v67CatchFired,count:v67CatchCount};
  return JSON.stringify({rules:COMPETITION.version,board:bestRecordKey(),
    first,afterOne,caught,retained,noRepeat,mirrorRemoved,mirrorVelocity,
    conditions,pauseRemoved,pauseBefore,pauseAfter,integrated,baseline,stage,reset});
})()`));
assert.equal(result.rules,'60.0','new handling must isolate old race records');
assert(result.board.endsWith(':60.0'));
assert(result.first>0&&result.first<.08,'countersteering catches but never teleports lateral motion');
assert(result.afterOne>0&&result.afterOne<.8,'preserve physical momentum sign');
assert.equal(result.caught.count,1);
assert.equal(result.caught.fired,true);
assert.equal(result.caught.visual,'SLIDE CAUGHT!','clear player feedback after deliberate catch');
assert.equal(result.retained,result.noRepeat,'one feedback event per continuous drift');
assert(Math.abs(result.mirrorRemoved-result.first)<1e-10,'mirror steering must balance');
assert(Math.abs(result.mirrorVelocity+result.afterOne)<1e-10,'mirror sign must reverse exactly');
for(const state of result.conditions){
  assert.equal(state.removed,0,state.key+' cannot activate auto-recovery');
  assert.equal(state.velocity,state.old,state.key+' must not alter vehicle');
  assert.equal(state.hold,0,state.key+' clears interrupted hold');
}
assert.equal(result.pauseRemoved,0);
assert.equal(result.pauseBefore,result.pauseAfter,'dt=0 does not simulate catch');
assert(result.integrated.velocity<result.baseline.velocity&&result.integrated.velocity>0,
  'actual vehicle update benefits from player countersteering');
assert(result.integrated.x<result.baseline.x,
  'caught drift changes physical road-relative line, not just the drawn sprite');
assert.equal(result.integrated.speed,result.baseline.speed,'no extra brake/boost');
assert.equal(result.integrated.nitro,result.baseline.nitro,'no nitro editing');
assert.deepEqual(result.stage,{hold:0,fired:false});
assert.deepEqual(result.reset,{hold:0,fired:false,count:0});
console.log('V67: countersteer grip catch, actual lateral physics, pause, mirror, no automatic rail and reset passed');
