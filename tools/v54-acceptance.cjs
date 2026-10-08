'use strict';
// V54 strict MANUAL candidate acceptance gate. Never runs GitHub Actions.
// Usage: node tools/v54-acceptance.cjs BEFORE.json AFTER.json SCENES.json [VISUAL_SIGNOFF.json]
const fs=require('node:fs');
const path=require('node:path');
const {readReport,compare}=require('./compare-performance.cjs');

const ROUTES=['1A','2A','2B','3A','3B','3C','4A','4B','4C','4D','5A','5B','5C','5D','5E'];
const EXPECTED=new Set(ROUTES.flatMap(id=>['sunset','neon'].map(mood=>id+'/'+mood)));
const PRESETS=new Map([['LOW',[720,405]],['STANDARD',[960,540]],['HIGH',[1200,675]],['ULTRA',[1440,810]]]);

function checkEvidence(before,after,visual,approval=null){
  const comparison=compare(before,after); // rejects incompatible benchmark environments
  const blocking=[],warnings=[];
  const fail=reason=>blocking.push(reason);
  if(before.sourceSHA256===after.sourceSHA256)fail('Identical baseline and candidate source hashes');
  if(before.samples<60||after.samples<60)fail('Insufficient samples: need >=60 per scene');
  if(comparison.comparedScenes!==30)fail('Benchmark needs 30 complete scenes');
  if(comparison.aggregateRenderImprovementPercent<20){
    fail('Steady-state render CPU improvement is below +20%');
  }
  for(const row of comparison.rows){
    if(row.improvementPercent < -15 &&
       row.afterMeanMs-row.beforeMeanMs > 2){
      fail('Severe steady-state regression: '+row.scene+' ('+row.improvementPercent.toFixed(1)+'%)');
    }
  }
  if(!comparison.coldStartAvailable)fail('Cold-start setup / first-render timings missing');
  else {
    const cold=comparison.coldStart;
    if(cold.afterMeanSceneSetupMs>cold.beforeMeanSceneSetupMs*1.5 &&
       cold.afterMeanSceneSetupMs-cold.beforeMeanSceneSetupMs>20){
      fail('Average route setup is >=50% slower and >20 ms worse');
    }
    if(cold.afterMeanFirstRenderMs>cold.beforeMeanFirstRenderMs*1.5 &&
       cold.afterMeanFirstRenderMs-cold.beforeMeanFirstRenderMs>10){
      fail('Average first render is >=50% slower and >10 ms worse');
    }
  }
  if(!visual||visual.schema!==1||!Array.isArray(visual.rows)){
    fail('Missing/invalid Chromium 30-scene visual report');
  } else {
    if(visual.browser!==before.browser||visual.browser!==after.browser){
      fail('Visual and performance audits used different Chromium versions');
    }
    if(JSON.stringify(visual.viewport)!==JSON.stringify(before.viewport)){
      fail('Visual and performance audits used different viewports');
    }
    if(visual.sourceSHA256?.before!==before.sourceSHA256||
       visual.sourceSHA256?.after!==after.sourceSHA256){
      fail('Visual and performance reports refer to different source files');
    }
    const keys=new Set();
    for(const row of visual.rows){
      const key=row.id+'/'+row.mood;
      if(!EXPECTED.has(key)||keys.has(key))fail('Unexpected or duplicate visual scene: '+key);
      keys.add(key);
      if(row.geometryMatches!==true)fail('Projected road/traffic geometry differs: '+key);
      if(!Number.isFinite(row.changedPixelsPercent) ||
         row.changedPixelsPercent<0||row.changedPixelsPercent>100 ||
         !Number.isFinite(row.meanAbsoluteRgbDifference) ||
         row.meanAbsoluteRgbDifference<0||row.meanAbsoluteRgbDifference>255){
        fail('Invalid pixel metrics: '+key);
      }
    }
    if(keys.size!==30||visual.scenes!==30||visual.geometryMatchesEveryScene!==true){
      fail('Visual audit missing scenes or contains geometry regression');
    }
    if(!Array.isArray(visual.quality)||visual.quality.length!==4){
      fail('Incomplete four-preset quality checks');
    }else{
      const used=new Set();
      for(const q of visual.quality){
        const expected=PRESETS.get(q.preset);
        if(!expected||used.has(q.preset)||q.passed!==true||
          q.width!==expected[0]||q.height!==expected[1]||
          !Number.isInteger(q.pngBytes)||q.pngBytes<2000){
          fail('Failed or duplicate preset check: '+String(q.preset));
        }
        used.add(q.preset);
      }
    }
    if(visual.presetPersistencePassed!==true)fail('Graphics preference did not persist');
    if(!Array.isArray(visual.responsive)||
      !['phone','landscape'].every(name=>visual.responsive.some(r=>r.name===name&&r.passed===true))){
      fail('Phone and landscape Chromium emulation checks missing');
    }
    if(!Array.isArray(visual.runtimeErrors)||visual.runtimeErrors.length){
      fail('Browser runtime errors or missing error audit');
    }
    const highDiff=visual.rows.filter(r=>r.changedPixelsPercent>=30);
    if(highDiff.length)warnings.push(highDiff.length+' scene(s) differ by >=30% of pixels: requires visual review');
  }
  const visualSignoff=approval!==null &&
    approval.approved===true &&
    typeof approval.reviewer==='string'&&approval.reviewer.trim().length>=2 &&
    typeof approval.reviewedAt==='string'&&!Number.isNaN(Date.parse(approval.reviewedAt)) &&
    approval.reviewedScenes===30 &&
    approval.baselineSourceSHA256===before.sourceSHA256 &&
    approval.candidateSourceSHA256===after.sourceSHA256 &&
    typeof approval.notes==='string'&&approval.notes.trim().length>=10;
  if(!visualSignoff)fail('Signed 30-scene human visual approval missing or does not match report hashes');
  return {
    schema:1,
    candidateReadyForManualMerge:blocking.length===0,
    benchmarkTargetMet:comparison.meetsAggregate20PercentTarget,
    actualMobileGameplayFpsVerified:false,
    actualDesktopGameplayFpsVerified:false,
    blocking,warnings,
    performance:{
      comparedScenes:comparison.comparedScenes,
      improvementPercent:comparison.aggregateRenderImprovementPercent,
      coldStart:comparison.coldStart,
      severeRegressions:comparison.rows.filter(r=>r.improvementPercent < -15 &&
        r.afterMeanMs-r.beforeMeanMs > 2).map(r=>r.scene)
    },
    humanVisualApproval:visualSignoff,
    limitations:[
      'A passing gate is only evidence for manually considering a merge; it never merges or deploys.',
      'Pixel quality requires actual review of the PNGs; a signed file attests to that human check.',
      'Mobile and desktop gameplay FPS and GPU/RSS memory need separate physical-device validation.'
    ]
  };
}
if(require.main===module){
  if(process.argv.length<5||process.argv.length>6){
    console.error('Usage: node tools/v54-acceptance.cjs BEFORE.json AFTER.json SCENES.json [VISUAL_SIGNOFF.json]');
    process.exitCode=2;
  }else{
    try{
      const before=readReport(process.argv[2]),after=readReport(process.argv[3]);
      const visual=JSON.parse(fs.readFileSync(path.resolve(process.argv[4]),'utf8'));
      const approval=process.argv[5]?JSON.parse(fs.readFileSync(path.resolve(process.argv[5]),'utf8')):null;
      const result=checkEvidence(before,after,visual,approval);
      process.stdout.write(JSON.stringify(result,null,2)+'\n');
      if(!result.candidateReadyForManualMerge)process.exitCode=1;
    }catch(e){console.error(e.stack||e);process.exitCode=1;}
  }
}
module.exports={checkEvidence};
