'use strict';
// Pure metrics regression, no Chromium/GitHub Actions required.
const assert=require('node:assert/strict');
const {compareRgba}=require('../tools/scene-metrics.cjs');
const before=new Uint8Array([
  10,20,30,255,   120,90,60,255,
  0,0,0,255,      250,255,100,255
]);
const after=new Uint8Array([
  10,20,30,255,   120,90,60,255,
  0,0,17,255,     250,255,100,128
]);
const result=compareRgba(before,after,2,2);
assert.equal(result.pixels,4);
assert.equal(result.changedPixels,1);
assert.equal(result.changedPixelsPercent,25);
assert.equal(result.maximumChannelDifference,17);
assert.equal(result.meanAbsoluteRgbDifference,17/12);
assert.equal(result.changedAlphaPixels,1);
const same=compareRgba(before,before,2,2);
assert.equal(same.changedPixels,0);
assert.equal(same.maximumChannelDifference,0);
assert.equal(same.meanAbsoluteRgbDifference,0);
assert.equal(compareRgba(before,after,2,2,17).changedPixels,0);
assert.throws(()=>compareRgba(before,after,3,2),/buffer size mismatch/);
assert.throws(()=>compareRgba(before,after,2,2,-1),/Invalid threshold/);
assert.throws(()=>compareRgba(before,after,0,2),/Invalid image size/);
console.log('V54 P3 pixel metrics: PASS (threshold, RGB, alpha, guards)');
