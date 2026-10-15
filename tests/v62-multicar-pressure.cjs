'use strict';
const assert=require('node:assert/strict');
const {RULES,planLaneIntent:plan,inspectLanePath:inspect}=require('../src/traffic/LaneIntent.cjs');
const car=(id,x,z,speed=190,extra={})=>({id,x,z,speed,halfWidth:.08,laneTarget:x,...extra});
const road=[[{center:0,half:.9}],[{center:0,half:.9}]];
const input=(self,others)=>({self,others,allow:true,corridors:road,player:{z:0},forkWarningZ:140000});
const a=car(0,-.468,20000),b=car(1,.468,20400),leadA=car(2,-.468,24000,120),leadB=car(3,.468,24500,120);
const first=plan(input(a,[a,b,leadA,leadB]));assert.equal(first.target,0);
assert.equal(plan(input(b,[a,b,leadA,leadB])).target,0,'prior version could double-merge');
const reserved={...a,passActive:true,laneTarget:0};
assert.equal(plan(input(b,[reserved,b,leadA,leadB])).reason,'adjacent-lanes-blocked');
assert.equal(inspect({...input(b,[car(4,-.468,20200,220,{passActive:true,laneTarget:.468})]),target:0}).reason,'traffic-path-blocked');
const far=car(5,0,9000,700);
assert.equal(inspect({...input(a,[far]),target:0}).reason,'traffic-path-blocked','fast distant follower');
assert.equal(inspect({...input(a,[{...far,speed:190}]),target:0}).safe,true);
const front=car(6,0,27500,30);
assert(front.z-a.z>RULES.forwardLook);
assert.equal(inspect({...input(a,[front]),target:0}).reason,'traffic-path-blocked','slow front beyond base lookahead');
assert.equal(inspect({...input(a,[car(6,0,27500,190)]),target:0}).safe,true);
assert.equal(inspect({...input(a,[car(8,.468,20200,200,{passActive:true,laneTarget:NaN})]),target:0}).reason,'invalid-peers');
let seed=0x61C0FFEE;
const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
let passing=0;
for(let k=0;k<3600;k++){
 const width=[.66,.74,.9,1,1.2][k%5],lanes=[-width*.52,0,width*.52];
 const pos=lanes[Math.floor(rnd()*3)],self=car(0,pos,20000+rnd()*3000,150+rnd()*100);
 const peers=Array.from({length:12},(_,i)=>{
   const x=lanes[Math.floor(rnd()*3)],z=self.z+(rnd()-.48)*14000;
   return car(i+1,x,z,70+rnd()*500,rnd()>.5?{passActive:true,laneTarget:lanes[Math.floor(rnd()*3)]}:{});
 });
 peers.push(car(20,pos,self.z+3500,65));
 const args={...input(self,peers),corridors:[[{center:0,half:width}]]},saved=JSON.stringify(args);
 const result=plan(args);assert.equal(JSON.stringify(args),saved);
 if(result.action==='change'){assert.equal(inspect({...args,target:result.target}).safe,true);passing++;}
}
assert(passing>0);
console.log('V62 multicar pressure: same-frame reservations, speed-expanded search, 3600 reproducible dense scenes passed; passing='+passing);
