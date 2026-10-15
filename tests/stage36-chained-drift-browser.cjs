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
  assert((await page.evaluate(()=>window.v56ThreeStatus())).ready,'real WebGL game must be ready');
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
