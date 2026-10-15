'use strict';
const assert=require('node:assert/strict');
const {RULES,planLaneIntent:plan}=require('../src/traffic/LaneIntent.cjs');
const self={id:'ego',x:0,laneTarget:0,z:20000,speed:190,halfWidth:.08};
const leader={id:'slow',x:0,z:24000,speed:125,halfWidth:.08};
const ground=()=>({self:{...self},others:[{...leader}],corridors:[[{center:0,half:.9}],[{center:0,half:.9}]],player:{z:0},forkWarningZ:120000,allow:true,cooldown:0});
const base=ground(),p=plan(base);
assert.equal(p.action,'change');assert(p.target<0&&Number.isFinite(p.target));
assert.equal(p.cooldown,RULES.cooldownSeconds);
assert.deepEqual(plan(ground()),p,'deterministic for identical inputs');
assert.equal(plan({...ground(),allow:false}).reason,'disabled');
assert.equal(plan({...ground(),cooldown:1}).reason,'cooldown');
assert.equal(plan({...ground(),player:{z:14000}}).reason,'player-proximity');
assert.equal(plan({...ground(),forkWarningZ:20000+RULES.forkBuffer}).reason,'fork-approach');
assert.equal(plan({...ground(),corridors:[[{center:-.45,half:.4},{center:.45,half:.4}]]}).reason,'split-or-invalid-road');
assert.equal(plan({...ground(),corridors:[[{center:0,half:.08}]]}).reason,'narrow-road');
assert.equal(plan({...ground(),others:[{...leader,speed:189}]}).reason,'no-slow-leader');
assert.equal(plan({...ground(),others:[{...leader,z:35000}]}).reason,'no-slow-leader');
assert.equal(plan({...ground(),others:[{x:0,z:24000,speed:125,halfWidth:.08}]}).action,'change','anonymous game traffic cars remain visible to planner');
assert.equal(plan({...ground(),others:[{...leader},{id:'left',x:-.468,z:19400,speed:210,halfWidth:.1}]}).action,'change');
assert(plan({...ground(),others:[{...leader},{id:'left',x:-.468,z:19400,speed:210,halfWidth:.1}]}).target>0,'blocked left chooses right');
assert.equal(plan({...ground(),others:[{...leader},{id:'left',x:-.468,z:19400,speed:210,halfWidth:.1},{id:'right',x:.468,z:21700,speed:175,halfWidth:.1}]}).reason,'adjacent-lanes-blocked');
assert.equal(plan({...ground(),others:[{...leader},{id:'cut-through',x:-.2,z:19600,speed:180,halfWidth:.1},{id:'right',x:.468,z:21700,speed:175,halfWidth:.1}]}).reason,'adjacent-lanes-blocked','swept lateral path must be clear');
assert.equal(plan({...ground(),others:[{...leader}, {id:'bad',x:NaN,z:24000,speed:100,halfWidth:.1}]}).reason,'invalid-peers');
assert.equal(plan({...ground(),self:{...self,x:Infinity}}).reason,'invalid-self');
for(const width of [.66,.78,.9,1,1.2])for(const mirror of [-1,1]){
  const g=ground();g.corridors=[[{center:0,half:width}]];
  g.others=[{...leader,id:'lead',z:24000}];
  if(mirror===1){g.others.push({id:'block-left',x:-width*.52,z:18500,speed:190,halfWidth:.1});}
  const result=plan(g);assert.equal(result.action,'change');assert(Number.isFinite(result.target));
  assert(Math.abs(result.target)+g.self.halfWidth+RULES.roadMargin<=width);
}
// Fixed-run snapshots must not advance gameplay RNG or mutate referenced state.
const frozen=ground(),saved=JSON.stringify(frozen),oldRandom=Math.random;let rng=0;
Math.random=()=>{rng++;return .5};try{for(let i=0;i<200;i++)plan(frozen);}finally{Math.random=oldRandom;}
assert.equal(rng,0);assert.equal(JSON.stringify(frozen),saved);
console.log('V60 isolated traffic planner: 27+ deterministic checks passed (no game runtime integration)');
