'use strict';
// Presentation-only yaw limiter; V51 driftAngle/slipAngle/physics/score are authoritative.
// A straight road must not produce the same huge 3D body angle as a hairpin.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function presentationYawDegrees(snapshot,curves,speedKmh) {
 const yaw=Number(snapshot?.yawDeg)||0,angle=Math.abs(yaw);
 const active=!!(snapshot?.isDrifting||snapshot?.driftState==='recover');
 if(!active)return clamp(yaw,-9,9);
 const points=Array.isArray(curves)?curves:[];
 let bend=0;
 for(let i=0;i<Math.min(15,points.length);i++){
  const weight=1-i/25;
  bend=Math.max(bend,Math.abs(Number(points[i])||0)*weight);
 }
 const speed=clamp(Number(speedKmh)||0,0,325);
 const speedEase=clamp((speed-60)/180,0,1);
 // Nighttime Taipei straight: restrained 10–16°; more rotation only for
 // a sustained corner at pace. Preserve signed V51 yaw; never invent drift.
 const cap=clamp(10+8.0*speedEase+8.5*clamp(bend/1.6,0,1),10,26.5);
 return Math.sign(yaw)*Math.min(angle,cap);
}
module.exports={presentationYawDegrees};