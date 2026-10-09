// P11 diagnosis only: classify whether GitHub Actions actually reached the runner.
// Pure function; does not touch GitHub settings, billing or deployment.
export function classifyActionsExecution(run,job,timing,artifactCount){
 const steps=job?.steps;
 const runnerId=job?.runner_id;
 const billedMs=timing?.billable?.UBUNTU?.total_ms;
 const status=run?.status,conclusion=run?.conclusion;
 const hasSteps=Array.isArray(steps)&&steps.length>0;
 const noRunner=runnerId===0||runnerId==null;
 if(status==='completed'&&conclusion==='failure'&&!hasSteps&&noRunner&&billedMs===0){
  return Object.freeze({
   classification:'FAILED_BEFORE_RUNNER',
   codeCheckExecuted:false,browserExecuted:false,artifactsVerified:false,
   rootCause:'UNKNOWN_FROM_AVAILABLE_API',
   message:'GitHub created a failed job without assigning a runner or executing steps. Inspect Actions run banner and account/repo policies.'
  });
 }
 if(hasSteps){
  const browserStarted=steps.some(step=>/Chromium|browser|WebGL|Playwright/i.test(String(step.name||''))&&
   step.status==='completed');
  return Object.freeze({
   classification:'RUNNER_STEPS_RECORDED',
   codeCheckExecuted:true,
   browserExecuted:browserStarted,
   artifactsVerified:false,artifactsReported:artifactCount>0,
   rootCause:'NOT_APPLICABLE',
   message:'Inspect individual steps and screenshots; a green job alone is not human visual approval.'
  });
 }
 return Object.freeze({
  classification:'UNKNOWN_OR_PENDING',
  codeCheckExecuted:false,browserExecuted:false,artifactsVerified:false,
  rootCause:'NOT_DETERMINED',
  message:'Insufficient evidence to claim tests executed.'
 });
}
