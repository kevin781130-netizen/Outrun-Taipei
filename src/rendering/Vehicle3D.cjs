'use strict';

/**
 * Original, unbranded, low-poly arcade sports car made with Three.js primitives.
 *
 * Coordinate system: X right, Y up, Z toward the rear of the car; its nose is
 * at negative Z. The camera/overlay owns placement and projection. This model
 * only owns its visual geometry and animation; it never advances game physics.
 *
 * The factory accepts THREE as an argument so the future offline renderer can
 * supply its bundled Three.js instance without CDN/global dependencies.
 */
function createVehicle3D(THREE, options = {}) {
  if (!THREE || typeof THREE.Group !== 'function' ||
      typeof THREE.MeshPhysicalMaterial !== 'function') {
    throw new TypeError('A Three.js module with MeshPhysicalMaterial is required');
  }

  const geometries = new Set();
  const materials = new Set();
  const geometry = (g) => { geometries.add(g); return g; };
  const material = (m) => { materials.add(m); return m; };

  const cube = geometry(new THREE.BoxGeometry(1, 1, 1));
  const tyreShape = geometry(new THREE.CylinderGeometry(1, 1, 1, 14));
  const rimShape = geometry(new THREE.CylinderGeometry(1, 1, 1, 12));
  const exhaustShape = geometry(new THREE.ConeGeometry(0.17, 0.62, 7));
  const shadowShape = geometry(new THREE.PlaneGeometry(2.5, 4.4));

  const paint = material(new THREE.MeshPhysicalMaterial({
    color: options.color ?? 0xe52448,
    metalness: 0.6,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.14
  }));
  const blackTrim = material(new THREE.MeshStandardMaterial({color: 0x151c29, metalness: 0.12, roughness: 0.76}));
  const glazing = material(new THREE.MeshPhysicalMaterial({color: 0x1e566e, metalness: 0.25, roughness: 0.13, clearcoat: 0.8}));
  const tyre = material(new THREE.MeshStandardMaterial({color: 0x101318, metalness: 0, roughness: 0.96}));
  const alloy = material(new THREE.MeshStandardMaterial({color: 0xa4b6c4, metalness: 0.85, roughness: 0.24}));
  const light = material(new THREE.MeshStandardMaterial({
    color: 0xe9f7ff, emissive: 0x8ae8ff, emissiveIntensity: 1.2, metalness: 0.1, roughness: 0.23
  }));
  const tail = material(new THREE.MeshStandardMaterial({
    color: 0xf01c39, emissive: 0xd91030, emissiveIntensity: 0.45, roughness: 0.35
  }));
  const glow = material(new THREE.MeshBasicMaterial({color: 0x53ddff, transparent: true, opacity: 0.82, depthWrite: false}));
  const shadowMaterial = material(new THREE.MeshBasicMaterial({
    color: 0x03070c, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide
  }));

  const root = new THREE.Group();
  root.name = 'V55_OriginalArcadeVehicle';
  const yaw = new THREE.Group();
  const roll = new THREE.Group();
  const pitch = new THREE.Group();
  root.add(yaw);
  yaw.add(roll);
  roll.add(pitch);

  const box = (name, size, position, mat, parent = pitch, rotation = null) => {
    const mesh = new THREE.Mesh(cube, mat);
    mesh.name = name;
    mesh.scale.set(...size);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  };

  // Body volumes: chassis, hood, trunk, raised roof, spoiler and original trim.
  box('body-lower', [1.89, 0.27, 3.83], [0, 0.55, 0], paint);
  box('nose', [1.77, 0.19, 0.52], [0, 0.51, -1.70], paint);
  box('hood', [1.77, 0.12, 1.13], [0, 0.72, -1.04], paint);
  box('trunk', [1.73, 0.13, 0.80], [0, 0.73, 1.32], paint);
  box('front-splitter', [1.85, 0.065, 0.20], [0, 0.41, -1.93], blackTrim);
  box('rear-diffuser', [1.85, 0.13, 0.17], [0, 0.40, 1.93], blackTrim);
  box('roof', [1.13, 0.09, 1.16], [0, 1.17, 0.04], paint);
  box('windshield', [1.21, 0.038, 0.76], [0, 0.98, -0.65], glazing, pitch, [-0.52, 0, 0]);
  box('rear-glass', [1.2, 0.04, 0.68], [0, 0.99, 0.71], glazing, pitch, [0.48, 0, 0]);
  for (const side of [-1, 1]) {
    box(`side-window-${side}`, [0.03, 0.28, 1.04], [side * 0.63, 1.00, 0.10], glazing);
    box(`side-skirt-${side}`, [0.08, 0.12, 2.58], [side * 0.99, 0.46, 0], blackTrim);
    box(`headlight-${side}`, [0.52, 0.11, 0.065], [side * 0.58, 0.63, -1.963], light);
    box(`taillight-${side}`, [0.53, 0.12, 0.064], [side * 0.58, 0.62, 1.967], tail);
    box(`wing-support-${side}`, [0.085, 0.18, 0.08], [side * 0.57, 0.91, 1.56], blackTrim);
  }
  box('rear-wing', [1.87, 0.07, 0.27], [0, 1.03, 1.57], blackTrim);

  const steeringPivots = [];
  const wheelSpinners = [];
  // Wheel geometry is shared. Steering pivots turn around Y; wheel spinners
  // rotate about the vehicle's X axle. Only the front pair steer.
  for (const front of [true, false]) {
    const z = front ? -1.25 : 1.25;
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.name = `${front ? 'front' : 'rear'}-${side < 0 ? 'left' : 'right'}-steer`;
      pivot.position.set(side * 1.02, 0.38, z);
      pitch.add(pivot);
      if (front) steeringPivots.push(pivot);

      const spinner = new THREE.Group();
      spinner.name = `${front ? 'front' : 'rear'}-${side < 0 ? 'left' : 'right'}-wheel`;
      pivot.add(spinner);
      wheelSpinners.push(spinner);

      const tyreMesh = new THREE.Mesh(tyreShape, tyre);
      tyreMesh.name = 'rubber-tire';
      tyreMesh.rotation.z = Math.PI / 2;
      tyreMesh.scale.set(0.375, 0.23, 0.375);
      spinner.add(tyreMesh);

      const rimMesh = new THREE.Mesh(rimShape, alloy);
      rimMesh.name = 'alloy-wheel';
      rimMesh.position.x = side * 0.125;
      rimMesh.rotation.z = Math.PI / 2;
      rimMesh.scale.set(0.23, 0.045, 0.23);
      spinner.add(rimMesh);
    }
  }

  const exhaustFlames = [];
  for (const side of [-1, 1]) {
    const flame = new THREE.Mesh(exhaustShape, glow);
    flame.name = 'nitro-exhaust';
    flame.position.set(side * 0.51, 0.41, 2.20);
    flame.rotation.x = Math.PI / 2;
    flame.visible = false;
    pitch.add(flame);
    exhaustFlames.push(flame);
  }

  // A simple contact shadow stays with the car's planar position but does not
  // tilt or drift with its chassis. A soft shadow texture is a later art pass.
  const shadow = new THREE.Mesh(shadowShape, shadowMaterial);
  shadow.name = 'contact-shadow';
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.008;
  root.add(shadow);

  let disposed = false;
  let lowQuality = null;
  function setQuality(quality) {
    if (disposed) return;
    const low = quality === 'LOW';
    if (low === lowQuality) return;
    lowQuality = low;
    paint.clearcoat = low ? 0 : 1;
    glazing.clearcoat = low ? 0 : 0.8;
    paint.roughness = low ? 0.52 : 0.25;
    paint.needsUpdate = true;
    glazing.needsUpdate = true;
  }

  function applyPose(pose) {
    if (disposed) return;
    if (!pose) throw new TypeError('vehicle pose required');
    for (const key of ['yawRad', 'rollRad', 'pitchRad', 'steerRad', 'wheelSpinRad', 'scaleX']) {
      if (!Number.isFinite(pose[key])) throw new TypeError(`${key} must be finite`);
    }
    if (pose.scaleX <= 0) throw new RangeError('scaleX must be positive');
    yaw.rotation.y = pose.yawRad;
    roll.rotation.z = pose.rollRad;
    pitch.rotation.x = pose.pitchRad;
    root.scale.x = pose.scaleX;
    for (const pivot of steeringPivots) pivot.rotation.y = pose.steerRad;
    for (const spinner of wheelSpinners) spinner.rotation.x = pose.wheelSpinRad;
    tail.emissiveIntensity = pose.brakeOn ? 2.6 : 0.45;
    for (const flame of exhaustFlames) flame.visible = pose.boostOn === true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (root.parent) root.parent.remove(root);
    for (const meshGeometry of geometries) meshGeometry.dispose();
    for (const meshMaterial of materials) meshMaterial.dispose();
    geometries.clear();
    materials.clear();
  }

  setQuality(options.quality ?? 'STANDARD');
  return {
    root,
    applyPose,
    setQuality,
    dispose,
    // Exposed for unit tests and future integration, not physics/collision.
    parts: {yaw, roll, pitch, steeringPivots, wheelSpinners, exhaustFlames, tail, paint, glazing}
  };
}

module.exports = {createVehicle3D};
