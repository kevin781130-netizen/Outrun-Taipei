'use strict';
// P10: evidence manifest and software-WebGL comparison. NEVER fabricate a pass.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'test-results/quaternius-p10');
fs.mkdirSync(OUT,{recursive:true});
function git(args){
 try{return execFileSync('git',args,{cwd:ROOT,encoding:'utf8',timeout:5000}).trim();}
 catch{return null;}
}
function safeReport(folder){
 const file=path.join(ROOT,'test-results',folder,'report.json');
 if(!fs.existsSync(file))return {folder,executed:false,status:'NOT RUN',summary:null};
 try{
  const report=JSON.parse(fs.readFileSync(file,'utf8'));
  return {folder,executed:true,status:report.status||report.conclusion||'UNKNOWN',
   summary:{runs:(report.runs||[]).length,screenshots:(report.screenshots||[]).length,
    errors:(report.errors||[]).length,smoke:(report.smoke||[]).length},
   report};
 }catch(error){return {folder,executed:false,status:'INVALID REPORT',error:String(error)};}
}
const results=['quaternius-p3','quaternius-p7','quaternius-p8'].map(safeReport);
const comparison=[],snapshots=[],problems=[];
const block=results.find(x=>x.folder==='quaternius-p8');
if(block.executed&&block.report){
 const data=block.report;
 for(const row of data.screenshots||[]){
  const file=path.join(ROOT,'test-results/quaternius-p8',path.basename(row.filename||''));
  if(!/^((desktop|mobile)_(near|far)_(day|night))\.png$/.test(row.filename||'')||
     !fs.existsSync(file)){problems.push('missing / invalid P8 screenshot '+row.filename);continue;}
  const buf=fs.readFileSync(file);
  snapshots.push({filename:row.filename,bytes:buf.length,sha256:crypto.createHash('sha256').update(buf).digest('hex')});
 }
 for(const viewport of ['desktop','mobile'])for(const light of ['day','night']){
  const find=lod=>(data.screenshots||[]).find(x=>x.viewport===viewport&&x.lod===lod&&x.lighting===light);
  const near=find('near'),far=find('far');
  if(!near||!far){problems.push('near/far pair missing: '+viewport+' '+light);continue;}
  const n=near.state,f=far.state;
  const callDrop=n.drawCalls-f.drawCalls;
  const triangleDrop=n.triangles-f.triangles;
  comparison.push({viewport,light,nearDrawCalls:n.drawCalls,farDrawCalls:f.drawCalls,
   observedDrawCallDelta:callDrop,nearRenderedTriangles:n.triangles,farRenderedTriangles:f.triangles,
   observedTriangleDelta:triangleDrop,
   nearSampleFPS:near.pacing.approximateFPS,farSampleFPS:far.pacing.approximateFPS,
   sampleFrameMsNear:near.pacing.meanMs,sampleFrameMsFar:far.pacing.meanMs,
   profiler:'SwiftShader headless software-WebGL only; NOT a GPU or game FPS claim'});
 }
 if((data.errors||[]).length)problems.push(...data.errors.map(String));
 if(snapshots.length!==8)problems.push('Expected eight P8 screenshots; found '+snapshots.length);
}
const manifest={
 title:'Quaternius P10 isolated preview acceptance manifest',
 createdAt:new Date().toISOString(),
 branch:process.env.GITHUB_REF_NAME||git(['branch','--show-current']),
 commit:process.env.GITHUB_SHA||git(['rev-parse','HEAD']),
 source:'GitHub Actions art-only workflow or manual local execution',
 status:results.some(x=>!x.executed)||problems.length>0?'INCOMPLETE — NO VISUAL APPROVAL':'BROWSER EVIDENCE CAPTURED — HUMAN VISUAL APPROVAL PENDING',
 proofs:results.map(({report,...rest})=>rest),comparison,screenshots:snapshots,problems,
 caution:'Headless Chromium uses ANGLE SwiftShader software rendering. No hardware GPU, deployed Web or game route has been measured.'
};
fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const lines=[
 '# P10 — Quaternius independent-browser acceptance',
 '',
 '- Branch: '+(manifest.branch||'unavailable'),
 '- Commit: '+(manifest.commit||'unavailable'),
 '- Evidence status: **'+manifest.status+'**',
 '- Test target: only standalone Quaternius asset previews; **not** production Taipei game',
 '- Actual Chinese glyph readability requires manual screenshot inspection',
 '- Software WebGL frame pacing is not GPU or production FPS',
 '',
 '| Test | Ran | Status | Screenshots / Runs | Errors |',
 '|---|---|---|---:|---:|'
];
for(const r of results)
 lines.push('| '+r.folder+' | '+(r.executed?'yes':'no')+' | '+r.status.replace(/\|/g,'/')+' | '+
 (r.summary?(r.summary.screenshots||r.summary.runs):0)+' | '+(r.summary?.errors??0)+' |');
lines.push('','## P8 default five-shop near/far evidence comparisons','',
 '| Viewport | Lighting | Near draw calls | Far draw calls | Difference | Near frame ms* | Far frame ms* |',
 '|---|---|---:|---:|---:|---:|---:|');
for(const row of comparison)lines.push('| '+row.viewport+' | '+row.light+' | '+row.nearDrawCalls+' | '+row.farDrawCalls+
 ' | '+row.observedDrawCallDelta+' | '+row.sampleFrameMsNear+' | '+row.sampleFrameMsFar+' |');
lines.push('','*Headless software GPU; do not compare these numbers against phone hardware or published game.',
 '','## Screenshot SHA-256 evidence');
for(const x of snapshots)lines.push('- '+x.filename+' — '+x.sha256);
lines.push('','## Human acceptance checklist','','- [ ] All shop names use correct Traditional Chinese glyphs','- [ ] No missing Quaternius textures, clipped balconies or self-intersecting roof props',
 '- [ ] LOD transitions render correctly in both day/night modes','- [ ] Desktop and phone screenshots have sensible framing','- [ ] No console errors and zero missing resources','- [ ] Confirm production game remains unchanged and this was not deployed');
if(problems.length)lines.push('','## Errors / blockers',...problems.map(x=>'- '+x));
fs.writeFileSync(path.join(OUT,'acceptance.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({status:manifest.status,reports:manifest.proofs,
 nearFarComparisons:comparison.length,hashes:snapshots.length,problems},null,2));
