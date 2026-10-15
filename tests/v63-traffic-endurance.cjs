'use strict';
// V63: complete production game state machine, but no GPU (browser gate separately).
const assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'),{search:'?trafficAI=v60'});
const ids=game.run("STAGES.flat().map(s=>s.id)");
assert.equal(ids.length,15);
assert.equal(new Set(ids).size,15);
game.run("v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;collisionCooldown=100000;timeLeft=999999;speed=0;");
assert.equal(game.run('trafficAI60Enabled()'),true);
const cycles=3,framesPerStage=240;
let recycled=0,peakCars=0;
global.gc?.();
for(let cycle=0;cycle<cycles;cycle++){
 for(const id of ids){
  const stats=game.run(`(()=>{
   const r=routeForId('${id}');setStage(r.level,r.column,false);
   gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
   collisionCooldown=100000;timeLeft=999999;speed=0;playerZ=8000;
   const cars=traffic.length;
   if(!cars)throw Error('route without traffic '+currentNode.id);
   let recycled=0,maxCars=cars;
   for(let t=0;t<${framesPerStage};t++){
     if(t%48===0){
       const car=traffic[(t/48)%cars];
       car.z=playerZ-2200;car.previousZ=car.z;
       car.v60PassActive=true;car.v60Cooldown=3;car.v60Think=2;
       car.v60LastVeto='stale';car.near=false;car.hitTimer=0;
       const previousX=car.x;
       update(1/60);
       if(car.v60PassActive!==false||car.v60Cooldown!==0||car.v60Think!==0||
          car.v60LastVeto!==null||Math.abs(car.x)>2||!Number.isFinite(car.z))
         throw Error('failed AI recycle state reset '+currentNode.id);
       if(Math.abs(car.z-playerZ)<1800)throw Error('car did not recycle');
       if(Math.abs(previousX)>2)throw Error('unexpected pre-recycle position');
       recycled++;
     }else update(1/60);
     if(traffic.length!==cars)throw Error('traffic population grows during simulation');
     maxCars=Math.max(maxCars,traffic.length);
   }
   if(!Number.isFinite(score)||!Number.isFinite(playerZ)||!Number.isFinite(simulationTime))
     throw Error('nonfinite long-running state');
   for(const car of traffic){
     if(![car.x,car.laneTarget,car.z,car.speed].every(Number.isFinite))
       throw Error('corrupted long-running car state');
     if(Math.abs(car.x)>2)throw Error('unbounded traffic lateral coordinate');
   }
   return {route:currentNode.id,recycled,maxCars,score};
  })()`);
  assert.equal(stats.route,id);
  recycled+=stats.recycled;
  peakCars=Math.max(peakCars,stats.maxCars);
 }
}
global.gc?.();
const heapAfter=process.memoryUsage().heapUsed;
// Run a second smaller replay on the same resident engine; garbage must remain collectable.
let baseline=heapAfter;
for(let cycle=0;cycle<2;cycle++){
 for(const id of ids)game.run(`(()=>{
    const r=routeForId('${id}');setStage(r.level,r.column,false);
    gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
    collisionCooldown=100000;timeLeft=999999;playerZ=8000;speed=0;
    for(let i=0;i<90;i++)update(1/60);
  })()`);
}
global.gc?.();
const heapFinal=process.memoryUsage().heapUsed;
const heapDelta=heapFinal-baseline;
// Intentionally generous: regression catches unbounded retention, not normal V8 noise.
if(global.gc)assert(heapDelta<24*1024*1024,'post-GC heap grew by over 24 MiB');
assert(recycled>=150,'must exercise many independent recycle events');
console.log('V63 live-game cruise endurance: '+(cycles*ids.length*framesPerStage)+' fixed ticks / '+
  ids.length+' original Taipei routes / '+recycled+' recycled cars / max '+peakCars+
  ' cars / post-GC delta '+(heapDelta/1048576).toFixed(2)+' MiB (GPU mocked)');
