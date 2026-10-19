'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const legacyFactory=require('./fixtures/v82-motion.cjs');
const game=load(path.join(__dirname,'../index.html'));
// Historical tuning regression; current V93 authority is covered by v93-drift-flow.cjs.
game.run('v90DriftCommand=('+require('./fixtures/v92-drift-command.cjs').toString()+')()');
const out=JSON.parse(game.run(`(()=>{
 const motion=stepArcadeMotion;
 const legacyMotion=(${legacyFactory.toString()})();
 function run(side,kmh,bend,command,legacy=false,dt=1/60,seconds=.8){
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
  traffic=[];timeLeft=9999;collisionCooldown=100;
  playerX=0;playerZ=180*SEGMENT_LENGTH;speed=kmh;currentGear='HIGH';
  driveGear='D';motionDirection=1;roadGrip=1;
  for(const seg of segments)seg.curve=side*bend;
  stepArcadeMotion=legacy?legacyMotion:motion;
  const rows=[];
  try{for(let i=0;i<Math.round(seconds/dt);i++){
   keys.KeyW=true;keys.KeyS=false;keys.ShiftLeft=i===0;
   keys.ArrowRight=side>0;keys.ArrowLeft=side<0;
   // Analogue input uses the same steering smoothing and update path.
   gamepadInput.steer=side*command;
   keys.ArrowRight=keys.ArrowLeft=false;
   update(dt);
   rows.push({x:playerX,lv:lateralVelocity,yaw:driftAngle,slip:slipAngle,
    state:driftState,speed,nitro,stock:nitroStock});
  }}finally{stepArcadeMotion=motion;gamepadInput.steer=0;}
  return rows;
 }
 const cases=[];
 for(const speed of [110,180,240])for(const bend of [.6,1.2,2.4])for(const command of [.5,1]){
  cases.push({speed,bend,command,before:run(1,speed,bend,command,true),
    after:run(1,speed,bend,command),left:run(-1,speed,bend,command)});
 }
 const commands=[];speed=180;isDrifting=true;driftDirection=1;
 for(const state of ['entry','drift','recover'])for(const age of [0,.14,.28,1]){
  driftState=state;driftAge=age;
  commands.push({state,age,neutral:v84DriftCommand(0,.4),inward:v84DriftCommand(1,.4),counter:v84DriftCommand(-1,.4)});
 }
 // Compare direct steady-state equations at identical state, isolating opposing input.
 const direct=[];
 for(const side of [-1,1])for(const command of [-1,0,1])for(const state of ['drift','recover','grip']){
  const step=legacy=>{resetGame();playerX=0;playerZ=180*SEGMENT_LENGTH;
   speed=180;roadGrip=1;isDrifting=state!=='grip';driftState=state;driftDirection=side;
   driftAge=1;driftAngle=side*28;slipAngle=side*12;steer=side*command;lateralVelocity=0;
   stepArcadeMotion=legacy?legacyMotion:motion;
   stepArcadeMotion(1/60,side*1.2,true,false);
   return {x:playerX,lv:lateralVelocity,speed,nitro};};
  direct.push({side,command,state,before:step(true),after:step(false)});
 }
 stepArcadeMotion=motion;
 const probes=[];
 for(const side of [-1,1])for(const state of ['drift','recover'])for(const yaw of [10,40]){
  resetGame();speed=180;roadGrip=1;isDrifting=true;driftState=state;driftDirection=side;
  driftAge=1;driftAngle=side*yaw;slipAngle=side*12;steer=side;playerX=0;
  playerZ=180*SEGMENT_LENGTH;lateralVelocity=-side*.6;
  stepArcadeMotion(1/60,side*1.2,true,false);
  probes.push({side,state,yaw,lv:lateralVelocity});
 }
 const sustained=run(1,180,1.2,1,false,1/60,2);
 const rates=[30,60,120].map(hz=>({hz,rows:run(1,180,1.2,1,false,1/hz)}));
 return JSON.stringify({cases,commands,direct,probes,sustained,rates,version:COMPETITION.version,
  record:bestRecordKey(),board:arcadeBoardKey()});
})()`));
assert.equal(out.version,'93.0');
assert(out.record.endsWith(':93.0')&&out.board.endsWith(':93.0'));
assert(!out.record.endsWith(':61.0'),'old records must remain separate');
for(const c of out.commands){
 assert.equal(c.neutral,0,'yaw alone must not pull neutral drift toward the apex');
 assert.equal(c.counter,-.4,'retain full opposing steering authority');
 const ceiling=.22*(c.state==='recover'?1:1.08);
 assert(c.inward>=.14&&c.inward<=ceiling+1e-12,'V88 bounded inward target at 180 km/h; recovery retains V84 ceiling');
 if(c.state==='recover')assert(Math.abs(c.inward-.22)<1e-12,'no yaw-force rebound in recovery');
}
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
 assert(ratio>.03&&ratio<.8,'inward displacement must decrease without reversing: '+ratio);
}
for(const c of out.direct){
 if(c.state==='grip')assert.deepEqual(c.after,c.before,'grip unchanged');
 else assert(c.after.lv*c.side<c.before.lv*c.side,'reduce inward pull through drift and recovery');
 if(c.state!=='grip'&&c.command===0)assert(c.after.lv*c.side<=0,'neutral applies only road outward push');
}
for(let i=0;i<out.probes.length;i+=2){
 const a=out.probes[i],b=out.probes[i+1];
 assert(a.lv*a.side<0,'entry must preserve outward inertia on the first step');
 if(a.state==='recover')assert.equal(a.lv,b.lv,'recovery retains no heading assistance');
  else assert(Math.abs(a.lv-b.lv)<.004,'V90 heading aid remains a small bounded correction');
}
assert(out.sustained.every(r=>r.x<.5&&r.x>=0),'two-second reference corner retains room for driver correction');
const endpoints=out.rates.map(r=>r.rows.at(-1).x);
assert(Math.max(...endpoints)-Math.min(...endpoints)<.025,'30/60/120Hz trajectory stays close');
const sample=out.cases.find(c=>c.speed===180&&c.bend===1.2&&c.command===1);
console.log('V84: 18 historical V82 replay pairs, mirrored turns, preserved yaw/slip/speed/nitro, full countersteer, neutral/recovery force correction, unchanged grip and 30/60/120 Hz passed');
console.log(JSON.stringify({sample:{speed:180,curve:1.2,seconds:.8,beforeX:sample.before.at(-1).x,afterX:sample.after.at(-1).x},twoSecondX:out.sustained.at(-1).x,endpoints}));
