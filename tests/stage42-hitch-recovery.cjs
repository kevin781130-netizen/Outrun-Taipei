'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {load}=require('./canvas-harness.cjs');
const html=path.resolve(__dirname,'../index.html');
const game=load(html,{search:'?handling=v59&drift=chain8'});
const settings=JSON.parse(game.run(`JSON.stringify({
 chain8:v59Arcade8,chain7:v59Arcade7,chain6:v59Arcade6,
 score:handlingRecordSuffix59(),max:V59_ARCADE8.maxCatchupSteps,
 delayed:v59Arcade8Budget(.25,0),smooth:v59Arcade8Budget(1/60,0),
 retained:v59Arcade8Budget(1/60,1/60),negative:v59Arcade8Budget(-2,-1)
})`));
assert(settings.chain8&&settings.chain7&&settings.chain6);
assert.equal(settings.score,':H59.8');
assert.equal(settings.max,4);
assert(Math.abs(settings.delayed-4/60)<1e-10,'a 250ms freeze cannot trigger 15 synchronous 60Hz physics updates');
assert(Math.abs(settings.smooth-1/60)<1e-10,'normal 60fps cadence must not be altered');
assert(Math.abs(settings.retained-2/60)<1e-10,'legitimate small debt is preserved');
assert.equal(settings.negative,0,'clock discontinuities cannot produce negative physics debt');
for(const profile of ['chain6','chain7']){
 const game=load(html,{search:'?handling=v59&drift='+profile});
 const state=JSON.parse(game.run('JSON.stringify({newMode:v59Arcade8,record:handlingRecordSuffix59()})'));
 assert(!state.newMode&&!state.record.endsWith('.8'),'old handling and ranking unaffected: '+profile);
}
const node={};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),node,{timeout:5000});
const T=node.THREE;const {createCanvas}=require('@napi-rs/canvas');
const {createRaceWayfinding}=require('../src/rendering/RaceWayfinding.cjs');
const scene=new T.Scene();
const route=createRaceWayfinding(T,scene,()=>({x:0,y:0,z:0,heading:0}),()=>10,
 {createElement(){return createCanvas(1024,256);}});
const signs=[{kind:'start',seg:26,label:'台北出發',detail:'圓山'},
 {kind:'distance',seg:180,label:'檢查站 200 M',detail:'CHECK POINT'}];
assert.equal(route.prewarmTextureGPU({initTexture(){}}),false,'no GPU uploads before CPU texture exists');
assert(route.prewarmRoute('2A',signs));
const uploaded=[];
const renderer={initTexture(t){assert(t.isCanvasTexture,'must upload a real Chinese sign canvas');uploaded.push(t);}};
assert(route.prewarmTextureGPU(renderer));
assert.equal(route.prewarmTextureGPU(renderer),false,'cannot upload same texture twice');
assert(route.prewarmRoute('2A',signs));
assert(route.prewarmTextureGPU(renderer));
assert.equal(uploaded.length,2,'each future Chinese sign uploaded once');
assert.equal(route.warmUploadCount,2);
assert.equal(scene.children.length,0,'GPU preupload must not show any future route signage');
const frame={routeId:'2A',raceSigns:signs,segment:0,corridors:Array.from({length:126},()=>[{center:0,half:1}])};
const points=Array.from({length:126},(_,i)=>({x:0,y:0,z:-i*2.7,heading:0}));
route.update(frame,points);
const claimed=scene.children.filter(x=>x.name.startsWith('RaceBoard_')).map(x=>x.children[0].material.map);
assert.strictEqual(claimed[0],uploaded[0],'route swap claims already GPU-uploaded texture');
assert.strictEqual(claimed[1],uploaded[1],'second sign uses its uploaded canvas');
assert.equal(route.prewarmTextureGPU(renderer),false,'claimed GPU textures are no longer queued');
route.dispose();assert.equal(scene.children.length,0,'dispose cleans all route sign groups');
console.log('Stage42 CHAIN8 PASS: input catchup capped, old modes isolated, two real next-route GPU textures uploaded exactly once');
