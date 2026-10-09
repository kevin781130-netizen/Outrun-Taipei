'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const fs=require('node:fs');
const root=path.resolve(__dirname,'..');
(async()=>{
 const {classifyActionsExecution}=await import(pathToFileURL(path.join(root,'tools/quaternius-runner-classifier.mjs')).href);
 // These fixtures represent both real P10 run attempts observed with the GitHub connector.
 for(const attempt of [1,2]){
  const diagnosis=classifyActionsExecution(
   {status:'completed',conclusion:'failure',run_attempt:attempt},
   {status:'completed',conclusion:'failure',runner_id:0,steps:[]},
   {billable:{UBUNTU:{total_ms:0}}},0);
  assert.equal(diagnosis.classification,'FAILED_BEFORE_RUNNER');
  assert.equal(diagnosis.codeCheckExecuted,false);
  assert.equal(diagnosis.browserExecuted,false);
  assert.equal(diagnosis.artifactsVerified,false);
  assert.equal(diagnosis.rootCause,'UNKNOWN_FROM_AVAILABLE_API');
 }
 const working=classifyActionsExecution(
  {status:'completed',conclusion:'success'},
  {runner_id:42,steps:[{name:'Install Node',status:'completed'},
    {name:'P8/P9 Chromium tests',status:'completed'}]},
  {billable:{UBUNTU:{total_ms:153000}}},1);
 assert.equal(working.classification,'RUNNER_STEPS_RECORDED');
 assert.equal(working.browserExecuted,true);
 assert.equal(working.artifactsReported,true);
 assert.equal(working.artifactsVerified,false);
 const pending=classifyActionsExecution({status:'queued'},null,null,0);
 assert.equal(pending.classification,'UNKNOWN_OR_PENDING');
 const local=fs.readFileSync(path.join(root,'tools/quaternius-p11-local-qa.cjs'),'utf8');
 const ps1=fs.readFileSync(path.join(root,'tools/run-quaternius-qa.ps1'),'utf8');
 assert(local.includes("EXPECTED='art/quaternius-downtown-buildings-p1'"));
 assert(local.includes("if(!checks.branchValid)"));
 assert(local.includes("browserReady"));
 assert(local.includes("report.steps.push(item)"));
 assert(local.includes("['p3-chromium-modules'"));
 assert(local.includes("['p8-chromium-streetblock'"));
 assert(ps1.includes("node tools/quaternius-p11-local-qa.cjs --full"));
 assert(ps1.includes("node tools/quaternius-p11-local-qa.cjs --static-only"));
 for(const str of ['git checkout','git switch','git push','git merge','updateVehiclePose','roadCorridors('])
  assert(!local.includes(str),'local QA cannot change game source or branch: '+str);
 console.log('P11 PASS: two observed runner-zero attempts correctly diagnosed, running/pending classified, guarded offline/browser QA verified statically.');
})().catch(e=>{console.error(e);process.exitCode=1;});
