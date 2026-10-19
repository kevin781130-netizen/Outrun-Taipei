'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const game=require('./canvas-harness.cjs').load(path.join(__dirname,'../index.html'));
const factory=require('./fixtures/v92-drift-command.cjs');
const data=JSON.parse(game.run(`(()=>{
 const modern=v90DriftCommand,legacy=(${factory.toString()})();
 function run(kmh,side,hz,input,drift,pulse=false,old=false){
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
  traffic=[];timeLeft=9999;collisionCooldown=100;speed=kmh;playerX=0;playerZ=180*SEGMENT_LENGTH;
  currentGear='HIGH';driveGear='D';motionDirection=1;roadGrip=1;
  for(const k of Object.keys(keys))keys[k]=false;
  for(const seg of segments)seg.curve=side*1.2;
  isDrifting=drift;driftState=drift?'drift':'grip';driftDirection=drift?side:0;driftAge=1;
  steer=side*input;driftAngle=drift?side*28:0;slipAngle=drift?side*12:0;
  keys.KeyW=true;gamepadInput.steer=side*input;
  const rows=[];v90DriftCommand=old?legacy:modern;
  try{for(let i=0;i<(pulse?hz:hz/2);i++){
   if(pulse)gamepadInput.steer=i<hz*.4?side*input:i<hz*.6?0:-side*input;
   update(1/hz);rows.push({x:playerX,lv:lateralVelocity,yaw:driftAngle,slip:slipAngle,speed,state:driftState});
  }}finally{v90DriftCommand=modern;}
  if(pulse)return rows;
  return {x:playerX,lv:lateralVelocity,yaw:driftAngle,state:driftState};
 }
 const cases=[];
 for(const speed of [110,180,240])for(const side of [-1,1])for(const hz of [30,60,120])for(const input of [.3,.8,1])
  cases.push({speed,side,hz,input,grip:run(speed,side,hz,input,false),drift:run(speed,side,hz,input,true)});
 const pulses=[];
 for(const hz of [30,60,120])for(const side of [-1,1])pulses.push({hz,side,before:run(180,side,hz,.8,true,true,true),after:run(180,side,hz,.8,true,true)});
 const routes=[];
 for(let l=0;l<5;l++)for(let c=0;c<STAGES[l].length;c++)routes.push({l,c,r:routeLayout(l,c),budget:stageTimeBudget(l,c)});
 speed=180;isDrifting=true;driftState='drift';driftDirection=1;driftAge=1;
 const zero=v90DriftCommand(0,.4),counter=v90DriftCommand(-.8,.4),oldCounter=v84DriftCommand(-.8,.4);
 driftState='recover';const recovery=v90DriftCommand(.8,.4),oldRecovery=v84DriftCommand(.8,.4);
 return JSON.stringify({cases,pulses,routes,zero,counter,oldCounter,recovery,oldRecovery,world:WORLD_SPEED,transition:TRANSITION_LENGTH});
})()`));
for(const p of data.pulses){
 for(let i=0;i<p.after.length;i++){
  const a=p.after[i],b=p.before[i];
  assert(Math.abs(a.x)<.5&&Number.isFinite(a.lv));
  for(const key of ['yaw','slip','speed','state'])assert.equal(a[key],b[key],'pose and speed rules preserved');
 }
 const start=p.after[Math.ceil(p.hz*.4)-1],release=p.after[Math.ceil(p.hz*.6)-1];
 assert(release.lv*p.side<start.lv*p.side,'release reduces inward carry');
 assert(p.after.at(-1).lv*p.side<0,'countersteer actually changes lateral direction');
}
for(const c of data.cases){
 const ratio=c.drift.x/c.grip.x;
 assert(ratio>1.03&&ratio<1.28,`whole drift/grip ${JSON.stringify(c)} ratio ${ratio}`);
 assert(Math.abs(c.drift.x)<.5,'half-second full-lock dodge remains inside half a road unit');
 const mirror=data.cases.find(m=>m.speed===c.speed&&m.side===-c.side&&m.hz===c.hz&&m.input===c.input);
 assert(Math.abs(c.drift.x+mirror.drift.x)<1e-9);
}
assert.equal(data.zero,0);assert.equal(data.counter,data.oldCounter);assert.equal(data.recovery,data.oldRecovery);
assert(Math.abs(data.world/18-1.15)<1e-12);assert.equal(data.transition,184);
for(const {l,c,r,budget} of data.routes){
 const extra=Math.round(980*(.12+.22*l+.04*c));
 for(const [key,start] of [['FORK_WARN',520],['FORK_START',580],['FORK_LOCK',780],['STAGE_END',880]])assert.equal(r[key],Math.round((start+extra)*1.15));
 const oldEnd=l===4?880+extra+160:880+extra+160;
 const oldBudget=Math.ceil(oldEnd*200/(222*18))+14;
 assert(Math.abs(budget-oldBudget)<=1,'route and world pace retain constant-speed time budget');
 assert(r.FORK_WARN<r.FORK_START&&r.FORK_START<r.FORK_LOCK&&r.FORK_LOCK<r.STAGE_END&&r.STAGE_END<r.STAGE_SWITCH);
}
console.log('V93: 54 matched actual-update drift/grip comparisons, mirrored 30/60/120Hz, neutral/counter/recovery and all stretched route timelines passed.');
console.log(JSON.stringify(data.cases.filter(c=>c.speed===180&&c.side===1&&c.input===.8)));
