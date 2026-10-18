'use strict';
// V68: recovery dynamics converge to the player's desired lateral solution,
// not an auto-rail centreline. This is a deliberately bounded tuning change.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const data=JSON.parse(game.run(`(()=>{
 v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
 const prime=(side=1)=>{
   speed=175;driveGear='D';motionDirection=1;isDrifting=true;
   driftState='recover';roadGrip=1;slipAngle=side*2;driftAngle=side*5;
   lateralVelocity=side*.85;steer=side*.55;playerX=0;playerZ=200*SEGMENT_LENGTH;
 };
 prime();
 const old=lateralVelocity,small=v68RecoveryRegrip(1/60,.30);
 const near={before:old,after:lateralVelocity,reduced:small};
 prime(-1);
 const mirrorRemoved=v68RecoveryRegrip(1/60,-.30);
 const mirrorVelocity=lateralVelocity;
 prime();slipAngle=12;
 const highSlip=v68RecoveryRegrip(1/60,.30);
 const invalid=[];
 const probe=(label,setup,dt=1/60)=>{prime();setup();const orig=lateralVelocity;
   const gain=v68RecoveryRegrip(dt,.30);
   invalid.push({label,gain,old:orig,now:lateralVelocity});
 };
 probe('normal-drift',()=>{driftState='drift'});
 probe('grip',()=>{isDrifting=false;driftState='grip'});
 probe('offroad',()=>{roadGrip=.65});
 probe('reverse',()=>{motionDirection=-1});
 probe('pause',()=>{},0);
 probe('invalid-time',()=>{},-1);
 prime();const noSnap=v68RecoveryRegrip(1/60,-.6),
   noSnapVelocity=lateralVelocity;
 const integrate=(off)=>{
   prime();const fn=v68RecoveryRegrip;let target=null;
   v68RecoveryRegrip=(dt,desired)=>{target=desired;return off?0:fn(dt,desired)};
   try{stepArcadeMotion(1/60,2.4,true,false);
     return {velocity:lateralVelocity,x:playerX,speed,nitro,nitroStock,
       gap:Math.abs(lateralVelocity-target),target};
   }finally{v68RecoveryRegrip=fn;}
 };
 const enabled=integrate(false),disabled=integrate(true);
 prime();v68RecoveryRegrip(1/60,.30);setStage(0,0,false);
 const stage={velocity:lateralVelocity,drifting:isDrifting,state:driftState};
 prime();v68RecoveryRegrip(1/60,.30);resetGame();
 const reset={velocity:lateralVelocity,drifting:isDrifting,state:driftState};
 return JSON.stringify({version:COMPETITION.version,board:bestRecordKey(),
   near,mirrorRemoved,mirrorVelocity,highSlip,invalid,noSnap,noSnapVelocity,
   enabled,disabled,stage,reset});
})()`));
assert.equal(data.version,'82.0');
assert(data.board.endsWith(':82.0'),'new physical tuning must not share V67 leaderboard');
assert(data.near.reduced>0&&data.near.reduced<.15);
assert(data.near.after>0.3&&data.near.after<.85,'preserve direction & continuous inertia');
assert(Math.abs(data.mirrorRemoved-data.near.reduced)<1e-12,'right/left mirror catch strengths identical');
assert(Math.abs(data.mirrorVelocity+data.near.after)<1e-12,'right/left signed recovery symmetric');
assert(data.highSlip>0&&data.highSlip<data.near.reduced,'regrip grows smoothly as slide angle settles');
for(const item of data.invalid){
 assert.equal(item.gain,0,item.label+' must not enable V68 tire recovery');
 assert.equal(item.now,item.old,item.label+' changes motion without permission');
}
assert(data.noSnap>0&&data.noSnapVelocity>0,'can approach opposing target but not teleport or reverse in a single frame');
assert(data.enabled.gap<data.disabled.gap,'live motion converges to the driver/road target');
assert(data.enabled.x!==data.disabled.x,'the real physical driving line changes, not only the sprite');
assert.equal(data.enabled.speed,data.disabled.speed,'regrip cannot grant braking or acceleration');
assert.equal(data.enabled.nitro,data.disabled.nitro,'regrip cannot modify nitro');
assert.equal(data.enabled.nitroStock,data.disabled.nitroStock,'regrip cannot create stored nitro');
assert.deepEqual(data.stage,{velocity:0,drifting:false,state:'grip'});
assert.deepEqual(data.reset,{velocity:0,drifting:false,state:'grip'});
console.log('V68: gradual on-road recovery, asymmetry/mirror, dt safety, no auto rail, score and nitro independence passed');
