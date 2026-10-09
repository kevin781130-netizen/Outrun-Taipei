'use strict';
// P11: independent Node.js QA orchestration for a checked-out PRIVATE ART BRANCH.
// No checkout/commit/push/merge/production deployment. All report writes gitignored.
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'test-results/quaternius-p11');
const EXPECTED='art/quaternius-downtown-buildings-p1';
const STEPS=[
 ['p2-assets','tests/quaternius-preview.cjs'],
 ['p4-facade','tests/quaternius-assembly.cjs'],
 ['p6-lod','tests/quaternius-lod.cjs'],
 ['p7-streetfront','tests/quaternius-taipei-streetfront.cjs'],
 ['p8-streetblock','tests/quaternius-streetblock.cjs'],
 ['p9-atlas','tests/quaternius-sign-atlas.cjs'],
 ['p11-runner-classifier','tests/quaternius-p11-classifier.cjs']
];
const BROWSER_STEPS=[
 ['p3-chromium-modules','tests/quaternius-render-acceptance.cjs'],
 ['p7-chromium-facade','tests/quaternius-taipei-browser.cjs'],
 ['p8-chromium-streetblock','tests/quaternius-streetblock-browser.cjs']
];
const args=process.argv.slice(2);
if(args.some(a=>!['--static-only','--full'].includes(a))||new Set(args).size!==args.length){
 console.error('Usage: node tools/quaternius-p11-local-qa.cjs [--static-only | --full]');process.exit(2);
}
if(args.includes('--static-only')&&args.includes('--full')){console.error('Conflicting flags');process.exit(2);}
const staticOnly=args.includes('--static-only');
function command(prog,parameters,timeout=15000){
 try{
  const result=cp.spawnSync(prog,parameters,{cwd:ROOT,encoding:'utf8',
   windowsHide:true,timeout,maxBuffer:8*1024*1024,shell:false});
  return {exitCode:result.status===null?-1:result.status,
   stdout:(result.stdout||'').slice(-8000),
   stderr:(result.stderr||'').slice(-4000),
   error:result.error?.message||null};
 }catch(error){return {exitCode:-1,stdout:'',stderr:'',error:String(error)};}
}
function stat(pathname){
 try{return fs.statSync(pathname).size;}catch{return null;}
}
function probe(){
 const branch=command('git',['branch','--show-current']);
 const head=command('git',['rev-parse','HEAD']);
 const pkg=require(path.join(ROOT,'package.json'));
 const nodeMajor=Number(process.versions.node.split('.')[0]);
 const resources=[
  ...['Brick_Plain_1','Brick_RedWhite_DoubleWindow','Metal_Window','DoorFrame_Trim'].flatMap(n=>
   ['.gltf','.bin'].map(ext=>'assets/third_party/quaternius-downtown/'+n+ext)),
  'assets/vendor/three-r149.min.js',
  'assets/vendor/three-r149-esm-shim.js',
  'previews/quaternius-downtown/streetblock.html',
  'previews/quaternius-downtown/streetblock.js',
  'tests/quaternius-streetblock-browser.cjs',
  'previews/quaternius-downtown/sign-atlas-layout.mjs'
 ];
 const missingResources=resources.filter(p=>!stat(path.join(ROOT,p)));
 const branchName=branch.exitCode===0?branch.stdout.trim():null;
 const branchValid=branchName===EXPECTED;
 let pw=null,canvas=null,chrome=null;
 try{pw=require('playwright');chrome={path:pw.chromium.executablePath(),
  installed:!!stat(pw.chromium.executablePath())};}catch(e){chrome={installed:false,error:String(e.code||e)};}
 try{canvas=require('@napi-rs/canvas');}catch{}
 return {
  branchName,branchValid,headSha:head.exitCode===0?head.stdout.trim():null,
  node:process.version,nodeVersionOK:nodeMajor>=22,packagePlaywright:pkg.devDependencies?.playwright||null,
  packageCanvas:pkg.devDependencies?.['@napi-rs/canvas']||null,
  playwrightInstalled:!!pw,canvasInstalled:!!canvas,chromium:chrome,
  missingResources,staticReady:branchValid&&nodeMajor>=22&&missingResources.length===0,
  browserReady:branchValid&&nodeMajor>=22&&missingResources.length===0&&!!pw&&!!canvas&&!!chrome?.installed
 };
}
fs.mkdirSync(OUT,{recursive:true});
const checks=probe();
const report={scope:'P11 Quaternius local art QA',generatedAt:new Date().toISOString(),
 branchExpected:EXPECTED,mode:staticOnly?'static-only':'full',checks,steps:[],
 result:'NOT RUN',visualApproved:false,
 notes:['No production runtime, Taipei map or main changes.',
  'A screenshot from headless SwiftShader needs human visual review; FPS is not native GPU FPS.']
};
const outFile=path.join(OUT,'local-qa-report.json');
function save(){fs.writeFileSync(outFile,JSON.stringify(report,null,2)+'\n');}
function step(name,script,timeout=120000){
 const start=Date.now();
 const execution=command(process.execPath,[script],timeout);
 const item={name,script,durationMs:Date.now()-start,
  status:execution.exitCode===0?'PASS':'FAIL',
  exitCode:execution.exitCode,
  tail:execution.stdout,errors:execution.stderr,error:execution.error};
 report.steps.push(item);
 return execution.exitCode===0;
}
try{
 if(!checks.branchValid){
  report.result='BLOCKED: refuses to run outside isolated art branch';process.exitCode=1;
 }else if(!checks.nodeVersionOK||checks.missingResources.length){
  report.result='BLOCKED: missing required Node version or preview assets';process.exitCode=1;
 }else{
  let allStatic=true;
  for(const [name,file] of STEPS)if(!step(name,file,45000))allStatic=false;
  if(!allStatic){report.result='FAILED: static art tests; browser not run';process.exitCode=1;}
  else if(staticOnly)report.result='STATIC PASS; BROWSER NOT RUN';
  else if(!checks.browserReady){
   report.result='BLOCKED: browser tooling unavailable; STATIC PASS ONLY';
   report.notes.push('Run npm ci && npx playwright install chromium to enable real screenshot checks.');
   process.exitCode=1;
  }else{
   let allBrowser=true;
   for(const [name,file] of BROWSER_STEPS)if(!step(name,file,240000))allBrowser=false;
   // Always derive an evidence manifest, even if one browser test failed.
   step('p10-evidence-manifest','tools/quaternius-p10-report.cjs',45000);
   report.result=allBrowser?'BROWSER AUTOMATED PASS; HUMAN VISUAL REVIEW PENDING':
    'FAILED: at least one browser audit did not pass';
   if(!allBrowser)process.exitCode=1;
  }
 }
}catch(err){report.result='ERROR';report.notes.push(String(err?.stack||err));process.exitCode=1;}
finally{
 save();
 console.log(JSON.stringify({result:report.result,branch:checks.branchName,commit:checks.headSha,
  staticChecks:report.steps.filter(x=>x.name.startsWith('p')&&!x.name.includes('chromium')),
  report:'test-results/quaternius-p11/local-qa-report.json'},null,2).slice(0,6000));
}
