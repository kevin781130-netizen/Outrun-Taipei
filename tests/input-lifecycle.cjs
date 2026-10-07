'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
function runInputLifecycleTests(){
  let pads=[];
  const game=load(path.join(__dirname,'../index.html'),{navigator:{getGamepads:()=>pads}});
  const run=game.run;
  const pad=(pressed=[])=>({connected:true,axes:[.5,0],buttons:Array.from({length:16},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0}))});
  let checks=0;
  const check=(code,message)=>{assert.equal(run(code),true,message);checks++;};
  run(`gameStarted=true;raceActive=true;paused=true;gameOver=false;inRadioScreen=false;`);
  pads=[null,null,null,pad([7,9])];run('pollGamepads();pollGamepads();');
  check(`!paused&&gamepadInput.gas&&gamepadInput.steer===.5`,'controller in slot 3 starts and drives');
  pads=[];run('pollGamepads();');
  check(`!gamepadInput.gas&&!keys.gp_start_last`,'disconnect releases driving and menu edge state');
  pads=[pad([9])];run('pollGamepads();');
  check(`paused`,'reconnected Start is recognized as a fresh press');
  game.document.hidden=true;
  run('keys.gp_start_last=false;pollGamepads();');
  check(`paused&&!gamepadInput.gas&&!keys.gp_start_last`,'hidden document cannot resume through held controller Start');
  game.document.hidden=false;pads=[{...pad([7]),connected:false},null,pad([6])];run('pollGamepads();');
  check(`!gamepadInput.gas&&gamepadInput.brake`,'disconnected slot is skipped for an active controller');
  // iOS/embedded browsers may omit fullscreen rather than returning a rejected promise.
  game.document.documentElement={};
  for(const fn of game.elements.get('fullscreen-btn').listeners.click||[])fn();
  checks++;
  return {checks};
}
module.exports={runInputLifecycleTests};
