'use strict';
// V74: actual browser keyboard input, actual update loop, and actual WebGL
// render path over two opposite-sign authored bends, no shipped hooks.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {analyzeSSequence}=require('./v75-countersteer-metrics.cjs');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const marker='resetGame(); updateHUD(); drawRouteMap(); render(0);';
assert.equal(source.split(marker).length,2,'unique game boot marker');
assert(!source.includes('__v74Eval'),'test-only evaluation hook must not ship');
const injected=source.replace(marker,'window.__v74Eval=code=>eval(code);'+marker);
const assets={
 '/assets/vendor/three-r149.min.js':'assets/vendor/three-r149.min.js',
 '/assets/hybrid-renderer.js':'assets/hybrid-renderer.js'
};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1').pathname;
 if(url==='/'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(injected);return;
 }
 const rel=assets[url];
 if(!rel){res.writeHead(404);res.end('not found');return;}
 res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8'});
 fs.createReadStream(path.join(root,rel)).pipe(res);
});
const output=path.join(root,'test-results/v74-s-curve-browser');
const routes=['4D','5C'];
const modes=['v68','v69'];
const actionLog=[];
const failureLog=[];
let browser;
const chooseBends=route=>`(()=>{
 v34Mode='cruise';selectedRoute=routeForId(${JSON.stringify(route)});
 if(v70LabEnabled)v70ToggleLab();
 resetGame();
 const pairs=[];
 for(let i=140;i<STAGE_END-340;i+=5){
  const first=segments[i].curve;
  if(Math.abs(first)<1.05)continue;
  const firstSign=Math.sign(first);
  for(let j=i+100;j<Math.min(i+320,STAGE_END-80);j+=5){
   const second=segments[j].curve;
   if(Math.sign(second)!==-firstSign||Math.abs(second)<1.05)continue;
   pairs.push({firstIndex:i,secondIndex:j,firstCurve:first,secondCurve:second,
    separation:j-i});
   break;
  }
 }
 pairs.sort((a,b)=>a.separation-b.separation||
  (Math.abs(b.firstCurve)+Math.abs(b.secondCurve))-
  (Math.abs(a.firstCurve)+Math.abs(a.secondCurve)));
 const pair=pairs[0];
 if(!pair)throw new Error('No genuine opposite-sign road bend pair on '+currentNode.id);
 return {pair,route:currentNode.id,stageEnd:STAGE_END};
})()`;
const frameExpr=count=>`(()=>{
 const out=[];
 for(let i=0;i<${count};i++){
  if(!raceActive||paused||gameOver||crashSequence)
   throw new Error('Full game loop interrupted at frame '+i);
  update(1/60);
  const idx=Math.max(0,Math.min(segments.length-1,Math.floor(playerZ/SEGMENT_LENGTH)));
  out.push({idx,curve:segments[idx].curve,speed,playerX,playerZ,steer,
   lateralVelocity,driftAngle,slipAngle,yawRate,driftState,isDrifting,
   roadGrip,settleRemaining:v69ExitTime,exitWindowPending:!!v71ExitWindow,
   crash:!!crashSequence});
 }
 return out;
})()`;
const untilExpr=index=>`(()=>{
 const out=[];let frames=0;
 while(Math.floor(playerZ/SEGMENT_LENGTH)<${index} && frames<1350){
  if(!raceActive||paused||gameOver||crashSequence)
   throw new Error('Full game loop interrupted en route to reverse bend');
  update(1/60);frames++;
  const idx=Math.max(0,Math.min(segments.length-1,Math.floor(playerZ/SEGMENT_LENGTH)));
  out.push({idx,curve:segments[idx].curve,speed,playerX,playerZ,steer,
   lateralVelocity,driftAngle,slipAngle,yawRate,driftState,isDrifting,
   roadGrip,settleRemaining:v69ExitTime,exitWindowPending:!!v71ExitWindow,
   crash:!!crashSequence});
 }
 if(frames===1350)throw new Error('Did not physically reach second bend');
 return out;
})()`;
async function main(){
 fs.mkdirSync(output,{recursive:true});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const summary={status:'failed',scope:'headless local Chromium real keyboard + update + WebGL',
  testSource:'game index.html (test-only eval hook injected in HTTP response)',
  warning:'not a human playtest; not a visual/aesthetic approval of public deployment',
  sourceRules:'94.0',scenarios:[],errors:failureLog};
 try{
  browser=await chromium.launch({headless:true,
   args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader'],
   ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',e=>failureLog.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.v56ThreeStatus?.().loaded,{timeout:20000});
  const run=code=>page.evaluate(expr=>window.__v74Eval(expr),code);
  await run('render(0)');
  assert.equal(await page.evaluate(()=>window.v56ThreeStatus().ready),true);
  assert.equal(await page.locator('#v56-full-3d-canvas').evaluate(
   e=>getComputedStyle(e).visibility),'visible');
  for(const route of routes){
   // Discover actual authored curvature sign reversal rather than a guessed
   // route segment index or a fake straight-line physics fixture.
   const {pair}=await run(chooseBends(route));
   assert(pair.firstCurve*pair.secondCurve<0,'must use a genuine S-curve');
   assert(pair.separation>=100&&pair.separation<=320);
   for(const model of modes){
    const setup=await run(`(()=>{
      v34Mode='cruise';selectedRoute=routeForId(${JSON.stringify(route)});
      if(v70LabEnabled)v70ToggleLab();
      resetGame();
      gameStarted=true;raceActive=true;paused=false;gameOver=false;
      inRadioScreen=false;crashSequence=null;traffic=[];timeLeft=999;
      collisionCooldown=999;overlay.classList.add('hidden');
      if(!v70ToggleLab()||!v70SelectExitMode(${JSON.stringify(model)}))
       throw new Error('Cruise A/B mode unavailable');
      playerZ=(${pair.firstIndex}-10)*SEGMENT_LENGTH;
      playerX=0;speed=185;currentGear='HIGH';driveGear='D';
      motionDirection=1;roadGrip=1;nitroStock=0;nitro=0;
      return {route:currentNode.id,index:Math.floor(playerZ/SEGMENT_LENGTH),
       score,record:bestRecordKey(),rules:COMPETITION.version};
     })()`);
    assert.equal(setup.route,route);assert.equal(setup.rules,'94.0');
    const trace=[],phases=[];
    async function collect(label,expression){
     const row=await run(expression);
     if(row.some(x=>!Number.isFinite(x.curve)||!Number.isFinite(x.playerX)||
       !Number.isFinite(x.speed)||x.crash))
      throw new Error('Non-finite values or crash in '+label+' '+route+'/'+model);
     const startFrame=trace.length;
     trace.push(...row);
     phases.push({label,startFrame,endFrameExclusive:trace.length,
      frames:row.length,endIndex:row.at(-1)?.idx??null,
      peakAbsX:row.reduce((m,x)=>Math.max(m,Math.abs(x.playerX)),0),
      driftFrames:row.filter(x=>x.isDrifting).length});
    }
    const firstKey=pair.firstCurve>0?'ArrowRight':'ArrowLeft',
      secondKey=pair.secondCurve>0?'ArrowRight':'ArrowLeft';
    await page.keyboard.down('KeyW');
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down(firstKey);
    await collect('first real keyboard drift',frameExpr(23));
    await page.keyboard.up('ShiftLeft');await page.keyboard.up(firstKey);
    await page.keyboard.down(secondKey);
    await collect('countersteer first bend',frameExpr(18));
    await page.keyboard.up(secondKey);
    await run('render(0)');
    const firstImage=path.join(output,`${route}-${model}-first.png`);
    await page.locator('#v56-full-3d-canvas').screenshot({path:firstImage});
    assert(fs.statSync(firstImage).size>5000,'first S-bend WebGL screenshot must be nonblank');
    await collect('continuous neutral drive, no reposition',untilExpr(pair.secondIndex-10));
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down(secondKey);
    await collect('opposite real keyboard drift',frameExpr(23));
    await page.keyboard.up('ShiftLeft');await page.keyboard.up(secondKey);
    await page.keyboard.down(firstKey);
    await collect('countersteer opposite bend',frameExpr(18));
    await page.keyboard.up(firstKey);
    await collect('neutral exit',frameExpr(50));
    await run('render(0)');
    const lastImage=path.join(output,`${route}-${model}-second.png`);
    await page.locator('#v56-full-3d-canvas').screenshot({path:lastImage});
    assert(fs.statSync(lastImage).size>5000,'opposite bend WebGL screenshot must be nonblank');
    await page.keyboard.up('KeyW');
    const end=await run(`({
      route:currentNode.id,score,record:bestRecordKey(),
      rules:COMPETITION.version,gameOver,crashCount,
      exitStats:{v68:v71ExitStats.v68.exits,v69:v71ExitStats.v69.exits},
      threeReady:window.v56ThreeStatus().ready,
      gpuCanvas:!!document.getElementById('v56-full-3d-canvas')
    })`);
    assert.equal(end.route,route,'stage may not switch inside S-curve sequence');
    assert.equal(end.rules,'94.0');
    assert.equal(end.record,setup.record,'record namespace unchanged');
    assert.equal(end.gameOver,false);
    assert.equal(end.threeReady,true);assert.equal(end.gpuCanvas,true);
    assert(trace.some(x=>Math.sign(x.curve)===Math.sign(pair.firstCurve)&&
      Math.abs(x.curve)>.8),'never drove first bend');
    assert(trace.some(x=>Math.sign(x.curve)===Math.sign(pair.secondCurve)&&
      Math.abs(x.curve)>.8),'never drove opposite bend');
    assert(trace.some(x=>x.isDrifting),'no authentic keyboard-initiated drift');
    assert(phases[0].driftFrames>0,'first keyboard maneuver must initiate drift');
    assert(phases[3].driftFrames>0,'opposite keyboard maneuver must initiate drift');
    const seenSigns=trace.map(x=>Math.sign(x.curve)).filter(Boolean);
    assert(seenSigns.includes(Math.sign(pair.firstCurve))&&
      seenSigns.includes(Math.sign(pair.secondCurve)));
    for(let i=1;i<trace.length;i++)assert(trace[i].playerZ>=trace[i-1].playerZ,
      'cannot teleport or rewind while transitioning bends');
    const telemetry=analyzeSSequence(trace,phases,pair,end.exitStats);
    assert.equal(telemetry.actualRecoveryTransitions.length,2,
      'each real keyboard drift must finish recovery once');
    assert(telemetry.countersteerOne.steerResponse,
      'first reversal must actually change game steering');
    assert(telemetry.countersteerTwo.steerResponse,
      'opposite reversal must actually change game steering');
    assert(telemetry.countersteerOne.driftRelease,
      'first countersteer must actually finish recovering grip');
    assert(telemetry.countersteerTwo.driftRelease,
      'opposite countersteer must actually finish recovering grip');
    const sample={route,mode:model,pair,starting:setup,ending:end,telemetry,
      samples:trace.length,phases,
      firstPeakLat:Math.max(...trace.slice(0,23).map(x=>Math.abs(x.lateralVelocity))),
      secondPeakLat:Math.max(...trace.slice(-91,-50).map(x=>Math.abs(x.lateralVelocity))),
      images:[path.basename(firstImage),path.basename(lastImage)]};
    summary.scenarios.push(sample);
    actionLog.push(`${route} ${model}: ${trace.length} real update frames; ${pair.firstIndex}→${pair.secondIndex}`);
   }
  }
  assert.deepEqual(failureLog,[],'no WebGL or game page errors');
  assert.equal(summary.scenarios.length,routes.length*modes.length);
  summary.status='passed';
  console.log('V74 full-browser authored S-bend / keyboard drift / countersteer / WebGL: '+
   actionLog.join('; '));
 }catch(e){summary.error=e.stack||String(e);throw e;}
 finally{
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(summary,null,2)+'\n');
  fs.writeFileSync(path.join(output,'v75-countersteer-observations.json'),
   JSON.stringify({status:summary.status,
    scope:'read-only active countersteer metrics from real V74 Chromium keyboard frames',
    comparability:'V68/V69 share scripted commands and bends, but are not human-drive trials',
    scenarios:summary.scenarios.map(({route,mode,telemetry})=>({route,mode,telemetry}))},
    null,2)+'\n');
  await browser?.close();
  await new Promise(done=>server.close(done));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
