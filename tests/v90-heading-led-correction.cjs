'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const game=require('./canvas-harness.cjs').load(path.join(__dirname,'../index.html'));
// Historical tuning regression; current V93 authority is covered by v93-drift-flow.cjs.
game.run('v90DriftCommand=('+require('./fixtures/v92-drift-command.cjs').toString()+')()');
const data=JSON.parse(game.run(`(()=>{
 const modern=v90DriftCommand;
 function run(side,kmh,hz,old=false,grip=false){
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();gameStarted=true;raceActive=true;
  paused=false;gameOver=false;inRadioScreen=false;traffic=[];timeLeft=9999;collisionCooldown=100;
  speed=kmh;playerX=0;playerZ=180*SEGMENT_LENGTH;currentGear='HIGH';driveGear='D';motionDirection=1;roadGrip=1;
  isDrifting=!grip;driftState=grip?'grip':'drift';driftDirection=grip?0:side;driftAge=1;
  steer=side*.8;driftAngle=grip?0:side*28;slipAngle=grip?0:side*12;
  let lastIntent=null;
  v90DriftCommand=old?v84DriftCommand:(command,authority,intent)=>{lastIntent=intent;return modern(command,authority,intent);};const rows=[];
  try{for(let i=0;i<hz;i++){
   for(const seg of segments)seg.curve=side*1.2;
   keys.KeyW=true;keys.KeyS=false;keys.ShiftLeft=false;
   gamepadInput.steer=i<hz*.4?side*.8:i<hz*.6?0:-side*.8;
   update(1/hz);rows.push({x:playerX,lv:lateralVelocity,yaw:driftAngle,slip:slipAngle,speed,state:driftState,intent:lastIntent});
  }}finally{v90DriftCommand=modern;gamepadInput.steer=0;}
  return rows;
 }
 const cases=[];
 for(const kmh of [110,180,240])for(const side of [-1,1])for(const hz of [30,60,120])
  cases.push({kmh,side,hz,before:run(side,kmh,hz,true),after:run(side,kmh,hz)});
 const gripBefore=run(1,180,60,true,true),gripAfter=run(1,180,60,false,true);
 const commands=[];
 for(const kmh of [110,180,240,270])for(const side of [-1,1])for(const input of [.2,.5,1]){
  speed=kmh;isDrifting=true;driftState='drift';driftAge=1;driftDirection=side;
  driftAngle=side*45;
  const now=v90DriftCommand(side*input,.4),normal=side*input*.238*v51SteeringProfile(kmh,false).authority;
  driftAngle=side*10;const shallow=v90DriftCommand(side*input,.4);
  driftAngle=side*45;const released=v90DriftCommand(side*input,.4,0);
  driftAngle=-side*45;const wrongNose=v90DriftCommand(side*input,.4);
  const neutral=v90DriftCommand(0,.4),counter=v90DriftCommand(-side,.4);
  driftState='recover';const recovery=v90DriftCommand(side*input,.4),oldRecovery=v84DriftCommand(side*input,.4);
  commands.push({kmh,side,input,now,normal,shallow,released,wrongNose,neutral,counter,recovery,oldRecovery});
 }
 return JSON.stringify({cases,commands,gripBefore,gripAfter,version:COMPETITION.version});
})()`));
assert.equal(data.version,'95.0');assert.deepEqual(data.gripAfter,data.gripBefore,'normal driving is unchanged');
for(const c of data.commands){
 assert(Math.abs(c.now)>Math.abs(c.normal)*1.06,'active correction exceeds the matched normal direct steering channel');
 assert(Math.abs(c.now)>Math.abs(c.shallow),'more aligned nose gives a stronger correction');
 assert(Math.abs(c.now/c.released-1)<=.060000001,'heading contributes at most 6% of the requested correction');
 assert.equal(c.released,c.wrongNose,'release or a stale opposite nose disables heading assistance');
 assert.equal(c.neutral,0);assert.equal(c.counter,-c.side*.4);assert.equal(c.recovery,c.oldRecovery);
}
for(const c of data.cases){
 const i=Math.round(c.hz*.3)-1,a=c.after[i],b=c.before[i];
 assert(a.lv*c.side>b.lv*c.side,'actual inward movement responds more strongly');
 assert(Math.abs(a.x-b.x)<.009,'short dodge adds less than 0.009 road units at 300ms');
 for(let j=0;j<c.after.length;j++){
  const r=c.after[j];assert(Math.abs(r.x)<.5,'reference correction remains well inside the road');
  for(const key of ['yaw','slip','speed','state'])assert.equal(r[key],c.before[j][key],key+' remains unchanged');
 }
 const releaseStart=Math.ceil(c.hz*.4),releaseEnd=Math.ceil(c.hz*.6);
 assert(c.after.slice(releaseStart,releaseEnd).every(r=>r.intent===0),'update passes released raw intent while steer is still smoothing');
 const mirror=data.cases.find(m=>m.kmh===c.kmh&&m.hz===c.hz&&m.side===-c.side);
 for(let j=0;j<c.after.length;j++)for(const key of ['x','lv'])assert(Math.abs(c.after[j][key]+mirror.after[j][key])<1e-9);
}
const rates=data.cases.filter(c=>c.kmh===180&&c.side===1).map(c=>c.after.at(-1).x);
assert(Math.max(...rates)-Math.min(...rates)<.025,'frame-rate trajectories remain close');
const sample=data.cases.find(c=>c.kmh===180&&c.side===1&&c.hz===60);
console.log('V90: actual-update old/new pulses, normal-channel correction advantage, bounded heading aid, raw-intent release, counter/recovery/grip preservation, mirror and 30/60/120Hz passed');
console.log(JSON.stringify({at300ms:{before:sample.before[17],after:sample.after[17]},endpoints:rates}));
