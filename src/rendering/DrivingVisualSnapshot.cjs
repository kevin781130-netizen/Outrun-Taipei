'use strict';
// Reusable one-way gameplay -> renderer state. *Deg are degrees; +game yaw turns right.
// Full3DScene converts that semantic sign to the -Z-facing mesh's local Y rotation.
// lateralVelocity uses playerX units/s, not m/s. No write to source physics.
const STATES=new Set(['grip','armed','brake','entry','drift','recover']);
const NUMBERS=['driftAngleDeg','slipAngleDeg','lateralVelocity','roadGrip','cleanDriftTime','exitBoost','momentBoostWindow','driftCharge','yawDeg'];
function createDrivingVisualSnapshot(){
 return {driftState:'grip',isDrifting:false,driftAngleDeg:0,slipAngleDeg:0,driftDirection:0,lateralVelocity:0,roadGrip:1,cleanDriftTime:0,exitBoost:0,momentBoostWindow:0,driftCharge:0,nitroActive:false,yawDeg:0};
}
function updateDrivingVisualSnapshot(target,source){
 if(!target||!source||typeof target!=='object'||typeof source!=='object')throw new TypeError('snapshot and source required');
 if(!STATES.has(source.driftState))throw new TypeError('invalid driftState');
 if(typeof source.isDrifting!=='boolean'||typeof source.nitroActive!=='boolean')throw new TypeError('drift/nitro flags must be boolean');
 if(![-1,0,1].includes(source.driftDirection))throw new TypeError('invalid driftDirection');
 for(const key of NUMBERS)if(!Number.isFinite(source[key]))throw new TypeError(key+' must be finite');
 // Validate before mutation: reject NaN without corrupting previous renderer state.
 target.driftState=source.driftState;
 target.isDrifting=source.isDrifting;
 target.driftDirection=source.driftDirection;
 target.nitroActive=source.nitroActive;
 for(const key of NUMBERS)target[key]=source[key];
 return target;
}
module.exports={createDrivingVisualSnapshot,updateDrivingVisualSnapshot};
