'use strict';
// V60: on the same original vehicle physics, tighter corners demand more
// deliberate entry speed. Test the real game globals via its VM audit harness.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));

const state=JSON.parse(game.run(`(()=>{
 v34Mode='arcade';selectedRoute=routeForId('1A');resetGame();
 const measure=(curve,initialSpeed,drifting=false)=>{
   speed=initialSpeed;steer=0;playerX=0;playerZ=200*SEGMENT_LENGTH;
   lateralVelocity=0;roadGrip=1;isDrifting=drifting;
   driftState=drifting?'drift':'grip';
   driftAngle=0;slipAngle=0;motionDirection=1;
   stepArcadeMotion(1/60,curve,true,false);
   return {speed,playerX,lateralVelocity,deltaSpeed:initialSpeed-speed};
 };
 const reference=[0,.45,1.3,2.4,4.8].map(curve=>[curve,v52SafeCornerSpeed(curve)]);
 const signedPush=[
   v52OverspeedPush(250,2.4),
   v52OverspeedPush(250,-2.4),
   v52OverspeedPush(190,2.4),
   v52OverspeedPush(260,3.6),
   v52OverspeedPush(285,3.6),
   v52OverspeedPush(1000,3.6)
 ];
 const straight=measure(0,250),cruiseBend=measure(1.3,220),
       grip=measure(2.4,250),drift=measure(2.4,250,true);
 // Show exact live speed excess in the existing HUD without extra overlays.
 speed=250;playerZ=200*SEGMENT_LENGTH;isDrifting=false;
 for(const seg of segments)seg.curve=2.4;
 updateDrivingHUD();
 const caution=document.getElementById('corner-speed').textContent;
 speed=210;updateDrivingHUD();
 const nearLimit=document.getElementById('corner-speed').textContent;
 speed=190;updateDrivingHUD();
 const normal=document.getElementById('corner-speed').textContent;
 return JSON.stringify({version:COMPETITION.version,reference,signedPush,straight,
  cruiseBend,grip,drift,caution,nearLimit,normal,
  bestKey:bestRecordKey(),boardKey:arcadeBoardKey()});
})()`));
assert.equal(state.version,'87.0','physical tuning isolates competitive records');
for(const key of ['bestKey','boardKey'])
 assert(state[key].endsWith(':87.0'),key+' must isolate previous records');
assert.equal(state.reference[0][1],278,'straight speed recommendation unchanged');
assert.equal(state.reference[1][1],278-.45*34);
assert.equal(state.reference[2][1],278-1.3*34);
assert(state.reference[3][1]>190&&state.reference[3][1]<200,'tight corner demands sensible entry speed');
assert.equal(state.reference[4][1],120,'extreme curves respect minimum safe speed');
assert(state.signedPush[0]>.10&&state.signedPush[0]<.17,'overspeed push is material but bounded');
assert(Math.abs(state.signedPush[0]+state.signedPush[1])<1e-10,'left/right symmetric');
assert.equal(state.signedPush[2],0,'below safe speed no added understeer');
assert(state.signedPush[4]>state.signedPush[3],'higher hairpin speed must worsen outward push');
assert(state.signedPush[5]<.28,'extreme hairpin understeer retains a strict soft cap');
assert(Math.abs(state.straight.deltaSpeed)<1e-9,'no arbitrary straight-line speed cap');
assert(Math.abs(state.cruiseBend.deltaSpeed)<1e-9,'moderate-speed corner stays accessible');
assert(state.grip.deltaSpeed>.40&&state.grip.deltaSpeed<1,'fast tight grip turn has speed penalty');
assert(state.drift.deltaSpeed<.04,'drift retains characteristic speed through bends');
assert(state.grip.deltaSpeed>state.drift.deltaSpeed*10,'player can earn better exit speed by controlled drifting');
assert(state.grip.lateralVelocity<-.025,'high-speed understeer pushes outside the curve');
assert(state.caution.includes('超速 +')&&state.caution.includes('推頭'),'HUD exposes speed error');
assert(state.nearLimit.includes('接近極限'),'HUD distinguishes near limit');
assert(state.normal.includes('保持路線'),'HUD gives controlled-entry feedback');
console.log('V60: ranked rule isolation, speed thresholds, signed grip push, drift reward and HUD warnings passed');
