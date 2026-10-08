'use strict';

// Purely presentational drift-to-3D bridge. Physics/collision remains owned by
// the arcade core. Inputs are physical state snapshots; output is visual only.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(v,fall=0)=>Number.isFinite(v)?v:fall;
function makeDriftVisualState() {
 return {lateral:0,bodyYaw:0,cameraX:0,cameraTarget:0,roll:0,smoke:0,fov:66,sliding:false,phase:'grip'};
}
function advanceDriftVisual(state, snapshot, dt) {
 if(!state||!snapshot)throw new TypeError('state and drift snapshot are required');
 const delta=clamp(finite(dt),0,0.05);
 const speed=clamp(finite(snapshot.speedKmh),0,400);
 const phase=['entry','drift','recover'].includes(snapshot.driftState)?snapshot.driftState:'grip';
 const active=!!snapshot.isDrifting||phase==='entry'||phase==='drift'||phase==='recover';
 const intensity=active?clamp((Math.abs(finite(snapshot.slipAngle))+Math.abs(finite(snapshot.driftAngle))*.28)/30,0,1):0;
 const signedSlip=clamp(finite(snapshot.lateralVelocity),-5,5);
 const direction=Math.sign(finite(snapshot.driftDirection))||Math.sign(signedSlip)||0;
 // Actual lateral physical world coordinate is tracked by playerX and road.
 // This offset provides a readable rear swing only, without double-integrating
 // speed / altering collision, score, or lane position.
 const targetOffset=active?clamp(signedSlip*.11+direction*intensity*.15,-.68,.68):0;
 const targetYaw=clamp(finite(snapshot.visualYawDeg),-58,58)*Math.PI/180;
 const targetCamera=clamp(targetOffset*.62+direction*intensity*.18,-.54,.54);
 const recover=phase==='recover';
 const blend=1-Math.exp(-delta*(recover?11:active?14:9));
 const cameraBlend=1-Math.exp(-delta*4.5);
 state.lateral+=(targetOffset-state.lateral)*blend;
 state.bodyYaw+=(targetYaw-state.bodyYaw)*blend;
 state.cameraX+=(targetCamera-state.cameraX)*cameraBlend;
 state.cameraTarget+=(targetCamera*.45-state.cameraTarget)*cameraBlend;
 state.roll=clamp(finite(snapshot.rollDeg),-6,6)*Math.PI/180;
 state.sliding=active && speed>40 && intensity>.10;
 state.smoke=state.sliding?clamp(intensity*(speed/140),0,1):0;
 state.fov=66+clamp(finite(snapshot.boosting)?speed/125:0,0,2.8);
 state.phase=phase;
 return state;
}
module.exports={makeDriftVisualState,advanceDriftVisual};
