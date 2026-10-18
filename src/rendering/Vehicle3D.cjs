'use strict';

/**
 * Original, unbranded, arcade coupe with a sculpted, chamfered shell and shared wheel details.
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
  const textures = new Set();
  const geometry = (g) => { geometries.add(g); return g; };
  const material = (m) => { materials.add(m); return m; };

  // Loft chamfered cross-sections instead of stacking rectangular body boxes.
  // Faces wind outward; normals stay flat across the designed crease lines.
  const loft = (rings) => {
    const vertices = [];
    const triangle = (a,b,c) => vertices.push(...a,...b,...c);
    for(let r=0;r<rings.length-1;r++)for(let i=0;i<rings[r].length;i++){
      const j=(i+1)%rings[r].length;
      triangle(rings[r][i],rings[r][j],rings[r+1][j]);
      triangle(rings[r][i],rings[r+1][j],rings[r+1][i]);
    }
    for(let i=1;i<rings[0].length-1;i++){
      triangle(rings[0][0],rings[0][i+1],rings[0][i]);
      const last=rings[rings.length-1];triangle(last[0],last[i],last[i+1]);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.computeVertexNormals();return geometry(g);
  };
  const bodyRing = (z,w,top) => [
    [-w*.80,.34,z],[w*.80,.34,z],[w,.46,z],[w,top-.10,z],
    [w*.84,top,z],[-w*.84,top,z],[-w,top-.10,z],[-w,.46,z]
  ];
  const shell = loft([[-1.96,.80,.61],[-1.68,.94,.73],[-1.18,1.00,.78],
    [-.65,.96,.79],[.60,.96,.80],[1.24,1.00,.81],[1.70,.95,.77],[1.96,.85,.68]]
    .map(([z,w,y])=>bodyRing(z,w,y)));
  const cabin = loft([[-.78,.73,.74,.80],[-.29,.73,.56,1.18],[.43,.73,.56,1.18],[.99,.73,.71,.81]]
    .map(([z,w,roofW,top])=>[[-w,.79,z],[w,.79,z],[roofW,top,z],[-roofW,top,z]]));
  const roofShape = loft([[-.32,.54,1.175],[-.25,.57,1.215],[.40,.57,1.215],[.48,.54,1.175]]
    .map(([z,w,y])=>[[-w,1.16,z],[w,1.16,z],[w,y,z],[-w,y,z]]));
  // One shared ring/spoke mesh per wheel, avoiding 24 separate spoke draws.
  const rimVertices=[];
  const quad=(a,b,c,d)=>rimVertices.push(...a,...b,...c,...a,...c,...d);
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
    quad([Math.cos(a)*.25,Math.sin(a)*.25,0],[Math.cos(b)*.25,Math.sin(b)*.25,0],
      [Math.cos(b)*.205,Math.sin(b)*.205,0],[Math.cos(a)*.205,Math.sin(a)*.205,0]);
  }
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,ux=Math.cos(a),uy=Math.sin(a),vx=-uy*.022,vy=ux*.022;
    quad([ux*.045+vx,uy*.045+vy,.004],[ux*.23+vx,uy*.23+vy,.004],
      [ux*.23-vx,uy*.23-vy,.004],[ux*.045-vx,uy*.045-vy,.004]);
  }
  const spokeShape=geometry(new THREE.BufferGeometry());
  spokeShape.setAttribute('position',new THREE.Float32BufferAttribute(rimVertices,3));
  spokeShape.computeVertexNormals();

  const cube = geometry(new THREE.BoxGeometry(1, 1, 1));
  const tyreShape = geometry(new THREE.CylinderGeometry(1, 1, 1, 14));
  const rimShape = geometry(new THREE.CylinderGeometry(1, 1, 1, 12));
  const exhaustShape = geometry(new THREE.ConeGeometry(0.17, 0.62, 7));
  const shadowShape = geometry(new THREE.PlaneGeometry(2.5, 4.4));

  const paint = material(new THREE.MeshPhysicalMaterial({
    color: options.color ?? 0xe52448,
    metalness: 0.32,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.14
  }));
  const blackTrim = material(new THREE.MeshStandardMaterial({color: 0x151c29, metalness: 0.12, roughness: 0.76}));
  const glazing = material(new THREE.MeshPhysicalMaterial({color: 0x1e566e, metalness: 0.25, roughness: 0.13, clearcoat: 0.8}));
  const tyre = material(new THREE.MeshStandardMaterial({color: 0x101318, metalness: 0, roughness: 0.96}));
  const alloy = material(new THREE.MeshStandardMaterial({color: 0xa4b6c4, metalness: 0.85, roughness: 0.24, side: THREE.DoubleSide}));
  const light = material(new THREE.MeshStandardMaterial({
    color: 0xe9f7ff, emissive: 0x8ae8ff, emissiveIntensity: 1.2, metalness: 0.1, roughness: 0.23
  }));
  const tail = material(new THREE.MeshStandardMaterial({
    color: 0xf01c39, emissive: 0xd91030, emissiveIntensity: 0.45, roughness: 0.35
  }));
  const glow = material(new THREE.MeshBasicMaterial({color: 0x53ddff, transparent: true, opacity: 0.82, depthWrite: false}));
  const shadowPixels=new Uint8Array(64*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<64;x++){
    const radius=Math.pow((x-31.5)/31.5,4)+Math.pow((y-63.5)/63.5,4);
    const alpha=Math.pow(Math.max(0,1-radius),2)*210;
    const i=(y*64+x)*4;shadowPixels[i+3]=Math.round(alpha);
  }
  const shadowMap=new THREE.DataTexture(shadowPixels,64,128,THREE.RGBAFormat);
  shadowMap.minFilter=shadowMap.magFilter=THREE.LinearFilter;
  shadowMap.needsUpdate=true;textures.add(shadowMap);
  const shadowMaterial = material(new THREE.MeshBasicMaterial({
    color: 0x03070c, transparent: true, opacity: 0.48, map: shadowMap, depthWrite: false, side: THREE.DoubleSide
  }));

  const root = new THREE.Group();
  root.name = 'V55_OriginalArcadeVehicle';
  const yaw = new THREE.Group();
  const roll = new THREE.Group();
  const pitch = new THREE.Group();
  root.add(yaw);
  yaw.add(roll);
  roll.add(pitch);

  const fineDetails=[];
  const box = (name, size, position, mat, parent = pitch, rotation = null) => {
    const mesh = new THREE.Mesh(cube, mat);
    mesh.name = name;
    mesh.scale.set(...size);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    parent.add(mesh);
    if(/^(deck-vent|mirror-|door-handle)/.test(name))fineDetails.push(mesh);
    return mesh;
  };

  const shaped = (name, shape, mat) => {
    const mesh=new THREE.Mesh(shape,mat);mesh.name=name;pitch.add(mesh);return mesh;
  };
  shaped('body-lower',shell,paint);
  shaped('windshield',cabin,glazing);
  shaped('roof',roofShape,paint);
  // Stable semantic anchors for world-space heading and existing effects.
  const anchor=(name,xyz)=>{const node=new THREE.Group();node.name=name;node.position.set(...xyz);pitch.add(node);};
  anchor('nose',[0,.51,-1.70]);anchor('trunk',[0,.73,1.32]);
  anchor('hood',[0,.75,-1.04]);anchor('rear-glass',[0,.99,.71]);
  box('front-splitter',[1.78,.055,.21],[0,.36,-1.91],blackTrim);
  box('front-intake',[1.15,.12,.025],[0,.49,-1.967],blackTrim);
  box('rear-diffuser',[1.72,.14,.20],[0,.36,1.91],blackTrim);
  box('rear-light-recess',[1.66,.17,.055],[0,.60,1.963],blackTrim);
  box('rear-plate',[.36,.12,.025],[0,.46,2.015],alloy);
  box('rear-lamp-bridge',[.45,.035,.025],[0,.62,2.003],tail);
  for(const side of [-1,1]){
    box('side-skirt-'+side,[.075,.10,2.55],[side*.97,.37,0],blackTrim);
    box('window-pillar-'+side,[.038,.34,.065],[side*.65,.98,.27],blackTrim,pitch,[0,0,-side*.46]);
    box('mirror-stalk-'+side,[.17,.035,.05],[side*.84,.88,-.46],blackTrim);
    box('mirror-'+side,[.15,.10,.20],[side*.98,.92,-.46],paint);
    box('door-handle-'+side,[.026,.025,.15],[side*.965,.67,.30],alloy);
    box('headlight-recess-'+side,[.51,.13,.05],[side*.52,.58,-1.958],blackTrim);
    box('headlight-'+side,[.44,.065,.018],[side*.52,.59,-1.991],light);
    box('taillight-'+side,[.52,.065,.025],[side*.55,.63,2.003],tail);
    box('wing-support-'+side,[.06,.16,.08],[side*.59,.89,1.56],blackTrim);
    box('exhaust-tip-'+side,[.16,.085,.16],[side*.51,.36,2.02],alloy);
  }
  box('rear-wing',[1.84,.055,.25],[0,1.00,1.57],blackTrim);
  // Visible from the chase camera: deck vents and a low, cohesive rear profile.
  for(let i=0;i<4;i++)box('deck-vent-'+i,[1.17,.018,.036],[0,.815,1.04+i*.095],blackTrim);

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
      rimMesh.scale.set(0.19, 0.022, 0.19);
      rimMesh.material=blackTrim;
      spinner.add(rimMesh);
      const spokes=new THREE.Mesh(spokeShape,alloy);
      spokes.name='rim-spokes';spokes.position.x=side*.153;
      spokes.rotation.y=side*Math.PI/2;spinner.add(spokes);fineDetails.push(spokes);

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

  // Soft analytic contact shadow stays on the road instead of tilting with chassis.
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
    for(const detail of fineDetails)detail.visible=!low;
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
    for(const texture of textures)texture.dispose();
    textures.clear();
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
