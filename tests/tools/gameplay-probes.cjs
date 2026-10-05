// Dev-only gameplay measurement probes (not part of npm test). Drives the real update() loop through a
// scripted "driver" so handling claims can be measured instead of assumed.
// Usage: node tests/tools/gameplay-probes.cjs corner|speed|nearmiss|all
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {CORNER,SPEED,TRAFFIC}=require('./probe-code.cjs');
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
  for(const v of [120,180,240,280])
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
 await close();
})();
