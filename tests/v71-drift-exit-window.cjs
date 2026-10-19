'use strict';
// V71: completed neutral drift exits only; other states cannot contaminate A/B.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const result=JSON.parse(game.run(`(()=>{
 v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
 gameStarted=true;raceActive=true;gameOver=false;paused=false;inRadioScreen=false;
 crashSequence=null;traffic=[];speed=175;steer=0;roadGrip=1;
 driveGear='D';motionDirection=1;playerX=0;playerZ=200*SEGMENT_LENGTH;
 v70ToggleLab();v70ClearLabStats();
 const key=bestRecordKey(),competition=COMPETITION.version;
 function prime(mode){
  v70SelectExitMode(mode);
  speed=175;steer=0;roadGrip=1;isDrifting=true;driftState='recover';
  driftAngle=.1;slipAngle=.1;driftDirection=1;yawRate=0;
  cleanDriftTime=0;lateralVelocity=.85;
  playerX=0;playerZ=200*SEGMENT_LENGTH;v69ExitTime=0;
  v71ResetExitWindow();
  stepBrakeDrift(1/60,false,true,0,0);
  return {armed:!!v71ExitWindow,state:driftState,isDrifting};
 }
 function complete(mode){
  const arm=prime(mode);
  const scoreBefore=score,nitroBefore=nitro,stockBefore=nitroStock;
  for(let i=0;i<26;i++)stepArcadeMotion(1/60,0,true,false);
  return {arm,exits:v71ExitStats[mode].exits,
    mean:v71ExitStats[mode].totalMeanLat/v71ExitStats[mode].exits,
    peak:v71ExitStats[mode].peakLat,
    pending:!!v71ExitWindow,deltaScore:score-scoreBefore,
    deltaNitro:nitro-nitroBefore,deltaStock:nitroStock-stockBefore};
 }
 const left=complete('v68'),right=complete('v69');
 v70RenderLab();
 const summary=document.getElementById('v71-lab-summary').textContent;
 // Mid-window steering: discard the entire partial exit, do not count it.
 const steerStart=prime('v68');
 for(let i=0;i<8;i++)stepArcadeMotion(1/60,0,true,false);
 steer=.5;stepArcadeMotion(1/60,0,true,false);
 const steeringCancelled=!v71ExitWindow;
 const afterSteer=v71ExitStats.v68.exits;
 steer=0;
 // A/B toggle must discard any incomplete window.
 prime('v68');stepArcadeMotion(1/60,0,true,false);
 v70SelectExitMode('v69');
 const modeCancelled=!v71ExitWindow;
 // Pause, offroad, wrong direction and crash must invalidate windows.
 prime('v69');paused=true;v71SampleExitWindow(1/60);
 const pauseCancelled=!v71ExitWindow;paused=false;
 prime('v69');roadGrip=.5;v71SampleExitWindow(1/60);
 const offroadCancelled=!v71ExitWindow;roadGrip=1;
 prime('v69');motionDirection=-1;v71SampleExitWindow(1/60);
 const reverseCancelled=!v71ExitWindow;motionDirection=1;
 prime('v69');crashSequence={};v71SampleExitWindow(1/60);
 const crashCancelled=!v71ExitWindow;crashSequence=null;
 prime('v68');v70ClearLabStats();
 const cleared={pending:!!v71ExitWindow,left:v71ExitStats.v68.exits,
    right:v71ExitStats.v69.exits,old68:v70LabStats.v68.frames};
 prime('v68');v70ToggleLab();
 const closeCancelled=!v71ExitWindow&&v70ExitMode==='v69';
 v34Mode='arcade';
 const denied=v71ArmExitWindow();
 return JSON.stringify({left,right,summary,steerStart,steeringCancelled,
  afterSteer,modeCancelled,pauseCancelled,offroadCancelled,reverseCancelled,
  crashCancelled,cleared,closeCancelled,denied,key,competition,
  finalKey:bestRecordKey(),score,nitro,nitroStock});
})()`));
for(const side of ['left','right']){
 const row=result[side];
 assert.deepEqual(row.arm,{armed:true,state:'grip',isDrifting:false});
 assert.equal(row.exits,1,side+' only counts one completed exit');
 assert(Number.isFinite(row.mean)&&row.mean>0&&row.peak>=row.mean);
 assert.equal(row.pending,false);
 assert.equal(row.deltaScore,0);assert.equal(row.deltaNitro,0);
 assert.equal(row.deltaStock,0);
}
assert(result.right.mean<result.left.mean,'same inputs should reveal V69 reduced exit slip');
assert(result.summary.includes('V68 1 次')&&result.summary.includes('V69 1 次'));
assert.equal(result.steerStart.armed,true);
for(const key of ['steeringCancelled','modeCancelled','pauseCancelled',
 'offroadCancelled','reverseCancelled','crashCancelled','closeCancelled']){
 assert.equal(result[key],true,key+' must discard partial exit');
}
assert.equal(result.afterSteer,1,'partial steering exit cannot be counted');
assert.deepEqual(result.cleared,{pending:false,left:0,right:0,old68:0});
assert.equal(result.denied,false,'arcade must never arm cruise-only telemetry');
assert.equal(result.competition,'93.0');
assert.equal(result.key,result.finalKey,'record namespace must not change');
console.log('V71: two completed 0.42s A/B exit windows, invalidation, clear, closure, competition isolation passed');
