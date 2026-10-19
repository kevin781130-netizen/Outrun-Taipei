'use strict';
// Frozen V91 command for actual-update comparisons; evaluated inside the game VM.
module.exports=function createV91DriftCommand(){
 return function v90DriftCommand(command,counterAuthority,intent=command){
 const previous=v84DriftCommand(command,counterAuthority);
 if(!isDrifting||driftState==='recover'||command*driftDirection<=0)return previous;
 const input=v87FineDriftInput(clamp(command,-1,1));
 const t=clamp(driftAge/V84_DRIFT_LINE.entrySeconds,0,1);
 const entry=lerp(V84_DRIFT_LINE.entryFloor,1,t*t*(3-2*t));
 const normalDirect=.238*v51SteeringProfile(speed,false).authority;
 const authority=Math.max(Math.abs(previous)*1.057,Math.abs(input)*normalDirect*1.06*entry);
 // Raw intent releases the heading aid immediately, even as steer smooths out.
 // A stale old-side nose cannot pull against a deliberate drift transfer.
 const requested=clamp((Math.abs(intent)-.10)/.40,0,1);
 const heading=intent*command>0&&command*driftAngle>0?
  .06*requested*clamp(Math.abs(driftAngle)/45,0,1):0;
 return Math.sign(command)*authority*(1+heading);
};
};
