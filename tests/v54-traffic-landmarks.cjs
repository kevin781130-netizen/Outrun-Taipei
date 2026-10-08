'use strict';
// Manual V54 P2 cache tests, with a lightweight Canvas API stub.
// This validates keys, limits and dynamic overlays, not screenshot parity.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
function extract(begin,end){
  const a=html.indexOf(begin),b=html.indexOf(end,a);
  assert(a>=0&&b>a,'source section '+begin+' found');
  return html.slice(a,b);
}
const trafficSource=extract('function rivalVolumeProfile(car,x){','// Original low-poly arcade bodies:');
let allocationCount=0,blinkRects=0,liveBlits=0,canAllocate=true;
function mockContext(live=false){
  return new Proxy({},{
    get(target,key){
      if(key==='fillRect')return (...args)=>{
        if(live&&target.fillStyle==='#ffaa00')blinkRects++;
      };
      if(key==='drawImage')return (...args)=>{if(live)liveBlits++;};
      if(typeof key==='symbol')return undefined;
      if(!(key in target))target[key]=()=>{};
      return target[key];
    },
    set(target,key,value){target[key]=value;return true;}
  });
}
const liveCtx=mockContext(true);
const document={createElement(tag){
  assert.equal(tag,'canvas');allocationCount++;
  return {width:0,height:0,getContext:()=>canAllocate?mockContext():null};
}};
const createTraffic=new Function('document','ctx','W','graphicsQuality','skyMood','simulationTime',
  'paintShade','v40FitSignText',trafficSource+
  '\nreturn {sprite:v54TrafficSprite,draw:drawRivalCar,stats:v54TrafficCacheStats,'+
  'clear:v54ClearTrafficCache,liveContext:()=>ctx,setMood:x=>skyMood=x,'+
  'setQuality:x=>graphicsQuality=x,setTime:x=>simulationTime=x};');
const traffic=createTraffic(document,liveCtx,960,'STANDARD','sunset',0,
  color=>color,()=>{});
const car={type:'taxi',spec:{name:'taxi',w:78,h:42,taxi:true},
  color:'#ffd200',x:.3,laneTarget:.3};
const first=traffic.sprite(car,200,.4);
assert(first&&first.width===456&&first.height===225,'standard sprite size');
assert.equal(traffic.sprite(car,200,.4),first,'traffic repeat hits cache');
assert.equal(traffic.stats().hits,1);
assert.equal(traffic.stats().misses,1);
assert.equal(traffic.liveContext(),liveCtx,'context restored after rasterization');
const otherSide=traffic.sprite(car,800,.4);
assert.notEqual(first,otherSide,'left/right volume separated');
traffic.setMood('neon');
assert.notEqual(traffic.sprite(car,200,.4),first,'night palette separated');
traffic.setQuality('ULTRA');
assert.equal(traffic.sprite(car,200,.4).width,608,'ultra sprite density');
traffic.setQuality('STANDARD');
traffic.setMood('sunset');

// Cached silhouette stays reused when lane position changes; blink draws live.
car.laneTarget=-.3;
const beforeBlink=blinkRects,beforeBlits=liveBlits;
traffic.setTime(0);
traffic.draw(car,200,300,.4);
assert.equal(liveBlits,beforeBlits+1,'raster blit was used for distant car');
assert.equal(blinkRects,beforeBlink+1,'live lane-change indicator lit');
traffic.setTime(.2); // floor(0.2*7) is odd: lamp off
traffic.draw(car,200,300,.4);
assert.equal(blinkRects,beforeBlink+1,'blink turns off without changing cached body');
const beforeNear=liveBlits;
traffic.draw(car,200,300,.8);
assert.equal(liveBlits,beforeNear,'near cars keep original vector path');
for(let i=0;i<45;i++){
  car.color='#'+i.toString(16).padStart(6,'0');
  traffic.sprite(car,200,.4);
}
assert(traffic.stats().bytes<=traffic.stats().budget,'traffic LRU within 8 MiB');
assert(traffic.stats().entries<49,'old traffic sprites evicted');
const trafficStats=traffic.stats();
traffic.clear();
assert.equal(traffic.stats().entries,0);
assert.equal(traffic.stats().bytes,0);
canAllocate=false;
traffic.draw(car,200,300,.4);
assert.equal(traffic.liveContext(),liveCtx,'failed traffic offscreen allocation has vector fallback');
canAllocate=true;

// Exercise exact landmark alpha-bounds algorithm using a 12x18 miniature,
// while leaving the production 1200x1800 implementation untouched.
let landmarkSource=extract('// V54 P2: byte-capped LRU','function planLandmarks(){');
assert(landmarkSource.includes('const V54_LANDMARK_CACHE_BUDGET=16*1024*1024;'));
landmarkSource=landmarkSource
 .replace('const V54_LANDMARK_CACHE_BUDGET=16*1024*1024;','const V54_LANDMARK_CACHE_BUDGET=1100;')
 .replaceAll('1200','12').replaceAll('1800','18').replaceAll('1199','11');
const mask=new Uint8ClampedArray(12*18*4);
for(const [x,y] of [[2,3],[3,4],[6,10],[9,16]])mask[(y*12+x)*4+3]=255;
function landmarkContext(){
  return {
    getImageData(){return {data:mask};},
    putImageData(){},
    save(){},restore(){},
    setTransform(){},translate(){}
  };
}
const landmarkCanvas={
  createElement(tag){
    assert.equal(tag,'canvas');
    return {width:0,height:0,getContext:()=>landmarkContext()};
  }
};
const createLandmark=new Function('document','ctx','skyMood','v54PropCacheStats',
  'v54TrafficCacheStats',landmarkSource+
  '\nreturn {get:getLandmarkSprite,stats:v54LandmarkCacheStats,all:v54CacheStats,'+
  'setPlan:items=>stageLandmarkPlan=items,setMood:x=>skyMood=x,ctx:()=>ctx};');
const landmark=createLandmark(landmarkCanvas,liveCtx,'sunset',
  ()=>({budget:8388608}),()=>({budget:8388608}));
const h1={name:'first',draw(){}};
const l1=landmark.get(h1);
assert.equal(l1.canvas.width,12,'alpha min/max x preserved');
assert.equal(l1.canvas.height,18,'alpha min/max y preserved');
assert.equal(l1.width,6);
assert.equal(l1.height,9);
assert.equal(landmark.get(h1),l1,'landmark repeat hits cache');
assert.equal(landmark.stats().hits,1);
const l2=landmark.get({name:'second',draw(){}});
assert.notEqual(l1,l2);
assert(landmark.stats().bytes<=1100,'landmark LRU respects test budget');
assert.equal(landmark.stats().entries,1,'older landmark evicted');
landmark.setPlan([{sprite:l1}]);
assert.equal(landmark.stats().activeOutsideCacheBytes,864,
  'active stage sprites outside LRU remain accounted for');
landmark.setMood('neon');
assert.notEqual(landmark.get({name:'second',draw(){}}),l2,'day and night separate');
assert.equal(landmark.ctx(),liveCtx,'landmark generation restores main context');
assert(landmark.all().landmarks.budget===1100,'benchmark stats expose landmarks');
assert(html.includes('function v54CacheStats(){'),'performance tool hook provided');
console.log(JSON.stringify({v54Traffic:'passed',trafficStats,
  v54Landmarks:'passed',alphaBounds:[2,3,9,16],
  activeOutsideCacheBytes:864,liveBlinkRects:blinkRects}));
