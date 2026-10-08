'use strict';
// Manual unit test only; not a substitute for visual/browser acceptance.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('const V54_PROP_CACHE_BUDGET=');
const end=html.indexOf('let v51RoadsideRenderLog=[];',start);
assert(start>=0&&end>start,'static roadside cache implementation exists');
const src=html.slice(start,end);
assert(html.includes('const sprite=v54StaticRoadsideSprite(family,surface,side);'),'live scene uses cached sprites');
assert(html.includes('ctx.save();clipNearRoad(seg.index);ctx.translate(x,y);ctx.scale(scale,scale);'),
  'original road masking, placement and scale are preserved');
assert(/graphicsQuality=preset;graphicsScale=scale;\s*v54ClearStaticRoadsideCache\(\)/.test(html),
  'graphics preset changes clear the raster cache');

let allocations=0,drawCalls=0,original={identity:'live-renderer'},available=true;
function makeCtx(){
  return new Proxy({},{
    get(obj,key){
      if(typeof key==='symbol')return undefined;
      if(!(key in obj))obj[key]=()=>{drawCalls++;};
      return obj[key];
    },set(obj,key,value){obj[key]=value;return true;}
  });
}
const document={createElement(tag){
  assert.equal(tag,'canvas');
  allocations++;
  return {width:0,height:0,getContext:()=>available?makeCtx():null};
}};
const create=new Function('document','ctx','skyMood','graphicsQuality',src+
  '\nreturn {sprite:v54StaticRoadsideSprite,stats:v54PropCacheStats,'+
  'clear:v54ClearStaticRoadsideCache,ctx:()=>ctx,'+
  'mood:value=>skyMood=value,quality:value=>graphicsQuality=value};');
const engine=create(document,original,'sunset','STANDARD');
const first=engine.sprite('urban','land',-1);
assert.equal(first.width,294);
assert.equal(first.height,234);
assert.equal(engine.sprite('urban','land',-1),first,'same static scene hits cache');
assert.equal(allocations,1,'cache hit performs zero raster allocations');
assert.equal(engine.stats().hits,1);
assert.equal(engine.stats().misses,1);
assert.equal(engine.ctx(),original,'context is restored after sprite generation');
assert(drawCalls>0,'static art was drawn to the offscreen context');

assert.notEqual(engine.sprite('urban','water',-1),first,'water and land differ');
assert.notEqual(engine.sprite('urban','land',1),first,'both orientations differ');
engine.mood('neon');
assert.notEqual(engine.sprite('urban','land',-1),first,'night art is a separate sprite');
engine.quality('ULTRA');
const ultra=engine.sprite('urban','land',-1);
assert.equal(ultra.width,392);
assert.equal(ultra.height,312,'high quality uses higher density');
engine.quality('LOW');
const low=engine.sprite('urban','land',-1);
assert.equal(low.width,196);
assert.equal(low.height,156);

// Overfill the byte limit: old canvases must be evicted in LRU order.
for(let i=0;i<160;i++)engine.sprite('family'+i,'land',i%2?1:-1);
assert(engine.stats().bytes<=engine.stats().budget,'memory budget respected');
assert(engine.stats().entries>0,'sprites remain reusable after eviction');
const beforeClear=engine.stats();
engine.clear();
assert.equal(engine.stats().entries,0);
assert.equal(engine.stats().bytes,0);
available=false;
assert.equal(engine.sprite('urban','land',1),null,'failed offscreen context gives safe vector fallback');
assert.equal(engine.ctx(),original,'context untouched after allocation failure');
assert.equal(engine.stats().entries,0,'failed allocations not retained');
console.log(JSON.stringify({roadsideCache:'passed',memoryBudget:beforeClear.budget,
  beforeClearBytes:beforeClear.bytes,entries:beforeClear.entries,
  allocations,drawCalls}));
