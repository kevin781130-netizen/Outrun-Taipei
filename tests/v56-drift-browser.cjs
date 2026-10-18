'use strict';
// PR-only test instrumentation: the eval hook and Three.js capture never ship.
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const marker='resetGame(); updateHUD(); drawRouteMap(); render(0);';
assert.equal(html.split(marker).length,2,'unique game bootstrap marker');
assert(!html.includes('__v56TestEval'),'test hook must not ship');
const testHtml=html.replace(marker,'window.__v56TestEval=code=>eval(code);'+marker);
const assets={'/assets/vendor/three-r149.min.js':'assets/vendor/three-r149.min.js','/assets/hybrid-renderer.js':'assets/hybrid-renderer.js'};
const server=http.createServer((req,res)=>{
 const route=new URL(req.url,'http://127.0.0.1').pathname;
 if(route==='/'||route==='/index.html'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(testHtml);return;
 }
 const file=assets[route];if(!file){res.writeHead(404);res.end('not found');return;}
 res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store'});
 fs.createReadStream(path.join(root,file)).pipe(res);
});
const out=path.join(root,'test-results/v56-drift-browser');
const audit=(page,code)=>page.evaluate(expr=>window.__v56TestEval(expr),code);
const physics=page=>audit(page,'({speed,playerX,playerZ,score,nitro,nitroStock,boostRemaining,boosting,driftState,isDrifting,driftAngle,slipAngle,driftDirection,yaw:v51DriftVisualYaw(),driftChargeRate,competition:COMPETITION.version})');
async function tick(page,n){
 return audit(page,'(()=>{const phases=[];for(let i=0;i<'+n+';i++){update(1/60);render(1/60);phases.push(driftState);}return phases;})()');
}
async function draw(page){
 const pre=await physics(page);await audit(page,'render(0)');
 assert.deepEqual(await physics(page),pre,'render cannot change physics/score/nitro');
 return page.evaluate(()=>window.__v56GpuProbe);
}
async function startDrift(page,side,stock){
 const code=[
  "v34Mode='cruise';selectedRoute=routeForId('4B');resetGame();",
  "gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;",
  "crashSequence=null;traffic=[];timeLeft=999;collisionCooldown=20;overlay.classList.add('hidden');",
  "const options=segments.filter(s=>s.index>100&&s.index<STAGE_END-100);",
  "const bend=options.reduce((best,s)=>Math.abs(s.curve)>Math.abs(best.curve)?s:best,options[0]);",
  "playerZ=bend.index*SEGMENT_LENGTH;playerX=0;speed=170;currentGear='HIGH';",
  "driveGear='D';motionDirection=1;roadGrip=1;nitro=0;nitroStock="+stock+";",
  "boostRemaining=0;boosting=false;nitroLatch=false;resetDrivingState();",
  "window.__v56Bend=bend.curve;"
 ].join('\n');
 await audit(page,code);
 await page.keyboard.down('KeyW');
 await page.keyboard.down(side===1?'ArrowRight':'ArrowLeft');
 await page.keyboard.down('ShiftLeft');
 await tick(page,30);
 const state=await physics(page),gpu=await draw(page);
 assert.equal(state.competition,'90.0','ranked rules revision must be explicit');
 assert(state.isDrifting&&state.nitro>0,'actual keyboard drift must charge nitro');
 assert(Math.abs(state.slipAngle)>2&&Math.abs(state.yaw)>5,'actual drift needs slip and yaw');
 assert(gpu&&Number.isFinite(gpu.carX)&&Number.isFinite(gpu.yawRad),'GPU did not render car');
 assert(Math.abs(gpu.yawRad-state.yaw*Math.PI/180)<1e-5,'WebGL yaw must equal actual game visual yaw');
 assert.equal(Math.sign(gpu.yawRad),side,'drift sign must match left/right keyboard');
 assert.equal(Math.sign(gpu.carX),-side,'3D car must visually sway sideways');
 assert(Math.abs(gpu.carX)<=.401,'3D sway is bounded');
 assert(gpu.cameraZ>gpu.carZ,'chase camera stays behind car');
 await page.screenshot({path:path.join(out,side===1?'right.png':'left.png')});
 return {state,gpu};
}
async function release(page){
 await page.keyboard.up('ShiftLeft');
 await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowRight');
 await page.keyboard.up('KeyW');await page.keyboard.up('KeyN');
}
async function main(){
 fs.mkdirSync(out,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;const result={status:'failed',scope:'local Chromium WebGL; deployed public visual not verified',checks:[],pageErrors:[]};
 try{
  const options={headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']};
  if(process.env.CHROMIUM_PATH)options.executablePath=process.env.CHROMIUM_PATH;
  browser=await chromium.launch(options);
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',err=>result.pageErrors.push(err.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.v56ThreeStatus?.().loaded,{timeout:20000});
  await page.evaluate(()=>{
   // Three r149 assigns WebGLRenderer.render per instance, not on its prototype.
   // Instead, observe the actual Three scene traversal performed by rendering.
   const original=window.THREE.Object3D.prototype.updateMatrixWorld;
   window.THREE.Object3D.prototype.updateMatrixWorld=function(force){
    const result=original.call(this,force);
    if(this.name==='V55_OriginalArcadeVehicle')window.__v56ObservedCar=this;
    if(this.isPerspectiveCamera)window.__v56ObservedCamera=this;
    return result;
   };
   Object.defineProperty(window,'__v56GpuProbe',{configurable:true,get(){
    const car=window.__v56ObservedCar,camera=window.__v56ObservedCamera;
    if(!car||!camera)return null;
    return {carX:car.position.x,carZ:car.position.z,
     yawRad:car.children.find(x=>x.isGroup)?.rotation.y,
     cameraX:camera.position.x,cameraZ:camera.position.z,
     boostFlame:!!car.getObjectByName('nitro-exhaust')?.visible};
   }});
  });
  await audit(page,'render(0)');
  assert.equal(await page.evaluate(()=>window.v56ThreeStatus().ready),true);
  assert.equal(await page.locator('#gameCanvas').evaluate(e=>getComputedStyle(e).visibility),'hidden');
  assert.equal(await page.locator('#v56-full-3d-canvas').evaluate(e=>getComputedStyle(e).visibility),'visible');
  result.checks.push('actual WebGL canvas / no visible legacy Canvas2D');
  const right=await startDrift(page,1,0);await release(page);
  result.checks.push('right drift keyboard + yaw + 3D sway + nitro charge');
  const left=await startDrift(page,-1,0);
  assert(left.gpu.yawRad*right.gpu.yawRad<0,'mirror drifts must yaw opposite ways');
  result.checks.push('left drift keyboard + opposite 3D rotation');
  await page.keyboard.up('ShiftLeft');await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowRight');
  const counterStates=await tick(page,24);await release(page);
  const neutralStates=await tick(page,40),settled=await draw(page);
  assert(counterStates.concat(neutralStates).includes('recover')||
   !(await physics(page)).isDrifting,'countersteer must leave active drift');
  assert(Math.abs(settled.yawRad)<Math.abs(left.gpu.yawRad),'3D yaw should recover');
  result.checks.push('countersteer + neutral recovery');
  await startDrift(page,1,1);
  const prior=await physics(page);
  await page.keyboard.down('KeyN');await tick(page,1);await page.keyboard.up('KeyN');
  const boosted=await physics(page),boostGpu=await draw(page);
  assert(boosted.boosting&&boosted.boostRemaining>2.6&&boosted.isDrifting,'N must boost within drift');
  assert(boosted.speed>prior.speed,'nitro accelerates');
  assert(boostGpu.boostFlame,'nitro exhaust must be visible in rendered 3D vehicle');
  await tick(page,10);
  assert((await physics(page)).nitro>boosted.nitro,'nitro must charge during boost + drift');
  await page.screenshot({path:path.join(out,'boost.png')});await release(page);
  result.checks.push('boost + charge + exhaust flames while drifting');
  assert.deepEqual(result.pageErrors,[],'no JS page errors');
  result.status='passed';
  console.log('DRIFT-05 Chromium WebGL: '+result.checks.join('; '));
 }catch(err){result.error=err.stack||String(err);throw err;}
 finally{
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2)+'\n');
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(err=>{console.error(err);process.exitCode=1;});
