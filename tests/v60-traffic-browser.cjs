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
 ['/assets/traffic-lane-intent.js','assets/traffic-lane-intent.js']
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
   const samples=await audit(page,'(()=>{const start=performance.now();for(let i=0;i<240;i++)update(1/60);return {elapsedMs:performance.now()-start,position:traffic[0].x,score,crashes:crashCount,route:currentNode.id};})()');
   assert(samples.position<-.15&&samples.route==='1A','safe traffic lane progression');
   assert(Number.isFinite(samples.elapsedMs)&&samples.elapsedMs>=0&&samples.elapsedMs<20000,'bounded 240-frame CPU-only update');
   assert.equal(samples.crashes,0);
   result.timings.push({viewport:name,frames:240,CPUUpdateMs:samples.elapsedMs,note:'simulation CPU timing, not GPU FPS'});
   result.captures.push(await capture(page,'v60-'+name));
   result.viewports.push({name,width:viewport.width,height:viewport.height,AI:true});
   await page.close();
  }

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
    'traffic[0].x=9;traffic[0].laneTarget=9;traffic[0].previousX=9;',
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
