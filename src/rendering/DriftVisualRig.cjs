'use strict';
// Optical-only sway. Road already accounts for -playerX*HALF_WIDTH; never
// apply game lateral position again. Yaw already includes V51's slip term.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function createDriftVisualRig(){return {offsetX:0,cameraX:0};}
function resetDriftVisualRig(rig){rig.offsetX=0;rig.cameraX=0;return rig;}
function updateDriftVisualRig(rig,drive,dtSeconds){
 if(!rig||!drive||!Number.isFinite(dtSeconds)||dtSeconds<0)throw new TypeError('valid rig, snapshot and nonnegative dt required');
 if(dtSeconds===0)return rig;
 const dt=Math.min(dtSeconds,.1);
 const active=drive.isDrifting||drive.driftState==='recover';
 const slip=clamp(Math.abs(drive.slipAngleDeg)/18,0,1);
 const side=Math.sign(drive.driftAngleDeg||drive.driftDirection||drive.slipAngleDeg);
 const recover=drive.driftState==='recover';
 const motion=clamp(drive.lateralVelocity,-1.6,1.6)*.065;
 const target=active?clamp(-side*.30*slip*(recover?.65:1)+motion,-.4,.4):0;
 rig.offsetX+=(target-rig.offsetX)*(1-Math.exp(-dt*(recover?13:11)));
 rig.cameraX+=(rig.offsetX*.4-rig.cameraX)*(1-Math.exp(-dt*4));
 return rig;
}
module.exports={createDriftVisualRig,updateDriftVisualRig,resetDriftVisualRig};
