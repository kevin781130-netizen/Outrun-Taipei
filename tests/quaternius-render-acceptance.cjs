'use strict';
// Isolated P3 real-browser audit. Requires local repo checkout + npm ci.
// Does not run or modify the real game. Generates evidence ONLY under test-results/.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const {loadImage,createCanvas}=require('@napi-rs/canvas');
const ROOT=path.resolve(__dirname,'..');
const DEST=path.join(ROOT,'test-results/quaternius-p3');
const MODELS=['Brick_RedWhite_DoubleWindow','Brick_Plain_1','Metal_Window','DoorFrame_Trim'];
const VIEWPORTS=[
 {id:'desktop',width:1280,height:800,deviceScaleFactor:1},
 {id:'mobile-portrait',width:390,height:844,deviceScaleFactor:1},
 {id:'mobile-landscape',width:844,height:390,deviceScaleFactor:1}
];
const PREFIX='assets/third_party/quaternius-downtown/';
const MIMES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.gltf':'model/gltf+json','.bin':'application/octet-stream','.png':'image/png','.txt':'text/plain; charset=utf-8','.md':'text/markdown; charset=utf-8'};
const pngSize=p=>{
 const b=fs.readFileSync(p);
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',p+' PNG header');
 const width=b.readUInt32BE(16),height=b.readUInt32BE(20);
 assert(width>0&&height>0&&width<=8192&&height<=8192,'invalid PNG size');
 return {width,height,bytes:b.length};
};
function staticAudit(){
 const records=[];
 for(const name of MODELS){
  const dir=path.join(ROOT,PREFIX),model=JSON.parse(fs.readFileSync(path.join(dir,name+'.gltf'),'utf8'));
  let tris=0;
  for(const mesh of model.meshes||[])for(const primitive of mesh.primitives||[]){
   assert.equal(primitive.mode??4,4,'only TRIANGLES mode supported by model estimate');
   const positions=model.accessors[primitive.attributes.POSITION];
   assert(positions?.count>0,'missing positions');
   const n=primitive.indices!==undefined?model.accessors[primitive.indices].count:positions.count;
   assert.equal(n%3,0,'nontriangle index count');tris+=n/3;
  }
  const referenced=[];
  for(const b of model.buffers||[]){
   assert(!b.uri.includes('..')&&!path.isAbsolute(b.uri));
   assert.equal(fs.statSync(path.join(dir,b.uri)).size,b.byteLength,'geometry buffer length');
   referenced.push(b.uri);
  }
  const images=[];
  for(const i of model.images||[]){
   assert(!i.uri.includes('..')&&!path.isAbsolute(i.uri));
   images.push({file:i.uri,...pngSize(path.join(dir,i.uri))});
   referenced.push(i.uri);
  }
  for(const tex of model.textures||[])assert(tex.source>=0&&tex.source<images.length);
  records.push({name,triangles:tris,primitives:model.meshes.reduce((n,m)=>n+m.primitives.length,0),
    materialCount:model.materials?.length||0,images,referenced});
 }
 return records;
}
function createServer(){
 return http.createServer((req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   const pathname=decodeURIComponent(url.pathname);
   const full=path.resolve(ROOT,'.'+pathname);
   if(full!==ROOT&&!full.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
   let target=full;
   if(fs.statSync(target).isDirectory())target=path.join(target,'index.html');
   const mime=MIMES[path.extname(target).toLowerCase()]||'application/octet-stream';
   res.setHeader('Content-Type',mime);
   res.setHeader('Cache-Control','no-store');
   fs.createReadStream(target).on('error',()=>{if(!res.headersSent)res.writeHead(500);res.end();}).pipe(res);
  }catch{res.writeHead(404);res.end();}
 });
}
const percentile=(arr,p)=>arr.slice().sort((a,b)=>a-b)[Math.min(arr.length-1,Math.floor(p*(arr.length-1)))];
async function framePacing(page){
 return page.evaluate(async()=>{
  const frames=[];
  await new Promise(resolve=>{
   const tick=t=>{
    frames.push(t);
    if(frames.length>=90)resolve();
    else requestAnimationFrame(tick);
   };
   requestAnimationFrame(tick);
  });
  const d=frames.slice(1).map((t,i)=>t-frames[i]).filter(x=>x>0);
  d.sort((a,b)=>a-b);
  const avg=d.reduce((a,b)=>a+b,0)/d.length;
  return {samples:d.length,meanFrameMs:+avg.toFixed(2),
    p95FrameMs:+d[Math.floor(d.length*.95)].toFixed(2),
    effectiveFPS:+(1000/avg).toFixed(1),framesOver33Ms:d.filter(x=>x>33.33).length};
 });
}
async function imageCheck(buffer){
 const image=await loadImage(buffer),canvas=createCanvas(48,32),ctx=canvas.getContext('2d');
 ctx.drawImage(image,0,0,48,32);
 const data=ctx.getImageData(0,0,48,32).data,colors=new Set();
 for(let i=0;i<data.length;i+=4)colors.add((data[i]>>4)*256+(data[i+1]>>4)*16+(data[i+2]>>4));
 return {width:image.width,height:image.height,quantizedColors:colors.size,nonBlank:colors.size>=12};
}
async function waitModel(page,name){
 await page.waitForFunction(n=>{
  const status=document.getElementById('status')?.textContent||'';
  return status.startsWith('已載入：'+n+' ·');
 },name,{timeout:30000});
}
async function run(){
 fs.mkdirSync(DEST,{recursive:true});
 const report={kind:'Quaternius P3 headless Chromium render audit',date:new Date().toISOString(),
   host:os.platform()+' '+os.arch(),node:process.version,headless:true,softwareOrGPU:'check browser GL renderer and environment',
   sourceCommit:null,static:staticAudit(),runs:[],errors:[],conclusion:'NOT VERIFIED'};
 try{report.sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();}catch{}
 const server=createServer();
 let browser=null;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  browser=await chromium.launch({headless:true,
    executablePath:process.env.CHROMIUM_PATH||undefined,
    args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  report.browserVersion=browser.version();
  for(const viewport of VIEWPORTS){
   const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:viewport.deviceScaleFactor});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push('pageerror: '+error.message));
   page.on('console',msg=>{if(msg.type()==='error')errors.push('console: '+msg.text());});
   page.on('requestfailed',req=>errors.push('request: '+req.url()+' '+req.failure()?.errorText));
   await page.goto('http://127.0.0.1:'+port+'/previews/quaternius-downtown/',{waitUntil:'domcontentloaded',timeout:30000});
   await waitModel(page,MODELS[0]);
   for(const name of MODELS){
    if(name!==MODELS[0])await page.selectOption('#asset',name);
    await waitModel(page,name);
    if((await page.getAttribute('#light','aria-pressed'))==='true')await page.click('#light');
    await page.waitForTimeout(250);
    const before=errors.length;
    const perf=await framePacing(page);
    const canvas=page.locator('#view');
    const pixelBuffer=await canvas.screenshot({animations:'disabled'});
    const pixel=await imageCheck(pixelBuffer);
    const filename=viewport.id+'_'+name+'_day.png';
    fs.writeFileSync(path.join(DEST,filename),pixelBuffer);
    await page.click('#light');
    await page.waitForTimeout(180);
    const nightBuffer=await canvas.screenshot({animations:'disabled'});
    const nightFile=viewport.id+'_'+name+'_night.png';
    const nightPixel=await imageCheck(nightBuffer);
    fs.writeFileSync(path.join(DEST,nightFile),nightBuffer);
    const ui=await page.evaluate(()=>{
     const value=id=>document.getElementById(id)?.textContent;
     const canvas=document.getElementById('view');
     const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
     return {status:value('status'),meshCount:value('meshes'),triangles:value('tris'),
       materials:value('materials'),drawCalls:value('drawcalls'),bounds:value('bounds'),
       webgl:!!gl,webglVersion:gl?gl.getParameter(gl.VERSION):null,maxTextureSize:gl?gl.getParameter(gl.MAX_TEXTURE_SIZE):null,materialProbe:window.__quaterniusPreviewProbe?.()||null};
    });
    const run={viewport:viewport.id,name,ui,perf,pixel,nightPixel,screenshots:[filename,nightFile],pageErrors:errors.slice(before)};
    report.runs.push(run);
    assert(ui.webgl&&ui.status.startsWith('已載入：'),'WebGL/model missing');
    assert(Number(ui.meshCount.replaceAll(',',''))>0&&Number(ui.drawCalls.replaceAll(',',''))>0,'missing draw calls');
    assert(ui.materialProbe?.loaded&&ui.materialProbe.meshCount>0,'rendered scene diagnostics missing');
    assert(ui.materialProbe.textures.length>0,'textured model has no runtime texture maps');
    assert(ui.materialProbe.textures.every(t=>t.ready),'runtime textures not decoded/ready');
    assert(pixel.nonBlank&&nightPixel.nonBlank,'blank/suspicious screenshot');
    assert(perf.samples>=80&&Number.isFinite(perf.effectiveFPS),'invalid frame sample');
   }
   if(errors.length)report.errors.push({viewport:viewport.id,messages:errors});
   await context.close();
  }
  report.conclusion=report.errors.length?'REVIEW ERRORS':'AUTOMATED BROWSER CHECKS PASSED; MANUAL VISUAL REVIEW REQUIRED';
 }catch(error){report.errors.push({fatal:String(error.stack||error)});report.conclusion='AUTOMATED BROWSER CHECK FAILED';process.exitCode=1;}
 finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(DEST,'report.json'),JSON.stringify(report,null,2)+'\n');
 }
 if(report.errors.length)process.exitCode=1;
 console.log(JSON.stringify({conclusion:report.conclusion,checks:report.runs.length,errors:report.errors.length,
  report:'test-results/quaternius-p3/report.json',screenshots:'test-results/quaternius-p3/*.png'},null,2));
 if(report.errors.length)console.error(JSON.stringify(report.errors).slice(0,1600));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
