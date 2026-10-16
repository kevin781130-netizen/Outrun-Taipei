'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
const {load}=require('./canvas-harness.cjs');
const sandbox={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),sandbox);
const T=sandbox.THREE;
const {createRaceWayfinding}=require('../src/rendering/RaceWayfinding.cjs');
const {previewPoints,sampleRoadPoint,streetOffset,createFull3DScene}=require('../src/rendering/Full3DScene.cjs');
const game=load(path.join(__dirname,'../index.html'));
const sign=(kind,seg,label)=>({kind,seg,label,detail:kind+' detail'});
const first=[sign('start',26,'A START'),sign('fork',300,'A FORK')];
const next=[sign('start',26,'B START'),sign('distance',145,'B 500 M'),sign('fork',800,'B FORK')];
const shape={segment:0,corridors:Array.from({length:126},()=>[{center:0,half:1}])};
const points=previewPoints({curves:Array(126).fill(0),hills:Array(126).fill(0)});
const scene=new T.Scene(),doc={createElement:tag=>tag==='canvas'?createCanvas(1024,256):null};
const boards=createRaceWayfinding(T,scene,sampleRoadPoint,streetOffset,doc);
const NativeTexture=T.CanvasTexture,NativeMaterial=T.MeshBasicMaterial;
let textures=0,materials=0,uploaded=0;
T.CanvasTexture=class extends NativeTexture{constructor(...args){super(...args);textures++;}};
T.MeshBasicMaterial=class extends NativeMaterial{constructor(...args){super(...args);materials++;}};
try{
 boards.update({...shape,routeId:'1A',raceSigns:first},points);
 assert.equal(textures,2);assert.equal(materials,2);
 for(let i=0;i<next.length;i++){
  assert.equal(boards.prewarm('2A',next,t=>{assert(t.isTexture);uploaded++;}),true);
  assert.equal(textures,3+i,'one new CanvasTexture per warm frame');
  assert.equal(materials,3+i,'one new MeshBasicMaterial per warm frame');
  assert.equal(uploaded,i+1);
 }
 assert.equal(boards.prewarm('2A',next,()=>{throw Error('unexpected extra upload');}),false);
 const beforeTextures=textures,beforeMaterials=materials,old=[...scene.children];
 boards.update({...shape,routeId:'2A',raceSigns:next},points);
 assert.equal(textures,beforeTextures,'route switch creates no new textures');
 assert.equal(materials,beforeMaterials,'route switch creates no new materials');
 assert.equal(scene.children.length,next.length);
 assert(old.every(group=>group.parent===null),'old sign groups removed');
 assert.equal(boards.preparedSigns,next.length,'cache retains only active route after switch');
 const map=scene.children[0].children[0].material.map;let disposed=0;map.addEventListener('dispose',()=>disposed++);
 boards.prewarm(null,null);
 boards.dispose();
 assert.equal(disposed,1,'prepared GPU texture released on teardown');
 assert.equal(boards.preparedSigns,0);
 assert.equal(boards.prewarm('2A',next),false,'disposed cache does not allocate');
}finally{T.CanvasTexture=NativeTexture;T.MeshBasicMaterial=NativeMaterial;}

// A predicted district must have bit-for-bit identical sign data at stage entry.
for(let level=1;level<5;level++)for(let col=0;col<=level;col++){
 const id=game.run(`STAGES[${level}][${col}].id`);
 const preview=game.run(`JSON.stringify(v59ArcadeRouteSigns(${level},${col}))`);
 game.run(`v34Mode='arcade';setStage(${level},${col},false);`);
 assert.equal(preview,game.run('JSON.stringify(v58RaceSigns())'),id+' preview equals actual route signs');
}
game.run("v34Mode='arcade';setStage(0,0,false);choiceLocked=false;stageTransition=null;");
assert.equal(game.run('v57SceneFrame().nextRouteSigns'),null);
for(const choice of ['left','right']){
 game.run(`pendingChoice='${choice}';choiceLocked=true;`);
 const f=JSON.parse(game.run('JSON.stringify(v57SceneFrame())'));
 assert.equal(f.nextRouteId,choice==='left'?'2A':'2B');
 assert(f.nextRouteSigns[0].detail.includes(f.nextRouteId));
}
const frame=JSON.parse(game.run('JSON.stringify(v57SceneFrame())'));
let uploads=0,renders=0;
T.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}render(){renders++;}dispose(){}initTexture(t){assert(t.isTexture);uploads++;}};
const world=createFull3DScene(T,{style:{},addEventListener(){},removeEventListener(){}});
const oldRandom=Math.random;Math.random=()=>{throw Error('visual initialization touched gameplay RNG');};
try{
 world.render(frame,1/60);
 assert.equal(uploads,1,'one GPU texture preupload per frame');
 world.render(frame,1/60);
 assert.equal(uploads,2,'second frame uploads second texture');
}finally{Math.random=oldRandom;}
assert(renders>=2);
world.dispose();
console.log('V59 signs: 14 route previews, one per-frame texture/material & GPU upload, bounded cache, reuse/disposal passed');
