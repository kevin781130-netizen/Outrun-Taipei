'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const protectedFields=['speed','steer','isDrifting','driftState','driftDirection','driftAngle',
 'slipAngle','lateralVelocity','driftAge','cleanDriftTime','driftChargeRate',
 'nitro','nitroStock','boostRemaining','boosting','roadGrip','exitBoost',
 'momentBoostWindow','helperWasHeld','driftRearmBlocked'];
let count=0;
// Cover every district boundary and both branches with a live active drift.
// This exercises the actual browser game's finishStageTransition() and setStage().
for(let level=0;level<4;level++)for(const choice of ['left','right']){
 const startColumn=level===0?0:1;
 const side=choice==='left'?-1:1;
 const state=JSON.parse(game.run(`(()=>{
  v34Mode='arcade';
  setStage(${level},${startColumn},false);
  playerX=${side}*.24;speed=230;steer=${side}*.55;
  driftState='drift';isDrifting=true;driftDirection=${side};driftAge=.86;
  driftAngle=${side}*27;slipAngle=${side}*12;lateralVelocity=${side}*.42;
  cleanDriftTime=1.12;driftChargeRate=21;nitro=47;nitroStock=1;
  boostRemaining=1.35;boosting=true;roadGrip=.94;exitBoost=.22;
  momentBoostWindow=.37;helperWasHeld=true;driftRearmBlocked=true;
  beginStageTransition('${choice}');
  // Reached the center of the merge using the authored transition geometry.
  stageTransition.lastCenter=transitionGeometry(STAGE_SWITCH,'${choice}').center;
  playerZ=STAGE_SWITCH*SEGMENT_LENGTH+37;
  const before=Object.fromEntries(${JSON.stringify(protectedFields)}.map(k=>[k,eval(k)]));
  finishStageTransition();
  const after=Object.fromEntries(${JSON.stringify(protectedFields)}.map(k=>[k,eval(k)]));
  const scene=v57SceneFrame();
  return JSON.stringify({before,after,route:currentNode.id,next:stageLevel===${level+1},
    distance:playerZ,playerX,limit:drivableHalf()*.85,stageTransition,
    sceneDrift:scene.driving.isDrifting,sceneYaw:scene.yawDeg,
    sceneCharge:scene.driving.driftCharge,sceneBoost:scene.boosting});
 })()`));
 assert.equal(state.next,true,choice+' stage advancement');
 assert.equal(state.distance,37,'preserve overshoot distance');
 assert.equal(state.stageTransition,null,'transition clears once');
 assert(Math.abs(state.playerX)<=state.limit+1e-10,'player stays inside next road');
 assert.deepEqual(state.after,state.before,`preserve active handling/charge through ${level} ${choice}`);
 assert.equal(state.sceneDrift,true,'next scene renders an active drift');
 assert(state.sceneYaw*side>0,'next scene preserves visible yaw direction');
 assert.equal(state.sceneCharge,47,'nitro UI receives unchanged charge');
 assert.equal(state.sceneBoost,true,'boost survives transition');
 count++;
}
// A fresh stage selection must still initialize neutral handling (no global removal).
assert.equal(game.run(`(()=>{isDrifting=true;driftState='drift';setStage(0,0,false);
 return !isDrifting&&driftState==='grip';})()`),true,'fresh start resets driving');
console.log('V59 handoff: '+count+' live-drift district joins retain handling, charge and boost');
