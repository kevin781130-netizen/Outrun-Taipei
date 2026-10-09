'use strict';
// P7 standalone Chromium evidence for the combined Taipei facade preview.
// Local-only: does not deploy, publish, patch, or run the real Taipei racing game.
const path=require('node:path');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'test-results/quaternius-p7');
const modes=['near','far'],lights=['day','night'];
const styles=['mixed','metal','brick'];
const viewports=[{label:'desktop',width:1280,height:800},{label:'mobile',width:390,height:844}];
const polygons={mixed:4268,metal:3836,brick:4700};
const types={'.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.gltf':'model/gltf+json','.html':'text/html; charset=utf-8','.png':'image/png','.bin':'application/octet-stream'};
function server(){
 return http.createServer((req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const file=path.resolve(root,'.'+pathname);
   if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   const stat=fs.statSync(file);
   const target=stat.isDirectory()?path.join(file,'index.html'):file;
   res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');
   res.setHeader('Cache-Control','no-store');
   fs.createReadStream(target).on('error',()=>res.end()).pipe(res);
  }catch{res.writeHead(404);res.end('Not found');}
 });
}
async function imageVariety(bytes){
 const image=await loadImage(bytes);
 const c=createCanvas(32,24),ctx=c.getContext('2d');
 ctx.drawImage(image,0,0,32,24);
 const pixels=ctx.getImageData(0,0,32,24).data;
 const colors=new Set();
 for(let i=0;i<pixels.length;i+=4)colors.add(((pixels[i]>>4)<<8)|((pixels[i+1]>>4)<<4)|(pixels[i+2]>>4));
 return {colors:colors.size,valid:colors.size>=12,dimensions:[image.width,image.height]};
}
async function pace(page){
 return page.evaluate(async()=>{
  const stamps=[];
  await new Promise(resolve=>{
   const frame=t=>{stamps.push(t);if(stamps.length>=61)resolve();else requestAnimationFrame(frame);};
   requestAnimationFrame(frame);
  });
  const d=stamps.slice(1).map((t,i)=>t-stamps[i]).filter(x=>x>0).sort((a,b)=>a-b);
  const avg=d.reduce((a,b)=>a+b,0)/d.length;
  return {frames:d.length,meanMs:+avg.toFixed(2),p95Ms:+d[Math.floor(d.length*.95)].toFixed(2),fps:+(1000/avg).toFixed(1)};
 });
}
async function run(){
 fs.mkdirSync(out,{recursive:true});
 const record={scope:'P7 isolated Taipei facade',timestamp:new Date().toISOString(),headless:true,softwareGPU:'SwiftShader; not hardware benchmark',
  runs:[],errors:[],status:'NOT RUN/INCOMPLETE'};
 let browser=null,app=server();
 try{
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  const port=app.address().port;
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  record.browserVersion=browser.version();
  for(const viewport of viewports){
   const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('requestfailed',e=>errors.push('Failed request '+e.url()+': '+e.failure()?.errorText));
   page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
   await page.goto('http://127.0.0.1:'+port+'/previews/quaternius-downtown/assembly.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#status')?.textContent.startsWith('LOD 樣板已組合'),null,{timeout:30000});
   for(const style of styles){
    await page.selectOption('#style',style);
    for(const mode of modes){
     await page.selectOption('#lod-mode',mode);
     const exp=mode==='near'?polygons[style]:180;
     await page.waitForFunction(expected=>{
      const v=document.querySelector('#visible-tris')?.textContent||'';
      return Number(v.replaceAll(',',''))===expected;
     },exp);
     for(const light of lights){
      const night=light==='night';
      const pressed=(await page.getAttribute('#lighting','aria-pressed'))==='true';
      if(pressed!==night)await page.click('#lighting');
      await page.waitForTimeout(120);
      const perf=await pace(page);
      const shot=await page.locator('#canvas').screenshot();
      const pixels=await imageVariety(shot);
      const filename=viewport.label+'_'+style+'_'+mode+'_'+light+'.png';
      fs.writeFileSync(path.join(out,filename),shot);
      const ui=await page.evaluate(()=>{
        const x=id=>document.getElementById(id)?.textContent;
        const c=document.querySelector('#canvas');
        const gl=c.getContext('webgl2')||c.getContext('webgl');
        return {status:x('status'),lod:x('lod-state'),triangles:x('visible-tris'),
          shop:x('taipei-shop'),objects:x('taipei-objects'),drawCalls:x('calls'),webgl:!!gl};
      });
      const item={style,mode,light,viewport:viewport.label,filename,ui,pixels,perf};
      if(!ui.webgl||!pixels.valid||Number(ui.drawCalls)<=0||
        Number(ui.triangles.replaceAll(',',''))!==exp){
        errors.push('Failed visuals/statics '+filename);
      }
      record.runs.push(item);
     }
    }
   }
   record.errors.push(...errors);
   await context.close();
  }
  record.status=record.errors.length?'FAIL':'AUTOMATED CHECKS COMPLETE; HUMAN VISUAL REVIEW PENDING';
 }catch(err){record.errors.push(String(err?.stack||err));record.status='INCOMPLETE/FAIL';}
 finally{
  if(browser)await browser.close();
  await new Promise(resolve=>app.close(resolve));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(record,null,2)+'\n');
 }
 console.log(JSON.stringify({status:record.status,images:record.runs.length,errors:record.errors.length,output:out},null,2));
 if(record.errors.length||record.runs.length!==24)process.exitCode=1;
}
run().catch(e=>{console.error(e);process.exitCode=1;});
