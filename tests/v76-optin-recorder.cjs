'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const result=JSON.parse(game.run(`(()=>{
 v34Mode='cruise';selectedRoute=routeForId('4D');resetGame();
 const initially={clip:v76Clip,recording:v76Recording,denied:v76RecordStart()};
 gameStarted=true;raceActive=true;gameOver=false;paused=false;inRadioScreen=false;
 crashSequence=null;traffic=[];playerZ=210*SEGMENT_LENGTH;
 playerX=0;speed=185;steer=0;roadGrip=1;driveGear='D';motionDirection=1;
 const deniedWithoutLab=v76RecordStart();
 v70ToggleLab();
 const started=v76RecordStart();const secondStart=v76RecordStart();
 const loopBefore=v76Clip.frames.length;
 for(let i=0;i<45;i++){
  steer=i<20?.6:i<35?-.6:0;
  stepArcadeMotion(1/60,i<20?1.1:-.8,true,false);
 }
 const clip=v76Clip;
 const evidence={length:clip.frames.length,
  schema:clip.schema,first:clip.frames[0],last:clip.frames.at(-1),
  duration:clip.frames.at(-1).t,summary:{...clip.summary},reason:clip.reason};
 const incompatible=v70SelectExitMode('v68');
 const afterChange={recording:v76Recording,reason:v76Clip.reason,
  mode:v76Clip.mode,retained:v76Clip.frames.length};
 const off=v76RecordStop(),discard=(()=>{v76RecordDiscard();return v76Clip===null;})();
 const enabled=v76RecordStart();
 const beforeCap=v76Clip.frames[0];
 v76Clip.frames=Array(V76_MAX_FRAMES-1).fill({
  ...beforeCap,drift:false,state:'grip',steer:0,driftDirection:0});
 steer=0;isDrifting=false;driftState='grip';
 v76RecordSample(1/60,.3);
 const capped={length:v76Clip.frames.length,reason:v76Clip.reason,
  recording:v76Recording};
 v76RecordDiscard();
 const startAgain=v76RecordStart();
 v76RecordSample(1/60,0);
 paused=true;v76RecordSample(1/60,0);paused=false;
 const interrupted={reason:v76Clip.reason,recording:v76Recording};
 v76RecordDiscard();
 v34Mode='arcade';
 const arcadeDenied=v76RecordStart();
 return JSON.stringify({initially,deniedWithoutLab,started,secondStart,loopBefore,
  evidence,incompatible,afterChange,off,discard,enabled,capped,startAgain,
  interrupted,arcadeDenied,rules:COMPETITION.version});
})()`));
assert.deepEqual(result.initially,{clip:null,recording:false,denied:false});
assert.equal(result.deniedWithoutLab,false);
assert.equal(result.started,true);
assert.equal(result.secondStart,true,'explicit restart should replace session');
assert.equal(result.loopBefore,0);
assert.equal(result.evidence.length,45);
assert.equal(result.evidence.schema,'taipei-driving.v76.player-drive.1');
assert.equal(result.evidence.first.mode,'v69');
assert.equal(result.evidence.first.route,'4D');
assert.equal(result.evidence.first.t,0.017);
assert.equal(result.evidence.duration,0.75);
assert.equal(result.evidence.reason,null);
assert(Number.isFinite(result.evidence.last.lat));
assert(Number.isFinite(result.evidence.first.rawSteer));
assert.equal(result.incompatible,true);
assert.deepEqual(result.afterChange,{recording:false,reason:'mode-changed',
 mode:'v69',retained:45});
assert.equal(result.off,false,'stop idempotent');
assert.equal(result.discard,true);
assert.equal(result.enabled,true);
assert.deepEqual(result.capped,{length:5400,reason:'limit-90s',recording:false});
assert.equal(result.startAgain,true);
assert.deepEqual(result.interrupted,{reason:'session-interrupted',recording:false});
assert.equal(result.arcadeDenied,false);
assert.equal(result.rules,'61.0');
console.log('V76: recording requires consent, 60Hz bounded samples, model separation, 90s cap, pause, clear, competitive isolation passed');
