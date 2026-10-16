'use strict';
// Distinct CHAIN3 arcade tuning: verified against actual game VM, not ROM formulas.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const html=path.resolve(__dirname,'../index.html');
const run=(search,script)=>load(html,{search}).run(script);
const arcade='?handling=v59&drift=chain3';
const info=JSON.parse(run(arcade,'JSON.stringify({enabled:v59Arcade3,chained:v59Chain2,record:bestRecordKey(),board:arcadeBoardKey(),shallow:v59Arcade3Charge(5,185,.8),medium:v59Arcade3Charge(11,185,.8),deep:v59Arcade3Charge(20,185,.8),straight:v59Arcade3CornerSafe(0),corner:v59Arcade3CornerSafe(2.3),throttleHigh:v59Arcade3Thrust(290),throttleLow:v59Arcade3Thrust(160),dragOver:v59Arcade3SpeedDrag(300,false),dragBoost:v59Arcade3SpeedDrag(300,true)})'));
assert(info.enabled&&info.chained,'CHAIN3 includes continuous CHAIN2 drift');
assert(info.record.endsWith(':H59.3')&&info.board.endsWith(':H59.3'),'separate CHAIN3 records');
assert(info.shallow>0&&info.shallow<info.medium&&info.medium<info.deep,'slip angle scales charge');
assert(info.deep>info.shallow*2,'big slide charges substantially more than mini drift');
assert(info.straight-info.corner>65,'tight bends must demand speed adjustment');
assert(info.throttleHigh===0&&info.throttleLow>0&&info.dragOver>info.dragBoost,'300 cannot be cruising speed');
for(const search of ['', '?handling=v59','?handling=v59&drift=chain2']){
 const baseline=JSON.parse(run(search,'JSON.stringify({active:v59Arcade3,key:bestRecordKey()})'));
 assert(!baseline.active&&!baseline.key.endsWith(':H59.3'),'original handling must remain isolated');
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
console.log('CHAIN3 kart loop PASS: no gears, slip-scaled mini/deep charge, 30/60/120Hz sideways motion and corner-speed checks');
