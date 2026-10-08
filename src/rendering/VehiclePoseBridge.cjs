'use strict';

// Presentation-only bridge from the existing V51/V53 driving state to a future
// 3D vehicle renderer. No ownership of physics, collision, randomness or time.
const DEG_TO_RAD = Math.PI / 180;
const TAU = 2 * Math.PI;
const MAX_STEER_VISUAL_DEG = 28;
const WHEEL_RADIUS_METERS = 0.33;

function finite(name, value) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}

function createVehiclePose() {
  return {
    screenX: 0,
    screenY: 0,
    yawRad: 0,
    rollRad: 0,
    pitchRad: 0,
    steerRad: 0,
    wheelSpinRad: 0,
    scaleX: 1,
    brakeOn: false,
    boostOn: false
  };
}

/**
 * Updates a reusable output object; avoids allocating on each animation frame.
 * `frame` must come from the existing 2D presentation state, not a new physics
 * calculation. Angles use degrees on input and radians on output. `screenX/Y`
 * are logical 960x540 arcade coordinates (not CSS pixels).
 *
 * Required frame keys:
 *   screenX, screenY, yawDeg, rollDeg, pitchDeg, steer, speedKmh
 * Optional: scaleX=1, direction=1, braking=false, boosting=false
 * `dtSeconds` is elapsed simulation time; clamp long resumes to 100 ms solely
 * for wheel animation. Negative time is invalid. Vehicle movement is untouched.
 */
function updateVehiclePose(pose, frame, dtSeconds) {
  if (!pose || typeof pose !== 'object') throw new TypeError('pose object required');
  if (!frame || typeof frame !== 'object') throw new TypeError('frame object required');
  const x = finite('screenX', frame.screenX);
  const y = finite('screenY', frame.screenY);
  const yaw = finite('yawDeg', frame.yawDeg);
  const roll = finite('rollDeg', frame.rollDeg);
  const pitch = finite('pitchDeg', frame.pitchDeg);
  const steer = finite('steer', frame.steer);
  const speed = finite('speedKmh', frame.speedKmh);
  const scaleX = finite('scaleX', frame.scaleX ?? 1);
  const direction = finite('direction', frame.direction ?? 1);
  const dt = finite('dtSeconds', dtSeconds);
  const oldSpin = finite('wheelSpinRad', pose.wheelSpinRad);
  if (dt < 0) throw new RangeError('dtSeconds must be non-negative');
  if (scaleX <= 0) throw new RangeError('scaleX must be positive');
  if (direction !== 1 && direction !== -1) throw new RangeError('direction must be 1 or -1');
  if (speed < 0) throw new RangeError('speedKmh must be non-negative');

  pose.screenX = x;
  pose.screenY = y;
  // Preserve the precomputed curve-limited drift yaw and existing body motion.
  pose.yawRad = yaw * DEG_TO_RAD;
  pose.rollRad = roll * DEG_TO_RAD;
  pose.pitchRad = pitch * DEG_TO_RAD;
  // Wheel steering angle is a visual choice, never an input to game handling.
  pose.steerRad = Math.max(-1, Math.min(1, steer)) * MAX_STEER_VISUAL_DEG * DEG_TO_RAD;
  pose.scaleX = scaleX;
  const spinDelta = (speed / 3.6 / WHEEL_RADIUS_METERS) * Math.min(dt, 0.1) * direction;
  pose.wheelSpinRad = ((oldSpin + spinDelta) % TAU + TAU) % TAU;
  pose.brakeOn = frame.braking === true;
  pose.boostOn = frame.boosting === true;
  return pose;
}

module.exports = {createVehiclePose, updateVehiclePose};
