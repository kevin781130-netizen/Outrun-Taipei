'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {load}=require('./canvas-harness.cjs');
const {geographyAt,resolveGeographicFrame,profileId}=require('../src/rendering/RouteGeography.cjs');
const data=require('../data/world-v59/scene-profiles.json');
const file=path.resolve(__dirname,'../index.html'),game=load(file,{search:'?handling=v59'}),legacy=load(file);
const sandbox={};vm.runInNewContext(fs.readFileSync(require.resolve('../assets/vendor/three-r149.min.js'),'utf8'),sandbox);const T=sandbox.THREE;
let rendered;T.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}render(scene,camera){rendered={scene,camera};}dispose(){}};
const {createFull3DScene}=require('../src/rendering/Full3DScene.cjs');
const world=createFull3DScene(T,{style:{},addEventListener(){},removeEventListener(){}}),receipts=[];
const routeIds=JSON.parse(game.run('JSON.stringify(STAGES.flat().map(s=>s.id))'));
assert.deepEqual(Object.keys(data.routes),routeIds);assert.equal(data.routes['4C'].bridgeEvidence,null);
for(const id of routeIds){
 const setup=`v34Mode='arcade';setStage(...Object.values(routeForId('${id}')),false);`;
 game.run(setup);legacy.run(setup);
 const originalRoad=game.run('JSON.stringify(segments.map(s=>[s.curve,s.p1.world.y]))');
 assert.equal(originalRoad,legacy.run('JSON.stringify(segments.map(s=>[s.curve,s.p1.world.y]))'),'do not replace authored driving geometry');
 const marks=JSON.parse(game.run('JSON.stringify(stageLandmarkPlan.map(h=>({seg:h.seg,name:h.name,side:h.side})))'));
 assert.equal(data.routes[id].zones.length,marks.length,id+' retains original landmark order');
 for(let j=0;j<marks.length;j++){
  game.run(`playerZ=(stageLandmarkPlan[${j}].seg-45)*SEGMENT_LENGTH-PLAYER_DEPTH;playerX=0;`);
  const input=JSON.parse(game.run('JSON.stringify(v57SceneFrame())')),before=JSON.stringify(input),frame=resolveGeographicFrame(input);
  assert.equal(input.geographyProfile,profileId);assert.equal(frame.geography.length,126);
  assert.equal(geographyAt(id,marks[j].seg,marks).id,data.routes[id].zones[j]);
  assert.equal(JSON.stringify(input),before,'pure scene resolution');
  assert.deepEqual(frame.curves,input.curves);assert.deepEqual(frame.hills,input.hills);assert.deepEqual(frame.corridors,input.corridors);assert.deepEqual(frame.traffic,input.traffic);
  if(id!=='2B'){assert(frame.deckHeights.every(h=>h===0),'unverified viaduct must not render');assert(frame.landmarks.every(h=>h.groundDrop===0),'ground landmarks do not float below an invented deck');}
  const random=Math.random;Math.random=()=>{throw Error('geography consumed gameplay RNG');};
  try{world.render(input,0);}finally{Math.random=random;}
  const deck=rendered.scene.getObjectByName('Race_ExpresswayDeck'),water=rendered.scene.getObjectByName('Race_GeographicWater');
  if(id==='2B')assert(deck.geometry.drawRange.count>0);else assert.equal(deck.geometry.drawRange.count,0);
  rendered.scene.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite),o.name+' finite transform'));
  for(const name of ['Race_GeographicLand','Race_GeographicWater']){const g=rendered.scene.getObjectByName(name).geometry;assert(g.drawRange.count<=g.attributes.position.count,'ribbon pool capacity');}
  receipts.push({id,landmark:marks[j].name,zone:geographyAt(id,marks[j].seg,marks).id,water:water.userData.kinds,deckVertices:deck.geometry.drawRange.count});
 }
}
// Specific identity checks away from landmark occlusion windows.
for(const [id,name] of [['5C','Race_SlopeHouses'],['5E','Race_TeaRows'],['5A','Race_Boats'],['5B','Race_Rocks'],['5B','Race_Waves']]){
 game.run(`setStage(...Object.values(routeForId('${id}')),false);playerZ=50*SEGMENT_LENGTH;`);
 world.render(JSON.parse(game.run('JSON.stringify(v57SceneFrame())')),0);
 assert(rendered.scene.getObjectByName(name).count>0,id+' has '+name);
 if(name==='Race_SlopeHouses'||name==='Race_TeaRows'){
  const objects=rendered.scene.getObjectByName(name),bases=rendered.scene.getObjectByName('Race_Terraces'),m=new T.Matrix4(),a=new T.Vector3(),b=new T.Vector3(),sa=new T.Vector3(),sb=new T.Vector3(),q=new T.Quaternion();
  assert.equal(objects.count,bases.count,'every raised object has a foundation');
  for(let n=0;n<objects.count;n++){
   objects.getMatrixAt(n,m);m.decompose(a,q,sa);bases.getMatrixAt(n,m);m.decompose(b,q,sb);
   assert(Math.abs(a.y-sa.y/2-b.y-sb.y/2)<1e-4,'foundation touches object base');
   const level=n%(name==='Race_SlopeHouses'?3:5),rise=level*(name==='Race_SlopeHouses'?3:.4);
   assert(b.y-sb.y/2<=a.y-sa.y/2-rise-.24,'foundation reaches the terrain instead of floating');
  }
 }

}
assert(receipts.filter(r=>r.id==='3A').every(r=>!r.water.includes('sea')),'Guandu is never open coast');
assert(receipts.filter(r=>r.id==='4A').every(r=>r.water.includes('estuary')));
assert(receipts.filter(r=>r.id==='5B').every(r=>r.water.includes('sea')));
for(const id of ['4B','5E','4D','5D'])assert(receipts.filter(r=>r.id===id).every(r=>r.water.length===0),id+' has no generic water plane');
const plain={routeId:'3A',archetype:'coastal'};assert.equal(resolveGeographicFrame(plain),plain,'default renderer stays legacy');
world.dispose();
fs.mkdirSync(path.resolve(__dirname,'../test-results'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../test-results/v59-geography.json'),JSON.stringify({status:'passed',scope:'scene classification, not surveyed road geography or visual approval',receipts},null,2));
console.log('V59 geography: 15 routes/27 original landmarks, river/estuary/coast identity, conservative viaducts, terrain props, road/input/RNG preservation and pool bounds passed (GPU mocked)');
