'use strict';
// V70: gameplay-preserving cruise-only instrumentation and A/B comparison.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const data=JSON.parse(game.run(`(()=>{
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  const panel=document.getElementById('v70-lab');
  const original={rules:COMPETITION.version,key:bestRecordKey(),
    hidden:panel.hidden,lab:v70LabEnabled,usingV69:v70UseV69()};
  const open=v70ToggleLab();
  gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
  v70RenderLab();
  const visible={hidden:panel.hidden,aria:document.getElementById('v70-lab-btn').getAttribute('aria-pressed'),
    mode:document.getElementById('v70-lab-mode').textContent};
  const v68Allowed=v70SelectExitMode('v68');
  const off={mode:v70ExitMode,usingV69:v70UseV69(),
    button:document.getElementById('v70-lab-mode').textContent};
  function step(mode){
    v70SelectExitMode(mode);speed=175;driveGear='D';motionDirection=1;
    isDrifting=false;driftState='grip';roadGrip=1;slipAngle=.2;
    lateralVelocity=.85;driftAngle=.5;yawRate=25;steer=0;
    playerX=0;playerZ=200*SEGMENT_LENGTH;v69ExitTime=.42;
    const scoreBefore=score,nitroBefore=nitro,stockBefore=nitroStock;
    stepArcadeMotion(1/60,0,true,false);
    return {x:playerX,lat:lateralVelocity,time:v69ExitTime,
      scoreChange:score-scoreBefore,nitroChange:nitro-nitroBefore,
      stockChange:nitroStock-stockBefore};
  }
  const oldStep=step('v68'),newStep=step('v69');
  v70ClearLabStats();
  const cleared={v68:v70LabStats.v68.frames,v69:v70LabStats.v69.frames};
  driftAngle=12.34;slipAngle=-8.25;lateralVelocity=-.45;roadGrip=.93;
  v70RenderLab(true);
  const measured={v68:v70LabStats.v68.frames,v69:v70LabStats.v69.frames,
    view:document.getElementById('v70-lab-metrics').textContent,
    state:document.getElementById('v70-lab-state').textContent};
  const samples=v70LabStats.v69.frames;
  paused=true;v70RenderLab(true);
  const pausedSamples=v70LabStats.v69.frames;
  paused=false;const notPaused=v70LabStats.v69.frames;
  v70RenderLab(false);const afterControls=v70LabStats.v69.frames;
  v34Mode='arcade';
  v70RenderLab(true);
  const competitive={hidden:panel.hidden,usesV69:v70UseV69(),
    unchangedSamples:v70LabStats.v69.frames,labEnabled:v70LabEnabled,
    forbidden:v70SelectExitMode('v68')};
  v34Mode='sprint';v70RenderLab();
  const sprint={usesV69:v70UseV69(),hidden:panel.hidden};
  v34Mode='cruise';v70RenderLab();
  v70SelectExitMode('v68');
  const closed=v70ToggleLab();
  const restored={closed,hidden:panel.hidden,mode:v70ExitMode,useV69:v70UseV69(),
    timer:v69ExitTime,aria:document.getElementById('v70-lab-btn').getAttribute('aria-pressed')};
  const rejectedWhenClosed=v70SelectExitMode('v68');
  v70ToggleLab();const invalid=v70SelectExitMode('alien');
  v70SelectExitMode('v69');
  v70ClearLabStats();
  const reset={v68:v70LabStats.v68.frames,v69:v70LabStats.v69.frames,
    score,rules:COMPETITION.version,record:bestRecordKey()};
  return JSON.stringify({original,open,visible,v68Allowed,off,oldStep,newStep,
    cleared,measured,samples,pausedSamples,notPaused,afterControls,
    competitive,sprint,restored,rejectedWhenClosed,invalid,reset});
})()`));
assert.deepEqual(data.original,{rules:'92.0',key:data.original.key,
  hidden:true,lab:false,usingV69:true});
assert(data.original.key.endsWith(':92.0'));
assert.equal(data.open,true);
assert.deepEqual(data.visible,{hidden:false,aria:'true',mode:'V69 SETTLE ON'});
assert.equal(data.v68Allowed,true);
assert.deepEqual(data.off,{mode:'v68',usingV69:false,button:'V68 SETTLE OFF'});
assert(data.oldStep.lat>data.newStep.lat&&data.oldStep.x>data.newStep.x,
  'switch must change real recovery physics in cruise only');
assert(data.oldStep.time===0,'V68 switch must reset V69 pending settle');
assert(data.newStep.time>0&&data.newStep.time<.42,'V69 regrip must consume natural timer');
for(const k of ['scoreChange','nitroChange','stockChange']){
  assert.equal(data.oldStep[k],0);
  assert.equal(data.newStep[k],0);
}
assert.deepEqual(data.cleared,{v68:0,v69:0});
assert.deepEqual([data.measured.v68,data.measured.v69],[0,1]);
assert(data.measured.view.includes('YAW 12.3°')&&
       data.measured.view.includes('SLIP -8.3°')&&
       data.measured.view.includes('LAT -0.45'));
assert(data.measured.state.includes('GRIP 0.93'));
assert.equal(data.pausedSamples,data.samples,'pause cannot create samples');
assert.equal(data.afterControls,data.notPaused,'button rerenders must not create samples');
assert.deepEqual(data.competitive,{hidden:true,usesV69:true,
  unchangedSamples:data.afterControls,labEnabled:true,forbidden:false});
assert.deepEqual(data.sprint,{usesV69:true,hidden:true});
assert.deepEqual(data.restored,{closed:false,hidden:true,mode:'v69',
  useV69:true,timer:0,aria:'false'});
assert.equal(data.rejectedWhenClosed,false);
assert.equal(data.invalid,false);
assert.equal(data.reset.v68,0);assert.equal(data.reset.v69,0);
assert.equal(data.reset.rules,'92.0');
console.log('V70: controlled V68/V69 physics A/B, cruise-only UI, 20Hz metrics, pause, ranking, closure reset and input isolation passed');
