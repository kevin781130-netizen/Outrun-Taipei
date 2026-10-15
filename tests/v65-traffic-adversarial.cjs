'use strict';
// V65: bounded multi-agent adversarial replay, boundary checks, and peer-order
// invariance of the pure planner. Deterministic, no random source consumed.
const assert=require('node:assert/strict');
const {planLaneIntent,inspectLanePath,RULES}=require('../src/traffic/LaneIntent.cjs');
const rngSeed=0x7a1e6501;
let seed=rngSeed;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function car(id,x,z,speed=190,additional={}){return {id,x,z,speed,halfWidth:.08,laneTarget:x,...additional};}
const road=(width=.9)=>[[{center:0,half:width}],[{center:0,half:width}]];
const ctx=(self,others,width=.9)=>({allow:true,self,others,corridors:road(width),player:{z:0},forkWarningZ:150000,cooldown:0});
const baseline=car('self',0,20000),slow=car('lead',0,24000,115);
const intent=planLaneIntent(ctx(baseline,[baseline,slow]));
assert.equal(intent.action,'change');
// Peer order must not alter a safety decision, even with equal-distance leaders.
const candidatePeers=[baseline,slow,car('left',-.468,19500,260),car('right',.468,28500,160)];
const first=planLaneIntent(ctx(baseline,candidatePeers));
for(const peers of [candidatePeers.slice().reverse(),[candidatePeers[2],candidatePeers[0],candidatePeers[3],candidatePeers[1]]]){
  assert.deepEqual(planLaneIntent(ctx(baseline,peers)),first,'permutation must not change lane choice');
}
const scenarios=12000;
let validPasses=0,holds=0;
for(let k=0;k<scenarios;k++){
  const width=[.66,.72,.9,1,1.15][k%5],lanes=[-width*.52,0,width*.52];
  const own=car('ego',lanes[Math.floor(random()*3)],20000+random()*6000,90+random()*260);
  const peers=Array.from({length:12},(_,i)=>{
    const x=lanes[Math.floor(random()*3)];
    const z=own.z+(random()-.5)*20000;
    const speed=25+random()*580;
    const ongoing=random()<.33;
    return car(i,x,z,speed,ongoing?{passActive:true,laneTarget:lanes[Math.floor(random()*3)]}:{});
  });
  peers.push(car('leader',own.x,own.z+1800+random()*2000,30));
  const input=ctx(own,peers,width);
  const json=JSON.stringify(input);
  const result=planLaneIntent(input);
  assert.equal(JSON.stringify(input),json,'planner mutated input in case '+k);
  assert(Number.isFinite(result.target)&&Number.isFinite(result.cooldown));
  if(result.action==='change'){
    const safety=inspectLanePath({...input,target:result.target});
    assert.equal(safety.safe,true,'planner selected an unsafe path at case '+k);
    assert(Math.abs(result.target)+own.halfWidth+RULES.roadMargin<=width+1e-10);
    validPasses++;
  }else{
    assert.equal(result.action,'hold');holds++;
  }
  if(k%29===0){
    const mirror=car('mirror',-own.x,own.z,own.speed);
    const flipped=peers.map(p=>({...p,x:-p.x,laneTarget:-p.laneTarget}));
    const mirrored=planLaneIntent(ctx(mirror,flipped,width));
    assert(Number.isFinite(mirrored.target),'mirrored road must remain finite');
    if(mirrored.action==='change')assert.equal(inspectLanePath({...ctx(mirror,flipped,width),target:mirrored.target}).safe,true);
  }
}
assert(validPasses>0&&holds>0);
for(const speed of [0,1,100,400,1200]){
 const ego=car('ego',0,20000,speed);
 const peer=car('rear',-.468,20000-(RULES.rearLook+1),speed+5000);
 const r=inspectLanePath({...ctx(ego,[peer]),target:-.468});
 assert.equal(r.safe,false,'fast follower must be checked beyond nominal rear range');
}
console.log('V65 adversarial traffic: '+scenarios+' seeded 12-car scenes, '+validPasses+' safe passes / '+holds+' holds; invariants and fast followers passed');
