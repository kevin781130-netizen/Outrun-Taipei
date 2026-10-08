'use strict';
const assert = require('node:assert/strict');
const {createVehiclePose, updateVehiclePose} = require('../src/rendering/VehiclePoseBridge.cjs');
const DEG = Math.PI / 180;
const base = Object.freeze({
  screenX: 492.5, screenY: 476.25, yawDeg: 58, rollDeg: -4,
  pitchDeg: 2, steer: -0.5, speedKmh: 108, scaleX: 1.015,
  direction: 1, braking: true, boosting: false
});

const pose = createVehiclePose();
const returned = updateVehiclePose(pose, base, 0.016);
assert.equal(returned, pose, 'reuses output object, no per-frame allocation');
assert.equal(pose.screenX, base.screenX);
assert.equal(pose.screenY, base.screenY);
assert.ok(Math.abs(pose.yawRad - 58 * DEG) < 1e-12);
assert.ok(Math.abs(pose.rollRad + 4 * DEG) < 1e-12);
assert.ok(Math.abs(pose.pitchRad - 2 * DEG) < 1e-12);
assert.ok(Math.abs(pose.steerRad + 14 * DEG) < 1e-12);
assert.equal(pose.scaleX, base.scaleX);
assert.equal(pose.brakeOn, true);
assert.equal(pose.boostOn, false);
const forwardSpin = pose.wheelSpinRad;
assert.ok(forwardSpin > 0);
updateVehiclePose(pose, {...base, direction: -1, braking: false, boosting: true}, 0.016);
assert.ok(Math.abs(pose.wheelSpinRad) < 1e-12 || Math.abs(pose.wheelSpinRad - 2 * Math.PI) < 1e-12,
  'same wheel motion in reverse cancels forward spin');
assert.equal(pose.brakeOn, false);
assert.equal(pose.boostOn, true);
updateVehiclePose(pose, {...base, steer: 5, yawDeg: -58}, 0);
assert.ok(Math.abs(pose.steerRad - 28 * DEG) < 1e-12, 'visual steer clamps; drift yaw does not');
assert.ok(Math.abs(pose.yawRad + 58 * DEG) < 1e-12);
const saved = pose.wheelSpinRad;
updateVehiclePose(pose, {...base, speedKmh: 0}, 1);
assert.equal(pose.wheelSpinRad, saved, 'stopped wheels do not spin');
for (const [partial, time] of [
  [{...base, yawDeg: NaN}, 0.016],
  [{...base, screenX: Infinity}, 0.016],
  [{...base, direction: 0}, 0.016],
  [{...base, speedKmh: -1}, 0.016],
  [base, -1],
  [base, Infinity]
]) assert.throws(() => updateVehiclePose(pose, partial, time));
assert.equal(base.yawDeg, 58, 'source state is never mutated');
console.log('V55 pose bridge: all assertions passed');
