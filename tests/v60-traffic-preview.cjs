'use strict';
// The V60 browser opt-in must never alter default/ranked race traffic behavior.
const assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const file=path.resolve(__dirname,'../index.html');
const regular=load(file),flaggedArcade=load(file,{search:'?trafficAI=v60'});
function setup(g,mode,closePlayer=false){
 g.run(`v34Mode='${mode}';selectedRoute=routeForId('1A');setStage(0,0,false);
  gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
  crashSequence=null;playerX=0;playerZ=${closePlayer?15000:1000};speed=0;
  collisionCooldown=100;timeLeft=9999;simulationTime=0;keys.KeyW=false;
  const fast=traffic[0],slow=traffic[1];traffic=[fast,slow];
  fast.x=0;fast.laneTarget=0;fast.z=20000;fast.speed=190;fast.targetSpeed=190;fast.phase=0;
  slow.x=0;slow.laneTarget=0;slow.z=24000;slow.speed=120;slow.targetSpeed=120;slow.phase=0;
  fast.previousX=fast.x;fast.previousZ=fast.z;slow.previousX=slow.x;slow.previousZ=slow.z;`);
}
const snapshot=g=>g.run('JSON.stringify({traffic:traffic.map(c=>({x:c.x,z:c.z,speed:c.speed,laneTarget:c.laneTarget,near:c.near,hitTimer:c.hitTimer})),score,crashCount,playerX,playerZ,route:currentNode.id,stage:stageLevel,timeLeft})');
setup(regular,'arcade');setup(flaggedArcade,'arcade');
assert.equal(flaggedArcade.run('trafficAI60Requested'),true);
assert.equal(flaggedArcade.run('trafficAI60Enabled()'),false);
assert.equal(snapshot(regular),snapshot(flaggedArcade));
for(let i=0;i<90;i++){
 regular.run('update(1/60)');flaggedArcade.run('update(1/60)');
 if(i%10===0)assert.equal(snapshot(regular),snapshot(flaggedArcade),'flag cannot change arcade '+i);
}
assert.equal(regular.run('bestRecordKey()'),flaggedArcade.run('bestRecordKey()'),'ranked and default score keys unchanged');
assert.equal(flaggedArcade.run('traffic[0].v60Cooldown===undefined'),true,'ranked never runs AI');
const cruise=load(file,{search:'?trafficAI=v60'}),cruiseLegacy=load(file);
setup(cruise,'cruise');setup(cruiseLegacy,'cruise');
assert.equal(cruise.run('trafficAI60Enabled()'),true);
assert(cruise.run('bestRecordKey().endsWith(\':AI60\')'),'preview records use a separate key');
assert(!cruiseLegacy.run('bestRecordKey().endsWith(\':AI60\')'));
assert.equal(cruise.run('traffic[0].laneTarget'),0);
cruise.run('update(1/60)');cruiseLegacy.run('update(1/60)');
assert(cruise.run('traffic[0].laneTarget')<-.15,'slow lead car triggers safe intent');
assert(cruise.run('traffic[0].v60Cooldown')>3,'cooldown stored only in opt-in preview');
assert.equal(cruiseLegacy.run('traffic[0].v60Cooldown===undefined'),true);
assert.equal(cruise.run('traffic[0].speed'),cruiseLegacy.run('traffic[0].speed'),'AI must not boost traffic');
const previewVisual=cruise.run('v57SceneFrame().traffic[0].turnYawRad');
assert(Number.isFinite(previewVisual)&&previewVisual>0&&previewVisual<=.16,
  'opt-in lateral movement supplies bounded positive visual yaw without physics edits');
assert.equal(cruiseLegacy.run("Object.hasOwn(v57SceneFrame().traffic[0],'turnYawRad')"),false,
  'ordinary renderer receives no AI yaw property');
for(let i=0;i<180;i++)cruise.run('update(1/60)');
assert(cruise.run('traffic[0].x')<-.15,'traffic moves gradually into chosen lane');
assert.equal(cruise.run('crashCount'),0,'no collision in distant controlled fixture');
assert.equal(cruise.run('currentNode.id'),'1A');
assert.equal(cruise.run('score>=0'),true);
const close=load(file,{search:'?trafficAI=v60'});setup(close,'cruise',true);
close.run('update(1/60)');
assert.equal(close.run('traffic[0].laneTarget'),0,'player proximity blocks new lane changes');
// V61: while a car is changing lanes, a newly arriving side car must stop
// the lateral movement within the periodic .16s safety reassessment window.
const intrude=load(file,{search:'?trafficAI=v60'});setup(intrude,'cruise');
intrude.run('update(1/60)');
assert.equal(intrude.run('traffic[0].v60PassActive'),true,'active pass has explicit state');
intrude.run("const side=traffic[1];side.x=traffic[0].laneTarget;side.laneTarget=side.x;side.z=traffic[0].z+1000;side.speed=195;side.targetSpeed=195;side.near=false;side.previousX=side.x;side.previousZ=side.z;");
const xBefore=intrude.run('traffic[0].x');
for(let i=0;i<30;i++)intrude.run('update(1/60)');
assert.equal(intrude.run('traffic[0].v60PassActive'),false,'new lane intruder vetoes active pass');
assert.equal(intrude.run("traffic[0].v60LastVeto"),'traffic-path-blocked');
assert(Math.abs(intrude.run('traffic[0].laneTarget')-intrude.run('traffic[0].x'))<1e-10,'abort stays at current position, without snap');
assert(intrude.run('traffic[0].x')<xBefore,'first portion of pass remains smooth');

