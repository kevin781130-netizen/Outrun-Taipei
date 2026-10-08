'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Real vendored Three.js module initialization (not a geometry mock).
// The browser loader must not consume random numbers from driving simulation.
const source=fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8');
const gameMath=Object.create(Math);
let gameRandomCalls=0;
const gameRandom=()=>{gameRandomCalls++;return 0.29;};
gameMath.random=gameRandom;
const sandbox={Math:gameMath};
vm.runInNewContext(source,sandbox,{timeout:5000,filename:'three-r149.min.js'});
assert.equal(sandbox.THREE.REVISION,'149');
assert.equal(gameRandomCalls,0,'vendored Three.js must not advance the game RNG');
assert.equal(gameMath.random,gameRandom,'loader must restore the exact original random function');
assert.equal(typeof sandbox.THREE.MeshPhysicalMaterial,'function');
assert.equal(typeof sandbox.THREE.WebGLRenderer,'function');
console.log('V55 vendor: real Three.js r149 loaded without consuming simulation randomness');
