'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const allowed = new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/index.html', ['index.html','text/html; charset=utf-8']],
  ['/assets/vendor/three-r149.min.js', ['assets/vendor/three-r149.min.js','text/javascript; charset=utf-8']],
  ['/assets/hybrid-renderer.js', ['assets/hybrid-renderer.js','text/javascript; charset=utf-8']]
]);
const server = http.createServer((req,res)=>{
  const key=new URL(req.url,'http://127.0.0.1').pathname;
  const target=allowed.get(key);
  if(!target){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':target[1]});
  fs.createReadStream(path.join(ROOT,target[0])).pipe(res);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/index.html';
  const launch={headless:true};
  if(process.env.CHROMIUM_PATH)launch.executablePath=process.env.CHROMIUM_PATH;
  const browser=await chromium.launch(launch);
  try{
    const output=path.join(ROOT,'test-results/v55-hybrid-browser');
    fs.mkdirSync(output,{recursive:true});
    for(const [name,viewport] of [
      ['desktop',{width:1280,height:800}],
      ['portrait',{width:390,height:844}],
      ['landscape',{width:844,height:390}]
    ]){
      const context=await browser.newContext({viewport});
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url+'?renderer=hybrid');
      await page.waitForFunction(()=>window.v55HybridStatus?.().initialized,{timeout:12000});
      await page.locator('#start-btn').click();
      await page.locator('#radio-drive').click();
      await page.waitForFunction(()=>window.v55HybridStatus?.().ready,{timeout:12000});
      const status=await page.evaluate(()=>window.v55HybridStatus());
      assert.equal(status.ready,true,name+' should have a rendered 3D frame');
      const overlay=page.locator('#v55-hybrid-canvas');
      assert.equal(await overlay.count(),1);
      assert.equal(await overlay.evaluate(el=>getComputedStyle(el).visibility),'visible');
      assert.equal(await overlay.evaluate(el=>getComputedStyle(el).pointerEvents),'none');
      await page.screenshot({path:path.join(output,name+'.png')});
      assert.deepEqual(errors,[],name+' no JS page errors');
      if(name==='desktop'){
        const canLose=await page.evaluate(()=>{
          const c=document.querySelector('#v55-hybrid-canvas');
          const gl=c.getContext('webgl2');
          const ext=gl?.getExtension('WEBGL_lose_context');
          if(!ext)return false;
          ext.loseContext();
          return true;
        });
        if(canLose){
          await page.waitForFunction(()=>window.v55HybridStatus().contextLost,{timeout:5000});
          assert.equal(await page.evaluate(()=>window.v55HybridStatus().ready),false);
          await page.evaluate(()=>{
            const gl=document.querySelector('#v55-hybrid-canvas').getContext('webgl2');
            gl.getExtension('WEBGL_lose_context').restoreContext();
          });
          await page.waitForFunction(()=>window.v55HybridStatus().ready,{timeout:12000});
        }
      }
      await context.close();
    }

    // Missing WebGL asset must retain existing playable 2D entry point.
    const context=await browser.newContext();
    const page=await context.newPage();
    await page.route('**/assets/vendor/three-r149.min.js',route=>route.abort());
    await page.goto(url+'?renderer=hybrid');
    await page.locator('#start-btn').click();
    await page.locator('#radio-drive').click();
    await page.waitForTimeout(450);
    assert.equal(await page.locator('#gameCanvas').isVisible(),true);
    assert.equal(await page.locator('#v55-hybrid-canvas').count(),0);
    assert.equal(await page.evaluate(()=>window.v55HybridStatus().initialized),false);
    await context.close();
    console.log('V55 browser: desktop, portrait, landscape, WebGL recovery and asset fallback passed');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;})
.finally(()=>new Promise(resolve=>server.close(resolve)));
