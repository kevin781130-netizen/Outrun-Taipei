'use strict';
// P7 DATA/STATIC checks only. Does not claim browser screenshot or hardware FPS.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
(async()=>{
  const api=await import(pathToFileURL(path.join(ROOT,'previews/quaternius-downtown/taipei-streetfront.mjs')).href);
  const presets=api.TAIPEI_STREETFRONT_PRESETS;
  assert.deepEqual(Object.keys(presets).sort(),['brick','metal','mixed']);
  const materialKeys=new Set(['plaster','awning','awningAlt','railing','condenser','signBg','accentGlow']);
  const totals={mixed:3652,metal:3220,brick:4084};
  for(const key of Object.keys(presets)){
    const plan=api.buildTaipeiStreetfrontPlan(key);
    assert(Object.isFrozen(plan));
    assert.equal(plan.nearBoxes.length,51);
    assert.equal(plan.farBoxes.length,8);
    assert.equal(plan.signs.length,2);
    assert.equal(plan.signs[0].text,presets[key].sign);
    assert(/^[\u3400-\u9fff]{2,8}$/.test(presets[key].sign),'shop name must be Traditional Chinese text');
    assert(plan.nearBoxes.some(b=>b.role==='arcade-column'));
    assert(plan.nearBoxes.some(b=>b.role==='awning-valance'));
    assert(plan.nearBoxes.some(b=>b.role==='balcony-vertical'));
    assert(plan.nearBoxes.some(b=>b.role==='aircon-case'));
    assert(plan.nearBoxes.some(b=>b.role==='rain-pipe'));
    assert(plan.farBoxes.some(b=>b.role==='sign-silhouette'));
    for(const box of [...plan.nearBoxes,...plan.farBoxes]){
      assert(Object.isFrozen(box),'box placement must be immutable');
      assert(materialKeys.has(box.material),'unsupported material '+box.material);
      assert.equal(box.position.length,3);
      assert.equal(box.scale.length,3);
      box.scale.forEach(n=>assert(Number.isFinite(n)&&n>0));
      box.position.forEach(n=>assert(Number.isFinite(n)));
      // Presentation-only geometry constrained to local 10m facade; no world/map coords.
      const [x,y,z]=box.position,[w,h,d]=box.scale;
      assert(Math.abs(x)+w/2<5.7,'local horizontal bounds exceeded');
      assert(y-h/2>=-.001 && y+h/2<=6.8,'local vertical bounds exceeded');
      assert(z+d/2<=2.1 && z-d/2>=-.6,'local facade depth exceeded');
    }
    for(const sign of plan.signs){
      assert(sign.text.length>0);
      assert(sign.position.length===3&&sign.size.length===2);
    }
    const near=totals[key]+plan.nearBoxes.length*12+plan.signs.length*2;
    const far=84+plan.farBoxes.length*12;
    assert(far<near*.06,'LOD geometry budget should be less than 6% of near scene');
    assert.equal(far,180);
  }
  assert.throws(()=>api.buildTaipeiStreetfrontPlan('main'),RangeError);
  const renderer=read('previews/quaternius-downtown/taipei-streetfront-renderer.mjs');
  const assembly=read('previews/quaternius-downtown/assembly.js');
  const html=read('previews/quaternius-downtown/assembly.html');
  assert(renderer.includes("import {buildTaipeiStreetfrontPlan} from './taipei-streetfront.mjs';"));
  assert(renderer.includes('new THREE.CanvasTexture(c)'));
  assert(renderer.includes('text.name=')&&renderer.includes('plan.farBoxes'));
  assert(assembly.includes("import {createTaipeiStreetfrontArtist} from './taipei-streetfront-renderer.mjs';"));
  assert(assembly.includes('taipeiArtist.attach(style,nearFacade,farFacade)'));
  assert(assembly.includes('taipeiArtist.setNight(night)'));
  assert(assembly.includes("cloneMod('door',0,0)")&&assembly.includes("cloneMod('brickWall',0,y)"));
  assert(html.includes('id="taipei-preset"')&&html.includes('id="taipei-shop"'));
  for(const f of [renderer,assembly]){
    for(const forbidden of ['Full3DScene.cjs','src/rendering/','roadCorridors(','updateVehiclePose','routes.push','index.html?route='])
      assert(!f.includes(forbidden),'preview dependency on gameplay '+forbidden);
  }
  console.log('P7 data schema, 3 Taipei-inspired styles, 2 signs/style, 51 near + 8 far props/style, LOD budget and isolated viewer: STATIC PASS. Browser visual check pending.');
})().catch(error=>{console.error(error);process.exitCode=1;});
