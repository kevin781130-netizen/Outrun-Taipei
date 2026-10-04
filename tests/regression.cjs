const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const {scenarios}=require('./scenarios.cjs');
const {runNetplayTests}=require('./netplay.cjs');
const {runAudioLifecycleTests}=require('./audio-lifecycle.cjs');
(async()=>{
 const game=load(path.join(__dirname,'../index.html'));
 const gameChecks=await scenarios(code=>game.run(code));
 const netplay=runNetplayTests();
 const audio=await runAudioLifecycleTests();
 console.log({...gameChecks,netplayChecks:netplay.checks,audioLifecycleChecks:audio.checks});
})().catch(e=>{console.error(e);process.exitCode=1});
