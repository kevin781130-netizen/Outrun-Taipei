'use strict';
// V76 real Chromium: user clicks to opt in, drives using keyboard, manually exports JSON.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const marker='resetGame(); updateHUD(); drawRouteMap(); render(0);';
assert.equal(html.split(marker).length,2);
assert(!html.includes('__v76TestAudit'),'browser QA hook may not ship');
const served=html.replace(marker,'window.__v76TestAudit=code=>eval(code);'+marker);
const server=http.createServer((req,res)=>{
 const p=new URL(req.url,'http://127.0.0.1').pathname;
 if(p==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(served);return;}
 if(!['/assets/vendor/three-r149.min.js','/assets/hybrid-renderer.js'].includes(p)){
  res.writeHead(404);res.end('not found');return;
 }
 res.setHeader('Content-Type','application/javascript; charset=utf-8');
 fs.createReadStream(path.join(root,p.slice(1))).pipe(res);
});
async function main(){
 const output=path.join(root,'test-results/v76-player-recorder');
 fs.mkdirSync(output,{recursive:true});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 let browser;const errors=[],unexpectedRequests=[];
 const report={status:'failed',scope:'real Chromium local WebGL + click and downloaded JSON',
  warning:'locally scripted driving, not independent human playfeel/remote deployed visual signoff'};
 try{
  browser=await chromium.launch({headless:true,
   args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader'],
   ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1280,height:800},acceptDownloads:true});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.method()!=='GET'||!r.url().startsWith('http://127.0.0.1:'))
   unexpectedRequests.push({method:r.method(),url:r.url()});});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.v56ThreeStatus?.().loaded,{timeout:20000});
  const run=code=>page.evaluate(expr=>window.__v76TestAudit(expr),code);
  await run(`v34Mode='cruise';selectedRoute=routeForId('4D');resetGame();
   gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
   crashSequence=null;traffic=[];timeLeft=999;collisionCooldown=999;
   playerX=0;playerZ=200*SEGMENT_LENGTH;speed=185;driveGear='D';
   motionDirection=1;roadGrip=1;overlay.classList.add('hidden');render(0);`);
  assert.equal(await run('v76Clip===null&&!v76Recording'),true,'off by default');
  await page.locator('#v70-lab-btn').click();
  assert.equal(await page.locator('#v70-lab').isVisible(),true);
  await page.locator('#v76-rec-toggle').click();
  assert.equal(await page.locator('#v76-rec-toggle').getAttribute('aria-pressed'),'true');
  await page.keyboard.down('KeyW');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ShiftLeft');
  await run('for(let i=0;i<40;i++)update(1/60);');
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  await run('for(let i=0;i<25;i++)update(1/60);');
  await page.keyboard.up('ArrowLeft');
  await run('for(let i=0;i<20;i++)update(1/60);render(0);');
  await page.keyboard.up('KeyW');
  const stats=await run('({frames:v76Clip.frames.length,recording:v76Recording,route:v76Clip.route,mode:v76Clip.mode,summary:v76Clip.summary,rules:COMPETITION.version})');
  assert(stats.frames>=70,'needs actual recorded physics frames');
  assert.equal(stats.route,'4D');assert.equal(stats.mode,'v69');
  assert.equal(stats.rules,'61.0');assert.equal(stats.recording,true);
  await page.locator('#v56-full-3d-canvas').screenshot({path:path.join(output,'v76-recorder-webgl.png')});
  await page.screenshot({path:path.join(output,'v76-recorder-desktop.png')});
  await page.locator('#v76-rec-toggle').click();
  assert.equal(await page.locator('#v76-rec-toggle').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#v77-report').isVisible(),true,
   'analysis should appear after manual stop');
  const localAnalysis=await run('v76Clip.analysisV77');
  assert.equal(localAnalysis.schema,'taipei-driving.v77.local-analysis.1');
  assert.equal(localAnalysis.frames,stats.frames);
  assert.equal(localAnalysis.route,'4D');
  assert.equal(localAnalysis.mode,'v69');
  assert.equal(localAnalysis.reason,'manual');
  assert(Number.isFinite(localAnalysis.totalAbsoluteLateralMotion));
  assert(localAnalysis.countersteerAttempts>=0);
  assert(localAnalysis.steerResponseObserved<=localAnalysis.countersteerAttempts);
  assert(localAnalysis.gripResponseObserved<=localAnalysis.countersteerAttempts);
  await page.screenshot({path:path.join(output,'v77-local-analysis-desktop.png')});
  const wait=page.waitForEvent('download');
  await page.locator('#v76-rec-export').click();
  const download=await wait;
  assert.match(download.suggestedFilename(),/^taipei-driving-v76-4D-v69\.json$/);
  const file=path.join(output,'user-export-sample.json');
  await download.saveAs(file);
  const json=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(json.schema,'taipei-driving.v76.player-drive.1');
  assert.equal(json.reason,'manual');assert.equal(json.route,'4D');
  assert.equal(json.mode,'v69');assert.equal(json.frames.length,stats.frames);
  assert.deepEqual(json.analysisV77,localAnalysis,
   'export includes exactly the visible on-device analysis');
  assert(json.frames.some(x=>x.shift&&x.rawSteer>0));
  assert(json.frames.some(x=>x.rawSteer<0));
  assert(json.frames.every(x=>Number.isFinite(x.lat)&&Number.isFinite(x.kmh)));
  // V78 import fixtures are derived from a test-only synthetic copy of one
  // real Chromium keyboard session; NOT independently recorded user runs.
  // Equal starting conditions here validate UI plumbing, not handling merits.
  function asModel(mode){
   const clip=JSON.parse(JSON.stringify(json));clip.mode=mode;
   clip.frames=clip.frames.map(row=>({...row,mode,curve:1.35}));
   return Buffer.from(JSON.stringify(clip));
  }
  await page.locator('#v78-file-v68').setInputFiles({
   name:'taipei-driving-v68.json',mimeType:'application/json',buffer:asModel('v68')});
  await page.locator('#v78-file-v69').setInputFiles({
   name:'taipei-driving-v69.json',mimeType:'application/json',buffer:asModel('v69')});
  await page.waitForFunction(()=>window.__v76TestAudit('v78Clips.v68!==null&&v78Clips.v69!==null')||
   document.getElementById('v78-compare-status').textContent.includes('失敗'),null,{timeout:8000});
  const diagnostic=await run(`({
   status:document.getElementById('v78-compare-status').textContent,
   v68:!!v78Clips.v68,v69:!!v78Clips.v69,
   err:v78LastError,comparison:v78AnalyzePair(v78Clips.v68,v78Clips.v69),
   files:[document.getElementById('v78-file-v68').files.length,document.getElementById('v78-file-v69').files.length]
  })`);
  console.log('V78 real browser import diagnostics:',JSON.stringify(diagnostic));
  assert.equal(diagnostic.comparison.ok,true,
   'real file import needs same-route ready comparison: '+JSON.stringify(diagnostic));
  assert.equal(await page.locator('#v78-compare-results').isVisible(),true);
  assert.match(await page.locator('#v78-compare-lateral').textContent(),/V68.*V69/);
  assert.equal(await page.locator('#v79-bins').isVisible(),true,
   'per-position V79 analysis must be visible for accepted V78 imports');
  const locationBins=await run('v79AnalyzeBins(v78AnalyzePair(v78Clips.v68,v78Clips.v69),v78Clips.v68,v78Clips.v69)');
  assert.equal(locationBins.ok,true);assert(locationBins.total>=5);
  assert(locationBins.eligible>0,'same keyboard fixture should provide eligible road bins');
  assert(locationBins.bins.every(b=>b.eligible||typeof b.reason==='string'));
  await page.screenshot({path:path.join(output,'v79-position-bins-desktop.png')});
  await page.screenshot({path:path.join(output,'v78-local-ab-preview.png')});
  const invalid=JSON.parse(JSON.stringify(json));invalid.mode='v69';invalid.route='5C';
  invalid.frames=invalid.frames.map(x=>({...x,mode:'v69',route:'5C'}));
  // Changing the same <input type=file> should be observed explicitly,
  // rather than waiting for a text change that may be skipped after rendering.
  await page.locator('#v78-file-v69').setInputFiles([]);
  await page.locator('#v78-file-v69').setInputFiles({
   name:'invalid-route.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
  await page.waitForFunction(()=>window.__v76TestAudit(
   'v78Clips.v69?.route === "5C" || v78LastError.length > 0'),null,{timeout:12000});
  const rejected=await run('({status:document.getElementById("v78-compare-status").textContent,route:v78Clips.v69?.route,error:v78LastError,visible:!document.getElementById("v78-compare-results").hidden})');
  console.log('V79 wrong-route rejection diagnostics:',JSON.stringify(rejected));
  assert.equal(rejected.route,'5C','real native JSON input must import mismatched route');
  assert.match(rejected.status,/不同路線/,'must actively reject unrelated routes');
  assert.equal(rejected.visible,false,'different routes must not claim comparability');
  assert.equal(await page.locator('#v79-bins').isVisible(),false,
   'position report must disappear when new import fails V78 checks');
  await page.locator('#v78-compare-clear').click();
  assert.equal(await run('v78Clips.v68===null&&v78Clips.v69===null'),true,
   'clear removes imported traces');
  assert.equal(await page.locator('#v78-compare-results').isVisible(),false);
  assert.equal(await page.locator('#v79-bins').isVisible(),false,
   'clear must hide binned report and release imported data');
  assert.deepEqual(unexpectedRequests,[],'recorder must not POST or contact outside hosts');
  await page.locator('#v76-rec-delete').click();
  assert.equal(await run('v76Clip===null&&!v76Recording'),true,'delete clears in-memory recording');
  assert.equal(await page.locator('#v77-report').isVisible(),false,
   'delete must also hide analysis without retaining hidden data');
  assert.equal(await page.locator('#v76-rec-export').isDisabled(),true);
  assert.deepEqual(errors,[]);
  report.status='passed';
  Object.assign(report,{frames:stats.frames,route:stats.route,mode:stats.mode,localAnalysis,
   summary:json.summary,bytes:fs.statSync(file).size,errors,unexpectedRequests});
  console.log('V76 real Chromium: explicitly started/recorded/drifted/countersteered/stopped/downloaded JSON/deleted, no upload');
 }catch(e){report.error=e.stack||String(e);throw e;}
 finally{
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
  await browser?.close();
  await new Promise(done=>server.close(done));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
