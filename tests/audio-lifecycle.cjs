const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');

async function runAudioLifecycleTests(){
 const game=load(path.join(__dirname,'../index.html'),{navigator:{getGamepads:()=>[]}});
 const run=game.run;
 let checks=0;
 const check=(code,message)=>{assert.equal(run(code),true,message);checks++;};
 const visibility=hidden=>{
  game.document.hidden=hidden;
  // visibilitychange is a Document event; it need not bubble to Window.
  for(const fn of game.document.listeners.visibilitychange||[])fn();
 };
 run(`window.__audioCalls=[];audioCtx={state:'running',suspend(){this.state='suspended';window.__audioCalls.push('suspend');return Promise.resolve();},resume(){this.state='running';window.__audioCalls.push('resume');return Promise.resolve();}};gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;keys.KeyW=true;`);
 visibility(true);
 check(`paused && !inputHeld('KeyW') && audioCtx.state==='suspended' && window.__audioCalls.join(',')==='suspend'`,'hiding the document pauses driving, releases inputs and suspends audio');
 run(`resumeAudio();initAudio();`);
 check(`audioCtx.state==='suspended' && window.__audioCalls.length===1`,'hidden-page unlocks cannot restart audio');
 visibility(false);
 check(`paused && audioCtx.state==='suspended'`,'returning to a paused race waits for explicit resume');
 run(`togglePause();`);
 check(`!paused && audioCtx.state==='running' && window.__audioCalls.join(',')==='suspend,resume'`,'shared pause resume restores audio for every input device');
 run(`audioCtx.state='suspended';paused=true;navigator.getGamepads=()=>[{axes:[0,0,0,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===9,value:i===9?1:0}))}];keys.gp_start_last=false;pollGamepads();`);
 check(`!paused && audioCtx.state==='running'`,'gamepad Start restores suspended race audio');
 run(`gameStarted=false;inRadioScreen=true;paused=false;audioCtx.state='running';`);
 visibility(true);
 check(`inRadioScreen && !paused && audioCtx.state==='suspended'`,'radio selection suspends audio without starting a race');
 visibility(false);
 check(`inRadioScreen && audioCtx.state==='running'`,'visible radio selection resumes its preview');
 run(`audioCtx.state='suspended';`);
 for(const fn of game.window.listeners.keydown||[])fn({code:'ArrowRight',repeat:false,target:{matches:()=>false},preventDefault(){}});
 check(`audioCtx.state==='running'`,'keyboard tuning unlocks a suspended audio context');
 run(`audioCtx.state='interrupted';resumeAudio();`);
 check(`audioCtx.state==='running'`,'interrupted mobile audio resumes on interaction');
 run(`audioCtx.state='closed';window.__callsBefore=window.__audioCalls.length;resumeAudio();`);
 check(`window.__audioCalls.length===window.__callsBefore`,'closed contexts are not resumed');
 run(`audioCtx=null;resumeAudio();initAudio();`);
 check(`audioCtx===null`,'missing Web Audio support remains playable');
 run(`audioCtx={state:'suspended',resume:()=>Promise.reject(new Error('audio unavailable'))};resumeAudio();`);
 await new Promise(resolve=>setImmediate(resolve));
 checks++;
 return {checks};
}
module.exports={runAudioLifecycleTests};
