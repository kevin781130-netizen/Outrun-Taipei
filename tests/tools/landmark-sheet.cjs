// Dev-only: renders every STAGE_LANDMARKS sprite on a neutral backdrop (sunset or night) for visual audit.
// Usage: [QA_INDEX=older.html] node tests/tools/landmark-sheet.cjs <outDir> [ids comma separated]
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
(async()=>{
 const out=process.argv[2];fs.mkdirSync(out,{recursive:true});const only=process.argv[3]?process.argv[3].split(','):null;
 const src=fs.readFileSync(process.env.QA_INDEX||path.join(__dirname,'../../index.html'),'utf8').replace('resetGame(); updateHUD(); drawRouteMap(); render(0);','window.__audit=code=>eval(code);resetGame(); updateHUD(); drawRouteMap(); render(0);');
 const srv=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(src)});await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1000,height:700}});const errors=[];pg.on('pageerror',e=>errors.push(e.message));
 await pg.addInitScript(()=>{window.requestAnimationFrame=()=>0});await pg.goto(`http://127.0.0.1:${srv.address().port}/`);
 const run=c=>pg.evaluate(c=>window.__audit(c),c);
 const ids=only||await run(`Object.keys(STAGE_LANDMARKS)`);
 for(const mood of ['sunset','neon']){
  for(const id of ids){
   const data=await run(`(()=>{skyMood='${mood}';v34Mode='sprint';selectedRoute=routeForId('${id}');resetGame();skyMood='${mood}';
    const items=(STAGE_LANDMARKS['${id}']||[]);const cols=items.length;const cw=620,ch=520;const cv=document.createElement('canvas');cv.width=cw*cols;cv.height=ch;const c=cv.getContext('2d');
    const sky=v53SkySet();const g=c.createLinearGradient(0,0,0,ch*.78);g.addColorStop(0,sky[0]);g.addColorStop(.7,sky[1]);g.addColorStop(1,sky[2]);c.fillStyle=g;c.fillRect(0,0,cv.width,ch);c.fillStyle='#4a4f55';c.fillRect(0,ch*.78,cv.width,ch*.22);
    const info=[];items.forEach((h,i)=>{const sp=getLandmarkSprite(h);const k=Math.min((ch*.74)/sp.height,(cw*.9)/sp.width,1.4);c.drawImage(sp.canvas,i*cw+cw/2-sp.width*k/2,ch*.78-sp.height*k,sp.width*k,sp.height*k);c.fillStyle='#fff';c.font='16px sans-serif';c.fillText(h.name,i*cw+10,22);info.push({name:h.name,w:Math.round(sp.width),h:Math.round(sp.height)});});
    return JSON.stringify({url:cv.toDataURL('image/png'),info});})()`);
   const j=JSON.parse(data);fs.writeFileSync(path.join(out,`${id}-${mood}.png`),Buffer.from(j.url.split(',')[1],'base64'));
   if(mood==='sunset')console.log(id,JSON.stringify(j.info));
  }
 }
 await b.close();srv.close();console.log(JSON.stringify({errors}));
})();
