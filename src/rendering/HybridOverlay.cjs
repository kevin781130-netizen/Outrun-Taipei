'use strict';
const {createVehicle3D} = require('./Vehicle3D.cjs');
const {createVehiclePose, updateVehiclePose} = require('./VehiclePoseBridge.cjs');

const WIDTH = 960;
const HEIGHT = 540;
const PIXELS_PER_METER = 110;
const CAMERA_ELEVATION = 3.3;
const CAMERA_DISTANCE = 9.0;
const CAMERA_LOOK_AT_Y = 0.7;
const COS_TILT = CAMERA_DISTANCE / Math.hypot(CAMERA_DISTANCE, CAMERA_ELEVATION);

function projectPresentation(x, y, presentation = {}) {
  const {crop = 0, zoom = 1, lean = 0, lateralLook = 0, verticalShift = 0} = presentation;
  const safeCrop = Math.min(Math.max(0, crop), 50);
  const scale = WIDTH / (WIDTH - safeCrop * 2);
  const lx = (x - WIDTH / 2) * scale;
  const ly = (y - HEIGHT / 2) * (HEIGHT / (HEIGHT - safeCrop * 2));
  const cos = Math.cos(lean), sin = Math.sin(lean);
  return {
    x: WIDTH / 2 - lateralLook + zoom * (lx * cos - ly * sin),
    y: HEIGHT / 2 + verticalShift + zoom * (lx * sin + ly * cos),
    scale: scale * zoom
  };
}

/**
 * Visual-only WebGL overlay. The main game remains the sole physics and
 * collision authority. Render on demand AFTER the existing 2D presentation.
 * A successful frame enables the 2D-car suppression on the NEXT frame.
 */
function createHybridOverlay(THREE, canvas, options = {}) {
  if (!THREE || !canvas || !THREE.WebGLRenderer) throw new TypeError('Three.js and canvas required');
  let renderer;
  let model;
  let disposed = false;
  let contextLost = false;
  let ready = false;
  const pose = createVehiclePose();
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -WIDTH / (2 * PIXELS_PER_METER), WIDTH / (2 * PIXELS_PER_METER),
    HEIGHT / (2 * PIXELS_PER_METER), -HEIGHT / (2 * PIXELS_PER_METER),
    0.1, 50
  );
  camera.position.set(0, CAMERA_LOOK_AT_Y + CAMERA_ELEVATION, CAMERA_DISTANCE);
  camera.lookAt(0, CAMERA_LOOK_AT_Y, 0);
  scene.add(new THREE.HemisphereLight(0xfff2d8, 0x243550, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-4, 8, 5);
  scene.add(sun);
  let lastWidth = 0, lastHeight = 0, lastQuality = '';
  const failure = () => {ready = false; canvas.style.visibility = 'hidden';};
  const lost = event => {
    event.preventDefault();
    contextLost = true;
    failure();
  };
  const restored = () => {
    // Three.js listens on the same canvas and restores its own GPU resources.
    // Do not reenable until the NEXT successful render.
    contextLost = false;
    ready = false;
  };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: false, powerPreference: 'low-power',
      preserveDrawingBuffer: false, premultipliedAlpha: true
    });
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    // The r149 UMD bundle uses outputEncoding (not outputColorSpace).
    renderer.outputEncoding = THREE.sRGBEncoding;
    model = createVehicle3D(THREE, {quality: options.quality || 'STANDARD'});
    scene.add(model.root);
  } catch (error) {
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
    if (model) model.dispose();
    if (renderer) renderer.dispose();
    throw error;
  }
  canvas.style.visibility = 'hidden';
  canvas.style.pointerEvents = 'none';

  function hide() {
    if (!disposed) {
      canvas.style.visibility = 'hidden';
      // Keep renderer resources, but restore the 2D player on the next frame.
      ready = false;
    }
  }

  function render(frame, dt, presentation, outputWidth, outputHeight, quality) {
    if (disposed || contextLost || !frame) {hide(); return false;}
    try {
      if (outputWidth !== lastWidth || outputHeight !== lastHeight) {
        if (!Number.isInteger(outputWidth) || !Number.isInteger(outputHeight) ||
            outputWidth <= 0 || outputHeight <= 0) throw new TypeError('Invalid buffer size');
        renderer.setSize(outputWidth, outputHeight, false);
        lastWidth = outputWidth;
        lastHeight = outputHeight;
      }
      if (quality !== lastQuality) {
        model.setQuality(quality);
        lastQuality = quality;
      }
      updateVehiclePose(pose, frame, dt);
      const location = projectPresentation(pose.screenX, pose.screenY, presentation);
      model.applyPose(pose);
      // Translate screen presentation to orthographic overlay coordinates.
      // The tilt correction anchors the ground shadow to the 2D road.
      model.root.position.set(
        (location.x - WIDTH / 2) / PIXELS_PER_METER,
        CAMERA_LOOK_AT_Y + (HEIGHT / 2 - location.y) / (PIXELS_PER_METER * COS_TILT),
        0
      );
      model.root.scale.set(pose.scaleX * location.scale, location.scale, location.scale);
      renderer.render(scene, camera);
      canvas.style.visibility = 'visible';
      ready = true;
      return true;
    } catch (error) {
      failure();
      // Avoid error spam in a broken renderer; the 2D path stays playable.
      if (!disposed) {
        console.warn('V55 hybrid renderer disabled; using 2D vehicle', error);
        dispose();
      }
      return false;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    failure();
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
    if (model) model.dispose();
    if (renderer) renderer.dispose();
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }

  return {
    render, hide, dispose,
    get ready() {return ready && !disposed && !contextLost;},
    get disposed() {return disposed;},
    get contextLost() {return contextLost;}
  };
}

module.exports = {createHybridOverlay, projectPresentation};
