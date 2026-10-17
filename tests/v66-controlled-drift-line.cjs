'use strict';
// V66 evidence-driven input/frame replay. The historical Stage36 package
// supplied useful event/replay methodology, NOT a verified physics formula.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const output=JSON.parse(game.run(`(()=>{
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  const math=(curve,turn,grip=1,drifting=true)=>{
    resetGame();
    speed=180;playerZ=200*SEGMENT_LENGTH;playerX=0;steer=turn;
    roadGrip=grip;isDrifting=drifting;driftState=drifting?'drift':'grip';
    driftAngle=drifting?Math.sign(curve)*28:0;
    slipAngle=drifting?Math.sign(curve)*12:0;
    lateralVelocity=0;
    const bite=v66DriftLineBite(steer,curve,grip);
    stepArcadeMotion(1/60,curve,true,false);
    return {curve,steer:steer,bite,dx:playerX,lateral:lateralVelocity,
      speed,nitro,nitroStock};
  };
  const inRight=math(2.4,.9),inLeft=math(-2.4,-.9);
  const release=math(2.4,0),counter=math(2.4,-.8);
  const poorGrip=math(2.4,.9,.5),grip=math(2.4,.9,1,false);
  const shallow=math(.1,.9),straight=math(0,.9);
  const visual=(yaw,slip,curve)=>{
    resetGame();isDrifting=true;driftState='drift';driftDirection=Math.sign(yaw);
    driftAngle=yaw;slipAngle=slip;
    const out=v51DriftVisualPose(curve);
    return {yaw:out.yaw,offset:out.offsetX,shadow:out.shadowX,cap:out.curveCap};
  };
  const poseRight=visual(30,15,2.4),poseLeft=visual(-30,-15,-2.4);
  const preReplay=()=>{
    v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
    gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
    traffic=[];timeLeft=9999;collisionCooldown=100;
    playerX=0;playerZ=180*SEGMENT_LENGTH;speed=165;currentGear='HIGH';
    driveGear='D';motionDirection=1;roadGrip=1;
    for(const seg of segments)seg.curve=1.15;
  };
  // Deterministic input snapshots, sampled at the arcade-like 60Hz tick.
  const run=side=>{
    preReplay();
    const snapshots=[],dt=1/60;
    for(let frame=0;frame<90;frame++){
      keys.KeyW=true;keys.KeyS=false;keys.ShiftLeft=frame===0;
      const turn=frame<40?side:frame<53?-side:0;
      keys.ArrowRight=turn>0;keys.ArrowLeft=turn<0;
      const curve=side*1.15;
      for(const seg of segments)seg.curve=curve;
      update(dt);
      snapshots.push({frame,state:driftState,x:playerX,lv:lateralVelocity,
        yaw:driftAngle,slip:slipAngle,speed,visual:v51DriftVisualYaw()});
    }
    return snapshots;
  };
  const framesR=run(1),framesL=run(-1);
  return JSON.stringify({rules:COMPETITION.version,key:bestRecordKey(),
    inRight,inLeft,release,counter,poorGrip,grip,shallow,straight,
    poseRight,poseLeft,framesR,framesL});
})()`));
assert.equal(output.rules,'61.0','physical handling revision must segregate old records');
assert(output.key.endsWith(':61.0'));
assert(output.inRight.bite>0&&output.inRight.bite<=.18);
assert.equal(output.inLeft.bite,-output.inRight.bite,'mirrored corner steering gives equal inward bite');
assert(output.inRight.lateral>0&&output.inLeft.lateral<0,
 'drift must follow intended corner when player turns into it');
assert(Math.abs(output.inRight.dx+output.inLeft.dx)<1e-9,
 '60Hz step in opposite bends must remain left/right symmetric');
assert.equal(output.release.bite,0,'no automatic inward steering on neutral input');
assert.equal(output.counter.bite,0,'countersteer must cancel added corner assistance');
assert.equal(output.poorGrip.bite,0,'offroad cannot earn inward corner bite');
assert.equal(output.grip.bite,0,'grip steering uses unchanged V60 motion');
assert.equal(output.shallow.bite,0);
assert.equal(output.straight.bite,0);
assert(output.inRight.speed>175,'inward assistance must not alter speed cap');
assert.equal(output.inRight.nitro,0);assert.equal(output.inRight.nitroStock,0);
const oldYaw=30*1.18+15*.72;
assert(output.poseRight.yaw<oldYaw-5,'visual should stop double-counting sideways slip');
assert(output.poseRight.yaw>25,'the car still has visible yaw/rear swing');
assert(Math.abs(output.poseRight.offset)<2.4,'entire car must not jump outward in screen space');
for(const key of ['yaw','offset','shadow'])
 assert(Math.abs(output.poseRight[key]+output.poseLeft[key])<1e-9,
  'visual pose left/right symmetry for '+key);
assert.equal(output.framesR.length,90);assert.equal(output.framesL.length,90);
assert(output.framesR.some(x=>x.state==='entry')&&output.framesR.some(x=>x.state==='drift'),
 'recorded frames must enter drift');
assert(output.framesR.some(x=>x.state==='recover'),
 'countersteering must recover chassis yaw');
assert(output.framesL.some(x=>x.state==='recover'));
assert(output.framesR.every(x=>Object.values(x).every(v=>typeof v!=='number'||Number.isFinite(v))));
assert(output.framesL.every(x=>Object.values(x).every(v=>typeof v!=='number'||Number.isFinite(v))));
console.log('V66: 60 Hz right/left/countersteer snapshots, true inward command, visual rear swing and rollback isolation passed');
