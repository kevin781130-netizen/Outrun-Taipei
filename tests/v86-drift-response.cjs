'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const data=JSON.parse(game.run(`(()=>{
 const response=v86DriftResponseRate;
 function run({speedNow=180,side=1,pulse=false,drifting=true,legacy=false,curve=1.2}){
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
  traffic=[];timeLeft=9999;collisionCooldown=100;speed=speedNow;
  playerX=0;playerZ=180*SEGMENT_LENGTH;currentGear='HIGH';driveGear='D';motionDirection=1;roadGrip=1;
  isDrifting=drifting;driftState=drifting?'drift':'grip';driftDirection=drifting?side:0;driftAge=1;
  driftAngle=drifting?side*28:0;slipAngle=drifting?side*12:0;
  v86DriftResponseRate=legacy?rate=>rate:response;
  const rows=[];
  try{for(let i=0;i<60;i++){
   for(const seg of segments)seg.curve=side*curve;
   keys.KeyW=true;keys.KeyS=false;keys.ShiftLeft=false;
   // 100 ms correction, release, then a short opposite correction.
   gamepadInput.steer=side*(pulse?(i<6?.8:i<18?0:i<24?-.8:0):.8);
   update(1/60);
   rows.push({x:playerX,lv:lateralVelocity,steer,speed,yaw:driftAngle,slip:slipAngle,state:driftState});
  }}finally{v86DriftResponseRate=response;gamepadInput.steer=0;}
  return rows;
 }
 const cases=[];
 for(const kmh of [110,180,240])for(const side of [-1,1])for(const curve of [.35,1.2,2.4]){
  const cfg={speedNow:kmh,side,curve};
  cases.push({...cfg,before:run({...cfg,legacy:true}),after:run(cfg),
   pulseBefore:run({...cfg,pulse:true,legacy:true}),pulseAfter:run({...cfg,pulse:true})});
 }
 const gripBefore=run({drifting:false,legacy:true}),gripAfter=run({drifting:false});
 const rates=[];
 for(const kmh of [110,180,240]){
  speed=kmh;isDrifting=true;driftDirection=1;driftAge=1;driftState='drift';
  const target=v84DriftCommand(.8,.4),now=v51SteeringProfile(kmh,true);
  v86DriftResponseRate=rate=>rate;
  const before=v51SteeringProfile(kmh,true);v86DriftResponseRate=response;
  rates.push({kmh,target,now,before});
 }
 return JSON.stringify({cases,gripBefore,gripAfter,rates,version:COMPETITION.version,record:bestRecordKey()});
})()`));
assert.equal(data.version,'92.0');assert(data.record.endsWith(':92.0'));
assert.deepEqual(data.gripAfter,data.gripBefore,'grip steering/motion stays identical');
for(const rate of data.rates){
 assert(Math.abs(rate.now.response/rate.before.response-1.12)<1e-12,'only 12% response gain');
 for(const key of ['authority','liftGrip','brakeRotation'])assert.equal(rate.now[key],rate.before[key]);
 const expected=.8*(1+.08*(1-.8))*(.26+(.20-.26)*rate.kmh/270)*1.08;
 assert(Math.abs(rate.target-expected)<1e-12,'V88 bounded authority includes V87 fine-input curve');
}
const near=(a,b,tolerance)=>Math.abs(a-b)<=tolerance;
for(const c of data.cases){
 const direction=c.side;
 const a=c.after,b=c.before,pa=c.pulseAfter,pb=c.pulseBefore;
 assert(a[5].steer*direction>b[5].steer*direction,'initial correction responds sooner');
 assert(a[5].lv*direction>b[5].lv*direction,'earlier sideways response helps obstacle correction');
 assert(Math.abs(pa[17].steer)<Math.abs(pb[17].steer),'release unwinds input sooner');
 assert(pa[17].lv*direction<pb[17].lv*direction,'less inward carry after releasing the correction');
 assert(pa[23].steer*direction<pb[23].steer*direction,'opposite correction responds sooner');
 assert(near(a.at(-1).lv,b.at(-1).lv,.002),'sustained lateral speed converges to same target');
 assert(Math.abs(a.at(-1).x-b.at(-1).x)<.015,'no large accumulated turn increase over one second');
 assert(a.every((r,i)=>Math.abs(r.yaw-b[i].yaw)<2),'transient chassis heading change stays small');
 assert([...a,...pa].every(r=>Object.values(r).every(v=>typeof v!=='number'||Number.isFinite(v))));
 assert([...a,...pa].every(r=>Math.abs(r.x)<.5),'reference dodge/turn stays well inside road bounds');
}
const sample=data.cases.find(c=>c.speedNow===180&&c.side===1&&c.curve===1.2);
console.log('V86: 18 update-driven correction/release/counter pairs; unchanged grip and sustained target, bounded correction and finite road positions passed');
console.log(JSON.stringify({speed:180,curve:1.2,at100ms:{beforeSteer:sample.before[5].steer,afterSteer:sample.after[5].steer,beforeLateral:sample.before[5].lv,afterLateral:sample.after[5].lv},at1s:{beforeX:sample.before.at(-1).x,afterX:sample.after.at(-1).x,beforeLateral:sample.before.at(-1).lv,afterLateral:sample.after.at(-1).lv},releaseAt300ms:{beforeSteer:sample.pulseBefore[17].steer,afterSteer:sample.pulseAfter[17].steer,beforeLateral:sample.pulseBefore[17].lv,afterLateral:sample.pulseAfter[17].lv}}));
