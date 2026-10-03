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
   assert.match(await live.locator('#build-version').textContent(),/V49\.0/,`${name} correct V49 build label`);
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
