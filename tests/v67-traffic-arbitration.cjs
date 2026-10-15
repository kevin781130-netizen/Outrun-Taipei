'use strict';
// V67: no random draws, deterministic priority, bounded wait age, safe plan.
const assert=require('node:assert/strict');
const {orderLaneRequests,planLaneIntent,inspectLanePath}=require('../src/traffic/LaneIntent.cjs');
const a={id:0,z:20000,x:-.468,speed:190,wait:0};
const b={id:1,z:20400,x:.468,speed:190,wait:0};
assert.deepEqual(orderLaneRequests([a,b]),[0,1],'lower Z gets first opportunity, not earlier index');
assert.deepEqual(orderLaneRequests([{...a,id:1},{...b,id:0}]),[1,0],
  'same physical cars retain priority after array reordering');
assert.deepEqual(orderLaneRequests([{...a,wait:0},{...b,wait:1}]),[1,0],
  'previous denied requests receive the next first opportunity');
assert.deepEqual(orderLaneRequests([{...a,wait:-100},{...b,wait:1000}]),[1,0],
  'extreme wait ages remain bounded in comparisons');
assert.deepEqual(orderLaneRequests([{id:99,x:NaN,z:1,speed:100},a]),[0],
  'bad candidates are never scheduled');
assert.deepEqual(orderLaneRequests([]),[]);
const snapshot=[a,b],serialized=JSON.stringify(snapshot);
for(let i=0;i<1000;i++)orderLaneRequests(snapshot);
assert.equal(JSON.stringify(snapshot),serialized,'ordering is a pure nonmutating function');
const self={id:1,x:.468,z:20400,speed:190,halfWidth:.08,laneTarget:.468};
const leader={id:3,x:.468,z:24500,speed:120,halfWidth:.08};
const block={id:0,x:-.468,z:20000,speed:190,halfWidth:.08,
  passActive:true,laneTarget:0};
const road=[[{center:0,half:.9}],[{center:0,half:.9}]];
const args={allow:true,self,others:[block,leader],corridors:road,player:{z:0},forkWarningZ:120000};
assert.equal(planLaneIntent(args).reason,'adjacent-lanes-blocked','earlier reserved path blocks contender');
assert.equal(inspectLanePath({...args,target:0}).reason,'traffic-path-blocked');
console.log('V67 arbitration pure: order-independent road priority, bounded waiting, safety reservations passed');
