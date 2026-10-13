const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const {clearAllCache}=require('@napi-rs/canvas');
const {scenarios}=require('./scenarios.cjs');
const {runNetplayTests}=require('./netplay.cjs');
const {runAudioLifecycleTests}=require('./audio-lifecycle.cjs');
(async()=>{
 const game=load(path.join(__dirname,'../index.html'));
 let calls=0,peakRss=process.memoryUsage().rss;
 const gameChecks=await scenarios(async code=>{
  const result=game.run(code);calls++;
  // Skia surfaces are native allocations; reclaim abandoned route canvases
  // without removing any scenario, rendering call, or gameplay assertion.
  if(calls%20===0){
   // Flush deferred Skia draws so old sprite surfaces can be reclaimed.
   game.run('ctx.getImageData(0,0,1,1);displayCtx.getImageData(0,0,1,1);');
   clearAllCache();
   if(global.gc)global.gc();
   await new Promise(resolve=>setImmediate(resolve));
   if(global.gc)global.gc();
  }
  peakRss=Math.max(peakRss,process.memoryUsage().rss);
  if(calls%200===0)console.log({regressionCalls:calls,rssMiB:Math.round(process.memoryUsage().rss/1048576)});
  return result;
 });
 const netplay=runNetplayTests();
 const audio=await runAudioLifecycleTests();
 console.log({...gameChecks,netplayChecks:netplay.checks,audioLifecycleChecks:audio.checks,peakRssMiB:Math.round(peakRss/1048576)});
})().catch(e=>{console.error(e);process.exitCode=1});
