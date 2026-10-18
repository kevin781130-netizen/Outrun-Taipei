'use strict';
// V62: execute the existing V61 apex evaluator and pass earned grades into
// the additive flow chain. Timers, caps and HUD must be deterministic.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));

const result=JSON.parse(game.run(`(()=>{
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  playerZ=200*SEGMENT_LENGTH;speed=190;steer=.25;
  roadGrip=1;collisionCooldown=0;isDrifting=false;
  const physics=()=>({speed,steer,nitro,nitroStock,driftAngle,
    lateralVelocity,boostRemaining,playerX});
  const before=physics();
  const earn=drift=>{
    playerZ+=55*SEGMENT_LENGTH;
    v61ApexStep(1/60,2.3);
    for(let i=0;i<40;i++){
      playerZ+=SEGMENT_LENGTH;isDrifting=drift;
      v61ApexStep(1/60,2.3);
    }
    isDrifting=false;playerZ+=4*SEGMENT_LENGTH;
    const apex=v61ApexStep(1/60,.2);
    return {apex,flow:v62OnApexAward(apex)};
  };
  const one=earn(false),two=earn(true),three=earn(false),
        four=earn(true),five=earn(false);
  const peak={chain:v62FlowCount,best:v62FlowBest,score,
    hudVisible:document.getElementById('flow-chain').classList.contains('show'),
    hudLabel:document.getElementById('flow-chain-count').textContent,
    timerLabel:document.getElementById('flow-chain-time').textContent};
  v62FlowTick(8);
  const half={chain:v62FlowCount,time:v62FlowTime};
  gameStarted=true;raceActive=true;paused=true;
  update(2);
  const pausedTimer=v62FlowTime;paused=false;
  v62FlowTick(8.01);
  const expired={chain:v62FlowCount,time:v62FlowTime,
    visible:document.getElementById('flow-chain').classList.contains('show')};
  const fresh=earn(false),afterFresh={chain:v62FlowCount,score};
  collisionCooldown=0;
  triggerCrash(null,null,true);
  const crashed={chain:v62FlowCount,time:v62FlowTime};
  crashSequence=null;collisionCooldown=0;roadGrip=1;
  const afterCrash=physics();
  // Triggering a crash is expected to reset driving physics; test the
  // physics neutrality of the scoring system before and after separately.
  const newChain=earn(true);
  setStage(0,0,false);
  const stageCleared={chain:v62FlowCount,time:v62FlowTime,best:v62FlowBest};
  resetGame();
  const reset={chain:v62FlowCount,time:v62FlowTime,best:v62FlowBest,
    visible:document.getElementById('flow-chain').classList.contains('show')};
  return JSON.stringify({one,two,three,four,five,peak,half,pausedTimer,
    expired,fresh,afterFresh,crashed,afterCrash,newChain,stageCleared,
    reset,before,version:COMPETITION.version,
    bestKey:bestRecordKey(),arcadeKey:arcadeBoardKey()});
})()`));
assert.equal(result.version,'86.0');
assert(result.bestKey.endsWith(':86.0')&&result.arcadeKey.endsWith(':86.0'),
  'new score awards must not overwrite V60 or V61 records');
assert.deepEqual(result.one.flow,{chain:1,bonus:0,total:240});
assert.deepEqual(result.two.flow,{chain:2,bonus:120,total:770});
assert.deepEqual(result.three.flow,{chain:3,bonus:240,total:480});
assert.deepEqual(result.four.flow,{chain:4,bonus:360,total:1010});
assert.deepEqual(result.five.flow,{chain:4,bonus:360,total:600},
  'chain bonus is strictly capped');
assert.deepEqual(result.peak,{chain:4,best:4,score:3100,
  hudVisible:true,hudLabel:'FLOW ×4',timerLabel:'16.0s'});
assert.equal(result.half.chain,4);
assert.equal(result.half.time,8);
assert.equal(result.pausedTimer,8,'paused updates cannot consume the chain');
assert.deepEqual(result.expired,{chain:0,time:0,visible:false});
assert.deepEqual(result.fresh.flow,{chain:1,bonus:0,total:240});
assert.equal(result.afterFresh.score,3340);
assert.deepEqual(result.crashed,{chain:0,time:0},'crash ends the streak');
assert.deepEqual(result.newChain.flow,{chain:1,bonus:0,total:650});
assert.deepEqual(result.stageCleared,{chain:0,time:0,best:4});
assert.deepEqual(result.reset,{chain:0,time:0,best:0,visible:false});
console.log('V62: chained corner rewards, bounded bonus, pause/expiry/crash/stage reset and HUD passed');
