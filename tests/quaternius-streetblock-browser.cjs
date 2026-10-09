'use strict';
// P8 repeatable headless Chrome evidence generator for the isolated art preview.
// Does NOT validate the official game or actual mobile GPU performance.
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const ROOT=path.resolve(__dirname,'..');
const DEST=path.join(ROOT,'test-results/quaternius-p8');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.gltf':'model/gltf+json','.bin':'application/octet-stream','.png':'image/png'};
function makeServer(){
 return http.createServer((req,res)=>{
  try{
   const u=new URL(req.url,'http://localhost');
   const file=path.resolve(ROOT,'.'+decodeURIComponent(u.pathname));
   if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
   const final=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
   res.setHeader('Content-Type',MIME[path.extname(final)]||'application/octet-stream');
   res.setHeader('Cache-Control','no-store');
   fs.createReadStream(final).on('error',()=>res.end()).pipe(res);
  }catch(err){res.writeHead(404);res.end('Not found');}
 });
}
async function inspectPixels(bytes){
 const img=await loadImage(bytes);
 const c=createCanvas(28,20),ctx=c.getContext('2d');
 ctx.drawImage(img,0,0,28,20);
 const d=ctx.getImageData(0,0,28,20).data;
 const unique=new Set();
 for(let i=0;i<d.length;i+=4)unique.add(((d[i]>>4)<<8)|((d[i+1]>>4)<<4)|(d[i+2]>>4));
 return {width:img.width,height:img.height,uniqueColors:unique.size,nonBlank:unique.size>=12};
}
async function frames(page){
 return page.evaluate(async()=>{
  const values=[];
  await new Promise(resolve=>{
   const sample=t=>{values.push(t);if(values.length>=61)resolve();else requestAnimationFrame(sample);};
   requestAnimationFrame(sample);
  });
  const deltas=values.slice(1).map((t,i)=>t-values[i]).sort((a,b)=>a-b);
  const average=deltas.reduce((a,b)=>a+b,0)/deltas.length;
  return {count:deltas.length,meanMs:+average.toFixed(2),
   p95Ms:+deltas[Math.floor(deltas.length*.95)].toFixed(2),
   approximateFPS:+(1000/average).toFixed(1)};
 });
}
async function run(){
 fs.mkdirSync(DEST,{recursive:true});
 const report={scope:'P8 independent Taipei-style block',timestamp:new Date().toISOString(),
  status:'INCOMPLETE',softwareGPU:true,screenshots:[],smoke:[],errors:[]};
 const server=makeServer();
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/previews/quaternius-downtown/streetblock.html';
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle',
   '--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  report.browser=browser.version();
  for(const [label,width,height] of [['desktop',1280,800],['mobile',390,844]]){
   const context=await browser.newContext({viewport:{width,height}});
   const page=await context.newPage(),runtimeErrors=[];
   page.on('pageerror',e=>runtimeErrors.push(e.message));
   page.on('requestfailed',r=>runtimeErrors.push(r.url()+': '+r.failure()?.errorText));
   page.on('console',m=>{if(m.type()==='error')runtimeErrors.push(m.text());});
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>document.getElementById('street-status')?.textContent.startsWith('已建立'),null,{timeout:30000});
   for(const count of ['3','5','7']){
    await page.selectOption('#count',count);
    await page.waitForFunction(n=>document.getElementById('building-count')?.textContent===n,count);
    report.smoke.push({viewport:label,count:Number(count)});
   }
   await page.selectOption('#count','5');
   for(const lod of ['near','far'])for(const lighting of ['day','night']){
    await page.selectOption('#lod-mode',lod);
    const night=lighting==='night';
    const isNight=(await page.getAttribute('#night','aria-pressed'))==='true';
    if(night!==isNight)await page.click('#night');
    const expectedNear=lod==='near'?5:0,expectedFar=5-expectedNear;
    await page.waitForFunction(expected=>{
      return Number(document.getElementById('lod-near')?.textContent)===expected[0]&&
        Number(document.getElementById('lod-far')?.textContent)===expected[1];
    },[expectedNear,expectedFar]);
    const pacing=await frames(page);
    const image=await page.locator('#street-canvas').screenshot();
    const visual=await inspectPixels(image);
    const filename=label+'_'+lod+'_'+lighting+'.png';
    fs.writeFileSync(path.join(DEST,filename),image);
    const state=await page.evaluate(()=>{
     const get=id=>document.getElementById(id)?.textContent;
     const c=document.getElementById('street-canvas');
     return {buildings:Number(get('building-count')),shops:get('shop-list'),
      near:Number(get('lod-near')),far:Number(get('lod-far')),
      budget:Number(get('budget')?.replaceAll(',','')),
      drawCalls:Number(get('calls')),triangles:Number(get('triangles')?.replaceAll(',','')),
      webgl:!!(c.getContext('webgl2')||c.getContext('webgl')),
      signTextures:get('sign-textures'),signMemory:get('sign-vram')};
    });
    const result={viewport:label,lod,lighting,filename,visual,pacing,state};
    report.screenshots.push(result);
    const expectedBudget=lod==='near'?21124:936;
    if(!state.webgl||!visual.nonBlank||state.buildings!==5||state.near!==expectedNear||
       state.far!==expectedFar||state.budget!==expectedBudget||state.drawCalls<=0||
       state.triangles<=0||pacing.count!==60||!state.signTextures?.startsWith('1 張')||
       !state.signMemory?.includes('4,096 KiB')){
      report.errors.push('Invalid visual/browser/metric state: '+filename);
    }
   }
   report.errors.push(...runtimeErrors.map(error=>label+': '+error));
   await context.close();
  }
  report.status=report.errors.length?'FAIL':'AUTOMATED CHECKS COMPLETED, HUMAN VISUAL REVIEW PENDING';
 }catch(e){report.errors.push(String(e.stack||e));report.status='FAILED/INCOMPLETE';}
 finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(DEST,'report.json'),JSON.stringify(report,null,2)+'\n');
 }
 console.log(JSON.stringify({status:report.status,smokeChecks:report.smoke.length,
  screenshots:report.screenshots.length,errors:report.errors.length,output:DEST},null,2));
 if(report.errors.length||report.smoke.length!==6||report.screenshots.length!==8)process.exitCode=1;
}
run().catch(e=>{console.error(e);process.exitCode=1;});
