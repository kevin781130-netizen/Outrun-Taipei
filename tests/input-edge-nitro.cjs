'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const {setup,checkInputEdges}=require('./tools/input-edge-cases.cjs');
function dispatch(target,type,event){for(const listener of target.listeners[type]||[])listener(event);}
async function main(){
 for(const handling of ['', '&handling=v59'])for(const enabled of [false,true]){
  const game=load(path.resolve(__dirname,'../index.html'),{search:enabled?'?input=edges1'+handling:handling?'?handling=v59':''});
  const run=code=>game.run(code);
  const send=(code,down,repeat=false)=>dispatch(game.window,down?'keydown':'keyup',
   {code,repeat,target:{matches:()=>false},preventDefault(){}});
  await checkInputEdges({run,send,enabled});
  if(!enabled)continue;
  run(setup);send('KeyN',true);
  dispatch(game.window,'blur',{});run('togglePause();update(1/60)');
  assert.equal(run('nitroStock'),2,'blur discards pulse before resume');
  run(setup);send('KeyN',true);game.document.hidden=true;
  dispatch(game.document,'visibilitychange',{});game.document.hidden=false;
  run('togglePause();update(1/60)');assert.equal(run('nitroStock'),2,'hidden tab discards pulse');
  run(setup);
  const el=game.elements.get('btn-nitro'),event={pointerId:7,preventDefault(){}};
  dispatch(el,'pointerdown',event);dispatch(el,'pointerup',event);run('update(1/60)');
  assert.equal(run('nitroStock'),1,'quick touch-button pulse is retained');
  run(setup);dispatch(el,'pointerdown',event);dispatch(el,'pointercancel',event);
  run('clearInputs();update(1/60)');assert.equal(run('nitroStock'),2,'input reset discards touch pulse');
 }
 console.log('Input edge nitro PASS: opt-in tap fix, hold/repeat, pause/focus/hidden, brake/reverse/refill/crash/countdown, gamepad/touch, isolated scores');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
