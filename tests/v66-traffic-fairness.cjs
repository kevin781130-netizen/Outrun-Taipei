'use strict';
// V66 - safe tie choice, completed-pass-only memory, deterministic replays.
// Contains no licensed external implementation.
const assert=require('node:assert/strict');
const {RULES,planLaneIntent,inspectLanePath}=require('../src/traffic/LaneIntent.cjs');
const self={id:0,x:0,z:20000,speed:190,halfWidth:.08,laneTarget:0};
const lead={id:1,x:0,z:24000,speed:110,halfWidth:.08};
const base=(extra={})=>({allow:true,self:{...self,...extra},others:[lead],
  corridors:[[{center:0,half:.9}],[{center:0,half:.9}]],
  player:{z:0},forkWarningZ:120000,cooldown:0});
const left=planLaneIntent(base()),right=planLaneIntent(base({lastCenterSide:-1}));
assert.equal(left.action,'change');
assert(left.target<0,'initial safe choice preserves legacy left preference');
assert.equal(right.action,'change');
assert(right.target>0,'previous completed left pass prefers right');
assert.equal(planLaneIntent(base({lastCenterSide:1})).target,left.target,'previous right pass prefers left');
assert.equal(planLaneIntent(base({lastCenterSide:0})).target,left.target,'no history uses default');
assert.equal(planLaneIntent(base({lastCenterSide:-1})).target,right.target,'stable replay');
// Safety is higher priority: an occupied right lane must allow safe left pass.
const rightBlock={id:2,x:right.target,z:19800,speed:220,halfWidth:.1};
const forced=planLaneIntent({...base({lastCenterSide:-1}),others:[lead,rightBlock]});
assert.equal(forced.target,left.target);
assert.equal(inspectLanePath({...base({lastCenterSide:-1}),others:[lead,rightBlock],target:forced.target}).safe,true);
// Both lanes occupied must hold, independent of preference.
const both=planLaneIntent({...base({lastCenterSide:-1}),
 others:[lead,rightBlock,{id:3,x:left.target,z:19800,speed:220,halfWidth:.1}]});
assert.equal(both.reason,'adjacent-lanes-blocked');
// The fairness memory is only a tie break, not an input mutator or RNG.
const immutable=base({lastCenterSide:-1}),before=JSON.stringify(immutable);
const previousRandom=Math.random;let calls=0;
Math.random=()=>{calls++;return .25;};
try{for(let i=0;i<1000;i++)planLaneIntent(immutable);}finally{Math.random=previousRandom;}
assert.equal(calls,0);assert.equal(JSON.stringify(immutable),before);
assert(RULES.settleSeconds>0&&RULES.settleSeconds<RULES.cooldownSeconds);
console.log('V66 fairness pure: alternate safe center choices, forced safe fallback, deterministic immutable planning passed');
