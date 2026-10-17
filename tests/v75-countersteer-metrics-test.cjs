'use strict';
const assert=require('node:assert/strict');
const {countersteerMetric,analyzeSSequence,firstMatch}=require('./v75-countersteer-metrics.cjs');
assert.equal(firstMatch([{steer:0},{steer:0}],r=>r.steer>0),null,
 'unobserved steering must stay null, not appear instantly responsive');
function inputFrame(i){
 const phases=[0,3,6,9,12,15];
 const part=phases.findLastIndex(x=>i>=x);
 const steer=part===1?0.7:part===4?-0.7:0;
 const curve=i<9?-1.6:1.6;
 const inDrift=(part===0||part===3)||(part===1&&i<5)||(part===4&&i<14);
 const state=inDrift?'recover':'grip';
 return {idx:400+i,curve,speed:170,playerX:i*.02,playerZ:i*160,
  steer,lateralVelocity:i<9?-.5:.3,driftAngle:i<9?-9:7,
  yawRate:1.5,roadGrip:1,settleRemaining:i<5?.4:0,
  exitWindowPending:false,driftState:state,isDrifting:inDrift};
}
const labels=['first real keyboard drift','countersteer first bend',
 'continuous neutral drive, no reposition','opposite real keyboard drift',
 'countersteer opposite bend','neutral exit'];
const trace=Array.from({length:18},(_,i)=>inputFrame(i));
const phases=labels.map((label,i)=>({
 label,frames:3,startFrame:i*3,endFrameExclusive:i*3+3
}));
const pair={firstCurve:-1.6,secondCurve:1.6,firstIndex:400,secondIndex:500};
const v=analyzeSSequence(trace,phases,pair,{v68:0,v69:0});
assert.equal(v.frames,18);assert.equal(v.actualRecoveryTransitions.length,2);
assert.equal(v.activeSteerRecoveryTransitions,2);
assert.equal(v.neutralRecoveryTransitions,0);
assert.deepEqual(v.qualifiedOldWindows,{v68:0,v69:0});
assert(v.countersteerOne.steerResponse&&v.countersteerTwo.steerResponse);
assert(v.countersteerOne.driftRelease&&v.countersteerTwo.driftRelease);
assert.equal(v.countersteerOne.commandedDirection,1);
assert.equal(v.countersteerTwo.commandedDirection,-1);
const absent=countersteerMetric(trace.slice(0,3),1);
assert.equal(absent.steerResponse,null,'unobserved reversal is right-censored');
assert.equal(absent.driftRelease,null,'unobserved full grip is right-censored');
assert.throws(()=>countersteerMetric([],1),/needs real frames/);
assert.throws(()=>countersteerMetric(trace,0),/Direction/);
assert.throws(()=>analyzeSSequence(trace,phases,{...pair,secondCurve:-1},{}),
 /opposite-sign/);
assert.throws(()=>analyzeSSequence(trace,phases.map((p,i)=>i===2?
 {...p,startFrame:p.startFrame+1}:p),pair,{}),/discontinuous/);
assert.throws(()=>analyzeSSequence([...trace.slice(0,-1),{
 ...trace.at(-1),lateralVelocity:NaN}],phases,pair,{}),/Invalid real-browser field/);
console.log('V75: active recovery events, right-censored response, phase continuity and metric safeguards passed');
