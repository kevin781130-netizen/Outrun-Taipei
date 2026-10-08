'use strict';
// V54 graphics contract test: uses the real runtime quality functions with
// mock Canvas 2D contexts. Does not claim browser visual verification.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const marker='// V54 raster-only quality.';
const start=html.indexOf(marker);
const end=html.indexOf('// ============================================================',start);
assert(start>=0&&end>start,'V54 graphics runtime region exists');
const source=html.slice(start,end);
const expected=[
  ['LOW',720,405,.75],
  ['STANDARD',960,540,1],
  ['HIGH',1200,675,1.25],
  ['ULTRA',1440,810,1.5]
];
const storage=new Map();
const writes=[];
const transforms=[];
const ctx={setTransform:(...values)=>transforms.push(['internal',...values])};
const displayCtx={setTransform:(...values)=>transforms.push(['output',...values])};
const canvas={width:960,height:540};
const arcadeBuffer={width:960,height:540};
const selector={value:''},status={textContent:''};
const document={getElementById(id){
  return {'dip-graphics':selector,'v54-graphics-status':status}[id]||null;
}};
let brokenStorage=false;
const localStorage={
  getItem(key){if(brokenStorage)throw new Error('storage disabled');return storage.get(key)||null;},
  setItem(key,value){if(brokenStorage)throw new Error('storage disabled');writes.push([key,value]);storage.set(key,value);}
};
const construct=new Function('W','H','canvas','arcadeBuffer','ctx','displayCtx','document','localStorage','v54ClearStaticRoadsideCache','v54ClearTrafficCache',
  source+'\nreturn {setGraphicsQuality,v54StoredGraphics,v54GraphicsInfo};');
const graphics=construct(960,540,canvas,arcadeBuffer,ctx,displayCtx,document,localStorage,()=>{},()=>{});

for(const [name,width,height,scale] of expected){
  const info=graphics.setGraphicsQuality(name);
  assert.deepEqual({width:info.outputWidth,height:info.outputHeight},{width,height},name+' output');
  assert.deepEqual({width:info.internalWidth,height:info.internalHeight},{width,height},name+' internal');
  assert.equal(info.logicalWidth,960,name+' logical W');
  assert.equal(info.logicalHeight,540,name+' logical H');
  assert.equal(info.scale,scale,name+' scale');
  assert.equal(info.quality,name,name+' preset');
  assert.equal(selector.value,name,name+' selector sync');
  assert(status.textContent.includes(width+' × '+height),name+' status sync');
  assert.deepEqual(transforms.at(-2),['internal',scale,0,0,scale,0,0],name+' internal transform');
  assert.deepEqual(transforms.at(-1),['output',scale,0,0,scale,0,0],name+' output transform');
  assert.equal(storage.get('taipeiGraphicsV54'),name,name+' saved');
}
storage.set('taipeiGraphicsV54','INVALID');
assert.equal(graphics.v54StoredGraphics(),'STANDARD','invalid storage falls back');
const storedCount=writes.length;
const fallback=graphics.setGraphicsQuality(null,false);
assert.equal(fallback.quality,'STANDARD','invalid runtime option falls back');
assert.equal(writes.length,storedCount,'boot/fallback does not rewrite storage');
brokenStorage=true;
assert.equal(graphics.v54StoredGraphics(),'STANDARD','blocked read falls back');
assert.doesNotThrow(()=>graphics.setGraphicsQuality('LOW'),'blocked write is nonfatal');

// Rendering contract: source and destination crops both scale; logical
// projection remains locked to the unchanged game coordinate system.
assert(html.includes('const W = canvas.width, H = canvas.height;'),'logical coordinates preserved');
assert(html.includes('displayCtx.setTransform(graphicsScale,0,0,graphicsScale,0,0);'),'output logical transform applied');
assert(html.includes('displayCtx.drawImage(arcadeBuffer,crop*graphicsScale,crop*graphicsScale,'),
  'cropped source pixels use backing scale');
assert(html.includes('displayCtx.drawImage(arcadeBuffer,(crop+2)*graphicsScale,crop*graphicsScale,'),
  'boost ghost source crop uses backing scale');
assert(!html.includes('const W = arcadeBuffer.width'),'world should not derive coordinates from scaled backing');
assert(html.includes("setGraphicsQuality(v54StoredGraphics(),false);"),'stored preset is loaded at boot');
assert(html.includes("graphicsSelect.addEventListener('change'"),'menu updates preset');
console.log('V54 graphics contract: PASS (four tiers, scaling, persistence, fallback, source crop)');
