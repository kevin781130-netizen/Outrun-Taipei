'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const sandbox={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),sandbox);
const THREE=sandbox.THREE;
THREE.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}render(){}dispose(){}};
const {createFull3DScene,previewPoints,sampleRoadPoint}=require('../src/rendering/Full3DScene.cjs');
const world=createFull3DScene(THREE,{style:{},addEventListener(){},removeEventListener(){}});
const routes=['1A','2A','2B','3A','3B','3C','4A','4B','4C','4D','5A','5B','5C','5D','5E'];
let frames=0;
for(const id of routes){
 game.run(`v34Mode='arcade';setStage(...Object.values(routeForId('${id}')),false);`);
 for(const marker of ['20','180','FORK_LOCK','STAGE_END+80'])for(const side of [-1,1]){
  game.run(`playerZ=(${marker})*SEGMENT_LENGTH;playerX=${side}*.45;pendingChoice='${side<0?'left':'right'}';choiceLocked=true;`);
  const frame=JSON.parse(game.run('JSON.stringify(v57SceneFrame())'));
  const pts=previewPoints(frame),player=sampleRoadPoint(pts,frame.fraction,frame.playerX*8);
  assert(Math.abs(player.x)<1e-8&&Math.abs(player.y)<1e-8&&Math.abs(player.z-3.15)<1e-8,id+' collision anchor');
  assert(pts.every(p=>Object.values(p).every(Number.isFinite)),id+' finite route geometry');
  assert.equal(world.render(frame,1/60),true,id+' scene frame');
  for(const box of world.prepareTrafficVisibility(frame)){
   assert(frame.traffic[box.sourceIndex].eligible,id+' shared authored traffic filter');
   assert(box.r>box.l&&box.b>box.t&&Object.values(box).every(Number.isFinite),id+' valid 3D projection');
  }
  frames++;
 }
}
game.window.__testScene=world;
game.run(`v34Mode='cruise';setStage(0,0,false);v56Scene=window.__testScene;playerX=0;playerZ=40*SEGMENT_LENGTH;
 const target=traffic[0];traffic=[target];target.x=0;target.previousX=0;target.z=playerZ+PLAYER_DEPTH+100;target.previousZ=target.z;`);
world.render(JSON.parse(game.run('JSON.stringify(v57SceneFrame())')),1/60);
game.run('v57PrepareTrafficVisibility();');
assert.equal(game.run('!!traffic[0].screenBox'),true,'visible 3D car receives collision box');
assert.equal(game.run('!!trafficContact({x:playerX,z:playerZ},traffic[0])'),true,'near visible car can collide');
game.run('traffic[0].z=playerZ+PLAYER_DEPTH-100;traffic[0].previousZ=traffic[0].z;v57PrepareTrafficVisibility();');
assert.equal(game.run('!!trafficContact({x:playerX,z:playerZ},traffic[0])'),true,'near car remains visible just after passing player');
game.run('traffic[0].x=9;traffic[0].previousX=9;v57PrepareTrafficVisibility();');
assert.equal(game.run('traffic[0].screenBox===null'),true,'off-road traffic hidden and noncollidable');
game.run('traffic[0].x=0;traffic[0].previousX=0;traffic[0].z=FORK_WARN*SEGMENT_LENGTH;traffic[0].previousZ=traffic[0].z;v57PrepareTrafficVisibility();');
assert.equal(game.run('traffic[0].screenBox===null'),true,'traffic beyond authored zone receives no box');
game.run("const highway=STAGES.flat().find(n=>n.archetype==='expressway');setStage(...Object.values(routeForId(highway.id)),false);const scooter=traffic[0];scooter.spec={...scooter.spec,scooter:true};window.__scooterEligible=trafficRoadEligible(scooter);");
assert.equal(game.window.__scooterEligible,false,'expressway excludes scooters');
// A crest that blocks the complete vehicle must hide it in both display and sensors.
const base={curves:Array(126).fill(0),hills:Array(126).fill(0),playerX:0,fraction:0,
 traffic:[{sourceIndex:0,distance:25,x:0,eligible:true}],carColor:'#181c24',archetype:'urban'};
world.render(base,1/60);assert.equal(world.prepareTrafficVisibility(base).length,1);
const hill={...base,hills:base.hills.map((y,i)=>i>=8&&i<=15?2600:0)};
assert.equal(world.prepareTrafficVisibility(hill).length,0,'crest occludes traffic');
assert.equal(world.prepareTrafficVisibility({...base,traffic:[{...base.traffic[0],x:30}]}).length,0,'offscreen traffic excluded');
world.dispose();
assert.equal(world.prepareTrafficVisibility(base).length,0,'disposed renderer yields no collision receipt');
console.log(`V57 routes/collision: ${routes.length} authored routes, ${frames} geometry frames, 3D receipts, road eligibility and hill occlusion passed (GPU mocked)`);
