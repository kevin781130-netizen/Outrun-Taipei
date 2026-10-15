'use strict';
const assert=require('node:assert/strict');
const {RULES,inspectLanePath,planLaneIntent}=require('../src/traffic/LaneIntent.cjs');
const self={id:0,x:-.12,z:20000,speed:190,halfWidth:.08};
const leader={id:1,x:0,z:24000,speed:125,halfWidth:.08};
const base=()=>({allow:true,self:{...self},target:-.468,others:[{...leader}],
  corridors:[[{center:0,half:.9}],[{center:0,half:.9}]],
  player:{z:0},forkWarningZ:120000});
assert.deepEqual(inspectLanePath(base()),{safe:true,reason:'clear'});
assert.equal(inspectLanePath({...base(),allow:false}).reason,'disabled');
assert.equal(inspectLanePath({...base(),target:NaN}).reason,'invalid-target');
assert.equal(inspectLanePath({...base(),player:{z:14000}}).reason,'player-proximity');
assert.equal(inspectLanePath({...base(),forkWarningZ:20000+RULES.forkBuffer}).reason,'fork-approach');
assert.equal(inspectLanePath({...base(),corridors:[[{center:-.4,half:.35},{center:.4,half:.35}]]}).reason,'split-or-invalid-road');
assert.equal(inspectLanePath({...base(),corridors:[[{center:0,half:.4}]]}).reason,'out-of-corridor');
assert.equal(inspectLanePath({...base(),others:[{id:5,x:-.468,z:19300,speed:220,halfWidth:.1}]}).reason,'traffic-path-blocked','approaching rear car vetoes lane path');
assert.equal(inspectLanePath({...base(),others:[{id:5,x:-.468,z:20800,speed:150,halfWidth:.1}]}).reason,'traffic-path-blocked','occupied destination front vetoes');
assert.equal(inspectLanePath({...base(),others:[{id:5,x:-.2,z:20100,speed:175,halfWidth:.1}]}).reason,'traffic-path-blocked','swept path crossing vetoes');
assert.equal(inspectLanePath({...base(),others:[{id:5,x:-.468,z:14800,speed:170,halfWidth:.1}]}).safe,true,'distant rear car not a threat');
assert.equal(inspectLanePath({...base(),others:[{id:5,x:NaN,z:14800,speed:170,halfWidth:.1}]}).reason,'invalid-peers');
const original=base(),fingerprint=JSON.stringify(original);
for(let i=0;i<250;i++)inspectLanePath(original);
assert.equal(JSON.stringify(original),fingerprint,'no input mutation');
const intent={...base(),self:{...self,x:0,laneTarget:0},others:[{...leader}]};
const first=planLaneIntent(intent);assert.equal(first.action,'change');
const mirrored=planLaneIntent({...intent,others:[{...leader},{id:4,x:-.468,z:19000,speed:220,halfWidth:.1}]});
assert.equal(mirrored.action,'change');
assert(mirrored.target>0,'mirror to other lane when left is blocked');
console.log('V61 safety model: in-flight rear/front/path checks, player/fork/edge guard and deterministic planner parity passed');
