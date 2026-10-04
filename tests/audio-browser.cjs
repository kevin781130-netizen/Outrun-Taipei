const assert=require('node:assert/strict');

async function audioBrowserChecks(browser,url,errors){
 const page=await browser.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0});
 const run=code=>page.evaluate(code=>window.__audit(code),code);
 // The deterministic game probe disables animation frames, so poll audio by timer.
 const state=expected=>page.waitForFunction(expected=>window.__audit('audioCtx.state')===expected,expected,{polling:50,timeout:5000});
 const visibility=async hidden=>{
  await page.evaluate(hidden=>{
   Object.defineProperty(document,'hidden',{configurable:true,value:hidden});
   document.dispatchEvent(new Event('visibilitychange'));
  },hidden);
 };
 try{
  await page.goto(url+'/audit');
  await page.locator('#start-btn').click();
  await state('running');
  assert.equal(await run(`inRadioScreen && !!engineCarrier && !!screechSource`),true,'radio selection starts native Web Audio');
  // Exercise the original tuning-noise path using a real AudioBufferSourceNode.
  await run(`playRadioTuningSound();playRadioTuningSound();`);
  await page.locator('#radio-next').click();
  await visibility(true);await state('suspended');
  const step=await run(`musicStep`);
  await page.waitForTimeout(350);
  assert.equal(await run(`musicStep`),step,'hidden radio cannot queue notes on a suspended context');
  await page.keyboard.press('ArrowRight');
  assert.equal(await run(`audioCtx.state`),'suspended','hidden keyboard input cannot wake audio');
  await visibility(false);await state('running');
  assert.equal(await run(`inRadioScreen`),true,'returning to radio selection does not start driving');
  await run(`audioCtx.suspend()`);await state('suspended');
  await page.keyboard.press('ArrowRight');await state('running');
  await page.locator('#radio-drive').click();
  await run(`raceActive=true;speed=150;keys.KeyW=true;`);
  const z=await run(`playerZ`);
  await visibility(true);await state('suspended');
  assert.equal(await run(`paused && !inputHeld('KeyW')`),true,'hidden race pauses and releases held throttle');
  await run(`update(.25)`);
  assert.equal(await run(`playerZ`),z,'background race does not advance');
  await visibility(false);
  assert.equal(await run(`paused && audioCtx.state==='suspended'`),true,'returning to race requires explicit resume');
  await page.keyboard.press('KeyP');await state('running');
  assert.equal(await run(`paused`),false,'keyboard P resumes gameplay and native audio');
  await run(`togglePause();audioCtx.suspend()`);await state('suspended');
  await run(`navigator.getGamepads=()=>[{axes:[0,0,0,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===9,value:i===9?1:0}))}];keys.gp_start_last=false;pollGamepads();`);
  await state('running');
  assert.equal(await run(`paused`),false,'gamepad Start resumes native audio');
  await run(`navigator.getGamepads=()=>[];togglePause();audioCtx.suspend()`);await state('suspended');
  await page.locator('#start-btn').click();await state('running');
  assert.equal(await run(`paused`),false,'pointer resume restores native audio');
  return {nativeAudio:'passed',keyboardResume:true,gamepadResume:true,pointerResume:true};
 }finally{await page.close();}
}
module.exports={audioBrowserChecks};
