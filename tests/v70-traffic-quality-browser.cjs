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
// Test-only WebGL buffer preservation for exact after-render pixel readback.
// Do NOT change the deployed Three.js bundle or game's GPU memory behavior.
const built=fs.readFileSync(path.join(ROOT,'assets/hybrid-renderer.js'),'utf8');
const contextAnchor="new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'high-performance'})";
assert.equal(built.split(contextAnchor).length,2,'one pinned WebGL renderer construction');
const readableRenderer=built.replace(contextAnchor,
 "new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'})");
const assets=new Set(['/assets/vendor/three-r149.min.js','/assets/hybrid-renderer.js',
 '/assets/traffic-lane-intent.js','/assets/perf-diagnostics.js']);
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(injected);return;}
 if(!assets.has(url.pathname)){res.writeHead(404);res.end('not found');return;}
 res.writeHead(200,{'Content-Type':'application/javascript'});
 if(url.pathname==='/assets/hybrid-renderer.js'){res.end(readableRenderer);return;}
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
   // Locate an actually visible near-field vehicle using the same Three.js
   // occlusion/projected-body query that authorizes game collisions. Merely
   // having an eligible road position does not mean the body is on screen.
   const placement=await audit(page,`(()=>{
     v34Mode='cruise';setStage(...Object.values(routeForId('${route}')),false);
     gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
     playerX=0;playerZ=1000;speed=0;timeLeft=999999;collisionCooldown=999999;
     const c=traffic[0];traffic=[c];c.x=0;c.laneTarget=0;
     c.speed=0;c.targetSpeed=0;c.near=false;c.hitTimer=0;
     for(const ahead of [6,8,10,12,15,18,24,30]){
       c.z=playerZ+PLAYER_DEPTH+ahead*SEGMENT_LENGTH;
       c.previousX=c.x;c.previousZ=c.z;
       const frame=v57SceneFrame();
       v56Scene.render(frame,0,canvas.width,canvas.height,graphicsQuality);
       const visible=v56Scene.prepareTrafficVisibility(frame,W,H);
       if(visible.some(box=>box.sourceIndex===0)){
         window.__v70Frame=frame;
         return {ahead,boxes:visible.length};
       }
     }
     return {ahead:null,boxes:0};
   })()`);
   assert(placement.ahead!==null,route+' must place a visible 3D body before comparing pixels');
   const meta=await audit(page,`({route:currentNode.id,archetype:currentNode.archetype,
      flag:window.__v70Frame.trafficVisual70,eligible:window.__v70Frame.traffic[0].eligible,
      distance:window.__v70Frame.traffic[0].distance,deck:Math.max(...window.__v70Frame.deckHeights)})`);
   assert.equal(meta.route,route);assert.equal(meta.flag,true);assert(meta.eligible);
   assert(meta.distance>0&&meta.distance<42,'car must be in V70 detail LOD range');
   if(route==='4B'||route==='5B')assert.equal(meta.deck,0,'mountain/coast cannot have an invented viaduct');
   const canvas=page.locator('#v56-full-3d-canvas');
   // V56's scene and canvas are lexical variables in the game script; only
   // the ephemeral in-script audit bridge can access them.
   const render=(flag,color)=>audit(page,`(()=>{
    const data=window.__v70Frame,chosen=${JSON.stringify(color||null)};
    const frame={...data,trafficVisual70:${flag===true},
     traffic:chosen?data.traffic.map((item,i)=>i===0?{...item,color:chosen}:item):data.traffic};
    return v56Scene.render(frame,0,canvas.width,canvas.height,graphicsQuality);
   })()`);
   await render(false);await render(false);
   const baseline=await canvas.screenshot({type:'png',animations:'disabled'});
   // Positive control: a deliberately different traffic body color MUST be
   // measurable, otherwise we are comparing stale compositor frames.
   await render(false,'#00ffff');
   const control=await canvas.screenshot({type:'png',animations:'disabled'});
   await render(true);
   const enhanced=await canvas.screenshot({type:'png',animations:'disabled'});
   await render(false);
   const restored=await canvas.screenshot({type:'png',animations:'disabled'});
   const colorTest=await different(baseline,control);
   const compare=await different(baseline,enhanced),reset=await different(baseline,restored);
   // Retain the actual evidence before enforcing quality thresholds.
   for(const [kind,data] of [['legacy',baseline],['color-control',control],['v70',enhanced],['restored',restored]]){
    const name=`v70-${route}-${width}-${kind}.png`;
    fs.writeFileSync(path.join(OUT,name),data);
    report.captures.push({file:name,bytes:data.length,sha256:hash(data)});
   }
   report.comparisons.push({route,archetype:meta.archetype,viewport:[width,height],
    visibleAtSegments:placement.ahead,colorControlPixels:colorTest.changed,
    changedPixels:compare.changed,affectedShare:compare.share,
    restoreDifferenceShare:reset.share});
   fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(report,null,2));
   console.log('V70 '+route+' distance='+placement.ahead+
    ' colorControl='+colorTest.changed+' changed='+compare.changed+
    ' share='+compare.share.toFixed(6)+' reset='+reset.share.toFixed(6));
   assert(colorTest.changed>20,route+' sanity check: compositor must register changed car paint');
   // Geometry must be observably more detailed, yet affect only a small visible
   // car region, not change the road/camera/terrain or mutate simulation state.
   assert(compare.changed>15,route+' styling must visibly modify the real WebGL image');
   assert(compare.share<.08,route+' details must not repaint the whole scene');
   assert(reset.share<.005,route+' opting out restores almost exactly baseline pixels');
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
