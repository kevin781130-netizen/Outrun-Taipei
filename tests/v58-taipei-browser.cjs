'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),output=path.join(ROOT,'test-results/v58-taipei');
const source=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
// Test-only bridge; never written to any deployed page. Keep the real WebGL path.
const injected=source.replace('resetGame(); updateHUD(); drawRouteMap(); render(0);','window.__sceneAudit=code=>eval(code);resetGame(); updateHUD(); drawRouteMap(); render(0);');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(injected);return;}
 if(!['/assets/vendor/three-r149.min.js','/assets/hybrid-renderer.js','/assets/traffic-lane-intent.js','/assets/perf-diagnostics.js'].includes(pathname)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type','application/javascript');fs.createReadStream(path.join(ROOT,pathname.slice(1))).pipe(res);
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],captures=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const run=code=>page.evaluate(code=>window.__sceneAudit(code),code);
  await page.waitForFunction(()=>window.v56ThreeStatus?.().loaded,{timeout:20000});
  await run('render(0)');
  assert(await page.evaluate(()=>window.v56ThreeStatus().ready),'WebGL renderer must initialize and render');
  for(const id of ['1A','2A','2B','3A','3B','3C','4A','4B','4C','4D','5A','5B','5C','5D','5E']){
   const names=await run(`v34Mode='arcade';setStage(...Object.values(routeForId('${id}')),false);gameStarted=true;raceActive=true;paused=false;gameOver=false;traffic=[];overlay.classList.add('hidden');stageLandmarkPlan.map(h=>h.name)`);
   for(let i=0;i<names.length;i++)for(const shot of [{mood:'sunset',distance:48},{mood:'neon',distance:48},{mood:'sunset',distance:24}]){
    const {mood,distance}=shot;
    await run(`skyMood='${mood}';playerZ=(stageLandmarkPlan[${i}].seg-${distance})*SEGMENT_LENGTH-PLAYER_DEPTH;playerX=0;speed=160;updateHUD();render(1/60);`);
    const file=id+'-'+i+'-'+mood+(distance===24?'-near':'')+'.png';await page.locator('#v56-full-3d-canvas').screenshot({path:path.join(output,file)});
    assert(fs.statSync(path.join(output,file)).size>5000,'nonempty screenshot '+file);captures.push({route:id,landmark:names[i],mood,distance,file});
   }
   if(!id.startsWith('5'))for(const side of ['left','right']){
    await run(`skyMood='sunset';playerZ=(FORK_LOCK-12)*SEGMENT_LENGTH;pendingChoice='${side}';playerX=${side==='left'?-.7:.7};render(1/60);`);
    await page.locator('#v56-full-3d-canvas').screenshot({path:path.join(output,id+'-fork-'+side+'.png')});
   }
  }
  for(const [name,viewport] of [['portrait',{width:390,height:844}],['landscape',{width:844,height:390}]]){
   await page.setViewportSize(viewport);await run(`setStage(...Object.values(routeForId('5D')),false);playerZ=(stageLandmarkPlan[0].seg-48)*SEGMENT_LENGTH-PLAYER_DEPTH;render(1/60);`);
   await page.screenshot({path:path.join(output,name+'.png')});
  }
  // V59 geographic scenery uses the original authored race, never downloaded road geometry.
  const geoOut=path.join(ROOT,'test-results/v59-geography');fs.mkdirSync(geoOut,{recursive:true});
  await page.setViewportSize({width:1280,height:800});
  await page.goto('http://127.0.0.1:'+server.address().port+'/?handling=v59');
  await page.waitForFunction(()=>window.v56ThreeStatus?.().loaded,{timeout:20000});
  const geographic=[];
  async function geoCapture(file,metadata){
   const png=await page.evaluate(()=>{window.__sceneAudit('render(0)');return document.getElementById('v56-full-3d-canvas').toDataURL('image/png');});
   fs.writeFileSync(path.join(geoOut,file),Buffer.from(png.split(',')[1],'base64'));assert(fs.statSync(path.join(geoOut,file)).size>5000);geographic.push({file,...metadata});
  }
  for(const id of ['1A','2A','2B','3A','3B','3C','4A','4B','4C','4D','5A','5B','5C','5D','5E']){
   const count=await run(`skyMood='sunset';v34Mode='arcade';setStage(...Object.values(routeForId('${id}')),false);gameStarted=true;raceActive=true;paused=false;gameOver=false;traffic=[];overlay.classList.add('hidden');stageLandmarkPlan.length`);
   for(let i=0;i<count;i++){
    const state=await run(`playerZ=(stageLandmarkPlan[${i}].seg-45)*SEGMENT_LENGTH-PLAYER_DEPTH;playerX=0;speed=160;render(.1);render(.1);({profile:v57SceneFrame().geographyProfile,name:stageLandmarkPlan[${i}].name,segment:Math.floor((playerZ+PLAYER_DEPTH)/SEGMENT_LENGTH)})`);
    assert.equal(state.profile,'taipei-v59-environment-1');
    await geoCapture(id+'-'+i+'.png',{id,index:i,...state});
   }
  }
  for(const id of ['2B','4C','5B','5C','5E']){
   await run(`setStage(...Object.values(routeForId('${id}')),false);skyMood='neon';playerZ=100*SEGMENT_LENGTH;render(.1);render(.1);`);
   await geoCapture(id+'-night.png',{id,mood:'neon'});
  }
  for(const id of ['5A','5C','5E']){
   await page.setViewportSize({width:390,height:844});
   await run(`setStage(...Object.values(routeForId('${id}')),false);skyMood='sunset';playerZ=(stageLandmarkPlan[0].seg-45)*SEGMENT_LENGTH-PLAYER_DEPTH;render(.1);render(.1);`);
   await geoCapture(id+'-mobile.png',{id,viewport:'390x844; existing fixed-aspect game canvas'});
  }
  fs.writeFileSync(path.join(geoOut,'manifest.json'),JSON.stringify({geographic,scope:'geographic scene identity only; original arcade geometry; not georeferenced routing or deployed visual approval'},null,2));
  console.log('V59 geography WebGL: '+geographic.length+' actual canvas captures, 15 route identities/27 landmarks, 5 night and 3 mobile views');
  assert.deepEqual(errors,[],'no shader or runtime errors');
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({captures,errors,visualReview:'Screenshots captured for human inspection; nonempty checks are not aesthetic approval.'},null,2));
  console.log('V58 real WebGL: 81 landmark/mood/distance captures, 20 fork captures, 2 mobile viewports; no runtime errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>new Promise(done=>server.close(done)));
