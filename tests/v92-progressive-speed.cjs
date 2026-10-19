'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./canvas-harness.cjs'),legacyFactory=require('./fixtures/v91-drift-command.cjs');
const game=load(path.join(__dirname,'../index.html'));
const data=JSON.parse(game.run(`(()=>{
 const modern=v90DriftCommand,oldCommand=(${legacyFactory.toString()})();
 function setup(kmh=200){
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
  traffic=[];timeLeft=9999;collisionCooldown=100;speed=kmh;playerX=0;playerZ=180*SEGMENT_LENGTH;
  currentGear='HIGH';driveGear='D';motionDirection=1;roadGrip=1;
  for(const k of Object.keys(keys))keys[k]=false;gamepadInput.steer=0;
  for(const seg of segments)seg.curve=0;
 }
 function speedRun(hz,{boost=true,stack=false,crash=false,hold=false}={}){
  setup(crash?300:200);nitroStock=2;keys.KeyW=true;
  const startZ=playerZ;
  if(crash){collisionCooldown=0;triggerCrash(null,{x:480,y:440});}
  let reached=!crash&&speed>=299.5?0:null,recovery=null,maxStep=0,previous=speed;
  const samples=[];
  for(let i=0;i<Math.round(hz*(crash?16:9));i++){
   if(stack&&!crashSequence){exitBoost=1;shiftPunch=1;draftLevel=1;}
   keys.KeyN=boost&&!crashSequence&&(hold||boostRemaining<=0&&nitroStock>0);
   const wasCrash=!!crashSequence;update(1/hz);
   if(wasCrash&&!crashSequence)recovery={t:(i+1)/hz,speed};
   if(!wasCrash)maxStep=Math.max(maxStep,speed-previous);
   if(reached===null&&!wasCrash&&speed>=299.5)reached=(i+1)/hz;
   previous=speed;
   if(i%hz===hz-1)samples.push({t:(i+1)/hz,speed,stock:nitroStock,remaining:boostRemaining});
  }
  return {hz,reached,recovery,maxStep,samples,distance:playerZ-startZ,stock:nitroStock};
 }
 const straight=[30,60,120].map(hz=>speedRun(hz));
 const stacked=[30,60,120].map(hz=>speedRun(hz,{stack:true}));
 const normal=speedRun(60,{boost:false}),held=speedRun(60,{hold:true});
 const crash=speedRun(60,{crash:true}),clean=speedRun(60);
 setup();nitroStock=1;const before=speed,activated=activateNitro(),after=speed,duration=boostRemaining;
 keys.KeyW=true;keys.KeyS=true;update(1/60);
 const brakeCancelled=boostRemaining===0&&!boosting;
 setup();nitroStock=1;activateNitro();paused=true;const pauseBefore=[speed,playerZ,boostRemaining];update(1);const pauseAfter=[speed,playerZ,boostRemaining];paused=false;
 setup();nitroStock=1;activateNitro();selectDriveGear('R',1000);const reverseCancelled=boostRemaining===0;
 const crossings=[30,60,120].map(hz=>({hz,speed:v92Accelerate(199,100,1/hz,true)}));
 function drift(side,legacy=false,grip=false){
  setup(180);isDrifting=!grip;driftState=grip?'grip':'drift';driftDirection=grip?0:side;driftAge=1;
  steer=side*.8;driftAngle=grip?0:side*28;slipAngle=grip?0:side*12;
  v90DriftCommand=legacy?oldCommand:modern;const rows=[];
  try{for(let i=0;i<60;i++){
   for(const seg of segments)seg.curve=side*1.2;keys.KeyW=true;
   gamepadInput.steer=i<24?side*.8:i<36?0:-side*.8;update(1/60);
   rows.push({x:playerX,lv:lateralVelocity,yaw:driftAngle,slip:slipAngle,speed,state:driftState});
  }}finally{v90DriftCommand=modern;gamepadInput.steer=0;}
  return rows;
 }
 const drifts=[-1,1].map(side=>({side,before:drift(side,true),after:drift(side)}));
 const gripBefore=drift(1,true,true),gripAfter=drift(1,false,true);
 return JSON.stringify({straight,stacked,normal,held,crash,clean,before,activated,after,duration,brakeCancelled,pauseBefore,pauseAfter,reverseCancelled,crossings,drifts,gripBefore,gripAfter,version:COMPETITION.version});
})()`));
assert.equal(data.version,'92.0');assert(data.activated);assert.equal(data.before,data.after,'no activation speed jump');assert.equal(data.duration,7);
for(const run of [...data.straight,...data.stacked]){
 assert(run.reached>=6.9&&run.reached<=7.1,'200→displayed 300 must take approximately seven seconds');
 assert(run.maxStep<=100/7/run.hz+1e-8,'stacked thrust cannot bypass high-speed acceleration budget');
 assert(run.samples[2].speed<245,'cannot rush back to near-300 within three seconds');
 assert(run.samples.every(s=>s.speed<=300&&s.speed>=0));
}
assert.equal(data.normal.reached,null);assert(data.normal.samples.at(-1).speed<270);
assert.equal(data.held.stock,1,'holding N consumes only one seven-second charge');
assert(data.brakeCancelled&&data.reverseCancelled);assert.deepEqual(data.pauseBefore,data.pauseAfter);
assert(data.crash.recovery&&data.crash.recovery.speed===118,'crash launch remains at the established recovery speed');
assert(data.crash.reached>10&&data.crash.reached<16,'boosting after a crash still incurs a substantial rebuild interval');
// Compare speeds at the common nine-second mark, before route completion.
const deficit=data.clean.samples[8].speed-data.crash.samples[8].speed;
assert(deficit>30,'crashed run remains materially slower nine seconds later');
for(const c of data.crossings){const low=Math.min(1/c.hz,.01),expected=199+100*low+(100/7)*(1/c.hz-low);assert(Math.abs(c.speed-expected)<1e-10);}
assert.deepEqual(data.gripAfter,data.gripBefore);
for(const d of data.drifts){
 const a=d.after[17],b=d.before[17],gain=a.lv/b.lv;
 assert(gain>1.045&&gain<1.065,'approximately five percent more actual inward correction vs V91');
 for(let i=0;i<d.after.length;i++){
  const r=d.after[i];assert(Math.abs(r.x)<.5);
  for(const key of ['yaw','slip','speed','state'])assert.equal(r[key],d.before[i][key]);
 }
}
console.log('V92: 7s nitro with no impulse, real 200→300 ramps, stacked-thrust cap, threshold integration, hold/cancel/pause gates, crash rebuild and +5% mirrored correction passed.');
console.log(JSON.stringify({to300:data.straight.map(r=>({hz:r.hz,t:r.reached})),crashTo300:data.crash.reached,recovery:data.crash.recovery,at9s:{clean:data.clean.samples[8].speed,crashed:data.crash.samples[8].speed},driftAt300ms:{before:data.drifts[1].before[17],after:data.drifts[1].after[17]}}));
