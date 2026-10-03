const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const {scenarios}=require('./scenarios.cjs');
(async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(!source.includes('__audit'),'test bridge must never ship in game');
 const injected=source.replace('resetGame(); updateHUD(); drawRouteMap(); render(0);','window.__audit=code=>eval(code);resetGame(); updateHUD(); drawRouteMap(); render(0);');
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(req.url.startsWith('/audit')?injected:source)});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});
 const output=path.join(__dirname,'../test-results');fs.mkdirSync(output,{recursive:true});
 const errors=[];let summary;
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0});
  await page.goto(url+'/audit');
  const run=code=>page.evaluate(code=>window.__audit(code),code);
  summary=await scenarios(run);
  // End-to-end keyboard probe: actual DOM key events must create drift charge and allow direct N activation.
  await run(`resetGame();gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;crashSequence=null;traffic=[];overlay.classList.add('hidden');playerZ=220*SEGMENT_LENGTH;speed=150;roadGrip=1;driveGear='D';motionDirection=1;currentGear='LOW';nitro=0;nitroStock=0;boostRemaining=0;`);
  await page.keyboard.down('KeyW');await page.keyboard.down('ArrowRight');await page.keyboard.down('ShiftLeft');
  await run(`for(let i=0;i<50;i++)update(1/60);`);
  await page.keyboard.up('ShiftLeft');await page.keyboard.up('ArrowRight');await page.keyboard.up('KeyW');
  const driftProbe=await run(`[isDrifting,nitro,driftChargeRate,speed,Math.abs(driftAngle),Math.abs(slipAngle)]`);
  assert.equal(driftProbe[0],true,'real keyboard Shift+steer enters drift');
  assert(driftProbe[1]>5,'real keyboard drift visibly charges nitro');
  assert(driftProbe[4]>4&&driftProbe[5]>2,'drift has visible yaw and slip');
  await run(`nitroStock=1;nitro=0;boostRemaining=0;nitroLatch=false;boosting=false;speed=170;driveGear='D';motionDirection=1;updateNitroHUD();`);
  await page.keyboard.down('KeyN');await run(`update(1/60);`);await page.keyboard.up('KeyN');
  const nitroProbe=await run(`[boosting,boostRemaining,nitroStock,speed,nitroLatch]`);
  assert.equal(nitroProbe[0],true,'real keyboard N activates boost without requiring simultaneous throttle');
  assert(nitroProbe[1]>2.7&&nitroProbe[2]===0&&nitroProbe[3]>170&&nitroProbe[4], 'nitro stock produces immediate acceleration and latch');
  // Real keyboard simultaneous boost + drift-charge probe.
  // Reset the drift input edge state as a real released-key frame would before beginning a new maneuver.
  await run(`resetDrivingState();playerZ=220*SEGMENT_LENGTH;playerX=0;lateralVelocity=0;traffic=[];nitro=10;nitroStock=1;boostRemaining=0;nitroLatch=false;boosting=false;speed=185;driveGear='D';motionDirection=1;roadGrip=1;currentGear='HIGH';keys.KeyN=false;`);
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
  assert(simultaneous[4]>210,'nitro delivers a strong forward surge');
  assert(Math.abs(simultaneous[5])>35,'whole-car visual yaw is clearly sideways during drift');
  for(const id of ['1A','2B','3A','4A','4C','5A','5B','5C','5D','5E']){
   await run(`v34Mode='cruise';selectedRoute=routeForId('${id}');resetGame();gameStarted=true;raceActive=true;playerZ=36000;overlay.classList.add('hidden');render(0);`);
   await page.locator('#gameCanvas').screenshot({path:path.join(output,`${id}.png`)});
  }
  // Real DOM keyboard, pointers, pause and menus, without the injected test bridge.
  for(const [name,viewport] of [['desktop',{width:1280,height:800}],['phone',{width:390,height:844}],['landscape',{width:844,height:390}]]){
   const context=await browser.newContext({viewport,hasTouch:name!=='desktop',isMobile:name!=='desktop'});
   const live=await context.newPage();live.on('pageerror',error=>errors.push(error.message));
   await live.goto(url);
   assert.equal(await live.locator('#build-version').isVisible(),true,`${name} build version visible`);
   assert.match(await live.locator('#build-version').textContent(),/V51\.0/,`${name} correct V51 build label`);
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
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({status:'passed',...summary,viewports:3,runtimeErrors:errors},null,2));
  console.log({status:'passed',...summary,viewports:3});
 }catch(error){fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({status:'failed',error:error.stack,runtimeErrors:errors},null,2));throw error;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
