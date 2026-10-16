'use strict';
// Stage40: runtime VM checks for a distinct clean-room CHAIN6 profile.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const html=path.resolve(__dirname,'../index.html');
const run=(profile,script)=>load(html,{search:'?handling=v59&drift='+profile}).run(script);
function read(profile,script){return JSON.parse(run(profile,script));}

const cfg=read('chain6',`JSON.stringify({
 enabled:v59Arcade6,parent:v59Arcade5&&v59Arcade4&&v59Arcade3&&v59Chain2,
 suffix:handlingRecordSuffix59(),board:arcadeBoardKey(),
 early:v59Arcade6Charge(16,185,.8,.14,false),
 late:v59Arcade6Charge(16,185,.8,.90,false),
 shallow:v59Arcade6Charge(5,185,.8,.9,false),
 deep:v59Arcade6Charge(20,185,.8,.9,false),
 transfer:v59Arcade6Charge(16,185,.8,.90,true),
 older:v59Arcade4Charge(16,185,.8,.14,false)
})`);
assert(cfg.enabled&&cfg.parent&&cfg.suffix===':H59.6'&&cfg.board.endsWith(':H59.6'),'CHAIN6 is opt-in with its own record key');
assert(cfg.early>0&&cfg.early<cfg.late*.70,'brief drift charges less than settled long drift');
assert(cfg.deep>cfg.shallow*3,'large slide charges much more than small slide');
assert(cfg.transfer<cfg.late*.8,'direction handoff cannot multiply charge');
assert(cfg.early<cfg.older,'CHAIN6 prevents short-tap farming vs CHAIN4');
for(const older of ['chain2','chain3','chain4','chain5']){
 const state=read(older,'JSON.stringify({on:v59Arcade6,suffix:handlingRecordSuffix59()})');
 assert(!state.on&&!state.suffix.endsWith('.6'),'old profile must remain isolated: '+older);
}

function exit(profile,brake=false,grip=1,speedNow=185,peak=17,age=.62){
 return read(profile,[
  "(()=>{v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();",
  "gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;",
  "isDrifting=true;driftState='recover';driftDirection=1;driftAge=.95;",
  "speed="+speedNow+";currentGear='HIGH';roadGrip="+grip+";driftAngle=0;slipAngle=0;steer=0;",
  "cleanDriftTime="+age+";v59Arcade4PeakSlip="+peak+";",
  "stepCountersteerDrift59(1/60,"+brake+",true,0,.7);",
  "return JSON.stringify({state:driftState,drifting:isDrifting,regrip:v59Arcade6Regrip,exit:v59Arcade4ExitTimer,moment:momentBoostWindow});})()"
 ].join('\n'));
}
const good=exit('chain6');
assert(!good.drifting&&good.state==='grip'&&good.regrip>.24&&good.exit>0,
 'clean drift exit must start short physical regrip without losing earned recovery');
assert.equal(exit('chain6',true).regrip,0,'braking cannot coast through the recovery buffer');
assert.equal(exit('chain6',false,.6).regrip,0,'off-road must bypass extra gliding');
assert.equal(exit('chain6',false,1,75).regrip,0,'low-speed exit must regain normal traction');
assert.equal(exit('chain5').regrip,0,'CHAIN5 must keep its original direct grip recovery');
assert(exit('chain6').moment>0,'long clean drift may arm original non-nitro moment window');
assert.equal(exit('chain6',false,1,185,5).moment,0,'shallow drift cannot farm moment acceleration');
assert.equal(exit('chain6',false,1,185,17,.31).moment,0,'sub-0.4s drift cannot farm moment acceleration');
assert(exit('chain5',false,1,185,5).moment>0,'CHAIN5 original bonus threshold remains untouched');

function impulse(profile,fps,side,condition='clean'){
 return read(profile,[
  "(()=>{v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();",
  "speed=185;currentGear='HIGH';playerX=0;steer=0;driftAngle=0;slipAngle=0;",
  "isDrifting=false;driftState='grip';roadGrip="+(condition==='road'?.62:1)+";",
  "lateralVelocity="+side+"*.64;v59Arcade6Regrip=.29;",
  "const before=lateralVelocity;const series=[];",
  "for(let i=0;i<"+Math.round(fps*.40)+";i++){",
  "stepArcadeMotionChain3(1/"+fps+",0,true,"+(condition==='brake')+");",
  "series.push({v:lateralVelocity,x:playerX,t:v59Arcade6Regrip});}",
  "return JSON.stringify({before,first:series[0],last:series.at(-1),series});})()"
 ].join('\n'));
}
for(const fps of [30,60,120])for(const side of [-1,1]){
 const next=impulse('chain6',fps,side),legacy=impulse('chain5',fps,side);
 assert(Math.sign(next.first.v)===side&&Math.sign(next.first.x)===side,'no instant direction reversal on regrip');
 assert(Math.abs(next.first.v)>Math.abs(legacy.first.v)*1.10,'CHAIN6 must retain physical lateral momentum briefly');
 assert(Math.abs(next.last.v)<.01,'regrip should settle to stable straight driving');
 assert.equal(next.last.t,0,'regrip timer expires deterministically');
 assert(next.series.every(x=>Number.isFinite(x.v)&&Number.isFinite(x.x)&&x.t>=0),'finite stable motion');
 const brake=impulse('chain6',fps,side,'brake');
 const offroad=impulse('chain6',fps,side,'road');
 assert(brake.first.t===0&&offroad.first.t===0,'brake and off-road must remove transitional grip immediately');
 assert(Math.abs(brake.first.v)<Math.abs(next.first.v),'braking regains traction quicker than coasting exit');
}
console.log('CHAIN6 regrip PASS: separate profile, shallow/deep/time charge, no handoff farming, 30/60/120Hz lateral recovery, brake/offroad gate');
