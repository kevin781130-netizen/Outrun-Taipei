'use strict';
// V70: screenshot/pixel-gated 3D detail improvement, WITHOUT game simulation edits.
const assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'test-results/v70-traffic-quality');
const src=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const anchor='resetGame(); updateHUD(); drawRouteMap(); render(0);';
assert.equal(src.split(anchor).length,2);
const injected=src.replace(anchor,'window.__v70VisualAudit=code=>eval(code);'+anchor);
const assets=new Set(['/assets/vendor/three-r149.min.js','/assets/hybrid-renderer.js',
 '/assets/traffic-lane-intent.js','/assets/perf-diagnostics.js']);
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(injected);return;}
 if(!assets.has(url.pathname)){res.writeHead(404);res.end('not found');return;}
 res.writeHead(200,{'Content-Type':'application/javascript'});
 fs.createReadStream(path.join(ROOT,url.pathname.slice(1))).pipe(res);
});
const audit=(page,script)=>page.evaluate(code=>window.__v70VisualAudit(code),script);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function pixels(buff){
 const img=await loadImage(buff),canvas=createCanvas(img.width,img.height);
 const g=canvas.getContext('2d');g.drawImage(img,0,0);
 return {width:img.width,height:img.height,data:g.getImageData(0,0,img.width,img.height).data};
}
async function different(a,b){
 const x=await pixels(a),y=await pixels(b);
 assert.equal(x.width,y.width);assert.equal(x.height,y.height);
 let changed=0;
 for(let i=0;i<x.data.length;i+=4){
  if(Math.abs(x.data[i]-y.data[i])+Math.abs(x.data[i+1]-y.data[i+1])+
    Math.abs(x.data[i+2]-y.data[i+2])>36)changed++;
 }
 return {changed,total:x.width*x.height,share:changed/(x.width*x.height)};
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const report={schema:'taipei.v70.traffic-visual.1',status:'failed',
  scope:'headless Chromium real composited WebGL pixels; not real-device FPS or human design signoff',
  captures:[],comparisons:[],errors:[]};
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  for(const [route,width,height] of [['1A',1280,800],['4B',1280,800],['5B',390,844]]){
   const page=await browser.newPage({viewport:{width,height}});
   page.on('pageerror',e=>report.errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
   await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
   await page.goto('http://127.0.0.1:'+server.address().port+'/?trafficAI=v60',{waitUntil:'load'});
   await page.waitForFunction(()=>window.v56ThreeStatus?.().loaded,{timeout:20000});
   await audit(page,`(()=>{
     v34Mode='cruise';setStage(...Object.values(routeForId('${route}')),false);
     gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
     playerX=0;playerZ=1000;speed=0;timeLeft=999999;collisionCooldown=999999;
     const c=traffic[0];traffic=[c];c.x=0;c.laneTarget=0;
     c.z=playerZ+PLAYER_DEPTH+18*SEGMENT_LENGTH;c.previousX=0;c.previousZ=c.z;
     c.speed=0;c.targetSpeed=0;c.near=false;c.hitTimer=0;
     window.__v70Frame=v57SceneFrame();
   })()`);
   const meta=await audit(page,`({route:currentNode.id,archetype:currentNode.archetype,
      flag:window.__v70Frame.trafficVisual70,eligible:window.__v70Frame.traffic[0].eligible,
      distance:window.__v70Frame.traffic[0].distance,deck:Math.max(...window.__v70Frame.deckHeights)})`);
   assert.equal(meta.route,route);assert.equal(meta.flag,true);assert(meta.eligible);
   assert(meta.distance>0&&meta.distance<42,'car must be in V70 detail LOD range');
   if(route==='4B'||route==='5B')assert.equal(meta.deck,0,'mountain/coast cannot have an invented viaduct');
   const canvas=page.locator('#v56-full-3d-canvas');
   const render=flag=>audit(page,`v56Scene.render({...window.__v70Frame,trafficVisual70:${flag}},0,canvas.width,canvas.height,graphicsQuality)`);
   await render(false);await render(false);
   const baseline=await canvas.screenshot({type:'png',animations:'disabled'});
   await render(true);
   const enhanced=await canvas.screenshot({type:'png',animations:'disabled'});
   await render(false);
   const restored=await canvas.screenshot({type:'png',animations:'disabled'});
   const compare=await different(baseline,enhanced),reset=await different(baseline,restored);
   // Geometry must be observably more detailed, yet affect only a small visible
   // car region, not change the road/camera/terrain or mutate simulation state.
   assert(compare.changed>15,route+' styling must visibly modify the real WebGL image');
   assert(compare.share<.08,route+' details must not repaint the whole scene');
   assert(reset.share<.005,route+' opting out restores almost exactly baseline pixels');
   for(const [kind,data] of [['legacy',baseline],['v70',enhanced],['restored',restored]]){
    const name=`v70-${route}-${width}-${kind}.png`;
    fs.writeFileSync(path.join(OUT,name),data);
    report.captures.push({file:name,bytes:data.length,sha256:hash(data)});
   }
   report.comparisons.push({route,archetype:meta.archetype,viewport:[width,height],
    changedPixels:compare.changed,affectedShare:compare.share,restoreDifferenceShare:reset.share});
   await page.close();
  }
  assert.deepEqual(report.errors,[],'no JavaScript or browser errors');
  report.status='passed';
  fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(report,null,2));
  console.log('V70 WebGL near-car details: three urban/mountain/coast same-frame A/B screenshot comparisons and six extra/three restored PNGs passed');
 }catch(error){
  report.failure=error.stack||String(error);
  fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(report,null,2));
  throw error;
 }finally{await browser?.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>new Promise(r=>server.close(r)));