// One-second lateral response must be invariant to fixed timestep resolution.
const outcomes=[30,60,120].map(fps=>{
  const p=load(file,{search:'?trafficAI=v60'});setup(p,'cruise');
  p.run("traffic[0].v60Think=1000;traffic[0].laneTarget=-.4;traffic[0].v60PassActive=false;");
  for(let i=0;i<fps;i++)p.run('update(1/'+fps+')');
  return p.run('traffic[0].x');
});
assert(Math.max(...outcomes)-Math.min(...outcomes)<1e-9,'exponential steering stable at 30/60/120 steps per second');

// Opt-in decision sensors never consider traffic that the original road filter excludes.
const ghost=load(file,{search:'?trafficAI=v60'});setup(ghost,'cruise');
ghost.run("setStage(...Object.values(routeForId('2B')),false);const a=traffic[0],b=traffic[1],s=traffic[2];traffic=[a,b,s];a.x=0;a.laneTarget=0;a.z=20000;a.speed=190;a.targetSpeed=190;b.x=0;b.z=24000;b.speed=120;b.targetSpeed=120;s.spec={...s.spec,scooter:true};s.x=-.52;s.laneTarget=-.52;s.z=21000;s.speed=220;s.targetSpeed=220;");
ghost.run('update(1/60)');
assert(ghost.run('traffic[0].laneTarget')<0,'expressway-excluded scooter cannot block legal pass');

// V62: two racing vehicles may not target the same empty center lane.
const multi=load(file,{search:'?trafficAI=v60'});setup(multi,'cruise');multi.run("const a=traffic[0],b=traffic[1],c={...a},d={...b};traffic=[a,b,c,d];const cfg=(car,x,z,v)=>{car.x=x;car.laneTarget=x;car.z=z;car.previousX=x;car.previousZ=z;car.speed=v;car.targetSpeed=v;car.hitTimer=0;car.near=false;car.v60PassActive=false;car.v60Think=0;car.v60Cooldown=0;};cfg(a,-.468,20000,190);cfg(b,.468,20400,190);cfg(c,-.468,24000,120);cfg(d,.468,24500,120);");
multi.run('update(1/60)');
assert.equal(multi.run('traffic[0].laneTarget'),0,'first vehicle reserves center');
assert.equal(multi.run('traffic[1].laneTarget'),.468,'second vehicle must hold');
assert.equal(multi.run('traffic[1].v60PassActive'),false);
const repeated=load(file,{search:'?trafficAI=v60'});setup(repeated,'cruise');repeated.run("const a=traffic[0],b=traffic[1],c={...a},d={...b};traffic=[a,b,c,d];const cfg=(car,x,z,v)=>{car.x=x;car.laneTarget=x;car.z=z;car.previousX=x;car.previousZ=z;car.speed=v;car.targetSpeed=v;car.hitTimer=0;car.near=false;car.v60PassActive=false;car.v60Think=0;car.v60Cooldown=0;};cfg(a,-.468,20000,190);cfg(b,.468,20400,190);cfg(c,-.468,24000,120);cfg(d,.468,24500,120);");
repeated.run('update(1/60)');
for(let i=0;i<90;i++){multi.run('update(1/60)');repeated.run('update(1/60)');}
assert.equal(multi.run('JSON.stringify(traffic.map(c=>[c.x,c.laneTarget,c.v60PassActive,c.v60Cooldown]))'),
  repeated.run('JSON.stringify(traffic.map(c=>[c.x,c.laneTarget,c.v60PassActive,c.v60Cooldown]))'),
  'same dense traffic initial state has deterministic replay');
const recycle=load(file,{search:'?trafficAI=v60'});setup(recycle,'cruise');
recycle.run("playerZ=50000;traffic[0].z=30000;traffic[0].previousZ=30000;traffic[0].v60PassActive=true;traffic[0].v60Cooldown=2;traffic[0].v60Think=2;");
recycle.run('update(1/60)');
assert.equal(recycle.run('traffic[0].v60PassActive'),false,'recycled car drops reservation');
assert.equal(recycle.run('traffic[0].v60Cooldown'),0);
assert.equal(recycle.run('traffic[0].v60Think'),0);

