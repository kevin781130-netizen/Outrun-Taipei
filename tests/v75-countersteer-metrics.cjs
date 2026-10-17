'use strict';
// V75: deterministic, read-only diagnostics of sampled real game frames.
// Never drives steering, supplies inputs, or changes the game's physics.
const DT=1/60;
const NEUTRAL=0.12;
function round(x){return Number.isFinite(x)?Math.round(x*1e6)/1e6:null;}
function firstMatch(rows,predicate){
 const offset=rows.findIndex(predicate);
 return offset<0?null:{frame:offset+1,seconds:round((offset+1)*DT)};
}
function countersteerMetric(rows,commandSign){
 if(!Array.isArray(rows)||rows.length===0)throw Error('Countersteer needs real frames');
 if(commandSign!==1&&commandSign!==-1)throw Error('Direction must be -1 or +1');
 const first=rows[0],last=rows[rows.length-1];
 const steerResponse=firstMatch(rows,f=>Math.sign(f.steer)===commandSign&&Math.abs(f.steer)>=NEUTRAL);
 const driftRelease=firstMatch(rows,f=>!f.isDrifting&&f.driftState==='grip');
 const driftRecovery=firstMatch(rows,f=>f.driftState==='recover');
 const lateralReversal=firstMatch(rows,f=>Math.sign(f.lateralVelocity)===commandSign&&Math.abs(f.lateralVelocity)>=.01);
 const speedDelta=last.speed-first.speed;
 return {
  commandedDirection:commandSign,frames:rows.length,
  steerResponse,driftRecovery,driftRelease,lateralReversal,
  // Lateral direction is not necessarily the commanded driving direction.
  // This is descriptive, NOT a steering-latency success threshold.
  peakAbsoluteLateralVelocity:round(Math.max(...rows.map(f=>Math.abs(f.lateralVelocity)))),
  peakAbsoluteYawDegrees:round(Math.max(...rows.map(f=>Math.abs(f.driftAngle)))),
  crossRoadDisplacement:round(last.playerX-first.playerX),
  speedDeltaKmh:round(speedDelta),
  minimumGrip:round(Math.min(...rows.map(f=>f.roadGrip))),
  driftFrames:rows.filter(f=>f.isDrifting).length
 };
}
function analyzeSSequence(trace,phases,pair,exitStats){
 if(!trace.length)throw Error('Missing continuous browser trace');
 const expected=['first real keyboard drift','countersteer first bend',
  'continuous neutral drive, no reposition','opposite real keyboard drift',
  'countersteer opposite bend','neutral exit'];
 if(phases.length!==expected.length)throw Error('Unexpected input phase count');
 let total=0;
 for(let i=0;i<phases.length;i++){
  const p=phases[i];
  if(p.label!==expected[i]||p.startFrame!==total||p.endFrameExclusive!==total+p.frames)
   throw Error('Out-of-order or discontinuous input phases at '+i);
  total=p.endFrameExclusive;
 }
 if(total!==trace.length)throw Error('Trace length differs from phase lengths');
 for(const row of trace){
  for(const key of ['curve','steer','lateralVelocity','driftAngle',
   'yawRate','roadGrip','playerX','playerZ','speed']){
   if(!Number.isFinite(row[key]))throw Error('Invalid real-browser field '+key);
  }
 }
 const events=[];
 for(let i=1;i<trace.length;i++){
  const prev=trace[i-1],next=trace[i];
  if((prev.isDrifting||prev.driftState==='recover')&&
    !next.isDrifting&&next.driftState==='grip'){
   const neutral=Math.abs(next.steer)<=NEUTRAL;
   events.push({
    frame:i,seconds:round(i*DT),roadSegment:next.idx,
    steeringAtGrip:round(next.steer),speedKmh:round(next.speed),
    roadGrip:round(next.roadGrip),
    inputNeutralAtGrip:neutral,
    // State eligibility does not guarantee 0.42s remains uninterrupted.
    phase:phases.find(p=>i>=p.startFrame&&i<p.endFrameExclusive)?.label||'unknown',
    qualifiedWindowPendingAfterStep:!!next.exitWindowPending,
    settleRemainingSeconds:round(next.settleRemaining)
   });
  }
 }
 const firstSign=Math.sign(pair.firstCurve);
 const secondSign=Math.sign(pair.secondCurve);
 if(!firstSign||secondSign!==-firstSign)throw Error('Not an opposite-sign S');
 const a=phases[1],b=phases[4];
 return {
  frames:trace.length,seconds:round(trace.length*DT),roadPair:pair,
  actualRecoveryTransitions:events,
  neutralRecoveryTransitions:events.filter(e=>e.inputNeutralAtGrip).length,
  activeSteerRecoveryTransitions:events.filter(e=>!e.inputNeutralAtGrip).length,
  countersteerOne:countersteerMetric(trace.slice(a.startFrame,a.endFrameExclusive),secondSign),
  countersteerTwo:countersteerMetric(trace.slice(b.startFrame,b.endFrameExclusive),firstSign),
  peakAbsoluteLateralVelocity:round(Math.max(...trace.map(f=>Math.abs(f.lateralVelocity)))),
  peakAbsoluteLateralDisplacement:round(Math.max(...trace.map(f=>Math.abs(f.playerX)))),
  totalAbsoluteLateralMotion:round(trace.reduce((sum,f)=>sum+Math.abs(f.lateralVelocity)*DT,0)),
  highestYawDegrees:round(Math.max(...trace.map(f=>Math.abs(f.driftAngle)))),
  roadGripBelowPointEightFrames:trace.filter(f=>f.roadGrip<.8).length,
  qualifiedOldWindows:{v68:exitStats.v68,v69:exitStats.v69},
  // Never report this as improvement in player skill or handling quality.
  resultKind:'observational scripted-keyboard browser telemetry'
 };
}
module.exports={DT,NEUTRAL,firstMatch,countersteerMetric,analyzeSSequence};
