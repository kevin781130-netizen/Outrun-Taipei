'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const game=require('./canvas-harness.cjs').load(path.join(__dirname,'../index.html'));
const data=JSON.parse(game.run(`(()=>{
 const routes=[],flows=[];
 function layout(id,difficulty='normal',mode='arcade'){
  dipSettings.difficulty=difficulty;v34Mode=mode;selectedRoute=routeForId(id);resetGame();
  const coords=traffic.map(c=>[c.x,c.z,c.speed,c.flowHome]);
  const sorted=[...traffic].sort((a,b)=>a.z-b.z);
  return {id,difficulty,mode,scale:roadFactor()/scene().width,count:traffic.length,
   expected:Math.round(currentNode.traffic*({easy:.65,normal:1,hard:1.3}[difficulty])*(mode==='cruise'?.5:1))+(stageLevel===0?3:0),
   minGap:Math.min(...sorted.slice(1).map((c,i)=>c.z-sorted[i].z)),
   eligible:traffic.every(c=>trafficRoadEligible(c)),coords};
 }
 for(const node of STAGES.flat())for(const difficulty of ['easy','normal','hard']){
  const a=layout(node.id,difficulty),b=layout(node.id,difficulty);
  routes.push({...a,repeat:JSON.stringify(a.coords)===JSON.stringify(b.coords),coords:undefined});
 }
 const cruiseA=layout('1A','normal','cruise'),cruiseB=layout('1A','normal','cruise');
 routes.push({...cruiseA,repeat:JSON.stringify(cruiseA.coords)===JSON.stringify(cruiseB.coords),coords:undefined});
 for(const id of ['1A','2B','5E'])for(const hz of [30,60,120]){
  layout(id,'hard');let minGap=Infinity,maxDrift=0,recycles=0,badTeleport=0,blocked=0;
  const count=traffic.length;
  for(let tick=0;tick<hz*75;tick++){
   const previous=new Map(traffic.map(c=>[c,{x:c.x,z:c.z,speed:c.speed}]));
   simulationTime+=1/hz;playerZ+=270*WORLD_SPEED/hz;v91StepTraffic(1/hz);
   const ordered=[...traffic].sort((a,b)=>a.z-b.z);
   for(let i=1;i<ordered.length;i++)minGap=Math.min(minGap,ordered[i].z-ordered[i-1].z);
   for(const c of traffic){
    const old=previous.get(c),jump=c.z-old.z;
    if(jump>(c.flowCruise+45)*WORLD_SPEED/hz+1){
     recycles++;if(!(old.z-playerZ<-1800&&c.z>=playerZ+V91_TRAFFIC.spawnAhead&&c.previousZ===c.z&&c.screenBox===null))badTeleport++;
    }
    maxDrift=Math.max(maxDrift,Math.abs(c.x-c.flowHome)/roadFactor());
    if(![c.x,c.z,c.speed,c.laneTarget].every(Number.isFinite)||c.speed<0||jump<-.0001)throw Error('invalid/backward AI motion');
   }
   // A collision-depth slice cannot contain a wall of several cars.
   for(const c of traffic){
    const atSlice=traffic.filter(other=>Math.abs(other.z-c.z)<=trafficContactDepth(other)+trafficContactDepth(c));
    if(atSlice.length>1)blocked++;
   }
  }
  flows.push({id,hz,minGap,maxDrift,recycles,badTeleport,blocked,count,after:traffic.length});
 }
 layout('1A');playerZ=20000;
 const spec=TRAFFIC_TYPES.taxi;
 const car=(x,z,speed)=>({x,z,speed,spec,phase:0,hitTimer:0,laneTarget:x,screenBox:{l:1,r:2,t:1,b:2},cp:{armed:true}});
 // Saturated spawn horizon must defer; never clamp several cars onto the limit.
 const limit=playerZ+V91_TRAFFIC.spawnAhead+V91_TRAFFIC.minGap;
 const candidate=car(0,playerZ-3000,160);
 traffic=[candidate,car(-.4,playerZ+V91_TRAFFIC.spawnAhead,120),car(.4,limit,120)];
 const full=v91TrafficSpawnSlot(candidate,limit,limit);
 traffic.pop();const free=v91TrafficSpawnSlot(candidate,limit,limit);
 // Fast follower, slow lead: no order swap, backward rewind or instant relocation.
 playerZ=0;traffic=[car(-.4,10000,240),car(.4,12401,100)];
 const snapshots=[];
 for(let i=0;i<300;i++){simulationTime+=1/60;const z=traffic.map(c=>c.z);v91StepTraffic(1/60,false);snapshots.push({gap:traffic[1].z-traffic[0].z,deltas:traffic.map((c,j)=>c.z-z[j])});}
 const pausedSnapshot=JSON.stringify(traffic);v91StepTraffic(0);const pausedAfter=JSON.stringify(traffic);
 // Real update and crash paths must invoke the same spacing controller.
 gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;timeLeft=9999;
 playerZ=5000;speed=180;collisionCooldown=100;keys.KeyW=true;
 for(let i=0;i<30;i++)update(1/60);
 const liveGap=traffic[1].z-traffic[0].z;
 crashSequence={t:0,anim:0,duration:2.9,impactSpeed:180,side:1};
 for(let i=0;i<30;i++)updateCrash(1/60);
 const crashGap=traffic[1].z-traffic[0].z;crashSequence=null;
 layout('1A');playerX=0;playerZ=100*SEGMENT_LENGTH;
 for(const seg of segments){seg.curve=0;seg.p1.world.y=seg.p2.world.y=0;}
 const frame=v57SceneFrame();
 const boundaries=[];
 for(const id of ['1A','2B','5E']){
  layout(id);const factor=roadFactor();
  for(const index of [100,FORK_START+100,STAGE_END+50]){
   playerX=99;resolveRoadBoundary(index);const lanes=roadCorridors(index);
   boundaries.push({factor,x:playerX,fits:lanes.some(q=>Math.abs(playerX-q.center)<=q.half+.12*factor-PLAYER_HALF_WIDTH+1e-8)});
  }
 }
 return JSON.stringify({routes,flows,full,free,limit,snapshots,paused:pausedSnapshot,pausedAfter,liveGap,crashGap,frame,boundaries,minGap:V91_TRAFFIC.minGap});
})()`));
for(const r of data.routes){
 assert(Math.abs(r.scale-1.08)<1e-12);assert.equal(r.count,r.expected);assert(r.repeat);
 assert(r.minGap>=data.minGap-1e-7);assert(r.eligible,'generated cars remain within the authored road zone');
}
for(const f of data.flows){
 assert(f.minGap>=data.minGap-1e-7,'headway remains open at every replay step');
 assert(f.maxDrift<=.025000001,'AI stays near its lateral home');
 assert.equal(f.badTeleport,0);assert.equal(f.blocked,0);assert.equal(f.after,f.count);assert(f.recycles>0,'far recycling exercised');
}
assert.equal(data.full,null);assert.equal(data.free,data.limit);
assert.equal(data.paused,data.pausedAfter);
for(const s of data.snapshots){assert(s.gap>=data.minGap-1e-7);assert(s.deltas.every(d=>d>=0&&d<=240*18/60+1e-7));}
assert(data.liveGap>=data.minGap-1e-7&&data.crashGap>=data.minGap-1e-7);
assert(data.boundaries.every(b=>b.fits));
// Check actual WebGL road vertices, not only a gameplay width variable.
const ctx={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),ctx);
const T=ctx.THREE;let scene;
T.WebGLRenderer=class{setPixelRatio(){}setClearColor(){}setSize(){}render(s){scene=s;}dispose(){}};
const world=require('../src/rendering/Full3DScene.cjs').createFull3DScene(T,{style:{},addEventListener(){},removeEventListener(){}});
world.render(data.frame,0);
const vertices=scene.getObjectByName('V58_Asphalt').geometry.attributes.position.array;
const xs=[vertices[0],vertices[3],vertices[6],vertices[9],vertices[12],vertices[15]];
assert(Math.abs(Math.min(...xs)+8*1.08)<1e-5&&Math.abs(Math.max(...xs)-8*1.08)<1e-5,'displayed road widens with collision corridors');world.dispose();
console.log('V91: 46 seeded route/mode layouts; 9 x 75s traffic replays at 30/60/120Hz; staggered spacing, bounded lateral homes, safe/deferred recycling, no collision-depth wall, live/crash integration and real 3D width passed (GPU mocked).');
console.log(JSON.stringify(data.flows.map(({id,hz,minGap,recycles})=>({id,hz,minGap,recycles}))));
