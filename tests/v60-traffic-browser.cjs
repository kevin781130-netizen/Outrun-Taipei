'use strict';
// Browser-only instrumentation is injected at response time. Never ship the eval hook.
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'test-results/v60-traffic-webgl');
const raw=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const MARK='resetGame(); updateHUD(); drawRouteMap(); render(0);';
assert.equal(raw.split(MARK).length,2,'test hook anchor must be unique');
assert(!raw.includes('__v60BrowserAudit'),'instrumentation must not be shipped');
const html=raw.replace(MARK,'window.__v60BrowserAudit=code=>eval(code);'+MARK);
const ASSETS=new Map([
 ['/assets/vendor/three-r149.min.js','assets/vendor/three-r149.min.js'],
 ['/assets/hybrid-renderer.js','assets/hybrid-renderer.js'],
 ['/assets/traffic-lane-intent.js','assets/traffic-lane-intent.js'],
 ['/assets/perf-diagnostics.js','assets/perf-diagnostics.js']
]);
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/'||url.pathname==='/index.html'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(html);return;
 }
 const relative=ASSETS.get(url.pathname);
 if(!relative){res.writeHead(404);res.end('not found');return;}
 res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store'});
 fs.createReadStream(path.join(ROOT,relative)).pipe(res);
});
const audit=(page,code)=>page.evaluate(expression=>window.__v60BrowserAudit(expression),code);
const sceneReady=async(page)=>{
 await page.waitForFunction(()=>window.v56ThreeStatus?.().loaded,{timeout:20000});
 await audit(page,'render(0)');
 assert.equal(await page.evaluate(()=>window.v56ThreeStatus().ready),true,'actual WebGL scene must render');
 assert.equal(await page.locator('#v56-full-3d-canvas').count(),1);
 assert.equal(await page.locator('#gameCanvas').evaluate(el=>getComputedStyle(el).visibility),'hidden');
};
function fixture(mode,playerZ=1000){
 return [
  "v34Mode='"+mode+"';selectedRoute=routeForId('1A');resetGame();",
  'gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;',
  "overlay.classList.add('hidden');crashSequence=null;collisionCooldown=100;",
  'playerX=0;playerZ='+playerZ+';speed=0;timeLeft=9999;simulationTime=0;',
  'const fast=traffic[0],slow=traffic[1];traffic=[fast,slow];',
  'fast.x=0;fast.laneTarget=0;fast.z=20000;fast.speed=190;fast.targetSpeed=190;fast.phase=0;',
  'slow.x=0;slow.laneTarget=0;slow.z=24000;slow.speed=120;slow.targetSpeed=120;slow.phase=0;',
  'for(const car of traffic){car.previousX=car.x;car.previousZ=car.z;car.near=false;car.hitTimer=0;car.cp=null;}'
 ].join('');
}
const snapshot='({cars:traffic.map(c=>({x:c.x,z:c.z,laneTarget:c.laneTarget,speed:c.speed,near:c.near,hitTimer:c.hitTimer})),score,crashCount,playerX,playerZ,timeLeft,stage:currentNode.id})';
const tick=(page,n=1)=>audit(page,'for(let i=0;i<'+n+';i++)update(1/60);');
async function capture(page,name){
 await audit(page,'render(1/60)');
 const image=await page.locator('#v56-full-3d-canvas').evaluate(el=>el.toDataURL('image/png'));
 assert(image.startsWith('data:image/png;base64,'),'WebGL framebuffer PNG capture');
 const bytes=Buffer.from(image.split(',')[1],'base64');
 const file=name+'.png';fs.writeFileSync(path.join(OUT,file),bytes);
 assert(bytes.length>5000,'WebGL framebuffer not blank: '+file);
 return {file,bytes:bytes.length};
}
async function newPage(browser,base,query,viewport,errors){
 const page=await browser.newPage({viewport});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await page.goto(base+'/?'+query,{waitUntil:'load'});
 await sceneReady(page);
 return page;
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const result={status:'failed',scope:'local Chromium/WebGL only; no deployed preview verification',viewports:[],errors:[],captures:[],timings:[]};
 let browser;
 try{
  const options={headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']};
  if(process.env.CHROMIUM_PATH)options.executablePath=process.env.CHROMIUM_PATH;
  browser=await chromium.launch(options);
  const desktop={width:1280,height:800};
  // Comparing independently loaded real runtime contexts catches hidden ranked effects.
  const normal=await newPage(browser,base,'',desktop,result.errors);
  await audit(normal,fixture('arcade'));
  await tick(normal,90);
  const defaultState=await audit(normal,snapshot);
  const defaultKey=await audit(normal,'arcadeBoardKey()');
  await normal.close();
  const rankedFlag=await newPage(browser,base,'trafficAI=v60',desktop,result.errors);
  await audit(rankedFlag,fixture('arcade'));
  assert.equal(await audit(rankedFlag,'trafficAI60Enabled()'),false,'ranked mode rejects AI');
  await tick(rankedFlag,90);
  assert.deepEqual(await audit(rankedFlag,snapshot),defaultState,'90 ranked frames must equal default');
  assert.equal(await audit(rankedFlag,'arcadeBoardKey()'),defaultKey,'leaderboard key must remain identical');
  await rankedFlag.close();
  result.viewports.push({mode:'ranked default vs flagged',frames:90,equivalent:true});

  // Three actual WebGL viewport dimensions, with the preview enabled only in Cruise.
  for(const [name,viewport] of [
   ['desktop',desktop],['portrait',{width:390,height:844}],['landscape',{width:844,height:390}]
  ]){
   const page=await newPage(browser,base,'trafficAI=v60',viewport,result.errors);
   await audit(page,fixture('cruise'));
   assert.equal(await audit(page,'trafficAI60Enabled()'),true);
   assert.equal(await audit(page,"bestRecordKey().endsWith(':AI60')"),true);
   await tick(page,1);
   const intent=await audit(page,'({target:traffic[0].laneTarget,cooldown:traffic[0].v60Cooldown})');
   assert(intent.target<-.15&&intent.cooldown>3,'lead-car pass and cooldown');
   // Capture a real WebGL frame during the maneuver, not just after merging.
   await tick(page,24);
   const midTurn=await audit(page,'v57SceneFrame().traffic[0].turnYawRad');
   assert(Number.isFinite(midTurn)&&Math.abs(midTurn)>.005&&Math.abs(midTurn)<=.16,
    '3D vehicle heading follows current lateral movement');
   result.captures.push(await capture(page,'v60-'+name+'-turn'));
   const samples=await audit(page,'(()=>{const start=performance.now();for(let i=0;i<240;i++)update(1/60);return {elapsedMs:performance.now()-start,position:traffic[0].x,score,crashes:crashCount,route:currentNode.id};})()');
   assert(samples.position<-.15&&samples.route==='1A','safe traffic lane progression');
   assert(Number.isFinite(samples.elapsedMs)&&samples.elapsedMs>=0&&samples.elapsedMs<20000,'bounded 240-frame CPU-only update');
   assert.equal(samples.crashes,0);
   // CPU-side WebGL submission latency, not presentation-vsync FPS or real-device GPU time.
   const renderStats=await audit(page,'(()=>{const xs=[];for(let i=0;i<8;i++){const t=performance.now();render(0);xs.push(performance.now()-t);}xs.sort((a,b)=>a-b);return {meanMs:xs.reduce((a,b)=>a+b,0)/xs.length,p95Ms:xs[Math.ceil(xs.length*.95)-1]};})()');
   assert(Number.isFinite(renderStats.meanMs)&&renderStats.meanMs>=0);
   result.timings.push({viewport:name,frames:240,CPUUpdateMs:samples.elapsedMs,
    renderSubmitMeanMs:renderStats.meanMs,renderSubmitP95Ms:renderStats.p95Ms,
    renderSamples:8,note:'headless Chromium software WebGL timing, NOT device FPS'});
   console.log('V60 perf '+name+': 240 updates '+samples.elapsedMs.toFixed(1)+'ms; render-submit mean '
    +renderStats.meanMs.toFixed(1)+'ms p95 '+renderStats.p95Ms.toFixed(1)+'ms');
   result.captures.push(await capture(page,'v60-'+name));
   result.viewports.push({name,width:viewport.width,height:viewport.height,AI:true});
   await page.close();
  }

  // V61 in-flight intruder appears after a legally initiated pass.
  const hazard=await newPage(browser,base,'trafficAI=v60',desktop,result.errors);
  await audit(hazard,fixture('cruise'));
  await tick(hazard,1);
  assert.equal(await audit(hazard,'traffic[0].v60PassActive'),true);
  await audit(hazard,"traffic[1].x=traffic[0].laneTarget;traffic[1].laneTarget=traffic[1].x;traffic[1].z=traffic[0].z+1000;traffic[1].speed=195;traffic[1].targetSpeed=195;traffic[1].previousZ=traffic[1].z;traffic[1].previousX=traffic[1].x;");
  await tick(hazard,30);
  const abort=await audit(hazard,'({active:traffic[0].v60PassActive,reason:traffic[0].v60LastVeto,stopped:Math.abs(traffic[0].x-traffic[0].laneTarget)<1e-10})');
  assert.equal(abort.active,false,'intruding car cancels mid-pass');
  assert.equal(abort.reason,'traffic-path-blocked');
  assert(abort.stopped,'aborted lane transition is not teleported or reversed');
  await hazard.close();
  result.viewports.push({mode:'V61 mid-pass hazard',frames:30,aborted:true});

  // V62: real WebGL multi-vehicle contention for center lane.
  const merge=await newPage(browser,base,'trafficAI=v60',desktop,result.errors);
  await audit(merge,fixture('cruise'));
  await audit(merge,"const a=traffic[0],b=traffic[1],c={...a},d={...b};traffic=[a,b,c,d];const cfg=(car,x,z,v)=>{car.x=x;car.laneTarget=x;car.z=z;car.previousX=x;car.previousZ=z;car.speed=v;car.targetSpeed=v;car.hitTimer=0;car.near=false;car.v60PassActive=false;car.v60Think=0;car.v60Cooldown=0;};cfg(a,-.468,20000,190);cfg(b,.468,20400,190);cfg(c,-.468,24000,120);cfg(d,.468,24500,120);");
  await tick(merge,1);
  const m=await audit(merge,'({a:traffic[0].laneTarget,b:traffic[1].laneTarget,activeA:traffic[0].v60PassActive,activeB:traffic[1].v60PassActive})');
  assert.equal(m.a,0);assert.equal(m.b,.468);
  assert(m.activeA&&!m.activeB,'one reserver; no simultaneous center merge');
  await tick(merge,16);
  result.captures.push(await capture(merge,'v62-four-car-center'));
  result.viewports.push({mode:'V62 four-car stress',frames:17,protected:true});
  await merge.close();

  // V63: long-running game engine on the REAL 3D Chromium scene.
  // This is a fixed-tick endurance benchmark, NOT a wall-clock FPS assertion.
  const endurance=await newPage(browser,base,'trafficAI=v60',desktop,result.errors);
  const cdp=await endurance.context().newCDPSession(endurance);
  await cdp.send('Performance.enable');
  await cdp.send('HeapProfiler.enable');
  const heapSize=async()=>{
   await cdp.send('HeapProfiler.collectGarbage');
   const metrics=(await cdp.send('Performance.getMetrics')).metrics;
   const heap=metrics.find(m=>m.name==='JSHeapUsedSize')?.value;
   assert(Number.isFinite(heap),'Chrome must expose post-GC JS heap');
   return heap;
  };
  const runLongCycle=async(cycle)=>audit(endurance,`(()=>{
   v34Mode='cruise';gameStarted=true;raceActive=true;paused=false;gameOver=false;
   inRadioScreen=false;const all=STAGES.flat();
   let ticks=0,recycles=0,maxCars=0;
   const begin=performance.now();
   for(const route of all){
    const r=routeForId(route.id);
    setStage(r.level,r.column,false);
    raceActive=true;gameStarted=true;paused=false;gameOver=false;inRadioScreen=false;
    collisionCooldown=100000;timeLeft=999999;playerZ=8000;speed=0;
    const count=traffic.length;
    if(!count)throw Error('empty route traffic '+route.id);
    maxCars=Math.max(maxCars,count);
    for(let t=0;t<120;t++){
     if(t%40===0){
      const car=traffic[(t/40)%count];
      car.z=playerZ-2200;car.previousZ=car.z;
      car.near=false;car.hitTimer=0;
      car.v60Think=5;car.v60Cooldown=3;
      car.v60PassActive=true;car.v60LastVeto='stale';
      update(1/60);
      if(car.v60Think!==0||car.v60Cooldown!==0||car.v60PassActive!==false||
         car.v60LastVeto!==null)throw Error('recycle stale AI '+route.id);
      recycles++;
     }else update(1/60);
     ticks++;
     if(traffic.length!==count)throw Error('growing traffic array '+route.id);
    }
    render(0);
    if(!Number.isFinite(score)||traffic.some(car=>![car.x,car.z,car.laneTarget,car.speed].every(Number.isFinite)))
     throw Error('nonfinite race state '+route.id);
   }
   return {cycle:${cycle},ticks,recycles,maxCars,CPUUpdatesAndRenderMs:performance.now()-begin};
  })()`);
  // First full traversal populates normal route/render caches. Subsequent
  // traversals must not accumulate long-lived AI or traffic allocations.
  const warm=await runLongCycle(0);
  const initialHeap=await heapSize();
  const longStats=[];
  const heapCheckpoints=[initialHeap];
  for(let c=1;c<=3;c++){
   const metrics=await runLongCycle(c);
   longStats.push(metrics);
   heapCheckpoints.push(await heapSize());
   assert.equal(metrics.ticks,1800);
   assert.equal(metrics.recycles,45);
  }
  const growth=Math.max(...heapCheckpoints.slice(1))-initialHeap;
  // Generous allowance for JIT and route caches; reject major retained growth.
  assert(growth<32*1024*1024,'V63 post-GC JS heap grew more than 32 MiB');
  const longResult={mode:'V63 15-route WebGL endurance',warmup:warm,cycles:longStats,
   heapBytesAfterGC:heapCheckpoints,heapPeakGrowthBytes:growth,
   note:'Chromium software-rendered JS heap only; excludes GPU/RSS and real device FPS'};
  result.endurance=longResult;
  console.log('V63 endurance: 7200 fixed ticks across 15 Taipei routes, 180 forced recycling events; '+
    'post-GC JS heap growth '+(growth/1048576).toFixed(2)+' MiB');
  result.captures.push(await capture(endurance,'v63-longrun-final'));
  await endurance.close();

  // V64: no monitoring in Arcade; opt-in Cruise exposes bounded, downloadable data.
  const perfArcade=await newPage(browser,base,'perf=v64',desktop,result.errors);
  await audit(perfArcade,fixture('arcade'));
  await audit(perfArcade,'loop(lastTime+17)');
  assert.equal(await perfArcade.locator('#v64-perf-panel').count(),0,'ranked mode never displays probe');
  assert.equal(await perfArcade.evaluate(()=>typeof window.v64PerfReport),'undefined','ranked mode never exports diagnostics');
  await perfArcade.close();
  const perfPage=await newPage(browser,base,'perf=v64',desktop,result.errors);
  await audit(perfPage,fixture('cruise'));
  await audit(perfPage,'for(let k=0;k<150;k++)loop(lastTime+16.7)');
  assert.equal(await perfPage.locator('#v64-perf-panel').count(),1,'probe controls appear only in opt-in cruise');
  const report=await perfPage.evaluate(()=>window.v64PerfReport());
  assert.equal(report.schema,'taipei.v64.frame-diagnostics.1');
  assert(report.sampleCount>=120&&report.sampleCount<=360);
  assert(report.framesPerSecond>55&&report.framesPerSecond<65,'real requestAnimationFrame timestamps');
  assert.equal(report.deviceInfo,'not-collected');
  assert(!JSON.stringify(report).includes('Mozilla/'),'browser fingerprint excluded');
  await perfPage.getByRole('button',{name:'重設數據'}).click();
  assert.equal(await perfPage.evaluate(()=>window.v64PerfReport().sampleCount),0,'HUD reset clears diagnostics only');
  await audit(perfPage,'for(let k=0;k<30;k++)loop(lastTime+16.7)');
  const downloadEvent=perfPage.waitForEvent('download');
  await perfPage.getByRole('button',{name:'匯出 JSON'}).click();
  const diagnosticFile=await downloadEvent;
  assert.equal(diagnosticFile.suggestedFilename(),'taipei-v64-diagnostics.json');
  const downloadPath=await diagnosticFile.path();
  const data=JSON.parse(fs.readFileSync(downloadPath,'utf8'));
  assert.equal(data.schema,'taipei.v64.frame-diagnostics.1');
  fs.writeFileSync(path.join(OUT,'v64-perf-sample.json'),JSON.stringify(data,null,2));
  await audit(perfPage,"v34Mode='arcade';loop(lastTime+16.7)");
  assert.equal(await perfPage.locator('#v64-perf-panel').count(),0,'mode switch removes probe');
  assert.equal(await perfPage.evaluate(()=>typeof window.v64PerfReport),'undefined');
  await perfPage.close();
  result.viewports.push({mode:'V64 opt-in performance monitor',frames:180,download:true,rankedIsolated:true});

  const safety=await newPage(browser,base,'trafficAI=v60',desktop,result.errors);
  await audit(safety,fixture('cruise',15000));
  await tick(safety);
  assert.equal(await audit(safety,'traffic[0].laneTarget'),0,'player proximity prevents overtake');
  // Actual traffic visibility comes from Three.js camera projection, not a test-owned hit box.
  await audit(safety,[
   "resetGame();v34Mode='cruise';gameStarted=true;raceActive=true;paused=false;gameOver=false;",
   "crashSequence=null;collisionCooldown=0;timeLeft=9999;playerZ=40*SEGMENT_LENGTH;playerX=0;speed=170;",
   "const car=traffic[0];traffic=[car];car.x=0;car.laneTarget=0;car.z=playerZ+PLAYER_DEPTH+100;",
   "car.previousX=car.x;car.previousZ=car.z;car.speed=0;car.targetSpeed=0;car.near=false;car.hitTimer=0;",
   'render(0);v57PrepareTrafficVisibility();'
  ].join(''));
  const hit=await audit(safety,'({visible:!!traffic[0].screenBox,contact:!!trafficContact({x:playerX,z:playerZ},traffic[0]),eligible:trafficRoadEligible(traffic[0])})');
  assert(hit.visible&&hit.contact&&hit.eligible,'only visible 3D traffic can physically hit');
  await tick(safety);
  assert.equal(await audit(safety,'crashCount'),1,'actual update generates one collision');
  await audit(safety,[
    'crashSequence=null;collisionCooldown=0;crashCount=0;speed=0;',
    'traffic[0].x=9;traffic[0].laneTarget=9;traffic[0].previousX=9;traffic[0].near=false;traffic[0].hitTimer=0;',
    'v57PrepareTrafficVisibility();'
  ].join(''));
  const ghost=await audit(safety,'({visible:!!traffic[0].screenBox,eligible:trafficRoadEligible(traffic[0])})');
  assert(!ghost.visible&&!ghost.eligible,'offroad invisible traffic has no collision box');
  await tick(safety);
  assert.equal(await audit(safety,'crashCount'),0,'ghost car does not crash player');
  await safety.close();

  assert.deepEqual(result.errors,[],'no JavaScript or browser console errors');
  result.status='passed';
  fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(result,null,2));
  console.log('V60 real Chromium WebGL: ranked equivalence, 3 preview viewports, visible-only collision, ghost-car safety, CPU metrics; screenshots captured for review');
 }catch(error){
  result.failure=error.stack||String(error);
  fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(result,null,2));
  throw error;
 }finally{await browser?.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>new Promise(done=>server.close(done)));
