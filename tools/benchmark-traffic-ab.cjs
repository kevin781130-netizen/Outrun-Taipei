'use strict';
// V68 controlled A/B: complete game from one source revision; only the
// traffic queue function is substituted with its verbatim V67 control.
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/v68-traffic-ab');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const baseline=require('./fixtures/v67-queue-original.cjs');
const start=html.indexOf('function planTrafficQueue67('),end=html.indexOf('\nfunction stepTrafficAI60(',start);
assert(start>0&&end>start,'V68 queue function boundaries missing');
const optimized=html.slice(start,end);
assert.notEqual(optimized,baseline,'must compare two genuinely different schedulers');
assert(optimized.includes('peerById[id]')&&baseline.includes('peers.find('));
const marker='resetGame(); updateHUD(); drawRouteMap(); render(0);';
assert.equal(html.split(marker).length,2);
const hook='window.__v68Audit=code=>eval(code);'+marker;
const htmls={
  A:html.replace(optimized,baseline).replace(marker,hook),
  B:html.replace(marker,hook)
};
assert(!html.includes('__v68Audit'),'test-only evaluation hook must not ship');
const assets=new Map([
 ['/assets/vendor/three-r149.min.js','assets/vendor/three-r149.min.js'],
 ['/assets/hybrid-renderer.js','assets/hybrid-renderer.js'],
 ['/assets/traffic-lane-intent.js','assets/traffic-lane-intent.js'],
 ['/assets/perf-diagnostics.js','assets/perf-diagnostics.js']
]);
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/A'||url.pathname==='/B'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(htmls[url.pathname.slice(1)]);return;
 }
 const asset=assets.get(url.pathname);
 if(!asset){res.writeHead(404);res.end('not found');return;}
 res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store'});
 fs.createReadStream(path.join(root,asset)).pipe(res);
});
const scriptFixture=[
  "v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();",
  'gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;',
  "overlay.classList.add('hidden');crashSequence=null;collisionCooldown=100000;",
  'playerX=0;playerZ=1000;speed=0;timeLeft=999999;simulationTime=0;',
  'traffic=traffic.slice(0,12);',
  'for(let i=0;i<traffic.length;i++){const c=traffic[i];c.x=(i%3-1)*.468;',
  'c.laneTarget=c.x;c.z=20000+i*1450;c.previousX=c.x;c.previousZ=c.z;',
  'c.speed=i%4===0?200:110;c.targetSpeed=c.speed;c.near=false;c.hitTimer=0;',
  'c.cp=null;c.v60Think=0;c.v60Cooldown=i%3===0?3:0;c.v60PassActive=false;',
  'c.v67WaitRounds=i%4===0?3:0;}'
].join('');
const runCode=`(()=>{
  const start=performance.now();
  for(let i=0;i<360;i++)update(1/60);
  const simulationCpuMs=performance.now()-start;
  const outcome=JSON.stringify({route:currentNode.id,score,crashCount,playerZ,
    traffic:traffic.map(c=>({x:c.x,z:c.z,speed:c.speed,laneTarget:c.laneTarget,
      active:!!c.v60PassActive,cooldown:c.v60Cooldown||0,wait:c.v67WaitRounds||0}))});
  for(let i=0;i<traffic.length;i++){
    const c=traffic[i];c.v60PassActive=false;c.v60Think=0;c.v60Cooldown=i%3===0?3:0;
    c.laneTarget=c.x;
  }
  const peers=traffic.map((c,id)=>({id,x:c.x,z:c.z,speed:c.speed,
    halfWidth:trafficHalfWidth(c),laneTarget:c.laneTarget,passActive:false}));
  let lastCount=0;
  const microStart=performance.now();
  for(let n=0;n<5000;n++){
    for(const p of peers){p.passActive=false;p.laneTarget=p.x;}
    lastCount=planTrafficQueue67(peers,(FORK_WARN-28)*SEGMENT_LENGTH,1/60).size;
  }
  const queueCpuMs=performance.now()-microStart;
  return {simulationCpuMs,queueCpuMs,lastCount,outcome};
})()`;
const median=values=>{const xs=values.slice().sort((a,b)=>a-b),middle=xs.length>>1;return xs.length%2?xs[middle]:(xs[middle-1]+xs[middle])/2;};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const report={schema:'taipei.v68.traffic-ab.1',scope:'same Chromium/SwiftShader process; CPU only; no real device FPS',
   control:'V67 original queue fixture',candidate:'V68 cooldown fastpath + indexed peer lookup',
   scenario:{route:'1A',vehicles:12,simulationTicks:360,queueRepetitions:5000,viewport:[1280,800]},
   sequence:'ABBAABBA',runs:[],errors:[],status:'failed'};
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  for(const variant of 'ABBAABBA'){
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    page.on('pageerror',error=>report.errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
    await page.addInitScript(()=>{
      window.requestAnimationFrame=()=>0;let seed=681;
      Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    });
    await page.goto(base+'/'+variant,{waitUntil:'load'});
    await page.waitForFunction(()=>window.v56ThreeStatus?.().loaded,{timeout:20000});
    const evaluate=(code)=>page.evaluate(str=>window.__v68Audit(str),code);
    await evaluate(scriptFixture);
    assert.equal(await evaluate('trafficAI60Enabled()'),true,'real Cruise opt-in must be on');
    const result=await evaluate(runCode);
    assert(Number.isFinite(result.simulationCpuMs)&&result.simulationCpuMs>0);
    assert(Number.isFinite(result.queueCpuMs)&&result.queueCpuMs>0);
    report.runs.push({variant,simulationCpuMs:result.simulationCpuMs,
      queueCpuMs:result.queueCpuMs,lastQueueCount:result.lastCount,outcome:result.outcome});
    await page.close();
  }
  const all=report.runs;
  const control=all.filter(r=>r.variant==='A'),candidate=all.filter(r=>r.variant==='B');
  assert.equal(control.length,4);assert.equal(candidate.length,4);
  // Input/output equivalence is a hard gate; timing is observational only.
  assert(all.every(r=>r.outcome===all[0].outcome),'full 360-tick game state must be equal');
  assert.deepEqual(report.errors,[],'no console/runtime JS errors');
  const stats=field=>({
    controlMedianMs:median(control.map(x=>x[field])),
    candidateMedianMs:median(candidate.map(x=>x[field]))
  });
  report.simulation=stats('simulationCpuMs');report.queue=stats('queueCpuMs');
  report.status='passed';
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(report,null,2));
  console.log('V68 traffic A/B: 8 same-browser ABBA passes, 360 gameplay ticks + 5000 queues each; equal game states; no runtime errors');
  console.log('V68 simulation median CPU A='+report.simulation.controlMedianMs.toFixed(2)+'ms B='+report.simulation.candidateMedianMs.toFixed(2)+'ms');
  console.log('V68 queue median CPU A='+report.queue.controlMedianMs.toFixed(2)+'ms B='+report.queue.candidateMedianMs.toFixed(2)+'ms');
 }catch(error){
  report.failure=String(error.stack||error);
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(report,null,2));
  throw error;
 }finally{await browser?.close();}
})().catch(err=>{console.error(err);process.exitCode=1;}).finally(()=>new Promise(resolve=>server.close(resolve)));
