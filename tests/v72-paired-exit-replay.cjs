'use strict';
// V72: matched-condition physics replay using the production game's own
// post-drift transition + motion functions. No gameplay/source modification.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const routes=['1A','2A','2B','3A','3B','3C','4A','4B','4C','4D','5A','5B','5C','5D','5E'];
const cases=[];
for(const route of routes)for(const initialLat of [-.85,.85]){
 cases.push({route,speedKmh:175,initialLat});
}
for(const route of ['1A','4B','5C'])for(const speedKmh of [125,245]){
 for(const initialLat of [-.85,.85])cases.push({route,speedKmh,initialLat});
}
function replayInside(configs){
 const dt=1/60,frames=26;
 function runCase(c,mode){
  v34Mode='cruise';selectedRoute=routeForId(c.route);
  v70LabEnabled=false;v70ExitMode='v69';
  resetGame();gameStarted=true;raceActive=true;paused=false;gameOver=false;
  inRadioScreen=false;crashSequence=null;traffic=[];v70ToggleLab();
  if(!v70SelectExitMode(mode))throw new Error('Cruise lab unavailable');
  v70ClearLabStats();
  speed=c.speedKmh;currentGear='HIGH';driveGear='D';motionDirection=1;
  playerX=0;playerZ=200*SEGMENT_LENGTH;roadGrip=1;steer=0;
  isDrifting=true;driftState='recover';driftDirection=Math.sign(c.initialLat);
  driftAngle=.1;slipAngle=.1;yawRate=0;lateralVelocity=c.initialLat;
  cleanDriftTime=0;counterTime=0;neutralTime=0;brakeEntry=0;
  momentBoostWindow=0;momentBoostArmed=false;
  const curveAt=()=>{
   const idx=Math.max(0,Math.min(segments.length-1,Math.floor(playerZ/SEGMENT_LENGTH)));
   return segments[idx].curve;
  };
  const firstCurve=curveAt();
  const scoreBefore=score,nitroBefore=nitro,stockBefore=nitroStock;
  // Genuine recovery-to-grip FSM completion arms V69 and V71.
  stepBrakeDrift(dt,false,true,0,firstCurve);
  if(driftState!=='grip'||isDrifting||!v71ExitWindow)
   throw new Error('Did not complete authentic recovery transition');
  const initial={route:currentNode.id,speed,playerX,playerZ,
   lateralVelocity,driftAngle,slipAngle,yawRate,steer,
   roadGrip,driveGear,motionDirection,exitTime:v69ExitTime};
  const states=[];
  for(let frame=0;frame<frames;frame++){
   const curve=curveAt();
   stepArcadeMotion(dt,curve,true,false);
   playerZ+=speed*WORLD_SPEED*dt;
   const state={curve,speed,playerX,playerZ,lateralVelocity};
   if(Object.values(state).some(v=>!Number.isFinite(v)))
    throw new Error('Non-finite physics result at frame '+frame);
   states.push(state);
  }
  const bucket=v71ExitStats[mode];
  if(bucket.exits!==1||v71ExitWindow!==null)
   throw new Error('Incomplete V71 exit in '+c.route+'/'+mode);
  return {initial,states,exit:{
   count:bucket.exits,meanAbsLat:bucket.totalMeanLat/bucket.exits,
   peakAbsLat:bucket.peakLat,finalX:playerX,finalLat:lateralVelocity
  },unchanged:{
   score:score===scoreBefore,nitro:nitro===nitroBefore,
   stock:nitroStock===stockBefore,record:bestRecordKey(),
   rules:COMPETITION.version}};
 }
 return configs.map(c=>({scenario:c,v68:runCase(c,'v68'),v69:runCase(c,'v69')}));
}
const game=load(path.join(__dirname,'../index.html'));
const invoke='('+replayInside.toString()+')('+JSON.stringify(cases)+')';
const first=JSON.parse(game.run('JSON.stringify('+invoke+')'));
const second=JSON.parse(game.run('JSON.stringify('+invoke+')'));
assert.deepEqual(first,second,'identical scenario and input must reproduce the same frames');
assert.equal(first.length,cases.length);
const report=[];
let changed=0;
for(const item of first){
 const {scenario,v68,v69}=item;
 assert.deepEqual(v68.initial,v69.initial,
  'Initial physical state mismatch '+scenario.route);
 assert.equal(v68.states.length,26);
 assert.equal(v69.states.length,26);
 for(let i=0;i<26;i++){
  const a=v68.states[i],b=v69.states[i];
  // Only lateral handling may differ: same route, time, steering, curve and speed.
  assert.equal(a.curve,b.curve,scenario.route+' road mismatch');
  assert.equal(a.speed,b.speed,scenario.route+' speed changed');
  assert.equal(a.playerZ,b.playerZ,scenario.route+' progress changed');
 }
 assert.deepEqual(v68.unchanged,v69.unchanged);
 assert.deepEqual({score:v68.unchanged.score,nitro:v68.unchanged.nitro,
  stock:v68.unchanged.stock,rules:v68.unchanged.rules},
  {score:true,nitro:true,stock:true,rules:'61.0'});
 assert(v68.unchanged.record.endsWith(':61.0'));
 for(const mode of [v68,v69]){
  assert.equal(mode.exit.count,1);
  assert(mode.exit.meanAbsLat>=0&&mode.exit.peakAbsLat>=mode.exit.meanAbsLat);
 }
 const delta=v69.exit.meanAbsLat-v68.exit.meanAbsLat;
 if(Math.abs(delta)>1e-9)changed++;
 report.push({route:scenario.route,speedKmh:scenario.speedKmh,
  initialLateralVelocity:scenario.initialLat,frames:26,seconds:26/60,
  validExitSeconds:.42,entryCurve:v68.states[0].curve,
  v68MeanAbsLat:v68.exit.meanAbsLat,v69MeanAbsLat:v69.exit.meanAbsLat,
  deltaMeanAbsLat:delta,v68FinalX:v68.exit.finalX,v69FinalX:v69.exit.finalX});
}
assert(changed>0,'V68 and V69 must have observable physical difference');
fs.mkdirSync(path.join(__dirname,'../test-results'),{recursive:true});
const destination=path.join(__dirname,'../test-results/v72-paired-exit-replay.json');
fs.writeFileSync(destination,JSON.stringify({
 status:'passed',scope:'headless paired post-exit physics replay (not full WebGL playtest)',
 controlled:'same source code, route, starting state, constant input (neutral steer/throttle), dt',
 warning:'synthetic recovery start; not actual live player inputs, not a causal or perceptual quality verdict',
 dt:1/60,scenarioCount:cases.length,routes:routes.length,pairedDifferences:changed,
 source:'current index.html',competitionVersion:'61.0',comparisons:report
},null,2)+'\n');
console.log('V72 paired replay: '+cases.length+' pairs on '+routes.length+
 ' routes, repeat deterministic, '+changed+' observed lateral deltas; '+destination);
