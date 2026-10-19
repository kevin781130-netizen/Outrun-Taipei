'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const game=require('./canvas-harness.cjs').load(path.join(__dirname,'../index.html'));
const data=JSON.parse(game.run(`(()=>{
 const modern=v94FineSteeringGain;
 function run({drift,side,hz,input,speedNow=180,tap=false},old){
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
  traffic=[];timeLeft=9999;collisionCooldown=100;speed=speedNow;playerX=0;playerZ=180*SEGMENT_LENGTH;
  currentGear='HIGH';driveGear='D';motionDirection=1;roadGrip=1;
  for(const key of Object.keys(keys))keys[key]=false;gamepadInput.steer=0;
  for(const seg of segments)seg.curve=side*1.2;
  isDrifting=drift;driftState=drift?'drift':'grip';driftDirection=drift?side:0;driftAge=1;
  steer=tap?0:side*input;driftAngle=drift?side*28:0;slipAngle=drift?side*12:0;
  keys.KeyW=true;v94FineSteeringGain=old?()=>1:modern;
  const rows=[];
  try{for(let i=0;i<hz/2;i++){
   if(tap){keys.ArrowLeft=side<0&&i<hz*.05;keys.ArrowRight=side>0&&i<hz*.05;}
   else gamepadInput.steer=side*input;
   update(1/hz);rows.push({x:playerX,lv:lateralVelocity,steer,yaw:driftAngle,slip:slipAngle,speed,state:driftState});
  }}finally{v94FineSteeringGain=modern;gamepadInput.steer=0;}
  return rows;
 }
 const cases=[];
 for(const drift of [false,true])for(const side of [-1,1])for(const hz of [30,60,120])for(const input of [.2,.5,.8,1])for(const speedNow of [180,240]){
  const c={drift,side,hz,input,speedNow};cases.push({...c,before:run(c,true),after:run(c,false)});
 }
 const taps=[];
 for(const drift of [false,true])for(const side of [-1,1])for(const hz of [60,120]){
  const c={drift,side,hz,input:1,tap:true};taps.push({...c,before:run(c,true),after:run(c,false)});
 }
 const gains=[];isDrifting=false;
 for(const input of [0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1])gains.push({input,gain:modern(input)});
 isDrifting=true;driftState='drift';driftDirection=1;
 const counter=modern(-.2);driftState='recover';const recovery=modern(.2);
 return JSON.stringify({cases,taps,gains,counter,recovery,version:COMPETITION.version});
})()`));
assert.equal(data.version,'94.0');assert.equal(data.counter,1);assert.equal(data.recovery,1);
for(let i=0;i<data.gains.length;i++){
 const {input,gain}=data.gains[i];assert(gain>=.85&&gain<=1);
 if(input<=.3)assert.equal(gain,.85);if(input>=.8)assert.equal(gain,1);
 if(i)assert(gain>=data.gains[i-1].gain);
}
for(const c of [...data.cases,...data.taps]){
 for(let i=0;i<c.after.length;i++){
  const a=c.after[i],b=c.before[i];
  for(const key of ['yaw','slip','steer','speed','state'])assert.equal(a[key],b[key],key+' law preserved');
  assert(Math.abs(a.x)<.5&&Number.isFinite(a.lv));
 }
 if(c.tap){assert(c.after[5].x*c.side<c.before[5].x*c.side,'50 ms keyboard tap is less aggressive');continue;}
 if(c.input>=.8)assert.deepEqual(c.after,c.before,'large correction remains identical to V93');
 else assert(c.after.at(-1).x*c.side<c.before.at(-1).x*c.side,'actual small-input inward displacement is lower');
 const mirror=data.cases.find(m=>m.drift===c.drift&&m.side===-c.side&&m.hz===c.hz&&m.input===c.input&&m.speedNow===c.speedNow);
 assert(Math.abs(c.after.at(-1).x+mirror.after.at(-1).x)<1e-9);
}
console.log('V94: 96 old/new actual-update comparisons, 8 keyboard taps, continuous fine-input attenuation, identical strong steering/pose/speed, counter/recovery preservation and mirrored 30/60/120Hz passed.');
console.log(JSON.stringify(data.cases.filter(c=>c.drift&&c.side===1&&c.hz===60&&c.speedNow===180).map(c=>({input:c.input,before:c.before.at(-1).x,after:c.after.at(-1).x}))));
