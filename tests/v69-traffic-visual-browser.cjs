'use strict';
// V69: deterministic visual-quality evidence for the *real* WebGL render path.
// Screenshots and numeric trajectory metrics are retained for human review.
// The capture-only eval bridge is not added to the shipped HTML.
const assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'test-results/v69-traffic-visual');
const raw=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const HOOK='resetGame(); updateHUD(); drawRouteMap(); render(0);';
assert.equal(raw.split(HOOK).length,2,'test bridge injection point must be unique');
assert(!raw.includes('__v69VisualAudit'),'no shipping test bridge');
const html=raw.replace(HOOK,'window.__v69VisualAudit=expression=>eval(expression);'+HOOK);
const files=new Map([
 ['/assets/vendor/three-r149.min.js','assets/vendor/three-r149.min.js'],
 ['/assets/hybrid-renderer.js','assets/hybrid-renderer.js'],
 ['/assets/traffic-lane-intent.js','assets/traffic-lane-intent.js'],
 ['/assets/perf-diagnostics.js','assets/perf-diagnostics.js']
]);
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'||url.pathname==='/index.html'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(html);return;
 }
 const file=files.get(url.pathname);
 if(!file){res.writeHead(404);res.end('not found');return;}
 res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store'});
 fs.createReadStream(path.join(ROOT,file)).pipe(res);
});
const audit=(page,code)=>page.evaluate(s=>window.__v69VisualAudit(s),code);
const delayTicks=(page,n)=>audit(page,`for(let k=0;k<${n};k++)update(1/60);`);
const setup=(route,mode,night=false)=>[
 "v34Mode='"+mode+"';selectedRoute=routeForId('"+route+"');",
 "setStage(...Object.values(routeForId('"+route+"')),false);",
 'gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;',
 "overlay.classList.add('hidden');crashSequence=null;collisionCooldown=100000;timeLeft=999999;",
 "playerX=0;playerZ=1000;speed=0;simulationTime=0;",
 "skyMood='"+(night?'neon':'sunset')+"';",
 'const fast=traffic[0],slow=traffic[1];traffic=[fast,slow];',
 'fast.x=0;fast.laneTarget=0;fast.z=20000;fast.speed=190;fast.targetSpeed=190;fast.phase=0;',
 'slow.x=0;slow.laneTarget=0;slow.z=24000;slow.speed=120;slow.targetSpeed=120;slow.phase=0;',
 'for(const c of traffic){c.previousX=c.x;c.previousZ=c.z;c.near=false;c.hitTimer=0;c.cp=null;',
 'c.v60PassActive=false;c.v60Think=0;c.v60Cooldown=0;c.v67WaitRounds=0;}'
].join('');
const snapshot=`(()=>{
 const car=traffic[0],data=v57SceneFrame(),item=data.traffic[0];
 const segment=Math.max(0,Math.min(segments.length-1,Math.floor(car.z/SEGMENT_LENGTH)));
 const roads=roadCorridors(segment);
 return {route:currentNode.id,archetype:currentNode.archetype,
   carX:car.x,target:car.laneTarget,passActive:!!car.v60PassActive,
   veto:car.v60LastVeto||null,completed:car.v66CompletedPasses||0,
   turnYawRad:item.turnYawRad??null,eligible:item.eligible,
   corridors:roads,carHalf:trafficHalfWidth(car),
   fraction:data.fraction,geography:data.geographyProfile,
   deckMax:Math.max(...data.deckHeights),hills:data.hills.slice(0,126),
   curves:data.curves.slice(0,126),score,crashes:crashCount};
})()`;
async function startPage(browser,origin,mode,viewport,errors){
 const page=await browser.newPage({viewport});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await page.goto(origin+'/?'+mode,{waitUntil:'load'});
 await page.waitForFunction(()=>window.v56ThreeStatus?.().loaded,{timeout:20000});
 await audit(page,'render(0)');
 assert.equal(await page.evaluate(()=>window.v56ThreeStatus?.().ready),true,'WebGL scene ready');
 assert.equal(await page.locator('#gameCanvas').evaluate(el=>getComputedStyle(el).visibility),'hidden');
 assert.equal(await page.locator('#v56-full-3d-canvas').count(),1);
 return page;
}
async function shot(page,name,report){
 await audit(page,'render(0)');
 const rawPNG=await page.locator('#v56-full-3d-canvas').evaluate(canvas=>canvas.toDataURL('image/png'));
 assert(rawPNG.startsWith('data:image/png;base64,'),'rendered PNG');
 const data=Buffer.from(rawPNG.split(',')[1],'base64'),hash=crypto.createHash('sha256').update(data).digest('hex');
 assert(data.length>5000,'rendered PNG has meaningful image content '+name);
 const file=name+'.png';fs.writeFileSync(path.join(OUT,file),data);
 report.captures.push({file,bytes:data.length,sha256:hash});
 return hash;
}
function checkCar(s,label){
 assert(Number.isFinite(s.carX)&&Number.isFinite(s.target)&&Number.isFinite(s.turnYawRad),label+' finite car/heading');
 assert(Math.abs(s.turnYawRad)<=.1600001,label+' yaw bounded');
 assert(s.corridors.some(q=>Math.abs(s.carX-q.center)+s.carHalf*.82<=q.half+.08),
  label+' body center follows actual road corridor');
 assert(s.eligible===true,label+' vehicle is road eligible');
 assert.equal(s.crashes,0,label+' presentation must not cause collisions');
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const report={schema:'taipei.v69.traffic-visual.1',status:'failed',
  scope:'real headless Chromium/SwiftShader WebGL; snapshots and geometric invariants; not human visual approval',
  captures:[],scenarios:[],errors:[]};
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const desktop={width:1280,height:800},portrait={width:390,height:844};
  // Record visible start, early yaw, mid change, approach, completed/settled.
  for(const [label,viewport] of [['desktop',desktop],['portrait',portrait]]){
   const page=await startPage(browser,origin,'trafficAI=v60',viewport,report.errors);
   await audit(page,setup('1A','cruise'));
   const record={name:'urban-'+label,route:'1A',samples:[],images:[]};
   const checkpoints=new Set([0,1,12,32,64,128,180]);
   let prev=null;
   for(let tick=0;tick<=180;tick++){
    if(tick>0)await delayTicks(page,1);
    const s=await audit(page,snapshot);
    checkCar(s,label+' tick '+tick);
    if(prev){
     const dx=s.carX-prev.carX;
     assert(dx<=1e-9,label+' no reversal of initial left pass');
     assert(Math.abs(dx)<.021,label+' no lateral teleport/snap');
     if(Math.abs(dx)>1e-6)assert(s.turnYawRad>=-1e-9,'leftward shift faces correct yaw direction');
     assert(Math.abs(s.turnYawRad-prev.turnYawRad)<.165,
      label+' no out-of-range instantaneous steering step');
    }
    if(checkpoints.has(tick)){
     const shotHash=await shot(page,'v69-urban-'+label+'-'+String(tick).padStart(3,'0'),report);
     record.samples.push({tick,x:s.carX,target:s.target,yaw:s.turnYawRad,pass:s.passActive,hash:shotHash});
    }
    prev=s;
   }
   assert(record.samples[1].target<-.1,label+' opt-in passes slower leader');
   assert(record.samples.some(p=>p.pass&&p.yaw>.001),label+' visible nonzero direction during pass');
   assert(prev.completed>=1,label+' pass successfully completes');
   assert(Math.abs(prev.target-prev.carX)<.031,label+' settles into target');
   assert(new Set(record.samples.map(s=>s.hash)).size>=4,label+' frames change visually over time');
   report.scenarios.push(record);
   await page.close();
  }
  // Actual Taipei mountain identity, hillside heights and zero invented decks.
  for(const [route,night] of [['4B',false],['5B',true]]){
   const page=await startPage(browser,origin,'trafficAI=v60',desktop,report.errors);
   await audit(page,setup(route,'cruise',night));
   const initial=await audit(page,snapshot);
   assert.equal(initial.route,route,'selected geography identity');
   assert(initial.archetype==='mountain'||initial.archetype==='coastal',
    '4B / 5B visual QA must be terrain/coast routes, not urban');
   assert.equal(initial.deckMax,0,'no unsupported highway on mountain/coastline');
   const record={name:'terrain-'+route,route,archetype:initial.archetype,samples:[]};
   for(let tick=0;tick<=30;tick++){
    if(tick)await delayTicks(page,1);
    const s=await audit(page,snapshot);
    checkCar(s,route+' tick '+tick);
    if([0,1,15,30].includes(tick)){
     const hash=await shot(page,'v69-'+route+'-'+String(tick).padStart(3,'0'),report);
     record.samples.push({tick,x:s.carX,yaw:s.turnYawRad,hash});
    }
   }
   assert(new Set(record.samples.map(x=>x.hash)).size>=2,route+' actual rendered state changes');
   report.scenarios.push(record);
   await page.close();
  }
  // A sudden occupied destination lane must stop gracefully, without teleport or extra crash.
  const abort=await startPage(browser,origin,'trafficAI=v60',desktop,report.errors);
  await audit(abort,setup('1A','cruise'));
  await delayTicks(abort,1);
  const pre=await audit(abort,snapshot);assert(pre.passActive,'hazard fixture starts mid-pass');
  await audit(abort,`(()=>{
    const c=traffic[1],fast=traffic[0];
    c.x=fast.laneTarget;c.laneTarget=c.x;c.z=fast.z+1000;c.speed=195;c.targetSpeed=195;
    c.previousX=c.x;c.previousZ=c.z;c.v60Think=100;c.v60PassActive=false;
  })()`);
  let last=await audit(abort,snapshot),vetoAt=null;
  const history=[];
  for(let tick=1;tick<=30;tick++){
   await delayTicks(abort,1);
   const s=await audit(abort,snapshot);
   checkCar(s,'abort '+tick);
   assert(Math.abs(s.carX-last.carX)<.021,'no teleport on late hazard');
   if(s.veto&&!vetoAt)vetoAt=tick;
   if([1,8,16,30].includes(tick)){
    const hash=await shot(abort,'v69-abort-'+String(tick).padStart(3,'0'),report);
    history.push({tick,x:s.carX,yaw:s.turnYawRad,veto:s.veto,hash});
   }
   last=s;
  }
  assert(vetoAt&&vetoAt<=20,'late hazard is checked within safety review window');
  assert.equal(last.veto,'traffic-path-blocked');
  assert.equal(last.passActive,false);
  assert.equal(last.completed,0,'aborted maneuver must not count as completed');
  report.scenarios.push({name:'late-intruder-abort',vetoAt,history});
  await abort.close();
  assert.deepEqual(report.errors,[],'no runtime or console errors');
  report.status='passed';
  fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(report,null,2));
  console.log('V69 Chromium WebGL visual QA: '+report.scenarios.length+' real urban/mountain/coastal/abort scenarios, '+report.captures.length+' PNGs; no snap/off-road/yaw/hit errors');
 }catch(error){
  report.failure=error.stack||String(error);
  fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(report,null,2));
  throw error;
 }finally{await browser?.close();}
})().catch(err=>{console.error(err);process.exitCode=1;}).finally(()=>new Promise(resolve=>server.close(resolve)));
