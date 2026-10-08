const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const {scenarios}=require('./scenarios.cjs');
const {audioBrowserChecks}=require('./audio-browser.cjs');
(async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(!source.includes('__audit'),'test bridge must never ship in game');
 const injected=source.replace('resetGame(); updateHUD(); drawRouteMap(); render(0);','window.__audit=code=>eval(code);resetGame(); updateHUD(); drawRouteMap(); render(0);');
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(req.url.startsWith('/audit')?injected:source)});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`;
 const output=path.join(__dirname,'../test-results');fs.mkdirSync(output,{recursive:true});
 const errors=[];let summary,browser;
 try{
  browser=await chromium.launch({headless:true});
  const audio=await audioBrowserChecks(browser,url,errors);
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0});
  await page.goto(url+'/audit');
  const run=code=>page.evaluate(code=>window.__audit(code),code);
  summary=await scenarios(run);
  // V52: rendered menu numbers must equal the gameplay constants (real DOM).
  const ruleDom=await run(`(()=>{applyRuleLabels();const els=[...document.querySelectorAll('[data-rule]')];const v=ruleValues();return {n:els.length,ok:els.every(el=>el.textContent===String(v[el.dataset.rule])&&el.textContent.length>0),menu:document.querySelector('#overlay .spec-grid')?.textContent||''};})()`);
  assert(ruleDom.n>=6&&ruleDom.ok,'every data-rule label shows the authoritative constant');
  const ruleVals=await run(`JSON.stringify(ruleValues())`).then(JSON.parse);
  assert(ruleDom.menu.includes(String(ruleVals.topSpeed))&&ruleDom.menu.includes(String(ruleVals.boostSpeed))&&ruleDom.menu.includes(String(ruleVals.nitroDuration))&&!ruleDom.menu.includes('4.00'),'menu speed caps and nitro duration match gameplay');
  // End-to-end keyboard probe: actual DOM key events must create drift charge and allow direct N activation.
  await run(`v34Mode='cruise';selectedRoute=routeForId('4B');resetGame();gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;crashSequence=null;traffic=[];overlay.classList.add('hidden');const candidates=segments.filter(s=>s.index>80&&s.index<STAGE_END-80);const target=candidates.reduce((best,seg)=>Math.abs(seg.curve)>Math.abs(best.curve)?seg:best,candidates[0]);window.__driftIndex=target.index;playerZ=target.index*SEGMENT_LENGTH;speed=150;roadGrip=1;driveGear='D';motionDirection=1;currentGear='LOW';nitro=0;nitroStock=0;boostRemaining=0;`);
  await page.keyboard.down('KeyW');await page.keyboard.down('ArrowRight');await page.keyboard.down('ShiftLeft');
  await run(`for(let i=0;i<50;i++)update(1/60);`);
  await page.keyboard.up('ShiftLeft');await page.keyboard.up('ArrowRight');await page.keyboard.up('KeyW');
  const driftProbe=await run(`[isDrifting,nitro,driftChargeRate,speed,Math.abs(driftAngle),Math.abs(slipAngle),v51CurrentCurve(),Math.abs(v51DriftVisualYaw()),v51VisualCurveCap(v51CurrentCurve())]`);
  assert.equal(driftProbe[0],true,'real keyboard Shift+steer enters drift');
  assert(driftProbe[1]>5,'real keyboard drift visibly charges nitro');
  assert(driftProbe[4]>4&&driftProbe[5]>2,'drift has visible yaw and slip');
  assert(Math.abs(driftProbe[6])>.7,'browser drift probe uses a genuinely curved Taipei road segment');
  assert(driftProbe[7]<=driftProbe[8]+.1,'visual sideways yaw is capped by actual road curvature');
  await run(`render(0);`);
  const tightShot=path.join(output,'v51-tight-drift.png');await page.locator('#gameCanvas').screenshot({path:tightShot});assert(fs.statSync(tightShot).size>10000,'tight-drift screenshot is nonblank');
  await run(`nitroStock=1;nitro=0;boostRemaining=0;nitroLatch=false;boosting=false;speed=170;driveGear='D';motionDirection=1;updateNitroHUD();`);
  await page.keyboard.down('KeyN');await run(`update(1/60);`);await page.keyboard.up('KeyN');
  const nitroProbe=await run(`[boosting,boostRemaining,nitroStock,speed,nitroLatch]`);
  assert.equal(nitroProbe[0],true,'real keyboard N activates boost without requiring simultaneous throttle');
  assert(nitroProbe[1]>2.7&&nitroProbe[2]===0&&nitroProbe[3]>170&&nitroProbe[4], 'nitro stock produces immediate acceleration and latch');
  // Real keyboard simultaneous boost + drift-charge probe.
  // Reset the drift input edge state as a real released-key frame would before beginning a new maneuver.
  await run(`resetDrivingState();playerZ=window.__driftIndex*SEGMENT_LENGTH;playerX=0;lateralVelocity=0;traffic=[];nitro=10;nitroStock=1;boostRemaining=0;nitroLatch=false;boosting=false;speed=185;driveGear='D';motionDirection=1;roadGrip=1;currentGear='HIGH';keys.KeyN=false;`);
  await page.keyboard.down('KeyW');await page.keyboard.down('ArrowRight');await page.keyboard.down('ShiftLeft');
  await run(`for(let i=0;i<20;i++)update(1/60);`);
  const preBoostDrift=await run(`[isDrifting,nitro,driftChargeRate,Math.abs(v51DriftVisualYaw())]`);
  assert(preBoostDrift[0]&&preBoostDrift[2]>0,'real keyboard drift is active and charging before nitro release');
  const beforeSim=preBoostDrift[1];
  await page.keyboard.down('KeyN');await run(`update(1/60);`);await page.keyboard.up('KeyN');
  const releaseFrame=await run(`[boosting,isDrifting,boostRemaining,nitro,driftChargeRate,speed]`);
  assert(releaseFrame[0]&&releaseFrame[1]&&releaseFrame[2]>2.7,'nitro release does not interrupt an active drift');
  await run(`for(let i=0;i<12;i++)update(1/60);`);
  const simultaneous=await run(`[boosting,isDrifting,nitro,driftChargeRate,speed,v51DriftVisualYaw()]`);
  await page.keyboard.up('ShiftLeft');await page.keyboard.up('ArrowRight');await page.keyboard.up('KeyW');
  assert(simultaneous[0]&&simultaneous[1],'boost remains active while the car is drifting');
  assert(simultaneous[2]>beforeSim&&simultaneous[3]>0,'nitro meter continues charging during active boost drift');
  assert(simultaneous[4]>releaseFrame[5]+6,'nitro delivers a forward surge (V53: relaxing push, smaller impulse)');
  assert(Math.abs(simultaneous[5])>30,'whole-car visual yaw is clearly sideways during a real tight bend');
  const tightCap=await run(`v51VisualCurveCap(v51CurrentCurve())`);assert(Math.abs(simultaneous[5])<=tightCap+.1,'tight-bend sideways yaw stays within curve-derived cap');
  await run(`const candidates=segments.filter(s=>s.index>80&&s.index<STAGE_END-80);const shallow=candidates.reduce((best,seg)=>Math.abs(Math.abs(seg.curve)-.35)<Math.abs(Math.abs(best.curve)-.35)?seg:best,candidates[0]);playerZ=shallow.index*SEGMENT_LENGTH;isDrifting=true;driftState='drift';driftDirection=Math.sign(shallow.curve)||1;driftAngle=30*driftDirection;slipAngle=9*driftDirection;render(0);window.__shallowVisual=[Math.abs(v51DriftVisualYaw()),v51VisualCurveCap(v51CurrentCurve()),Math.abs(v51CurrentCurve())];`);
  const shallowVisual=await run(`[...window.__shallowVisual]`);assert(shallowVisual[0]<=shallowVisual[1]+.1&&shallowVisual[0]<42,'shallow bend uses a smaller sideways angle');
  const shallowShot=path.join(output,'v51-shallow-drift.png');await page.locator('#gameCanvas').screenshot({path:shallowShot});assert(fs.statSync(shallowShot).size>10000,'shallow-drift screenshot is nonblank');
  for(const id of ['1A','2A','2B','3A','3B','3C','4A','4B','4C','4D','5A','5B','5C','5D','5E']){
   await run(`v34Mode='cruise';selectedRoute=routeForId('${id}');resetGame();gameStarted=true;raceActive=true;playerZ=36000;overlay.classList.add('hidden');render(0);`);
   const shot=path.join(output,`${id}.png`);await page.locator('#gameCanvas').screenshot({path:shot});assert(fs.statSync(shot).size>10000,`${id} route screenshot is nonblank`);
  }
  // Real DOM keyboard, pointers, pause and menus, without the injected test bridge.
  for(const [name,viewport] of [['desktop',{width:1280,height:800}],['phone',{width:390,height:844}],['landscape',{width:844,height:390}]]){
   const context=await browser.newContext({viewport,hasTouch:name!=='desktop',isMobile:name!=='desktop'});
   const live=await context.newPage();live.on('pageerror',error=>errors.push(error.message));
   await live.goto(url);
   assert.equal(await live.locator('#build-version').isVisible(),true,`${name} build version visible`);
   assert.match(await live.locator('#build-version').textContent(),/V55\.0/,`${name} correct V56.0 build label`);
   await live.locator('#start-btn').click();
   assert.equal(await live.locator('#radio-actions').isVisible(),true);
   await live.locator('#radio-next').click();
   await live.screenshot({path:path.join(output,`${name}-radio.png`)});
   await live.locator('#radio-drive').click();
   await live.waitForTimeout(3600);
   await live.keyboard.down('KeyW');await live.waitForTimeout(600);await live.keyboard.up('KeyW');
   await live.locator('#pause-btn').click();
   assert.equal(await live.locator('#start-btn').textContent(),'RESUME / 繼續');
   await live.locator('#start-btn').click();
   await live.locator('#atlas-btn').click();
   assert.equal(await live.locator('#atlas-modal').isVisible(),true);
   await live.locator('#atlas-close').click();
   // Pointer capture release must not leave an active throttle button.
   await live.locator('#btn-accel').click();
   assert.equal(await live.locator('#btn-accel').evaluate(el=>el.classList.contains('active')),false);
   await live.screenshot({path:path.join(output,`${name}-race.png`)});
   const overflow=await live.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   assert.equal(overflow,false,`${name} horizontal overflow`);
   await context.close();
  }
  assert.deepEqual(errors,[],'browser runtime errors');
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({status:'passed',...summary,viewports:3,...audio,runtimeErrors:errors},null,2));
  console.log({status:'passed',...summary,viewports:3,...audio});
 }catch(error){fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({status:'failed',error:error.stack,runtimeErrors:errors},null,2));throw error;}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
