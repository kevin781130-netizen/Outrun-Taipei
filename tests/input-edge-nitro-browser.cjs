'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const {setup,checkInputEdges}=require('./tools/input-edge-cases.cjs');
const root=path.resolve(__dirname,'..');
const marker='resetGame(); updateHUD(); drawRouteMap(); render(0);';
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.equal(source.split(marker).length,2);
const html=source.replace(marker,'window.__inputTestEval=code=>eval(code);'+marker);
const allowed=new Set(['assets/vendor/three-r149.min.js','assets/hybrid-renderer.js','assets/traffic-lane-intent.js','assets/perf-diagnostics.js']);
const server=http.createServer((req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname.slice(1);
 if(p===''||p==='index.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}
 else if(allowed.has(p)){res.setHeader('Content-Type','application/javascript');fs.createReadStream(path.join(root,p)).pipe(res);}
 else {res.writeHead(404);res.end();}
});
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader'],
   ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  for(const handling of ['', '&handling=v59'])for(const enabled of [false,true]){
   const page=await browser.newPage({viewport:enabled?{width:390,height:844}:{width:1280,height:800}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
   const search=enabled?'?input=edges1'+handling:handling?'?handling=v59':'';
   await page.goto(`http://127.0.0.1:${server.address().port}/${search}`);
   const run=code=>page.evaluate(code=>window.__inputTestEval(code),code);
   const send=(code,down)=>down?page.keyboard.down(code):page.keyboard.up(code);
   await checkInputEdges({run,send,enabled});
   if(enabled){
    await send('KeyN',false);await run(setup);await send('KeyN',true);
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    await run('togglePause();update(1/60)');
    assert.equal(await run('nitroStock'),2,'browser blur clears pending input');
   }
   assert.deepEqual(errors,[],'no page errors');await page.close();
  }
  console.log('Input edge Chromium PASS: real keyboard down/up/repeat, default/V59 opt-in and legacy controls, pause/blur, guard cases; local test build only');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
