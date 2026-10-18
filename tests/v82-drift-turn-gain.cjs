'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const out=JSON.parse(game.run(`(()=>{
 const gain=v82DriftTurnGain;
 function run(side,kmh,bend,command,legacy=false,dt=1/60){
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
  traffic=[];timeLeft=9999;collisionCooldown=100;
  playerX=0;playerZ=180*SEGMENT_LENGTH;speed=kmh;currentGear='HIGH';
  driveGear='D';motionDirection=1;roadGrip=1;
  for(const seg of segments)seg.curve=side*bend;
  v82DriftTurnGain=legacy?()=>1:gain;
  const rows=[];
  try{for(let i=0;i<Math.round(.8/dt);i++){
   keys.KeyW=true;keys.KeyS=false;keys.ShiftLeft=i===0;
   keys.ArrowRight=side>0;keys.ArrowLeft=side<0;
   // Analogue input uses the same steering smoothing and update path.
   gamepadInput.steer=side*command;
   keys.ArrowRight=keys.ArrowLeft=false;
   update(dt);
   rows.push({x:playerX,lv:lateralVelocity,yaw:driftAngle,slip:slipAngle,
    state:driftState,speed,nitro,stock:nitroStock});
  }}finally{v82DriftTurnGain=gain;gamepadInput.steer=0;}
  return rows;
 }
 const cases=[];
 for(const speed of [110,180,240])for(const bend of [.6,1.2,2.4])for(const command of [.5,1]){
  cases.push({speed,bend,command,before:run(1,speed,bend,command,true),
    after:run(1,speed,bend,command),left:run(-1,speed,bend,command)});
 }
 const gains=[];isDrifting=true;driftState='drift';
 for(const age of [0,.07,.14,.28,1]){driftAge=age;gains.push(gain());}
 driftState='recover';const recovery=gain();isDrifting=false;const grip=gain();
 // Compare direct steady-state equations at identical state, isolating opposing input.
 const direct=[];
 for(const side of [-1,1])for(const command of [-1,0,1])for(const state of ['drift','recover','grip']){
  const step=legacy=>{resetGame();playerX=0;playerZ=180*SEGMENT_LENGTH;
   speed=180;roadGrip=1;isDrifting=state!=='grip';driftState=state;driftDirection=side;
   driftAge=1;driftAngle=side*28;slipAngle=side*12;steer=side*command;lateralVelocity=0;
   v82DriftTurnGain=legacy?()=>1:gain;
   stepArcadeMotion(1/60,side*1.2,true,false);
   return {x:playerX,lv:lateralVelocity,speed,nitro};};
  direct.push({side,command,state,before:step(true),after:step(false)});
 }
 v82DriftTurnGain=gain;
 const rates=[30,60,120].map(hz=>({hz,rows:run(1,180,1.2,1,false,1/hz)}));
 return JSON.stringify({cases,gains,recovery,grip,direct,rates,version:COMPETITION.version,
  record:bestRecordKey(),board:arcadeBoardKey()});
})()`));
assert.equal(out.version,'82.0');
assert(out.record.endsWith(':82.0')&&out.board.endsWith(':82.0'));
assert(!out.record.endsWith(':61.0'),'old records must remain separate');
assert.equal(out.gains.at(-1),.68);
assert(out.gains[0]>.4&&out.gains[0]<.5);
assert(out.gains.every((g,i)=>i===0||g>=out.gains[i-1]));
assert.equal(out.recovery,1);assert.equal(out.grip,1);
for(const c of out.cases){
 assert(c.after.some(r=>r.state==='drift'),'actual input replay must enter drift');
 for(let i=0;i<c.after.length;i++){
  const a=c.after[i],b=c.before[i],l=c.left[i];
  for(const k of ['yaw','slip','speed','nitro','stock','state'])assert.equal(a[k],b[k],k+' preserved');
  assert(Math.abs(a.x+l.x)<1e-9,'left/right trajectory symmetry');
  assert(Math.abs(a.lv+l.lv)<1e-9,'left/right momentum symmetry');
  assert(Object.values(a).every(v=>typeof v!=='number'||Number.isFinite(v)));
 }
 const ratio=c.after.at(-1).x/c.before.at(-1).x;
 assert(ratio>.4&&ratio<.8,'inward displacement must decrease without reversing: '+ratio);
}
for(const c of out.direct){
 if(c.state!=='drift')assert.deepEqual(c.after,c.before,'grip/recovery unchanged');
 else if(c.command===-1)assert(c.after.lv*c.side<c.before.lv*c.side,
  'countersteer retains full opposing authority while inward yaw is reduced');
}
const endpoints=out.rates.map(r=>r.rows.at(-1).x);
assert(Math.max(...endpoints)-Math.min(...endpoints)<.025,'30/60/120Hz trajectory stays close');
const sample=out.cases.find(c=>c.speed===180&&c.bend===1.2&&c.command===1);
console.log('V82: 18 input replay pairs, mirrored turns, preserved yaw/slip/speed/nitro, full countersteer, unchanged grip/recovery and 30/60/120 Hz passed');
console.log(JSON.stringify({sample:{speed:180,curve:1.2,seconds:.8,beforeX:sample.before.at(-1).x,afterX:sample.after.at(-1).x},gains:out.gains,endpoints}));
