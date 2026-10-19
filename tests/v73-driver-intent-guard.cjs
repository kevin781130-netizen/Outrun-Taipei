'use strict';
// V73: prove the V69 settle never becomes hidden steering assistance
// while the player actively turns or countersteers, including reversals.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const routes=['1A','2A','2B','3A','3B','3C','4A','4B','4C','4D','5A','5B','5C','5D','5E'];
const cases=[];
for(const route of routes)for(const kmh of [125,175,245])for(const direction of [-1,1]){
 cases.push({route,kmh,direction});
}
function auditInside(configs){
 const dt=1/60;
 function setup(c,model){
  v34Mode='cruise';selectedRoute=routeForId(c.route);
  v70LabEnabled=false;v70ExitMode='v69';resetGame();
  gameStarted=true;raceActive=true;paused=false;gameOver=false;
  inRadioScreen=false;crashSequence=null;traffic=[];
  v70ToggleLab();if(!v70SelectExitMode(model))throw new Error('No cruise A/B');
  speed=c.kmh;currentGear='HIGH';driveGear='D';motionDirection=1;
  playerX=0;playerZ=200*SEGMENT_LENGTH;roadGrip=1;steer=0;
  isDrifting=false;driftState='grip';driftAngle=.2;slipAngle=.1;
  lateralVelocity=c.direction*.85;yawRate=12;
  v69ExitTime=.42;v71ResetExitWindow();
 }
 function activeRun(c,model){
  setup(c,model);
  const start={score,nitro,nitroStock,record:bestRecordKey(),rules:COMPETITION.version};
  const trace=[];
  for(let i=0;i<26;i++){
   // Active input never enters the V69 neutral range. Abrupt reversal
   // is an explicit player command, not a self-steering correction.
   steer=c.direction*(i<13?.55:-.55);
   const idx=Math.max(0,Math.min(segments.length-1,Math.floor(playerZ/SEGMENT_LENGTH)));
   const curve=segments[idx].curve;
   stepArcadeMotion(dt,curve,true,false);
   playerZ+=speed*WORLD_SPEED*dt;
   trace.push({curve,steer,playerX,playerZ,lateralVelocity,yawRate,
    driftAngle,slipAngle,roadGrip,speed});
  }
  return {trace,scoreSame:score===start.score,nitroSame:nitro===start.nitro,
   stockSame:nitroStock===start.nitroStock,
   recordSame:bestRecordKey()===start.record,
   rules:COMPETITION.version};
 }
 function directGate(initial,desired,command,grip=1,forward=true,drifting=false){
  // Call the original V69 function with an actual nonzero settle timer
  // to isolate the effect from all other lateral-control equations.
  v69ExitTime=.42;speed=175;driveGear='D';motionDirection=forward?1:-1;
  isDrifting=drifting;driftState=drifting?'recover':'grip';
  lateralVelocity=initial;yawRate=12;roadGrip=grip;
  playerX=.33;const before=lateralVelocity,beforeYaw=yawRate,beforeX=playerX;
  const correction=v69ExitSettle(dt,desired,command,grip);
  return {before,after:lateralVelocity,beforeYaw,afterYaw:yawRate,
   beforeX,afterX:playerX,correction,remaining:v69ExitTime};
 }
 const outputs=configs.map(c=>{
  const v68=activeRun(c,'v68'),v69=activeRun(c,'v69');
  return {scenario:c,v68,v69};
 });
 const gates=[];
 for(const initial of [-.85,.85])for(const desired of [-.30,0,.30]){
  for(const command of [0,.08,-.08,.55,-.55]){
   gates.push({initial,desired,command,
    result:directGate(initial,desired,command)});
  }
 }
 const invalid=[
  {name:'offroad',result:directGate(.85,0,0,.5)},
  {name:'reverse',result:directGate(.85,0,0,1,false)},
  {name:'still-drifting',result:directGate(.85,0,0,1,true,true)}
 ];
 v34Mode='arcade';v70LabEnabled=true;v70ExitMode='v68';
 const competitive=v70UseV69();
 return {outputs,gates,invalid,competitive};
}
const game=load(path.join(__dirname,'../index.html'));
const command='JSON.stringify(('+auditInside.toString()+')('+JSON.stringify(cases)+'))';
const rows=JSON.parse(game.run(command));
assert.equal(rows.outputs.length,90);
let frames=0;
for(const {scenario,v68,v69} of rows.outputs){
 assert.deepEqual(v68.trace,v69.trace,
  'V69 must never secretly act during continuous active steering: '+JSON.stringify(scenario));
 assert.deepEqual([v68.scoreSame,v68.nitroSame,v68.stockSame,v68.recordSame,v68.rules],
  [true,true,true,true,'95.0']);
 assert.deepEqual([v69.scoreSame,v69.nitroSame,v69.stockSame,v69.recordSame,v69.rules],
  [true,true,true,true,'95.0']);
 for(const frame of v68.trace)for(const x of Object.values(frame)){
  assert(Number.isFinite(x),scenario.route+' non-finite replay');
 }
 frames+=v68.trace.length;
}
let neutralGates=0,activeGates=0;
for(const {initial,desired,command,result:r} of rows.gates){
 assert.equal(r.before,initial);assert.equal(r.beforeX,r.afterX,'no lane-centering');
 assert(r.remaining<.42&&r.remaining>=0,'window timer must advance');
 if(Math.abs(command)<=.12){
  assert(Math.abs(r.after-desired)<Math.abs(initial-desired),
   'neutral settle must reduce target-relative error (not just absolute velocity)');
  assert(r.correction>0&&Math.abs(r.afterYaw)<Math.abs(r.beforeYaw));
  neutralGates++;
 }else{
  assert.equal(r.after,r.before,'active steering cannot receive hidden lateral help');
  assert.equal(r.afterYaw,r.beforeYaw,'active steering cannot receive hidden yaw help');
  assert.equal(r.correction,0);activeGates++;
 }
}
for(const row of rows.invalid){
 assert.equal(row.result.after,row.result.before,row.name+' should never settle');
 assert.equal(row.result.afterYaw,row.result.beforeYaw);
 assert.equal(row.result.correction,0);
}
assert.equal(rows.competitive,true,'competition always selects V69');
const report={status:'passed',scope:'V73 original-physics player-intent test',
 scenarios:rows.outputs.length,framePairs:frames,neutralTargetErrorChecks:neutralGates,
 activeInputNoAssistChecks:activeGates,invalidConditionChecks:rows.invalid.length,
 competitionVersion:'95.0',
 finding:'active left/right and immediate countersteer reversal are identical across V68 and V69; correction engages only in neutral range',
 limitation:'these are synthetic player commands, not actual recorded gameplay or real WebGL rendering'};
fs.mkdirSync(path.join(__dirname,'../test-results'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'../test-results/v73-driver-intent-guard.json'),
 JSON.stringify(report,null,2)+'\n');
console.log('V73: '+frames+' matched active-input frames; '+
 neutralGates+' neutral target-error gates; '+activeGates+
 ' active steering exclusions; '+rows.invalid.length+' invalid-condition exclusions passed');
