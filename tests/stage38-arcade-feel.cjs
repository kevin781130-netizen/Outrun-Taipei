'use strict';
// Distinct CHAIN4 arcade tuning: verified against actual game VM, not ROM formulas.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const html=path.resolve(__dirname,'../index.html');
const run=(search,script)=>load(html,{search}).run(script);
const arcade='?handling=v59&drift=chain4';
const info=JSON.parse(run(arcade,'JSON.stringify({enabled:v59Arcade3,chained:v59Chain2,record:bestRecordKey(),board:arcadeBoardKey(),shallow:v59Arcade3Charge(5,185,.8),medium:v59Arcade3Charge(11,185,.8),deep:v59Arcade3Charge(20,185,.8),straight:v59Arcade3CornerSafe(0),corner:v59Arcade3CornerSafe(2.3),throttleHigh:v59Arcade3Thrust(290),throttleLow:v59Arcade3Thrust(160),dragOver:v59Arcade3SpeedDrag(300,false),dragBoost:v59Arcade3SpeedDrag(300,true)})'));
assert(info.enabled&&info.chained,'CHAIN4 includes continuous CHAIN2 drift');
assert(info.record.endsWith(':H59.4')&&info.board.endsWith(':H59.4'),'separate CHAIN4 records');
assert(info.shallow>0&&info.shallow<info.medium&&info.medium<info.deep,'slip angle scales charge');
assert(info.deep>info.shallow*2,'big slide charges substantially more than mini drift');
assert(info.straight-info.corner>65,'tight bends must demand speed adjustment');
assert(info.throttleHigh===0&&info.throttleLow>0&&info.dragOver>info.dragBoost,'300 cannot be cruising speed');
for(const search of ['', '?handling=v59','?handling=v59&drift=chain2']){
 const baseline=JSON.parse(run(search,'JSON.stringify({active:v59Arcade3,key:bestRecordKey()})'));
 assert(!baseline.active&&!baseline.key.endsWith(':H59.4'),'original handling must remain isolated');
}
for(const fps of [30,60,120])for(const side of [-1,1]){
 const code=[
  "(()=>{v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();",
  "gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;",
  "crashSequence=null;traffic=[];timeLeft=9999;collisionCooldown=9999;",
  "keys.KeyW=true;keys.KeyZ=true;keys.KeyA=true;",
  "gearInputEvents=[{gear:'R',at:performance.now()}];processGearInputs(1/"+fps+");",
  "const gear={drive:driveGear,transmission:currentGear,direction:motionDirection};",
  "toggleGear();const stillHigh=currentGear==='HIGH';",
  "speed=180;driftAngle=30*"+side+";slipAngle=20*"+side+";steer=0;",
  "isDrifting=true;driftState='drift';driftDirection="+side+";roadGrip=1;",
  "playerX=0;lateralVelocity=0;",
  "for(let i=0;i<"+fps+";i++)stepArcadeMotionChain3(1/"+fps+","+side+"*.35,true,false);",
  "return JSON.stringify({gear,stillHigh,x:playerX,velocity:lateralVelocity,speed});})()"
 ].join('\n');
 const sample=JSON.parse(run(arcade,code));
 assert.equal(sample.gear.drive,'D','reverse input disabled');
 assert.equal(sample.gear.direction,1,'forward-only arcade loop');
 assert.equal(sample.gear.transmission,'HIGH','no LOW/HIGH shifting');
 assert(sample.stillHigh,'shift button must be inert');
 assert(Math.sign(sample.x)===side&&Math.abs(sample.x)>.12,
    'skid must physically move sideways: '+JSON.stringify({fps,side,sample}));
 assert(sample.speed<180&&sample.speed>130,'long drift costs speed without instant stall');
}
const speeds=JSON.parse(run(arcade,[
 "(()=>{v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();",
 "gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;",
 "traffic=[];timeLeft=9999;collisionCooldown=9999;speed=300;currentGear='HIGH';",
 "keys.KeyW=true;keys.ShiftLeft=false;keys.KeyN=false;",
 "const samples=[];for(let i=0;i<240;i++){update(1/60);if(i%60===59)samples.push(speed);}",
 "return JSON.stringify(samples);})()"
].join('\n')));
assert(speeds.every(Number.isFinite)&&speeds[0]<300&&speeds[3]<275,
 '300 must bleed down on straight without nitro: '+JSON.stringify(speeds));
