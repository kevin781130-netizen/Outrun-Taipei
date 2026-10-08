'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const assets={
 '/':'index.html','/index.html':'index.html',
 '/assets/vendor/three-r149.min.js':'assets/vendor/three-r149.min.js',
 '/assets/hybrid-renderer.js':'assets/hybrid-renderer.js'
};
const server=http.createServer((req,res)=>{
 const key=new URL(req.url,'http://localhost').pathname,rel=assets[key];
 if(!rel){res.writeHead(404);res.end('missing');return;}
 const type=rel.endsWith('.js')?'application/javascript; charset=utf-8':'text/html; charset=utf-8';
 res.writeHead(200,{'Content-Type':type});
 fs.createReadStream(path.join(ROOT,rel)).pipe(res);
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port;
 const opts={headless:true};
 if(process.env.CHROMIUM_PATH)opts.executablePath=process.env.CHROMIUM_PATH;
 const browser=await chromium.launch(opts);
 try{
  const output=path.join(ROOT,'test-results/v56-webgl');fs.mkdirSync(output,{recursive:true});
  for(const [name,viewport] of [
   ['desktop',{width:1280,height:800}],
   ['mobile',{width:390,height:844}],
   ['landscape',{width:844,height:390}]
  ]){
   const page=await browser.newPage({viewport});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/');
   await page.waitForFunction(()=>window.v56ThreeStatus?.().ready,{timeout:20000});
   assert.equal(await page.locator('#v56-full-3d-canvas').count(),1);
   assert.equal(await page.locator('#gameCanvas').evaluate(el=>getComputedStyle(el).visibility),'hidden');
   assert.equal(await page.locator('#v56-full-3d-canvas').evaluate(el=>getComputedStyle(el).visibility),'visible');
   assert.equal(await page.locator('#build-version strong').textContent(),'V56.1');
   await page.locator('#start-btn').click();
   await page.locator('#radio-drive').click();
   await page.waitForTimeout(900);
   assert.equal(await page.evaluate(()=>window.v56ThreeStatus().ready),true);
   await page.screenshot({path:path.join(output,name+'.png')});
   assert.deepEqual(errors,[],name+' must not have JS errors');
   await page.close();
  }
  console.log('V56 real Chromium WebGL test: 3 desktop/mobile viewports, no visible 2D canvas, no runtime errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>new Promise(done=>server.close(done)));
