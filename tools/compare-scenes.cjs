'use strict';
// V54 P3 manual Chromium visual parity: 15 routes x sunset/neon.
// Usage: node tools/compare-scenes.cjs /path/V53.html index.html
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {compareRgba}=require('./scene-metrics.cjs');
const MARKER='applyRuleLabels(); resetGame(); updateHUD(); drawRouteMap(); render(0);';
const ROUTES=['1A','2A','2B','3A','3B','3C','4A','4B','4C','4D','5A','5B','5C','5D','5E'];
const MOODS=['sunset','neon'],VIEWPORT={width:1280,height:800};
function inject(html,label){
  if(html.split(MARKER).length!==2)throw Error(label+': cannot inject test-only bridge');
  return html.replace(MARKER,'window.__sceneAudit=code=>eval(code);'+MARKER);
}
function hash(s){return crypto.createHash('sha256').update(s).digest('hex');}
function setup(id,mood){
  if(!ROUTES.includes(id)||!MOODS.includes(mood))throw Error('Unknown scene');
  return "window.__resetAuditRng();v34Mode='cruise';selectedRoute=routeForId('"+id+"');"+
    "skyMood='"+mood+"';resetGame();gameStarted=true;raceActive=true;"+
    "paused=false;gameOver=false;inRadioScreen=false;screenShake=0;"+
    "overlay.classList.add('hidden');speed=220;playerX=0;"+
    "playerZ=200*SEGMENT_LENGTH;simulationTime=10;"+
    "traffic.forEach((car,i)=>{car.z=playerZ+(15+i*8)*SEGMENT_LENGTH;"+
    "car.x=(i%3-1)*.55;car.laneTarget=car.x;});render(0);";
}
async function pixels(png){
  const im=await loadImage(png),cv=createCanvas(im.width,im.height),cx=cv.getContext('2d');
  cx.drawImage(im,0,0);
  return {width:im.width,height:im.height,data:cx.getImageData(0,0,im.width,im.height).data};
}
async function main(){
  if(process.argv.length!==4)throw Error('Usage: node tools/compare-scenes.cjs V53.1.html V54.html');
  const b=fs.readFileSync(path.resolve(process.argv[2]),'utf8');
  const a=fs.readFileSync(path.resolve(process.argv[3]),'utf8');
  const sourceSHA256={before:hash(b),after:hash(a)};
  if(sourceSHA256.before===sourceSHA256.after)throw Error('Before and after source files are identical');
  const out=path.resolve(process.env.SCENE_OUTPUT||'test-results/v54-scenes');
  const paths={before:path.join(out,'before'),after:path.join(out,'after'),quality:path.join(out,'quality')};
  for(const directory of Object.values(paths))fs.mkdirSync(directory,{recursive:true});
  const html={before:inject(b,'before'),after:inject(a,'after')};
  const server=http.createServer((req,res)=>{
    const key=req.url==='/before'?'before':req.url==='/after'?'after':null;
    if(!key){res.writeHead(404);res.end('Not found');return;}
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html[key]);
  });
  let browser;
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const opts={headless:true};
    if(process.env.CHROMIUM_PATH)opts.executablePath=process.env.CHROMIUM_PATH;
    browser=await chromium.launch(opts);
    const errors=[];
    async function open(name){
      const page=await browser.newPage({viewport:VIEWPORT});
      page.on('pageerror',e=>errors.push(name+': '+e.message));
      await page.addInitScript(()=>{
        window.requestAnimationFrame=()=>0;
        let seed=540;
        window.__resetAuditRng=()=>{seed=540;};
        Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      });
      await page.goto('http://127.0.0.1:'+server.address().port+'/'+name,{waitUntil:'load'});
      return page;
    }
    const [before,after]=await Promise.all([open('before'),open('after')]);
    const run=(page,expr)=>page.evaluate(code=>window.__sceneAudit(code),expr);
    const bRoutes=await run(before,'STAGES.flat().map(x=>x.id)');
    const aRoutes=await run(after,'STAGES.flat().map(x=>x.id)');
    if(JSON.stringify(bRoutes)!==JSON.stringify(ROUTES)||JSON.stringify(aRoutes)!==JSON.stringify(ROUTES)){
      throw Error('Stage identities differ from the expected 15 routes');
    }
    if(!await run(after,"typeof setGraphicsQuality==='function'"))throw Error('V54 graphics preset hook missing');
    await run(after,"setGraphicsQuality('STANDARD',false)");
    async function snapshot(page){
      const expr="(()=>{const c=document.getElementById('gameCanvas');"+
        "return {png:c.toDataURL('image/png'),geometry:JSON.stringify({"+
        "W,H,route:currentNode.id,playerZ,playerX,"+
        "road:projectedRoad.map(s=>[s.index,s.p1.screen.x,s.p1.screen.y,s.p1.screen.w,"+
        "s.p2.screen.x,s.p2.screen.y,s.p2.screen.w,s.clipY]),"+
        "traffic:trafficSprites.map(t=>[t.car.type,t.x,t.y,t.scale,t.clipY,"+
        "t.car.screenBox?.l,t.car.screenBox?.r,t.car.screenBox?.t,t.car.screenBox?.b])"+
        "})};})()";
      return run(page,expr);
    }
    const rows=[];
    for(const id of ROUTES)for(const mood of MOODS){
      await run(before,setup(id,mood));
      await run(after,setup(id,mood));
      const [bs,as]=await Promise.all([snapshot(before),snapshot(after)]);
      const bp=Buffer.from(bs.png.split(',')[1],'base64'),ap=Buffer.from(as.png.split(',')[1],'base64');
      if(bp.length<2000||ap.length<2000)throw Error(id+'/'+mood+': blank or tiny PNG');
      const [bi,ai]=await Promise.all([pixels(bp),pixels(ap)]);
      if(bi.width!==960||bi.height!==540||ai.width!==960||ai.height!==540){
        throw Error(id+'/'+mood+': incorrect STANDARD 960x540 image dimensions');
      }
      const metrics=compareRgba(bi.data,ai.data,960,540);
      const geometryMatches=bs.geometry===as.geometry,filename=id+'-'+mood+'.png';
      fs.writeFileSync(path.join(paths.before,filename),bp);
      fs.writeFileSync(path.join(paths.after,filename),ap);
      rows.push({id,mood,geometryMatches,...metrics});
      console.log(id+'/'+mood+' changed='+metrics.changedPixelsPercent.toFixed(2)+
        '% avg RGB='+metrics.meanAbsoluteRgbDifference.toFixed(2)+
        ' geometry='+(geometryMatches?'OK':'DIFFERENT'));
    }
    // Test actual settings DOM interaction and canvas backing pixels.
    await after.locator('#service-btn').click();
    const presets=[['LOW',720,405],['STANDARD',960,540],['HIGH',1200,675],['ULTRA',1440,810]];
    const quality=[];
    for(const [preset,width,height] of presets){
      await after.locator('#dip-graphics').selectOption(preset);
      const info=await run(after,"(()=>{render(0);return {info:v54GraphicsInfo(),"+
        "selected:document.getElementById('dip-graphics').value,"+
        "stored:localStorage.getItem('taipeiGraphicsV54'),"+
        "transform:displayCtx.getTransform().a};})()");
      const valid=info.info.logicalWidth===960&&info.info.logicalHeight===540&&
        info.info.outputWidth===width&&info.info.outputHeight===height&&
        info.info.internalWidth===width&&info.info.internalHeight===height&&
        info.selected===preset&&info.stored===preset&&
        Math.abs(info.transform-width/960)<1e-8;
      const dataUrl=await run(after,"document.getElementById('gameCanvas').toDataURL('image/png')");
      const bytes=Buffer.from(dataUrl.split(',')[1],'base64');
      fs.writeFileSync(path.join(paths.quality,preset+'.png'),bytes);
      quality.push({preset,width,height,passed:valid,pngBytes:bytes.length});
      if(!valid)throw Error('Chromium graphics quality mismatch: '+preset+' '+JSON.stringify(info));
    }
    await after.reload({waitUntil:'load'});
    const persistence=await run(after,"v54GraphicsInfo().quality==='ULTRA'&&"+
      "document.getElementById('dip-graphics').value==='ULTRA'");
    if(!persistence)throw Error('Quality preference did not survive reload');
    // Verify service-menu reachability and quality change in phone/landscape
    // Chromium emulation. This is not a physical-device FPS measurement.
    const responsive=[];
    for(const [name,viewport] of [
      ['phone',{width:390,height:844}],
      ['landscape',{width:844,height:390}]
    ]){
      const context=await browser.newContext({viewport,hasTouch:true,isMobile:true});
      try{
        const mobilePage=await context.newPage();
        mobilePage.on('pageerror',e=>errors.push(name+': '+e.message));
        await mobilePage.goto('http://127.0.0.1:'+server.address().port+'/after',{waitUntil:'load'});
        await mobilePage.locator('#service-btn').click();
        if(!await mobilePage.locator('#dip-graphics').isVisible()){
          throw Error(name+': graphics selector not visible in service settings');
        }
        await mobilePage.locator('#dip-graphics').selectOption('HIGH');
        const info=await mobilePage.evaluate(()=>({
          width:document.getElementById('gameCanvas').width,
          height:document.getElementById('gameCanvas').height,
          selected:document.getElementById('dip-graphics').value
        }));
        if(info.width!==1200||info.height!==675||info.selected!=='HIGH'){
          throw Error(name+': quality menu not operational '+JSON.stringify(info));
        }
        await mobilePage.screenshot({path:path.join(paths.quality,name+'-settings.png')});
        responsive.push({name,viewport,passed:true,selected:info.selected});
      }finally{await context.close();}
    }
    if(errors.length)throw Error('Browser runtime errors: '+errors.join(' | '));
    const report={
      schema:1,sourceSHA256,browser:browser.version(),viewport:VIEWPORT,
      scenes:rows.length,geometryMatchesEveryScene:rows.every(r=>r.geometryMatches),
      quality,presetPersistencePassed:persistence,responsive,rows,runtimeErrors:errors,
      reviewRequired:true,
      notes:[
        'Compares 30 deterministic STANDARD 960x540 game-canvas images and projected road/traffic geometry.',
        'Pixel differences are reported; visual parity must still be reviewed by a human.',
        'This does not measure live gameplay FPS, GPU memory or real mobile performance.'
      ]
    };
    const file=path.join(out,'summary.json');
    fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
    console.log('Saved '+file);
    if(!report.geometryMatchesEveryScene){
      console.error('FAILED: projection or traffic geometry differs between versions');
      process.exitCode=1;
    }else console.log('V54 P3 projection and quality checks passed; visual review remains.');
  }finally{
    if(browser)await browser.close();
    if(server.listening)await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
