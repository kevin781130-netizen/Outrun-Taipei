'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHybridOverlay, projectPresentation} = require('../src/rendering/HybridOverlay.cjs');

const screenCenter = projectPresentation(480, 270);
assert.deepEqual(screenCenter,{x:480,y:270,scale:1});
const transformed = projectPresentation(480, 475,{crop:8,zoom:1.02,lean:0,lateralLook:4,verticalShift:0.5});
assert.equal(transformed.x,476);
assert.ok(transformed.y>475);
assert.ok(transformed.scale>1.02);

class Vec {
 constructor(x=0,y=0,z=0){this.set(x,y,z);}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
}
class Node {
 constructor(){Math.random();this.rotation=new Vec();this.position=new Vec();this.scale=new Vec(1,1,1);this.children=[];this.parent=null;this.visible=true;}
 add(node){node.parent=this;this.children.push(node);}
 remove(node){this.children.splice(this.children.indexOf(node),1);node.parent=null;}
 lookAt(){/* camera pose not relevant to structural test */}
}
class Group extends Node{}
class Geometry{dispose(){this.disposed=true;}}
class Material{constructor(opts){Object.assign(this,opts);}dispose(){this.disposed=true;}}
class Mesh extends Node{constructor(g,m){super();this.geometry=g;this.material=m;}}
class Renderer {
 constructor({canvas}){this.canvas=canvas;this.sizes=[];this.frames=0;this.disposed=false;this.lastAlpha=null;}
 setPixelRatio(r){this.pixelRatio=r;}
 setClearColor(color,alpha){this.lastAlpha=alpha;}
 setSize(w,h){this.sizes.push([w,h]);}
 render(){Math.random();this.frames++;}
 dispose(){this.disposed=true;}
}
const THREE={
 Scene:Group,Group,Mesh,WebGLRenderer:Renderer,OrthographicCamera:Group,
 HemisphereLight:Group,DirectionalLight:Group,BoxGeometry:Geometry,CylinderGeometry:Geometry,
 ConeGeometry:Geometry,PlaneGeometry:Geometry,MeshPhysicalMaterial:Material,
 MeshStandardMaterial:Material,MeshBasicMaterial:Material,DoubleSide:2,sRGBEncoding:3001
};
const listeners={};
const canvas={
 style:{},parentNode:{removeChild(node){assert.equal(node,canvas);this.wasRemoved=true;}},
 addEventListener(name,fn){listeners[name]=fn;},
 removeEventListener(name,fn){if(listeners[name]===fn)delete listeners[name];}
};
// Mock Three.js constructors and render consume random for UUID allocation.
const originalRandom=Math.random;
let gameRandomCalls=0;
Math.random=()=>{gameRandomCalls++;return 0.23;};
const overlay=createHybridOverlay(THREE,canvas);
assert.equal(gameRandomCalls,0,'scene/model UUIDs must not advance game RNG');
assert.equal(Math.random()===0.23,true);
gameRandomCalls=0;
assert.equal(overlay.ready,false,'do not suppress 2D player before a successful 3D frame');
assert.equal(canvas.style.visibility,'hidden');
const frame={
 screenX:480,screenY:475,yawDeg:30,rollDeg:2,pitchDeg:-1,
 steer:0.5,speedKmh:150,scaleX:1,direction:1,braking:false,boosting:true
};
assert.equal(overlay.render(frame,0.016,{},960,540,'STANDARD'),true);
assert.equal(overlay.ready,true);
assert.equal(gameRandomCalls,0,'first GPU render must not advance game RNG');
assert.equal(canvas.style.visibility,'visible');
overlay.hide();
assert.equal(overlay.ready,false,'radio and mode changes restore 2D car');
overlay.render(frame,0.016,{crop:3,zoom:1.01},720,405,'LOW');
assert.equal(overlay.ready,true);
const lost=listeners.webglcontextlost;
const restored=listeners.webglcontextrestored;
let prevented=false;
lost({preventDefault(){prevented=true;}});
assert.equal(prevented,true);
assert.equal(overlay.ready,false);
assert.equal(overlay.contextLost,true);
assert.equal(overlay.render(frame,0.016,{},720,405,'LOW'),false);
restored();
assert.equal(overlay.contextLost,false);
assert.equal(overlay.render(frame,0,{},1200,675,'HIGH'),true);
assert.equal(overlay.ready,true);
overlay.dispose();
assert.equal(gameRandomCalls,0,'3D lifetime did not advance game RNG');
Math.random=originalRandom;
assert.equal(overlay.ready,false);
assert.equal(overlay.disposed,true);
assert.equal(canvas.parentNode.wasRemoved,true);
assert.equal(Object.keys(listeners).length,0);
assert.equal(overlay.render(frame,0,{},1200,675,'HIGH'),false);
assert.throws(()=>createHybridOverlay(null,canvas),TypeError);

// Bundle and HTML must remain in sync. Legacy mode does not load extra scripts.
const bundle=fs.readFileSync(path.join(__dirname,'../assets/hybrid-renderer.js'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const shipped={window:{}};
require('node:vm').runInNewContext(bundle,shipped);
for(const api of ['createHybridOverlay','createFull3DScene'])assert.equal(typeof shipped.window.TaipeiHybrid[api],'function',api+' exported by shipping bundle');
assert(source.includes('v56Load3DScene();'));
assert(source.includes('window.TaipeiHybrid.createFull3DScene'));
assert(source.includes('if(v56Full3D)'));
assert(source.includes('webglcontextlost') === false, 'context handling lives exclusively in hybrid module');
console.log('V55 hybrid overlay: projection, opt-in, fallback, context recovery and cleanup passed');
