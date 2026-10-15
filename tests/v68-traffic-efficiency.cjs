'use strict';
// V68: optimized queue skips cars whose cooldown cannot expire this tick;
// reservation lookup is by stable ID rather than searching the peer snapshot.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function planTrafficQueue67('),end=html.indexOf('\nfunction stepTrafficAI60(',start);
assert(start>0&&end>start,'V67 queue function exists');
const optimized=html.slice(start,end);
assert(optimized.includes('peerById[id]'),'direct indexed reservation lookup');
assert(optimized.includes('((car.v60Cooldown||0)>dt)'),'cooldown fast path exists');
assert(!optimized.includes('peers.find('),'no linear reservation lookup');
const baseline=require('../tools/fixtures/v67-queue-original.cjs');
assert(baseline.includes('peers.find(')&&!baseline.includes('peerById'),'fixture remains V67 baseline');
assert(optimized!==baseline,'baseline and optimization are actually different');
const setup=context=>{
 const traffic=[];
 context.traffic=traffic;
 context.trafficIntentInput60=(car,id,peers,_limit,cooldown)=>({
   allow:true,self:{id,x:car.x,z:car.z,speed:car.speed,halfWidth:.08,laneTarget:car.laneTarget},
   others:peers,corridors:[[{center:0,half:.9}]],player:{z:0},cooldown
 });
 context.window={TaipeiTrafficAI:{
   orderLaneRequests:req=>req.slice().sort((a,b)=>b.wait-a.wait||a.z-b.z||a.id-b.id).map(x=>x.id),
   planLaneIntent:arg=>{
     context.calls++;
     if(arg.cooldown>0)return {action:'hold',reason:'cooldown'};
     const i=arg.self.id,near=arg.others.some(p=>p.id!==i&&p.passActive&&
       Math.abs(p.z-arg.self.z)<1000&&p.laneTarget===0);
     return near?{action:'hold',reason:'adjacent-lanes-blocked'}:
       {action:'change',target:0,cooldown:3.2};
   }
 }};
 context.calls=0;
 return context;
};
function run(fn,hasCooldown){
 const c=setup({});const cars=[];
 for(let i=0;i<12;i++)cars.push({x:i%2?-.468:.468,z:20000+i*200,speed:160,
   laneTarget:i%2?-.468:.468,v60Think:0,v60Cooldown:hasCooldown&&i%3===0?3:0,
   v60PassActive:false,v67WaitRounds:i%5});
 c.traffic=cars;
 const peers=cars.map((car,id)=>({id,x:car.x,z:car.z,speed:car.speed,halfWidth:.08,passActive:false,laneTarget:car.laneTarget}));
 vm.createContext(c);vm.runInContext(fn+'\nthis.invoke=planTrafficQueue67;',c);
 const plans=c.invoke(peers,120000,1/60);
 return {plans:[...plans].map(([i,p])=>[i,{...p}]),peers:JSON.parse(JSON.stringify(peers)),calls:c.calls};
}
for(const hasCooldown of [false,true]){
 const a=run(baseline,hasCooldown),b=run(optimized,hasCooldown);
 assert.deepEqual(b.plans.filter(([i])=>!hasCooldown||i%3!==0),
   a.plans.filter(([i])=>!hasCooldown||i%3!==0));
 assert.deepEqual(b.peers,a.peers,'accepted lane reservations must match');
 assert(b.calls<=a.calls,'optimized queue never performs more planner calls');
}
console.log('V68 queue optimization: decision equivalence, cooldown bypass and indexed reservations passed');