// V66: completing a center-origin maneuver records its side and adds a grace
// period. Aborted passes must not count as successes or change the next side.
const done=load(file,{search:'?trafficAI=v60'});setup(done,'cruise');
done.run('update(1/60)');
assert.equal(done.run('traffic[0].v60Think<=.16'),true,'first hazard recheck is in .16s');
done.run('traffic[0].x=traffic[0].laneTarget+.029;traffic[0].v60Think=.2;traffic[0].v60Cooldown=0;');
done.run('update(1/60)');
assert.equal(done.run('traffic[0].v60PassActive'),false,'pass naturally completed');
assert.equal(done.run('traffic[0].v66CompletedPasses'),1);
assert.equal(done.run('traffic[0].v66LastCenterSide'),-1);
assert(done.run('traffic[0].v60Cooldown')>=2,'successful pass has settle grace');
// Replay a new center-lane slow-leader encounter: choose the opposite side.
done.run('traffic[0].x=0;traffic[0].laneTarget=0;traffic[0].v60Cooldown=0;traffic[0].v60Think=0;');
done.run('update(1/60)');
assert(done.run('traffic[0].laneTarget')>0,'next independent center-lane choice alternates right');
const rejected=load(file,{search:'?trafficAI=v60'});setup(rejected,'cruise');
rejected.run('update(1/60)');
rejected.run("traffic[1].x=traffic[0].laneTarget;traffic[1].laneTarget=traffic[1].x;traffic[1].z=traffic[0].z+1000;traffic[1].speed=190;traffic[1].targetSpeed=190;");
for(let i=0;i<30;i++)rejected.run('update(1/60)');
assert.equal(rejected.run('traffic[0].v60PassActive'),false);
assert.equal(rejected.run('traffic[0].v66CompletedPasses||0'),0,'abort never counts as pass');
assert.equal(rejected.run('traffic[0].v66LastCenterSide||0'),0,'abort never updates preference');
assert.equal(rejected.run('traffic[0].v66PassOrigin'),null);

// V67: priority is attached to road position, not array slot. Reverse the
// same four traffic objects and verify the same physical winner (z=20000).
const reversed=load(file,{search:'?trafficAI=v60'});setup(reversed,'cruise');
reversed.run("const a=traffic[0],b=traffic[1],c={...a},d={...b};traffic=[b,d,a,c];const cfg=(car,x,z,v)=>{car.x=x;car.laneTarget=x;car.z=z;car.previousX=x;car.previousZ=z;car.speed=v;car.targetSpeed=v;car.hitTimer=0;car.near=false;car.v60PassActive=false;car.v60Think=0;car.v60Cooldown=0;car.v67WaitRounds=0;};cfg(a,-.468,20000,190);cfg(b,.468,20400,190);cfg(c,-.468,24000,120);cfg(d,.468,24500,120);");
reversed.run('update(1/60)');
assert.equal(reversed.run('traffic[2].laneTarget'),0,'physical z=20000 car wins after array reversal');
assert.equal(reversed.run('traffic[0].laneTarget'),.468,'later z=20400 car holds despite index zero');
assert.equal(reversed.run('traffic[0].v67WaitRounds'),1,'blocked contender ages safely');
const aged=load(file,{search:'?trafficAI=v60'});setup(aged,'cruise');
aged.run("const a=traffic[0],b=traffic[1],c={...a},d={...b};traffic=[a,b,c,d];const cfg=(car,x,z,v,w)=>{car.x=x;car.laneTarget=x;car.z=z;car.previousX=x;car.previousZ=z;car.speed=v;car.targetSpeed=v;car.hitTimer=0;car.near=false;car.v60PassActive=false;car.v60Think=0;car.v60Cooldown=0;car.v67WaitRounds=w;};cfg(a,-.468,20000,190,0);cfg(b,.468,20400,190,3);cfg(c,-.468,24000,120,0);cfg(d,.468,24500,120,0);");
aged.run('update(1/60)');
assert.equal(aged.run('traffic[1].laneTarget'),0,'older waiting contender goes first');
assert.equal(aged.run('traffic[0].laneTarget'),-.468,'newcomer yields to older request');
assert.equal(aged.run('traffic[1].v67WaitRounds'),0,'successful reservation resets age');
assert.equal(aged.run('traffic[0].v67WaitRounds'),1,'loser gains next-round priority');

const missing=load(file,{search:'?trafficAI=v60'});setup(missing,'cruise');
missing.window.TaipeiTrafficAI=undefined;
assert.equal(missing.run('trafficAI60Enabled()'),false,'missing bundle fails closed');
missing.run('update(1/60)');
assert.equal(missing.run('traffic[0].v60Cooldown===undefined'),true,'safe fallback to original traffic');
console.log('V60 traffic preview: default/ranked equivalent, cruise opt-in, slow lead, smooth move, player safety, fallback and separated records (simulation only)');