const bend=JSON.parse(run(arcade,[
 "(()=>{speed=280;playerX=0;lateralVelocity=0;isDrifting=false;steer=0;driftAngle=0;slipAngle=0;",
 "stepArcadeMotionChain3(1,2.2,true,false);const hard=speed;",
 "speed=280;playerX=0;lateralVelocity=0;stepArcadeMotionChain3(1,0,true,false);",
 "return JSON.stringify({hard,straight:speed});})()"
].join('\n')));
assert(bend.hard<bend.straight-40,
 'high-speed corner must cost substantial speed: '+JSON.stringify(bend));

const quality=JSON.parse(run(arcade,'JSON.stringify({preview:v59Arcade4,chain:v59Chain2,mini:v59Arcade4Charge(5,185,.9,.2,false),deep:v59Arcade4Charge(21,185,.9,1.1,false),holdShort:v59Arcade4Charge(15,185,.9,.2,false),holdLong:v59Arcade4Charge(15,185,.9,1.1,false),preparing:v59Arcade4Charge(15,185,.9,1.1,true),chargeNoSlip:v59Arcade4Charge(0,185,.9,1.1,false),suffix:handlingRecordSuffix59()})'));
assert(quality.preview&&quality.chain&&quality.suffix===':H59.4','CHAIN4 opt-in and score isolation');
assert(quality.deep>quality.mini*3,'long deep slide must reward more than a mini drift');
assert(quality.holdLong>quality.holdShort,'sustained drift must reward control');
assert(quality.preparing<quality.holdLong,'chain handoff must not farm extra charge');
const exitCase=(peak,age,braking)=>JSON.parse(run(arcade,[
 "(()=>{v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();",
 "gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;",
 "traffic=[];collisionCooldown=100;timeLeft=9999;speed=185;currentGear='HIGH';",
 "roadGrip=1;driftAngle=0;slipAngle=0;isDrifting=true;driftState='recover';driftDirection=1;",
 "cleanDriftTime="+age+";driftAge=1.2;v59Arcade4PeakSlip="+peak+";",
 "stepCountersteerDrift59(1/60,"+braking+",true,0,.8);",
 "return JSON.stringify({timer:v59Arcade4ExitTimer,active:isDrifting,record:bestRecordKey()});})()"
].join('\n')));
assert(exitCase(16,.7,false).timer>0&&!exitCase(16,.7,false).active,'qualified drift grants short exit recovery');
assert(exitCase(6,.7,false).timer===0,'weak slide cannot farm recovery');
assert(exitCase(16,.1,false).timer===0,'too-short drift cannot farm recovery');
assert(exitCase(16,.7,true).timer===0,'braking drift cannot earn recovery');
const powered=(exitTimer,boosted)=>JSON.parse(run(arcade,[
 "(()=>{v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();",
 "gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;",
 "traffic=[];collisionCooldown=999;timeLeft=9999;speed=185;currentGear='HIGH';",
 "playerX=0;playerZ=180*SEGMENT_LENGTH;roadGrip=1;keys.KeyW=true;",
 "v59Arcade4ExitTimer="+exitTimer+";boostRemaining="+(boosted?1:0)+";",
 "for(let i=0;i<18;i++)update(1/60);",
 "return JSON.stringify({speed,active:v59Arcade4ExitTimer,boost:boosting});})()"
].join('\n')));
const baseExit=powered(0,false),earnedExit=powered(.48,false);
assert(earnedExit.speed>baseExit.speed+2,'earned recovery must be tangible');
assert(earnedExit.speed<baseExit.speed+12,'earned recovery must be bounded, not a free nitro');
const baseBoost=powered(0,true),stackBoost=powered(.48,true);
assert(Math.abs(baseBoost.speed-stackBoost.speed)<1e-6,'cannot stack earned acceleration with nitro');
for(const fps of [30,60,120])for(const side of [-1,1]){
 const movement=JSON.parse(run(arcade,[
  "(()=>{v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();",
  "speed=190;currentGear='HIGH';playerX=0;driftAngle="+(side*28)+";slipAngle="+(side*18)+";",
  "driftDirection="+side+";driftState='drift';isDrifting=true;steer=0;roadGrip=1;lateralVelocity="+(side*.65)+";",
  "const start=lateralVelocity;",
  "stepArcadeMotionChain3(1/"+fps+","+(-side*.5)+",true,false);",
  "return JSON.stringify({start,after:lateralVelocity,x:playerX,speed});})()"
 ].join('\n')));
 assert(Math.sign(movement.after)===side,'short opposite curve should preserve skid inertia before reversing');
 assert(Math.abs(movement.after)<=V59_ARCADE4.lateralCap+1e-8,'skid speed must be bounded');
}
console.log('CHAIN4 tuned physics PASS: earned limited exit speed, non-stackable nitro, larger controlled charge, 30/60/120Hz momentum');
