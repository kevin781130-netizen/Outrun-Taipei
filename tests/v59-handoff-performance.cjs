'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(process.env.PERF_GAME_ROOT||path.join(__dirname,'..'));
const OUTPUT=path.resolve(process.env.PERF_OUTPUT||path.join(__dirname,'../test-results/v59-handoff-performance.json'));
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const boot='resetGame(); updateHUD(); drawRouteMap(); render(0);';
assert.equal(html.split(boot).length,2,'single browser bootstrap marker');
const injected=html.replace(boot,'window.__perfAudit=code=>eval(code);'+boot);
const assets={'/assets/vendor/three-r149.min.js':'assets/vendor/three-r149.min.js',
 '/assets/hybrid-renderer.js':'assets/hybrid-renderer.js'};
const server=http.createServer((req,res)=>{
 const route=new URL(req.url,'http://localhost').pathname;
 if(route==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(injected);return;}
 if(!assets[route]){res.writeHead(404);res.end('missing');return;}
 res.setHeader('Content-Type','application/javascript');
 fs.createReadStream(path.join(ROOT,assets[route])).pipe(res);
});
const routes=[
 {from:'1A',level:0,column:0,choice:'left',to:'2A'},
 {from:'1A',level:0,column:0,choice:'right',to:'2B'},
 {from:'3B',level:2,column:1,choice:'left',to:'4B'},
 {from:'4C',level:3,column:2,choice:'right',to:'5D'}
];
const stats=x=>{const a=[...x].sort((a,b)=>a-b);return {meanMs:x.reduce((s,n)=>s+n,0)/x.length,p95Ms:a[Math.ceil(.95*a.length)-1]};};
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader'],
   ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.addInitScript(()=>{
   window.requestAnimationFrame=()=>0;
   window.__uploadCalls=0;window.__bufferCalls=0;
   for(const type of [window.WebGLRenderingContext,window.WebGL2RenderingContext]){
    if(!type)continue;
    for(const method of ['bufferData','bufferSubData']){
     if(!Object.prototype.hasOwnProperty.call(type.prototype,method))continue;
     const native=type.prototype[method];
     if(typeof native==='function')type.prototype[method]=function(...args){
      window.__bufferCalls++;return native.apply(this,args);
     };
    }
    for(const method of ['texImage2D','texSubImage2D','compressedTexImage2D','compressedTexSubImage2D']){
     if(!Object.prototype.hasOwnProperty.call(type.prototype,method))continue;
     const native=type.prototype[method];
     if(typeof native==='function')type.prototype[method]=function(...args){
      window.__uploadCalls++;return native.apply(this,args);
     };
    }
   }
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.v56ThreeStatus?.().loaded,{timeout:20000});
  await page.evaluate(()=>window.__perfAudit('render(0)'));
  assert.equal(await page.evaluate(()=>window.v56ThreeStatus?.().ready),true,'WebGL starts after first manual render');
  const runs=[];
  for(let index=0;index<routes.length;index++){
   const route=routes[index];
   const modes=index%2?['warm','cold']:['cold','warm'];
   for(const mode of modes){
    const measurement=await page.evaluate(({route,mode})=>{
     const evalGame=expr=>window.__perfAudit(expr);
     const dir=route.choice==='left'?-1:1;
     evalGame([
      "v34Mode='arcade'",'setStage('+route.level+','+route.column+',false)',
      'gameStarted=true','raceActive=true','paused=false','gameOver=false',
      'traffic=[]','speed=210',"currentGear='HIGH'","driveGear='D'",
      'motionDirection=1','playerZ=(STAGE_END-24)*SEGMENT_LENGTH',
      'playerX='+dir*.25,"pendingChoice='"+route.choice+"'",
      'choiceLocked=true','roadGrip=1',"driftState='drift'",
      'isDrifting=true','driftAge=.7','driftDirection='+dir,
      'driftAngle='+dir*24,'slipAngle='+dir*10,
      'lateralVelocity='+dir*.24,'boostRemaining=.9','boosting=true','nitro=30'
     ].join(';')+';');
     const frame=JSON.parse(evalGame('JSON.stringify(v57SceneFrame())'));
     if(frame.routeId!==route.from||frame.nextRouteId!==route.to)
      throw Error('bad route preview');
     const canvas=document.createElement('canvas');
     canvas.width=960;canvas.height=540;canvas.style.position='absolute';
     canvas.style.left='-9999px';document.body.appendChild(canvas);
     const receipts=[];
     const world=window.TaipeiHybrid.createFull3DScene(window.THREE,canvas,{
      onPhaseProfile:receipt=>receipts.push(receipt)
     });
     const timed=(state,dt)=>{
      const uploads=window.__uploadCalls,buffers=window.__bufferCalls,
       start=performance.now(),index=receipts.length;
      const ok=world.render(state,dt,960,540,'STANDARD');
      if(receipts.length!==index+1)throw Error('missing renderer phase sample');
      const profile=receipts[index];
      return {ms:performance.now()-start,textureCalls:window.__uploadCalls-uploads,
       bufferCalls:window.__bufferCalls-buffers,ok,
       phase:profile.phases,totalProfileMs:profile.totalMs,
       firstRouteFrame:profile.firstRouteFrame};
     };
     try{
      const prime=timed(frame,0);
      if(!prime.ok||!world.ready)throw Error('real WebGL was not ready');
      const previews=[];
      if(mode==='warm')for(let n=0;n<12;n++)previews.push(timed(frame,1/60));
      const before=evalGame('JSON.stringify({speed,isDrifting,driftAngle,slipAngle,boostRemaining,nitro})');
      const switchStart=performance.now();
      evalGame("beginStageTransition('"+route.choice+"');"+
       "stageTransition.lastCenter=transitionGeometry(STAGE_SWITCH,'"+route.choice+"').center;"+
       'playerZ=STAGE_SWITCH*SEGMENT_LENGTH+37;finishStageTransition();');
      const stageSwitchMs=performance.now()-switchStart;
      const after=evalGame('JSON.stringify({speed,isDrifting,driftAngle,slipAngle,boostRemaining,nitro})');
      if(before!==after)throw Error('handoff reset active drift');
      const next=JSON.parse(evalGame('JSON.stringify(v57SceneFrame())'));
      if(next.routeId!==route.to||!next.driving.isDrifting)throw Error('handoff scene invalid');
      const handoff=timed(next,1/60);
      const followup=Array.from({length:8},()=>timed(next,1/60));
      if([prime,...previews,handoff,...followup].some(x=>!x.ok||!Number.isFinite(x.ms)||x.ms<0||
       !Number.isInteger(x.textureCalls)||x.textureCalls<0||
        !Number.isInteger(x.bufferCalls)||x.bufferCalls<0))throw Error('invalid WebGL receipt');
      if(!canvas.getContext('webgl2')&&!canvas.getContext('webgl'))throw Error('WebGL context missing');
      return {from:route.from,to:route.to,choice:route.choice,mode,
       primeMs:prime.ms,stageSwitchMs,handoff,prewarm:{
        frames:previews.length,textureCalls:previews.reduce((s,x)=>s+x.textureCalls,0),
         bufferCalls:previews.reduce((s,x)=>s+x.bufferCalls,0),
        meanCpuMs:previews.length?previews.reduce((s,x)=>s+x.ms,0)/previews.length:0
       },followup:followup.map(x=>x.ms),driftRetained:true};
     }finally{
      world.dispose();
      const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
     }
    },{route,mode});
    runs.push(measurement);
    console.log(route.from+'>'+route.to+' '+mode+' handoff '+
     measurement.handoff.ms.toFixed(2)+'ms, texture calls '+
     measurement.handoff.textureCalls+', preview calls '+measurement.prewarm.textureCalls+
     ', handoff buffer calls '+measurement.handoff.bufferCalls+
      ', prior buffer calls '+measurement.prewarm.bufferCalls+
      ', phases '+JSON.stringify(measurement.handoff.phase));
   }
  }
  const comparisons=routes.map(route=>{
   const values=runs.filter(x=>x.from===route.from&&x.choice===route.choice);
   const cold=values.find(x=>x.mode==='cold'),warm=values.find(x=>x.mode==='warm');
   assert(cold&&warm&&cold.driftRetained&&warm.driftRetained);
   return {from:route.from,to:route.to,choice:route.choice,
    coldMs:cold.handoff.ms,warmMs:warm.handoff.ms,deltaMs:warm.handoff.ms-cold.handoff.ms,
    coldPhases:cold.handoff.phase,warmPhases:warm.handoff.phase,
     coldBufferCalls:cold.handoff.bufferCalls,warmBufferCalls:warm.handoff.bufferCalls,
     prewarmBufferCalls:warm.prewarm.bufferCalls,
    coldTextureCalls:cold.handoff.textureCalls,warmTextureCalls:warm.handoff.textureCalls,
    prewarmTextureCalls:warm.prewarm.textureCalls};
  });
  assert.equal(runs.length,8);
  assert.deepEqual(errors,[],'no browser runtime errors');
  const report={schema:'v59.7-gpu-prewarm-1',browser:browser.version(),
   environment:'Chromium headless SwiftShader real WebGL; offscreen test canvas',
   sourceRoot:ROOT,commit:process.env.GITHUB_SHA||null,
   measurement:'Synchronous WebGL render JS wall time + texImage/subImage API calls; NOT GPU completion or device FPS',
   warmupFrames:12,comparisons,runs,
   aggregate:{cold:stats(comparisons.map(x=>x.coldMs)),
    warm:stats(comparisons.map(x=>x.warmMs)),
    coldPhases:Object.fromEntries(Object.keys(comparisons[0].coldPhases).map(k=>
     [k,stats(comparisons.map(x=>x.coldPhases[k]))])),
    warmPhases:Object.fromEntries(Object.keys(comparisons[0].warmPhases).map(k=>
     [k,stats(comparisons.map(x=>x.warmPhases[k]))])),
    coldTextureCalls:comparisons.reduce((s,x)=>s+x.coldTextureCalls,0),
    warmTextureCalls:comparisons.reduce((s,x)=>s+x.warmTextureCalls,0),
     coldBufferCalls:comparisons.reduce((s,x)=>s+x.coldBufferCalls,0),
     warmBufferCalls:comparisons.reduce((s,x)=>s+x.warmBufferCalls,0),
     prewarmBufferCalls:comparisons.reduce((s,x)=>s+x.prewarmBufferCalls,0)},
   errors};
  fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
  fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n');
  console.log('V59.4 performance receipts written: '+OUTPUT);
 }finally{
  if(browser)await browser.close();
  if(server.listening)await new Promise(done=>server.close(done));
 }
})().catch(err=>{console.error(err);process.exitCode=1;});
