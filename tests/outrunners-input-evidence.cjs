'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {InputEventTrace,replayInputTrace}=require('../src/diagnostics/InputEventTrace.cjs');
const {load}=require('./canvas-harness.cjs');
const file=path.resolve(__dirname,'../index.html');
function dispatch(game,event){
 const type=event.down?'keydown':'keyup';
 for(const listener of game.window.listeners[type]||[])listener({code:event.code,
  repeat:false,target:{matches:()=>false},preventDefault(){}});
}
function setup(game){game.run(`v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
 gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
 crashSequence=null;traffic=[];timeLeft=9999;collisionCooldown=100;
 playerX=0;playerZ=180*SEGMENT_LENGTH;speed=175;currentGear='HIGH';
 driveGear='D';motionDirection=1;roadGrip=1;nitro=0;nitroStock=1;`);}
function state(game){return JSON.parse(game.run(`JSON.stringify({speed,playerX,playerZ,
 steer,driftState,driftAngle,slipAngle,nitroStock,boostRemaining,boosting})`));}
function simulate(profile,events,observe){
 const game=load(file,{search:profile});setup(game);
 const trace=new InputEventTrace(),rows=[];let i=0;
 for(let tick=1;tick<=60;tick++){
  const at=tick*1000/60;
  while(i<events.length&&events[i].at<=at){
   const e=events[i++];dispatch(game,e);if(observe)trace.record(e.at,e.code,e.down);
  }
  if(observe)trace.sample(at);
  game.run('update(1/60)');rows.push(state(game));
 }
 return {rows,trace:trace.export()};
}
const events=[{at:1,code:'KeyW',down:true},{at:2,code:'ArrowRight',down:true},
 {at:3,code:'ShiftLeft',down:true},{at:20,code:'ShiftLeft',down:false},
 {at:200,code:'KeyN',down:true},{at:240,code:'KeyN',down:false},
 {at:300,code:'ArrowRight',down:false},{at:301,code:'ArrowLeft',down:true},
 {at:800,code:'ArrowLeft',down:false}];
for(const profile of ['', '?handling=v59']){
 const observed=simulate(profile,events,true),baseline=simulate(profile,events,false);
 assert.deepEqual(observed.rows,baseline.rows,'recording must not change actual physics');
 assert.deepEqual(replayInputTrace(observed.trace),observed.trace,'exact event/sample replay');
 assert.deepEqual(simulate(profile,observed.trace.events,false).rows,baseline.rows,'actual update replay');
}
// A controlled keyboard pulse between updates: actual DOM handlers, real update().
const pulse=[{at:1,code:'KeyW',down:true},{at:4,code:'KeyN',down:true},
 {at:8,code:'KeyN',down:false}];
for(const profile of ['', '?handling=v59']){
 const short=simulate(profile,pulse,true);
 assert.equal(short.rows[0].nitroStock,1,'sub-tick pulse is missed by level sampling');
 assert.equal(short.rows[0].boosting,false);
 assert.deepEqual(short.trace.frames[0].edges.filter(e=>e.code==='KeyN').map(e=>e.down),[true,false]);
 const held=simulate(profile,[pulse[0],pulse[1],{at:24,code:'KeyN',down:false}],true);
 assert.equal(held.rows[0].nitroStock,0,'positive control: held N consumes one nitro');
 assert.equal(held.rows[0].boosting,true);
}
const repeats=new InputEventTrace();repeats.record(1,'KeyN',true);repeats.record(2,'KeyN',true);
repeats.record(3,'KeyN',false);assert.equal(repeats.sample(4).edges.length,2);
const same=new InputEventTrace();same.record(0,'KeyN',true);same.record(0,'KeyN',false);same.sample(1);
assert.deepEqual(replayInputTrace(same.export()),same.export());
same.record(1,'KeyN',true);same.sample(1);
assert.deepEqual(replayInputTrace(same.export()),same.export(),'equal-clock events retain sample boundary');
const bounded=new InputEventTrace(2);bounded.record(1,'KeyW',true);bounded.sample(2);
assert.equal(bounded.record(3,'KeyW',false),false);assert.equal(bounded.sample(4),null);
assert.equal(bounded.export().complete,false);assert.throws(()=>replayInputTrace(bounded.export()));
assert.throws(()=>repeats.record(0,'KeyN',true));
const copy=repeats.export();copy.events[0].code='mutated';assert.equal(repeats.export().events[0].code,'KeyN');
console.log('Input evidence PASS: default/V59 unchanged, deterministic gameplay replay; 4–8ms N pulse missed, held control works; bounded capture and ordering');
