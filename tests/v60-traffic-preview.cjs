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
for(let i=0;i<180;i++)cruise.run('update(1/60)');
assert(cruise.run('traffic[0].x')<-.15,'traffic moves gradually into chosen lane');
assert.equal(cruise.run('crashCount'),0,'no collision in distant controlled fixture');
assert.equal(cruise.run('currentNode.id'),'1A');
assert.equal(cruise.run('score>=0'),true);
const close=load(file,{search:'?trafficAI=v60'});setup(close,'cruise',true);
close.run('update(1/60)');
assert.equal(close.run('traffic[0].laneTarget'),0,'player proximity blocks new lane changes');
const missing=load(file,{search:'?trafficAI=v60'});setup(missing,'cruise');
missing.window.TaipeiTrafficAI=undefined;
assert.equal(missing.run('trafficAI60Enabled()'),false,'missing bundle fails closed');
missing.run('update(1/60)');
assert.equal(missing.run('traffic[0].v60Cooldown===undefined'),true,'safe fallback to original traffic');
console.log('V60 traffic preview: default/ranked equivalent, cruise opt-in, slow lead, smooth move, player safety, fallback and separated records (simulation only)');
