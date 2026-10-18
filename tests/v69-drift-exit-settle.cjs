'use strict';
// V69: neutral-input post-drift settle never grabs the car mid-S-bend.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const v=JSON.parse(game.run(`(()=>{
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  const prime=(side=1)=>{
    v69ResetSettle();speed=170;driveGear='D';motionDirection=1;
    roadGrip=1;isDrifting=false;driftState='grip';steer=0;
    playerX=0;playerZ=210*SEGMENT_LENGTH;
    lateralVelocity=side*.85;driftAngle=side*.5;slipAngle=side*.2;yawRate=side*30;
    v69ArmExitSettle();
  };
  prime();
  const before={lv:lateralVelocity,yaw:yawRate,time:v69ExitTime};
  const removed=v69ExitSettle(1/60,.20,0);
  const after={lv:lateralVelocity,yaw:yawRate,time:v69ExitTime};
  prime(-1);
  const mirrorRemoved=v69ExitSettle(1/60,-.20,0),mirrorVelocity=lateralVelocity,mirrorYaw=yawRate;
  const blocked=[];
  const probe=(name,setup,dt=1/60,desired=.2,command=0)=>{
    prime();setup();const orig={lv:lateralVelocity,yaw:yawRate,time:v69ExitTime};
    const effect=v69ExitSettle(dt,desired,command);
    blocked.push({name,orig,effect,lv:lateralVelocity,yaw:yawRate,time:v69ExitTime});
  };
  probe('turn-to-next-bend',()=>{steer=-.6},1/60,.20,-.6);
  probe('drift-active',()=>{isDrifting=true;driftState='drift'});
  probe('recover-active',()=>{isDrifting=true;driftState='recover'});
  probe('offroad',()=>{roadGrip=.4});
  probe('reversing',()=>{motionDirection=-1});
  probe('slow',()=>{speed=30});
  probe('pause',()=>{},0);
  probe('invalid-dt',()=>{},-1);
  probe('nan-command',()=>{},1/60,.2,NaN);
  prime();
  const step=(disabled,side=1)=>{
    prime(side);
    const original=v69ExitSettle;
    if(disabled)v69ExitSettle=()=>0;
    try{
      stepArcadeMotion(1/60,0,true,false);
      return {x:playerX,velocity:lateralVelocity,yaw:yawRate,score,
        nitro,nitroStock,speed};
    }finally{v69ExitSettle=original;}
  };
  const live=step(false),control=step(true);
  const liveLeft=step(false,-1);
  prime();
  for(let i=0;i<30;i++)v69ExitSettle(1/60,0,0);
  const expired={time:v69ExitTime,lv:lateralVelocity,yaw:yawRate};
  prime();setStage(0,0,false);
  const stage={time:v69ExitTime,drifting:isDrifting};
  prime();resetGame();
  const newRun={time:v69ExitTime,drifting:isDrifting};
  // The settle window must be armed from a legitimate recover->grip finish.
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  roadGrip=1;speed=170;isDrifting=true;driftState='recover';
  driftDirection=1;driftAge=0.45;driftAngle=.1;slipAngle=.05;
  steer=0;playerZ=180*SEGMENT_LENGTH;
  stepBrakeDrift(1/60,false,true,0,1);
  const natural={time:v69ExitTime,state:driftState,drifting:isDrifting};
  return JSON.stringify({rules:COMPETITION.version,key:bestRecordKey(),
    before,removed,after,mirrorRemoved,mirrorVelocity,mirrorYaw,
    blocked,live,control,liveLeft,expired,stage,newRun,natural});
})()`));
assert.equal(v.rules,'90.0');
assert(v.key.endsWith(':90.0'));
assert.equal(v.before.time,.42);
assert(v.removed>0&&v.removed<.15,'gentle physical correction, no snap');
assert(v.after.lv>.2&&v.after.lv<.85);
assert(v.after.yaw>0&&v.after.yaw<v.before.yaw);
assert(v.after.time<v.before.time);
assert(Math.abs(v.removed-v.mirrorRemoved)<1e-12,'symmetrical recovery magnitude');
assert(Math.abs(v.after.lv+v.mirrorVelocity)<1e-12);
assert(Math.abs(v.after.yaw+v.mirrorYaw)<1e-12);
for(const x of v.blocked){
  assert.equal(x.effect,0,x.name+' must never intervene');
  assert.equal(x.lv,x.orig.lv,x.name+' must preserve car inertia');
  assert.equal(x.yaw,x.orig.yaw,x.name+' must preserve chassis yaw');
}
assert.equal(v.blocked.find(x=>x.name==='pause').time,.42,'pause freezes settle window');
assert.equal(v.expired.time,0);
assert(v.live.velocity<v.control.velocity&&v.live.velocity>0,
  'actual vehicle dynamics react to residual settle');
assert(v.live.x<v.control.x&&v.live.x>0,'car follows real lateral velocity not visual snap');
assert(Math.abs(v.live.velocity+v.liveLeft.velocity)<1e-10,'left/right car control symmetry');
assert.equal(v.live.speed,v.control.speed,'no artificial brakes or acceleration');
assert.equal(v.live.score,v.control.score);
assert.equal(v.live.nitro,v.control.nitro);
assert.equal(v.live.nitroStock,v.control.nitroStock);
assert.deepEqual(v.stage,{time:0,drifting:false});
assert.deepEqual(v.newRun,{time:0,drifting:false});
assert.equal(v.natural.state,'grip');
assert.equal(v.natural.drifting,false);
assert.equal(v.natural.time,.42,'arm only upon legitimate final drift recovery frame');
console.log('V69: post-drift 60Hz stabilizer, no auto rail, next bend preserved, mirrored dynamics, natural exit, reset and timing passed');
