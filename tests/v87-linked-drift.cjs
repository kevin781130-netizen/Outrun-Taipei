'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const result=JSON.parse(game.run(`(()=>{
 function replay(side,{helper=false,chicane=false,gas=true,grip=1,kmh=180,hz=60}={}){
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
  traffic=[];timeLeft=9999;collisionCooldown=100;playerX=0;playerZ=180*SEGMENT_LENGTH;
  speed=kmh;currentGear='HIGH';driveGear='D';motionDirection=1;roadGrip=grip;
  isDrifting=true;driftState='drift';driftDirection=side;driftAge=1;
  steer=side*.8;driftAngle=side*28;slipAngle=side*14;lateralVelocity=0;
  const rows=[];
  for(let i=0;i<Math.round(hz*1.2);i++){
   const t=i/hz,turn=t<.2?side:-side;
   for(const seg of segments)seg.curve=(chicane&&t>=.2?-side:side)*1.2;
   keys.KeyW=gas;keys.KeyS=false;keys.ShiftLeft=helper;gamepadInput.steer=turn*.8;
   update(1/hz);
   rows.push({t,dir:driftDirection,state:driftState,active:isDrifting,yaw:driftAngle,
    visual:v51DriftVisualYaw(),slip:slipAngle,lv:lateralVelocity,x:playerX,
    link:v87TransferRemaining,transfer:v87TransferActive,rearm:driftRearmBlocked,boost:exitBoost});
  }
  keys.ShiftLeft=false;gamepadInput.steer=0;
  return rows;
 }
 const automatic=replay(1,{chicane:true}),mirror=replay(-1,{chicane:true});
 const manual=replay(1,{helper:true}),normalExit=replay(1),noGas=replay(1,{chicane:true,gas:false});
 const lowSpeed=replay(1,{helper:true,kmh:90});
 const rates=[30,60,120].map(hz=>({hz,rows:replay(1,{chicane:true,hz})}));
 speed=180;roadGrip=1;driveGear='D';motionDirection=1;coastWindow=0;
 const gates=[];
 for(const condition of ['normal','no-gas','braking','low-grip','low-speed','reverse']){
  speed=180;roadGrip=1;motionDirection=1;
  if(condition==='low-grip')roadGrip=.6;if(condition==='low-speed')speed=80;if(condition==='reverse')motionDirection=-1;
  gates.push({condition,allowed:v87TransferIntent(-1,-1.2,condition!=='no-gas',condition==='braking',true)});
 }
 resetGame();speed=180;roadGrip=1;isDrifting=true;driftState='drift';driftAge=1;driftDirection=1;
 driftAngle=28;slipAngle=14;steer=-.8;counterTime=.11;keys.ShiftLeft=true;
 const pauseBefore=[driftAngle,slipAngle,v87TransferRemaining,driftDirection];
 stepBrakeDrift(0,false,true,-1,-1.2);
 const pauseAfter=[driftAngle,slipAngle,v87TransferRemaining,driftDirection];keys.ShiftLeft=false;
 const fine=[0,.2,.5,.8,1].map(input=>({input,mapped:v87FineDriftInput(input),command:v84DriftCommand(input,.4)}));
 driftState='recover';const recover=v87FineDriftInput(.5);isDrifting=false;const gripInput=v87FineDriftInput(.5);
 v87TransferRemaining=.1;v87TransferYaw=12;v87TransferSlip=4;resetGame();
 return JSON.stringify({automatic,mirror,manual,normalExit,noGas,lowSpeed,rates,gates,fine,recover,gripInput,pauseBefore,pauseAfter,
  reset:[v87TransferRemaining,v87TransferYaw,v87TransferSlip,v87TransferActive],version:COMPETITION.version});
})()`));
assert.equal(result.version,'90.0');
for(const key of ['automatic','manual']){
 const rows=result[key],flip=rows.findIndex(r=>r.dir===-1);
 assert(flip>=0,key+' must transfer into the opposite drift');
 assert(rows.every(r=>r.active&&r.state!=='grip'&&r.state!=='recover'),key+' must not force a straight/grip phase');
 assert(rows.slice(flip).some(r=>r.yaw<-15),'new drift develops actual opposite chassis angle');
 assert(rows.every(r=>r.boost===0),'transfer does not award an exit boost');
 assert(rows.every(r=>Math.abs(r.x)<.6&&Number.isFinite(r.yaw)),'bounded road motion');
 const nearCenter=rows.filter(r=>r.t>.2&&Math.abs(r.yaw)<3).length/60;
 assert(nearCenter<.10,'cross zero yaw without dwelling upright');
 const jump=Math.max(...rows.slice(1).map((r,i)=>Math.abs(r.visual-rows[i].visual)));
 assert(jump<4.5,'rendered yaw must not snap when its sign crosses zero');
}
for(let i=0;i<result.automatic.length;i++)for(const key of ['yaw','slip','lv','x'])
 assert(Math.abs(result.automatic[i][key]+result.mirror[i][key])<1e-8,'left/right transfer symmetry '+key);
assert(result.normalExit.some(r=>r.state==='recover')&&result.normalExit.some(r=>!r.active),'same-bend countersteer without drift hold still exits');
assert(!result.noGas.some(r=>r.link>0),'throttle release cannot force a chain');
assert(!result.lowSpeed.some(r=>r.link>0),'slow countersteering cannot force a chain');
for(const g of result.gates)assert.equal(g.allowed,g.condition==='normal',g.condition+' transfer gate');
assert.equal(result.fine[0].mapped,0);assert.equal(result.fine.at(-1).mapped,1);
assert(Math.abs(result.fine[2].mapped-.52)<1e-12,'half input receives only 4% extra correction');
assert(result.fine.every(r=>r.mapped-r.input<=.020000001),'fine correction adds at most 2% full-scale input');
assert.equal(result.recover,.5);assert.equal(result.gripInput,.5);
assert.deepEqual(result.reset,[0,0,0,false]);assert.deepEqual(result.pauseAfter,result.pauseBefore,'dt zero cannot start or advance a transfer');
for(const rate of result.rates){
 assert(rate.rows.every(r=>r.active),'all tested rates retain a live drift');
 assert(rate.rows.some(r=>r.dir===-1&&r.yaw<-15),'all tested rates complete the transfer');
}
const rows=result.automatic,flip=rows.findIndex(r=>r.dir===-1);
console.log('V87: automatic chicane/manual-hold transfers, no grip plateau or exit boost, fine correction bounds, counter exit, gates, mirror, reset and 30/60/120 Hz passed');
console.log(JSON.stringify({transferAt:rows[flip].t,centerDwellSeconds:rows.filter(r=>r.t>.2&&Math.abs(r.yaw)<3).length/60,maxVisualStep:Math.max(...rows.slice(1).map((r,i)=>Math.abs(r.visual-rows[i].visual))),finalX:rows.at(-1).x}));
