// Dev-only QA tool: captures a fixed set of deterministic states so before/after screenshots can be compared.
// Usage: [QA_INDEX=/path/to/older/index.html] node tests/tools/qa-shots.cjs <outDir>   (writes PNGs outside the repo; never commit them)
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
(async()=>{
 const out=process.argv[2];if(!out)throw new Error('usage: qa-shots.cjs <outDir>');fs.mkdirSync(out,{recursive:true});
 const src=fs.readFileSync(process.env.QA_INDEX||path.join(__dirname,'../../index.html'),'utf8').replace('resetGame(); updateHUD(); drawRouteMap(); render(0);','window.__audit=code=>eval(code);resetGame(); updateHUD(); drawRouteMap(); render(0);');
 const srv=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(src)});await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 const b=await chromium.launch();const errors=[];
 async function open(w,h){const pg=await b.newPage({viewport:{width:w,height:h}});pg.on('pageerror',e=>errors.push(e.message));await pg.addInitScript(()=>{window.requestAnimationFrame=()=>0});await pg.goto(`http://127.0.0.1:${srv.address().port}/`);return pg;}
 const pg=await open(1280,800);const run=c=>pg.evaluate(c=>window.__audit(c),c);
 const base=(id,mode='arcade')=>`v34Mode='${mode}';selectedRoute=routeForId('${id}');if('${mode}'==='arcade')setStage(...Object.values(routeForId('${id}')));else resetGame();gameStarted=true;raceActive=true;clearTimeout(resultTimer);gameOver=false;overlay.classList.add('hidden');nameEntryModal.classList.remove('show');celebrationCard.classList.remove('show');traffic=[];timeLeft=999;playerX=0;countdownEl.classList.remove('show');bubble.classList.remove('show');stylePop.classList.remove('show');stageCard.classList.remove('show');`;
 const shot=async name=>{await pg.waitForTimeout(350);await pg.screenshot({path:path.join(out,name+'.png')});};
 await pg.waitForTimeout(300);await shot('00-menu');
 for(const [name,id] of [['urban','4D'],['expressway','2B'],['coastal','3A'],['mountain','4B']]){
  await run(base(id)+`speed=200;playerZ=170*SEGMENT_LENGTH;render(0);`);await shot('01-'+name);
 }
 for(const [name,lo,hi] of [['shallow',.22,.55],['tight',1.5,2.6]]){
  await run(base('2A','sprint')+`let found=-1;for(let i=140;i<segments.length-60;i++){const c=Math.abs(segments[i].curve);if(c>=${lo}&&c<=${hi}&&Math.abs(segments[i+6].curve)>=${lo}){found=i;break;}}window.__cornerIdx=found;`);
  await run(`const s=segments[window.__cornerIdx>0?window.__cornerIdx:200].curve>=0?1:-1;speed=190;playerZ=(Math.max(60,window.__cornerIdx-8))*SEGMENT_LENGTH;isDrifting=true;driftState='drift';driftDirection=s;driftAngle=34*s;slipAngle=10*s;render(0);`);
  await shot('02-corner-'+name);
 }
 await run(base('4D')+`speed=210;playerZ=180*SEGMENT_LENGTH;const spec=TRAFFIC_TYPES.taxi;traffic=[{x:.38*roadFactor(),z:playerZ+PLAYER_DEPTH+420,previousX:.38*roadFactor(),previousZ:playerZ+PLAYER_DEPTH+420,speed:90,spec,type:'taxi',phase:0,hitTimer:0,laneTarget:.38*roadFactor(),screenBox:null},{x:-.3*roadFactor(),z:playerZ+PLAYER_DEPTH+1500,previousX:-.3*roadFactor(),previousZ:playerZ+PLAYER_DEPTH+1500,speed:80,spec:TRAFFIC_TYPES.bus||spec,type:'bus',phase:0,hitTimer:0,laneTarget:-.3*roadFactor(),screenBox:null}];render(0);`);await shot('03-traffic');
 await run(`v34Mode='arcade';selectedRoute=routeForId('4D');clearTimeout(resultTimer);gameOver=false;nameEntryModal.classList.remove('show');celebrationCard.classList.remove('show');overlay.classList.add('hidden');inRadioScreen=true;dipSettings.coin='free';confirmRadioAndStart();for(let i=0;i<70;i++)update(1/60);render(0);`);await shot('04-start-count');
 await run(`for(let i=0;i<120;i++)update(1/60);render(0);`);await shot('04-start-go');
 await run(base('4D')+`speed=180;playerZ=(FORK_START-51)*SEGMENT_LENGTH;stageLevel=0;checkpointPassed=false;`);
 await run(`awardCheckpoint();render(0);`);await shot('05-checkpoint');
 await run(base('5D')+`speed=190;playerZ=(FINISH_LINE-3)*SEGMENT_LENGTH;render(0);`);await shot('06-finish-approach');
 await run(`finishGame(true);render(0);`);await shot('07-finish-celebration');
 await pg.waitForTimeout(4300);await shot('08-finish-result');
 const speedShots=[100,160,220,280,325];
 for(const v of speedShots){await run(base('4D')+`speed=${v};playerZ=170*SEGMENT_LENGTH;boosting=${v>285};render(0);`);await shot('09-speed-'+v);}
 for(const id of ['1A','2A','2B','3A','3B','3C','4A','4B','4C','4D','5A','5B','5C','5D','5E']){await run(base(id,'sprint')+`speed=190;playerZ=220*SEGMENT_LENGTH;updateHUD();render(0);`);await shot('11-route-'+id);}
 for(const mood of ['sunset','neon'])for(const id of ['1A','2B','3A','4B','4D','5C','5D','5E']){await run(base(id,'sprint')+`skyMood='${mood}';speed=200;playerZ=230*SEGMENT_LENGTH;updateHUD();render(0);`);await shot(`13-${mood}-${id}`);}
 for(const mood of ['sunset','neon']){await run(base('1A')+`skyMood='${mood}';speed=205;playerZ=175*SEGMENT_LENGTH;const spec=TRAFFIC_TYPES;const mk=(k,x,dz,sp)=>({x:x*roadFactor(),z:playerZ+PLAYER_DEPTH+dz,previousX:x*roadFactor(),previousZ:playerZ+PLAYER_DEPTH+dz,speed:sp,spec:spec[k],type:k,phase:0,hitTimer:0,laneTarget:x*roadFactor(),screenBox:null,color:spec[k].colors[0],near:false});traffic=[mk('taxi',.3,1500,150),mk('bus',-.35,3000,130),mk('euro_gt',.05,5200,200),mk('scooter',-.1,800,150)];updateHUD();render(0);`);await shot('14-traffic-'+mood);}
 await run(base('4B','sprint')+`skyMood='sunset';speed=190;playerZ=240*SEGMENT_LENGTH;isDrifting=true;driftState='drift';driftDirection=1;driftAngle=34;slipAngle=10;updateHUD();render(0);`);await shot('15-drift-mountain');
 const pp=await open(390,844);await pp.waitForTimeout(300);await pp.screenshot({path:path.join(out,'10-portrait-menu.png')});
 for(const [name,w,h] of [['portrait',390,844],['landscape',844,390]]){
  const q=await open(w,h);const r=c=>q.evaluate(c=>window.__audit(c),c);await q.waitForTimeout(250);
  await r(`v34Mode='arcade';selectedRoute=routeForId('4D');clearTimeout(resultTimer);overlay.classList.add('hidden');inRadioScreen=true;dipSettings.coin='free';confirmRadioAndStart();for(let i=0;i<70;i++)update(1/60);render(0);`);await q.waitForTimeout(350);await q.screenshot({path:path.join(out,`12-${name}-start.png`)});
  await r(`finishGame(true);render(0);`);await q.waitForTimeout(450);await q.screenshot({path:path.join(out,`12-${name}-finish.png`)});
 }
 await b.close();srv.close();
 console.log(JSON.stringify({shots:fs.readdirSync(out).length,errors}));
})();
