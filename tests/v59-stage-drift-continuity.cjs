'use strict';
// V59: a scenery/stage swap must never wipe live arcade driving dynamics.
// This guards the actual transition entry point, not a mock of its internals.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');

const game=load(path.join(__dirname,'../index.html'));
const fields=[
 'speed','steer','isDrifting','driftState','driftDirection','driftAge',
 'driftAngle','slipAngle','yawRate','lateralVelocity','cleanDriftTime',
 'counterTime','neutralTime','driftRearmBlocked','driftChargeRate',
 'nitro','nitroStock','boostRemaining','momentBoostWindow',
 'momentBoostArmed','exitBoost','shiftCutTimer','score'
];

for(const choice of ['left','right']){
 const side=choice==='left'?-1:1;
 const data=JSON.parse(game.run(`(()=>{
   v34Mode='arcade';selectedRoute=routeForId('1A');resetGame();
   playerX=${side}*.18;
   playerZ=STAGE_SWITCH*SEGMENT_LENGTH+123;
   speed=173;steer=${side}*.73;
   isDrifting=true;driftState='drift';driftDirection=${side};
   driftAge=.78;driftAngle=${side}*27;slipAngle=${side}*13;
   yawRate=${side}*12;lateralVelocity=${side}*.19;
   cleanDriftTime=.57;counterTime=.09;neutralTime=.02;
   driftRearmBlocked=false;driftChargeRate=.42;
   nitro=.61;nitroStock=1;boostRemaining=.85;
   momentBoostWindow=.34;momentBoostArmed=true;exitBoost=.12;
   shiftCutTimer=.02;score=1234;
   beginStageTransition('${choice}');
   // The transition animation has reached its end; no offset remains.
   stageTransition.lastCenter=transitionGeometry(STAGE_SWITCH,'${choice}').center;
   const capture=()=>Object.fromEntries(${JSON.stringify(fields)}.map(k=>[k,eval(k)]));
   const before=capture();
   finishStageTransition();
   return JSON.stringify({before,after:capture(),route:currentNode.id,
     stageLevel,stageTransition,playerX,playerZ});
 })()`));
 assert.deepEqual(data.after,data.before,choice+' route handoff erased vehicle state');
 assert.equal(data.route,choice==='left'?'2A':'2B');
 assert.equal(data.stageLevel,1);
 assert.equal(data.stageTransition,null);
 assert(Math.abs(data.playerX)<1,choice+' player lane stays bounded');
 assert.equal(data.playerZ,123);
}

// Explicit race restart still clears the drift. Only automatic stage flow is
// meant to retain transient physics.
const cleared=JSON.parse(game.run(`(()=>{
 resetGame();
 return JSON.stringify({isDrifting,driftState,driftAngle,slipAngle,lateralVelocity});
})()`));
assert.equal(cleared.isDrifting,false);
assert.equal(cleared.driftState,'grip');
assert.equal(cleared.driftAngle,0);
assert.equal(cleared.slipAngle,0);
assert.equal(cleared.lateralVelocity,0);

console.log('V59: left/right stage transitions preserve live drift; race restart still clears dynamics');
