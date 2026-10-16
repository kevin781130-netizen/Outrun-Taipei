'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const marker='resetGame(); updateHUD(); drawRouteMap(); render(0);';
assert.equal(source.split(marker).length,2,'unique boot hook marker');
const html=source.replace(marker,'window.__chainTestEval=code=>eval(code);'+marker);
const allowed=new Set(['assets/vendor/three-r149.min.js','assets/hybrid-renderer.js','assets/traffic-lane-intent.js','assets/perf-diagnostics.js']);
const server=http.createServer((req,res)=>{
 const route=new URL(req.url,'http://localhost').pathname.slice(1);
 if(route===''||route==='index.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 if(!allowed.has(route)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type','application/javascript; charset=utf-8');
 fs.createReadStream(path.join(root,route)).pipe(res);
});
const out=path.join(root,'test-results/stage36-chain-browser');
async function main(){
 fs.mkdirSync(out,{recursive:true});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let browser;
 const report={status:'failed',scope:'local Playwright Chromium, not deployed browser or human feel validation',checks:[],errors:[]};
 try{
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader'],
    ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('http://127.0.0.1:'+server.address().port+'/?handling=v59&drift=chain2');
  await page.waitForFunction(()=>window.v56ThreeStatus?.().loaded,{timeout:20000});
  const run=expr=>page.evaluate(s=>window.__chainTestEval(s),expr);
  const snapshot=()=>run('({active:isDrifting,dir:driftDirection,yaw:driftAngle,slip:slipAngle,visualYaw:v51DriftVisualYaw(),state:driftState,clean:cleanDriftTime,charge:driftChargeRate,stock:nitroStock})');
  const tick=n=>run('(()=>{const states=[];for(let i=0;i<'+n+';i++){update(1/60);states.push({active:isDrifting,state:driftState});}render(0);return states;})()');
  assert(await run('handlingProfile59&&v59Chain2&&bestRecordKey().endsWith(":H59.2")'));
  // The shipped scene becomes ready after the first render (rAF is disabled here).
  await run('render(0)');
  assert((await page.evaluate(()=>window.v56ThreeStatus())).ready,'real WebGL game must be ready after first render');
  for(const side of [1,-1]){
   await run("v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;traffic=[];collisionCooldown=100;timeLeft=9999;playerX=0;playerZ=180*SEGMENT_LENGTH;speed=175;currentGear='HIGH';driveGear='D';motionDirection=1;roadGrip=1;overlay.classList.add('hidden');for(const s of segments)s.curve="+(side*.8));
   const first=side===1?'ArrowRight':'ArrowLeft',second=side===1?'ArrowLeft':'ArrowRight';
   await page.keyboard.down('KeyW');await page.keyboard.down(first);await page.keyboard.down('ShiftLeft');
   await tick(23);await page.keyboard.up('ShiftLeft');
   let shot=await snapshot();
   assert(shot.active&&shot.dir===side&&Math.sign(shot.yaw)===side,'original slide starts normally');
   await page.keyboard.up(first);await page.keyboard.down(second);
   let states=await tick(52),opposite=await snapshot();
   assert(states.every(x=>x.active&&x.state!=='recover'),'reversal cannot cut drift');
   assert(opposite.active&&opposite.dir===-side&&Math.sign(opposite.yaw)===-side&&Math.sign(opposite.slip)===-side,'keyboard reverses real drift');
   assert(Math.sign(opposite.visualYaw)===-side,'WebGL visual yaw must face new slide');
   await page.keyboard.up(second);await page.keyboard.down(first);
   states=await tick(52);shot=await snapshot();
   assert(states.every(x=>x.active&&x.state!=='recover'),'return reversal cannot recover');
   assert(shot.active&&shot.dir===side&&Math.sign(shot.yaw)===side,'keyboard slides back to original side');
   assert(shot.clean>opposite.clean,'style combo remains continuous');
   const png=await page.evaluate(()=>document.getElementById('v56-full-3d-canvas').toDataURL('image/png'));
   const file=path.join(out,'chain-'+(side>0?'right':'left')+'.png');
   fs.writeFileSync(file,Buffer.from(png.split(',')[1],'base64'));
   assert(fs.statSync(file).size>5000,'WebGL screenshot must not be empty');
   await page.keyboard.up(first);await page.keyboard.up('KeyW');
   report.checks.push(side>0?'right-left-right keyboard + WebGL':'left-right-left keyboard + WebGL');
  }
  // CHAIN3 uses a separate URL. Verify the real browser presents no gear
  // actions while keeping Taipei WebGL, keyboard steering and custom nitro.
  for(const profile of ['chain3','chain4','chain5','chain6','chain7']){
  const kart=await browser.newPage({viewport:{width:1280,height:800}});
  kart.on('pageerror',e=>report.errors.push(profile+' '+e.message));
  await kart.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await kart.goto('http://127.0.0.1:'+server.address().port+'/?handling=v59&drift='+profile);
  await kart.waitForFunction(()=>window.v56ThreeStatus?.().loaded,{timeout:20000});
  const ka=expr=>kart.evaluate(s=>window.__chainTestEval(s),expr);
  assert(await ka('v59Arcade3&&v59Chain2&&bestRecordKey().endsWith(":'+(profile==='chain7'?'H59.7':profile==='chain6'?'H59.6':profile==='chain5'?'H59.5':profile==='chain4'?'H59.4':'H59.3')+'")'));
  if(['chain4','chain5','chain6','chain7'].includes(profile))assert(await ka('v59Arcade4'));
  if(['chain5','chain6','chain7'].includes(profile))assert(await ka('v59Arcade5'));
  if(['chain6','chain7'].includes(profile))assert(await ka('v59Arcade6'));
  if(profile==='chain7')assert(await ka('v59Arcade7'));
  assert(await kart.locator('#btn-drive').evaluate(el=>getComputedStyle(el).display==='none'));
  assert(await kart.locator('#btn-gear').evaluate(el=>getComputedStyle(el).display==='none'));
  await ka('render(0)');
  assert((await kart.evaluate(()=>window.v56ThreeStatus())).ready,'CHAIN3 Taipei WebGL active');
  await ka("v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;traffic=[];collisionCooldown=100;timeLeft=9999;playerZ=180*SEGMENT_LENGTH;speed=182;currentGear='HIGH';roadGrip=1");
  await kart.keyboard.down('KeyW');await kart.keyboard.down('ArrowRight');await kart.keyboard.down('ShiftLeft');
  await ka('for(let i=0;i<25;i++)update(1/60)');
  const early=await ka('({active:isDrifting,driftDirection,charge:driftChargeRate,nitro,gear:currentGear})');
  assert(early.active&&early.driftDirection===1&&early.charge>0,'CHAIN3 must enter real drift and charge');
  await kart.keyboard.up('ShiftLeft');
  await ka('for(let i=0;i<50;i++)update(1/60)');
  const held=await ka('({x:playerX,charge:driftChargeRate,nitro,gear:currentGear,speed})');
  assert(held.nitro>early.nitro,'CHAIN3 must charge during held slide');
  assert.equal(held.gear,'HIGH','gearless handling cannot change gear');
  await kart.keyboard.up('ArrowRight');await kart.keyboard.up('KeyW');
  if(profile==='chain7'){
    // Measure actual WebGL district change after 2D sprites are skipped, while
    // preserving the same active drift inputs, route choice and GPU surface.
    const fork=await ka(`(()=>{
      v34Mode='arcade';setStage(0,0,false);gameStarted=true;raceActive=true;
      inRadioScreen=false;paused=false;gameOver=false;speed=180;roadGrip=1;
      const misses=v54LandmarkCacheStats().misses;
      const predicted=JSON.stringify(v58NextRaceSigns(1,0));
      choiceLocked=true;pendingChoice='left';playerZ=FORK_LOCK*SEGMENT_LENGTH;
      const warmStart=v56Scene.landmarkWarmCount;
      for(let n=0;n<40;n++)render(1/60);
      const warmed=v56Scene.landmarkWarmCount;
      stageTransition={choice:'left',nextLevel:1,nextColumn:0,next:STAGES[1][0],lastCenter:0,progress:1};
      playerZ=STAGE_SWITCH*SEGMENT_LENGTH+SEGMENT_LENGTH*.15;
      driftState='drift';driftDirection=1;isDrifting=true;driftAge=.8;cleanDriftTime=.65;
      driftAngle=21;slipAngle=12;lateralVelocity=.37;nitro=24;
      const before={driftAngle,slipAngle,lateralVelocity,nitro};
      const t=performance.now();finishStageTransition();const elapsed=performance.now()-t;
      const signMatch=predicted===JSON.stringify(v58RaceSigns());
      render(1/60);
      const after={driftAngle,slipAngle,lateralVelocity,nitro};
      return {before,after,id:currentNode.id,elapsed,missesBefore:misses,missesAfter:v54LandmarkCacheStats().misses,
        hints:stageLandmarkPlan.every(h=>h.sprite?.metadataOnly),ready:v56Scene.ready,signMatch,warmStart,warmed};
    })()`);
    assert.equal(fork.id,'2A','map choice must still reach 2A');
    assert.deepEqual(fork.before,fork.after,'no drift momentum interruption at real WebGL route switch');
    assert.equal(fork.missesAfter,fork.missesBefore,'full 3D route swap cannot rasterize a massive hidden landmark sprite');
    assert(fork.hints&&fork.ready,'author-defined Taipei landmarks remain planned and WebGL renders');
    assert(fork.signMatch,'prepainted road-sign labels must exactly match the actual 2A stage');
    assert(fork.warmed>fork.warmStart,'next Taipei district models were built before switch');
    report.checks.push('CHAIN7 WebGL district switch no 2D sprite rasterization; '+fork.elapsed.toFixed(2)+'ms swap');
  }
  report.checks.push(profile.toUpperCase()+' gearless UI + WebGL + held-slide charging');
  await kart.close();
  }
  assert.deepEqual(report.errors,[],'no browser page errors');
  report.status='passed';
  console.log('CHAIN2 Chromium PASS: '+report.checks.join('; '));
 }catch(error){report.error=error.stack||String(error);throw error;}
 finally{
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
  await browser?.close();
  await new Promise(ok=>server.close(ok));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
