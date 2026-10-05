// Dev-only: captures roadside-object grounding states and landmark approaches for before/after review.
// Usage: [QA_INDEX=older.html] node tests/tools/qa-grounding.cjs <outDir>
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
(async()=>{
 const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
 const src=fs.readFileSync(process.env.QA_INDEX||path.join(__dirname,'../../index.html'),'utf8').replace('resetGame(); updateHUD(); drawRouteMap(); render(0);','window.__audit=code=>eval(code);resetGame(); updateHUD(); drawRouteMap(); render(0);');
 const srv=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(src)});await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1280,height:800}});const errors=[];pg.on('pageerror',e=>errors.push(e.message));
 await pg.addInitScript(()=>{window.requestAnimationFrame=()=>0});await pg.goto(`http://127.0.0.1:${srv.address().port}/`);
 const run=c=>pg.evaluate(c=>window.__audit(c),c);
 const shot=async n=>{await pg.waitForTimeout(250);await pg.locator('#gameCanvas').screenshot({path:path.join(out,n+'.png')});};
 const clean=`clearTimeout(resultTimer);gameOver=false;overlay.classList.add('hidden');nameEntryModal.classList.remove('show');celebrationCard.classList.remove('show');countdownEl.classList.remove('show');bubble.classList.remove('show');stylePop.classList.remove('show');stageCard.classList.remove('show');`;
 const sign=async(name,id,mode,curve,which=1,dist=42,mood='sunset')=>{
  await run(`v34Mode='${mode}';selectedRoute=routeForId('${id}');if('${mode}'==='arcade')setStage(...Object.values(routeForId('${id}')));else resetGame();gameStarted=true;raceActive=true;${clean}traffic=[];timeLeft=999;skyMood='${mood}';speed=180;playerX=0;
   ${curve===null?'':`for(let i=0;i<segments.length;i++)segments[i].curve=${curve};`}
   const sg=v52ApproachSigns()[${which}];playerZ=Math.max(0,sg.index-${dist})*SEGMENT_LENGTH;updateHUD();render(0);`);
  await shot(name);
 };
 await sign('s1-straight-1A','1A','sprint',0);
 await sign('s2-shallow-3B','3B','sprint',.4);
 await sign('s3-tight-4B','4B','sprint',2.4);
 await sign('s4-expressway-2B','2B','sprint',null);
 await sign('s5-expressway-4C','4C','sprint',null,0,60);
 await sign('s6-coastal-3A','3A','sprint',null);
 await sign('s7-mountain-5E','5E','sprint',.8);
 await sign('s8-arcade-4D','4D','arcade',null,2,30);
 await sign('s9-night-2B','2B','sprint',null,1,42,'neon');
 await run(`v34Mode='arcade';selectedRoute=routeForId('1A');setStage(...Object.values(routeForId('1A')));gameStarted=true;raceActive=true;${clean}traffic=[];timeLeft=999;speed=0;playerX=0;playerZ=0;render(0);`);await shot('s10-start-1A');
 await run(`v34Mode='arcade';selectedRoute=routeForId('1A');setStage(...Object.values(routeForId('1A')));gameStarted=true;raceActive=true;${clean}traffic=[];timeLeft=999;speed=180;playerX=0;playerZ=(FORK_START+30)*SEGMENT_LENGTH;render(0);`);await shot('s11-fork-1A');
 await run(`v34Mode='arcade';selectedRoute=routeForId('1A');setStage(...Object.values(routeForId('1A')));gameStarted=true;raceActive=true;${clean}traffic=[];timeLeft=999;speed=180;playerX=0;playerZ=(FORK_START-30)*SEGMENT_LENGTH;render(0);`);await shot('s12-gate-1A');
 await run(`if(typeof DEBUG_ROADSIDE_ANCHORS!=="undefined")DEBUG_ROADSIDE_ANCHORS=true;`);await sign('s13-debug-4B','4B','sprint',1.2);await sign('s14-debug-2B','2B','sprint',null);await run(`if(typeof DEBUG_ROADSIDE_ANCHORS!=="undefined")DEBUG_ROADSIDE_ANCHORS=false;`);
 // landmarks: approach at three distances for the audited set
 const lm=[['4C',0],['4C',1],['4C',2],['3B',0],['3B',1],['3C',0],['3C',1],['4D',0],['4D',1],['5A',0],['5C',0],['5D',0],['5E',0],['5E',1],['4A',1],['2A',1]];
 for(const mood of ['sunset','neon'])for(const [id,i] of lm){
  await run(`v34Mode='sprint';selectedRoute=routeForId('${id}');resetGame();gameStarted=true;raceActive=true;${clean}traffic=[];timeLeft=999;skyMood='${mood}';speed=180;playerX=0;const h=stageLandmarkPlan[${i}];playerZ=Math.max(0,h.seg-55)*SEGMENT_LENGTH;updateHUD();render(0);`);
  await shot(`l-${id}-${i}-${mood}`);
 }
 await b.close();srv.close();console.log(JSON.stringify({shots:fs.readdirSync(out).length,errors}));
})();
