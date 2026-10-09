'use strict';
// Converts P3 automated Chromium screenshots and metrics into an evidence index.
// An automated green result is NOT approval of the appearance.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'test-results/quaternius-p3');
const rp=path.join(dir,'report.json');
if(!fs.existsSync(rp)){console.error('Missing report.json: run node tests/quaternius-render-acceptance.cjs');process.exit(1);}
const r=JSON.parse(fs.readFileSync(rp,'utf8'));
const viewports=['desktop','mobile-portrait','mobile-landscape'];
const models=['Brick_RedWhite_DoubleWindow','Brick_Plain_1','Metal_Window','DoorFrame_Trim'];
const expected=viewports.flatMap(v=>models.map(m=>v+'|'+m));
const seen=new Set();
let issues=[];
const text=v=>String(v??'—').replace(/\|/g,'/').replace(/[\r\n]/g,' ');
const lines=[
 '# Quaternius — Independent Chromium QA Evidence',
 '',
 'Generated: '+new Date().toISOString(),
 'Source commit: '+text(r.sourceCommit),
 'Browser: '+text(r.browserVersion),
 'Host: '+text(r.host),
 '',
 'Note: Software-rendered SwiftShader WebGL frame-pacing is NOT native GPU or full racing game FPS.',
 'Automated screenshots DO NOT prove correct image quality until manually inspected.',
 '',
 '| Viewport | Module | FPS* | P95 ms* | Draw calls | Materials | Day screenshot | Night screenshot | Result |',
 '|---|---|---:|---:|---:|---|---|---|---|'
];
let files=0;
for(const v of viewports)for(const m of models){
 const id=v+'|'+m;
 const entries=(r.runs||[]).filter(x=>x.viewport===v&&x.name===m);
 if(entries.length!==1){
  issues.push(id+': expected exactly one result');
  lines.push('| '+v+' | '+m+' | — | — | — | — | — | — | MISSING/DUPLICATED |');continue;
 }
 seen.add(id);
 const x=entries[0],broken=[];
 if(!x.ui?.webgl||!x.ui?.materialProbe?.loaded)broken.push('WebGL or mesh not loaded');
 if(!x.ui?.materialProbe?.textures?.length||x.ui.materialProbe.textures.some(t=>!t.ready))broken.push('texture not decoded');
 if(!x.pixel?.nonBlank||!x.nightPixel?.nonBlank)broken.push('blank picture heuristic');
 if(!(x.perf?.samples>=80))broken.push('incomplete frame sample');
 if(x.pageErrors?.length)broken.push('browser errors: '+x.pageErrors.join(';'));
 const imgs=[];
 for(const filename of x.screenshots||[]){
   if(!/^(desktop|mobile-portrait|mobile-landscape)_[A-Za-z0-9_]+_(day|night)\.png$/.test(filename))broken.push('unsafe screenshot name');
   const f=path.join(dir,path.basename(filename));
   if(!fs.existsSync(f)){broken.push('missing PNG '+filename);continue;}
   const buf=fs.readFileSync(f);
   if(buf.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')broken.push('invalid PNG '+filename);
   const hash=crypto.createHash('sha256').update(buf).digest('hex');
   imgs.push({filename,hash});files++;
 }
 if(imgs.length!==2)broken.push('not exactly two screenshots');
 issues.push(...broken.map(y=>id+': '+y));
 lines.push('| '+v+' | '+m+' | '+text(x.perf?.effectiveFPS)+' | '+text(x.perf?.p95FrameMs)+' | '+text(x.ui?.drawCalls)+' | '+text(x.ui?.materialProbe?.textures?.length)+' | '+(imgs[0]?'['+imgs[0].filename+'](./'+imgs[0].filename+')':'—')+' | '+(imgs[1]?'['+imgs[1].filename+'](./'+imgs[1].filename+')':'—')+' | '+(broken.length?'FAIL':'automated checks passed')+' |');
 lines.push('<!-- Screenshots for '+id+': '+imgs.map(t=>t.filename+' SHA256='+t.hash).join(', ')+' -->');
}
for(const x of r.errors||[])issues.push('Chromium: '+text(x.fatal||x.messages||x));
for(const run of r.runs||[])if(!expected.includes(run.viewport+'|'+run.name))issues.push('unexpected run: '+text(run.name));
const valid=seen.size===12 && files===24 && issues.length===0;
lines.push('','Automated result: '+(valid?'PASSED; HUMAN VISUAL APPROVAL PENDING':'FAILED / INCOMPLETE'),'','Visual checklist:');
lines.push('- [ ] All models visible and correctly textured','- [ ] Day and night colors and glass are correct','- [ ] No clipping on portrait, landscape and desktop','- [ ] Mobile and desktop actual GPU benchmarks verified','');
lines.push('Issues:');
if(issues.length)lines.push(...issues.map(x=>'- '+x));
else lines.push('- No automatic errors; human visual inspection is still mandatory.');
const output=path.join(dir,'review-index.md');
fs.writeFileSync(output,lines.join('\n')+'\n');
console.log(JSON.stringify({passedAutomatedChecks:valid,visualApproved:false,runCount:(r.runs||[]).length,screenshots:files,issues,reviewIndex:output},null,2));
if(!valid)process.exitCode=1;
