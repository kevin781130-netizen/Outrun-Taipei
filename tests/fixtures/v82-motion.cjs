'use strict';
// Frozen V82/V83 trajectory for historical input replay, injected into the game VM.
// Source V83: f29e547d27b959b7f0d8687100b5b617555c6fe7.
module.exports=function legacyMotionFactory(){
const V82_DRIFT_TURN=Object.freeze({gain:.68,entrySeconds:.28,entryFloor:.65});
function v82DriftTurnGain(){
 if(!isDrifting||driftState==='recover')return 1;
 const t=clamp(driftAge/V82_DRIFT_TURN.entrySeconds,0,1);
 return V82_DRIFT_TURN.gain*lerp(V82_DRIFT_TURN.entryFloor,1,t*t*(3-2*t));
}
return function stepArcadeMotion(dt,curve,accelHeld=true,brakeHeld=false){
 const ratio=clamp(speed/COMPETITION.topSpeed,0,1.1),safe=v52SafeCornerSpeed(curve),excess=Math.max(0,speed-safe);
 const profile=v51SteeringProfile(speed,isDrifting);
 const liftGrip=!isDrifting&&!accelHeld&&!brakeHeld?profile.liftGrip:1;
 const frontGrip=clamp((1-excess/210)*liftGrip,.68,1.24);
 const curveDemand=clamp(Math.abs(curve)/1.8,0,1);
 const travelYaw=(driftAngle-slipAngle)*Math.PI/180;
 const driftPathScale=isDrifting?v51DriftPathScale(curve):1;
 const yawTurn=Math.sin(travelYaw)*(isDrifting?DRIFT51.driftPathYaw*driftPathScale:DRIFT51.gripPathYaw)*(.50+.72*ratio);
 const baseAuthority=isDrifting?lerp(.25,DRIFT51.steerPath,curveDemand):.238*profile.authority;
 const brakeRotation=!isDrifting&&brakeHeld?steer*profile.brakeRotation:0;
 const matchingCurve=Math.sign(steer)===Math.sign(curve)?Math.min(Math.abs(curve),2.4):0;
 const turnInBite=!isDrifting?steer*matchingCurve*V51_HANDLING.turnInBite*(.35+.65*ratio):0;
 const driftGain=v82DriftTurnGain();
 // Attenuate only contributions toward the drift. Opposing input stays full.
 const softenInward=value=>value*driftDirection>0?value*driftGain:value;
 const turn=Math.min(1,speed/30)*(softenInward(yawTurn)+softenInward(steer*baseAuthority)+brakeRotation+turnInBite+softenInward(v66DriftLineBite(steer,curve)))*(isDrifting?1:frontGrip);
 const outward=curve*.032*ratio*ratio+(isDrifting?0:v52OverspeedPush(speed,curve));
 const desiredLateral=turn-outward;
 lateralVelocity=lerp(lateralVelocity,desiredLateral,1-Math.exp(-dt*(isDrifting?DRIFT51.driftLateralResponse:17.6)));
 v67CountersteerCatch(dt,steer);
 v68RecoveryRegrip(dt,desiredLateral);
 if(v70UseV69())v69ExitSettle(dt,desiredLateral,steer);else v69ResetSettle();
 const idx=clamp(Math.floor(playerZ/SEGMENT_LENGTH),0,Math.max(0,segments.length-1)),corridors=roadCorridors(idx);
 const lane=corridors.reduce((best,q)=>Math.abs(playerX-q.center)<Math.abs(playerX-best.center)?q:best,corridors[0]||{center:0,half:roadFactor()});
 const usable=Math.max(.12,lane.half-PLAYER_HALF_WIDTH),edgeUse=Math.abs(playerX-lane.center)/usable;
 const outwardMotion=Math.sign(lateralVelocity)===Math.sign(playerX-lane.center)&&Math.abs(playerX-lane.center)>.01;
 if(isDrifting&&outwardMotion&&edgeUse>.70){
   const shoulderDamp=clamp((edgeUse-.70)/.30,0,1);
   lateralVelocity*=Math.max(.72,1-dt*(2.2+shoulderDamp*5.2));
 }
 playerX+=lateralVelocity*dt*motionDirection;
 visualLoad=lerp(visualLoad,brakeHeld?1.08:accelHeld?-.42:0,1-Math.exp(-dt*10));
 const targetRoll=clamp(-(steer*.72+lateralVelocity*.40)*(2.3+ratio*2.2),-V51_HANDLING.chassisRollMax,V51_HANDLING.chassisRollMax);
 const targetPitch=clamp(visualLoad*V51_HANDLING.chassisPitchMax,-V51_HANDLING.chassisPitchMax,V51_HANDLING.chassisPitchMax);
 chassisRoll=lerp(chassisRoll,targetRoll,1-Math.exp(-dt*11));
 chassisPitch=lerp(chassisPitch,targetPitch,1-Math.exp(-dt*13));
 if(isDrifting&&driftState!=='recover')speed=Math.max(0,speed-(.32+Math.abs(slipAngle)*.011)*dt);
 if(excess>0&&Math.abs(curve)>.8)speed=Math.max(0,speed-excess*(isDrifting?.012:V52_CORNER.scrubGrip)*dt);
 v71SampleExitWindow(dt);
 v76RecordSample(dt,curve);
}
};
