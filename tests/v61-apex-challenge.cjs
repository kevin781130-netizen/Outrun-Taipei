'use strict';
// V61: ensure corner skill awards are earned on exit, never on entry or crash.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));

const result=JSON.parse(game.run(`(()=>{
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  speed=190;playerZ=200*SEGMENT_LENGTH;roadGrip=1;collisionCooldown=0;
  const physics=()=>({speed,nitro,nitroStock,lateralVelocity,driftAngle,slipAngle});
  const before=physics();
  const premature=v61ApexStep(1/60,2.2);
  const tooSoon=(playerZ+=5*SEGMENT_LENGTH,v61ApexStep(1/60,.3));
  const scoreAfterTooSoon=score;
  const clean=(()=>{
    playerZ+=55*SEGMENT_LENGTH;v61ApexStep(1/60,2.2);
    playerZ+=40*SEGMENT_LENGTH;return v61ApexStep(1/60,.25);
  })();
  const scoreAfterClean=score;
  const duplicate=v61ApexStep(1/60,.1),scoreAfterDuplicate=score;
  const perfect=(()=>{
    playerZ+=100*SEGMENT_LENGTH;v61ApexStep(1/60,-2.4);
    isDrifting=true;
    for(let i=0;i<40;i++){playerZ+=SEGMENT_LENGTH;v61ApexStep(1/60,-2.4);}
    isDrifting=false;playerZ+=4*SEGMENT_LENGTH;
    return v61ApexStep(1/60,-.2);
  })();
  const scoreAfterPerfect=score;
  const offRoad=(()=>{
    playerZ+=80*SEGMENT_LENGTH;v61ApexStep(1/60,2);
    playerZ+=15*SEGMENT_LENGTH;roadGrip=.5;v61ApexStep(1/60,2);
    roadGrip=1;playerZ+=30*SEGMENT_LENGTH;
    return v61ApexStep(1/60,.1);
  })();
  const scoreAfterOffRoad=score;
  const short=(()=>{
    playerZ+=80*SEGMENT_LENGTH;v61ApexStep(1/60,2.0);
    playerZ+=2*SEGMENT_LENGTH;return v61ApexStep(1/60,.1);
  })();
  const resetCheck=(()=>{
    playerZ+=80*SEGMENT_LENGTH;v61ApexStep(1/60,2.0);
    const armed=!!v61Apex;setStage(0,0,false);
    return {armed,cleared:!v61Apex};
  })();
  const after=physics();
  const awards=v61ApexAwards;
  const prevScore=score;
  resetGame();
  return JSON.stringify({premature,tooSoon,scoreAfterTooSoon,clean,scoreAfterClean,
    duplicate,scoreAfterDuplicate,perfect,scoreAfterPerfect,
    offRoad,scoreAfterOffRoad,short,resetCheck,
    before,after,awards,prevScore,resetAwards:v61ApexAwards,
    version:COMPETITION.version,recordKey:bestRecordKey(),boardKey:arcadeBoardKey()});
})()`));
assert.equal(result.version,'87.0','scoring changes require separate records');
assert(result.recordKey.endsWith(':87.0')&&result.boardKey.endsWith(':87.0'));
assert.equal(result.premature,null);
assert.equal(result.tooSoon,null);
assert.equal(result.scoreAfterTooSoon,0,'short bend is not a score exploit');
assert.deepEqual(JSON.parse(JSON.stringify(result.clean)),{grade:'clean',points:240,curve:2.2,direction:1,entrySpeed:190,exitSpeed:190,cornerStart:260,routeId:'1A'});
assert.equal(result.scoreAfterClean,240);
assert.equal(result.duplicate,null,'cannot claim same bend twice');
assert.equal(result.scoreAfterDuplicate,240);
assert.equal(result.perfect.grade,'perfect');
assert.equal(result.perfect.direction,-1,'left bend returns dominant curve sign');
assert.equal(result.perfect.points,650);
assert.equal(result.scoreAfterPerfect,890);
assert.equal(result.offRoad,null);
assert.equal(result.scoreAfterOffRoad,890,'leaving track invalidates whole corner');
assert.equal(result.short,null);
assert.deepEqual(result.resetCheck,{armed:true,cleared:true});
assert.equal(result.awards,2);
assert.equal(result.prevScore,890);
assert.equal(result.resetAwards,0,'new race clears skill state');
// No physics mutation in the scoring helper: the setup exercises ordinary
// counters but the driver's speed and nitro state must survive every award.
for(const key of ['speed','nitro','nitroStock','lateralVelocity','driftAngle','slipAngle'])
 assert.equal(result.after[key],result.before[key],key+' must be physics-neutral');
console.log('V61: checkpoint-safe clean line/drift exit, anti-farming, crash-road reset and ranked isolation passed');
