// Dev-only gameplay measurement probes (not part of npm test). Drives the real update() loop through a
// scripted "driver" so handling claims can be measured instead of assumed.
// Usage: node tests/tools/gameplay-probes.cjs corner|speed|nearmiss|all
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {CORNER,SPEED,TRAFFIC,ACCEL,DWELL,ARCADE_STAGE}=require('./probe-code.cjs');
async function open(){
 const src=fs.readFileSync(process.env.QA_INDEX||path.join(__dirname,'../../index.html'),'utf8').replace('resetGame(); updateHUD(); drawRouteMap(); render(0);','window.__audit=code=>eval(code);resetGame(); updateHUD(); drawRouteMap(); render(0);');
 const srv=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(src)});await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1280,height:800}});
 await pg.addInitScript(()=>{window.requestAnimationFrame=()=>0});await pg.goto(`http://127.0.0.1:${srv.address().port}/`);
 return {run:c=>pg.evaluate(c=>window.__audit(c),c),close:async()=>{await b.close();srv.close();}};
}
// One scripted corner run inside the page. curve = constant bend on segments [A,A+LEN).

// Straight-section decision probe: how often does traffic force/offer a choice during 60 s of flat-out driving?

// Speed-perception probe: how much does the *picture* change per frame at each speed, and how much of it comes from overlays?
async function corner(run){
 const rows=[];
 for(const [name,c] of [['shallow',.3],['medium',.9],['tight',2.2],['hairpin',3.6]])
  for(const v of [120,180,240,265])
   for(const p of ['coast','grip','lift','brake','drift'])
    rows.push({cls:name,...await run(`(${CORNER})(${c},${v},'${p}')`)});
 return rows;
}
(async()=>{
 const mode=process.argv[2]||'corner';const {run,close}=await open();
 if(mode==='corner'||mode==='all'){
  const rows=await corner(run);
  console.log('cls     v   policy  crash maxX  off  minV exitV time driftS yaw charge duty');
  for(const r of rows)console.log(`${r.cls.padEnd(8)}${String(r.v0).padEnd(4)}${r.policy.padEnd(8)}${String(r.crashed).padEnd(6)}${String(r.maxX).padEnd(6)}${String(r.offroad).padEnd(5)}${String(r.minSpeed).padEnd(5)}${String(r.exitSpeed).padEnd(6)}${String(r.time).padEnd(5)}${String(r.driftSec).padEnd(7)}${String(r.visYaw).padEnd(4)}${String(r.charge).padEnd(7)}${r.duty}`);
 }

 if(mode==='traffic'||mode==='all'){
  for(const id of ['1A','2B','4D','5D'])for(const pol of ['hold','dodge'])console.log(JSON.stringify(await run(`(${TRAFFIC})('${id}','${pol}',45)`)));
 }

 if(mode==='speed'||mode==='all'){
  for(const v of [100,160,220,280,325]){const a=await run(`(${SPEED})(${v},true)`),b=await run(`(${SPEED})(${v},false)`);console.log(JSON.stringify(a));console.log(JSON.stringify(b));}
 }

 if(mode==='accel'||mode==='all'){
  for(const [st,g,n] of [[0,'AT',0],[0,'MT:118',0],[0,'MT:100',0],[0,'MT:150',0],[200,'AT',0],[230,'AT',230],[250,'AT',250],[180,'AT',180],[150,'AT',150]]){
   const r=await run(`(${ACCEL})(${st},${n?70:140},'${g}',${n})`);console.log(JSON.stringify({start:r.start,gear:r.gearMode,nitroAt:n,t:r.t,final:r.final,boostMax:r.boostMax}));
   if(st===0&&g==='AT')console.log('trace/s',r.trace.join(','));
  }
 }
 if(mode==='dwell'||mode==='all'){
  for(const id of ['1A','3A','4D','5B','5E'])for(const d of [0,1])console.log(d?'drift':'grip ',JSON.stringify(await run(`(${DWELL})('${id}',${d})`)));
 }

 if(mode==='stage'||mode==='all'){
  for(const id of ['1A','2A','2B','3A','3C','4A','4B','5A','5D'])console.log(JSON.stringify(await run(`(${ARCADE_STAGE})('${id}')`)));
 }

 if(mode==='perf'||mode==='all'){
  const out=[];
  for(const [id,m] of [['1A','sunset'],['2B','neon'],['3A','sunset'],['4B','sunset'],['4D','neon'],['5C','neon'],['5D','neon']]){
   out.push(JSON.stringify(await run(`(()=>{v34Mode='sprint';selectedRoute=routeForId('${id}');resetGame();gameStarted=true;raceActive=true;overlay.classList.add('hidden');traffic=[];timeLeft=999;skyMood='${m}';speed=220;playerX=0;
    for(let i=0;i<10;i++){playerZ=(200+i*3)*SEGMENT_LENGTH;render(0);}
    let best=1e9;for(let rep=0;rep<3;rep++){const t0=performance.now();const N=70;for(let i=0;i<N;i++){playerZ=(200+i*2)*SEGMENT_LENGTH;simulationTime+=1/60;render(1/60);}best=Math.min(best,(performance.now()-t0)/N);}
    return {id:'${id}',mood:'${m}',msPerFrame:+best.toFixed(2)};})()`)));
  }
  console.log(out.join('\n'));
 }
 await close();
})();
