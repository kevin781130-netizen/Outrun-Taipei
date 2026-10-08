'use strict';
const {createVehicle3D} = require('./Vehicle3D.cjs');
const {createVehiclePose, updateVehiclePose} = require('./VehiclePoseBridge.cjs');

// Full WebGL road/world renderer. This is intentionally NOT a Canvas overlay.
// World coordinates: +X right, +Y up, -Z forward. Camera is behind the car (+Z).
// The game supplies existing physics/route data; this module never changes them.
const COUNT=125, STEP=2.7, HALF_WIDTH=8, MAX_CARS=15;
const DEG=Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(n)=>{let x=(n|0)^0x6b7f4a21;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return ((x^(x>>>16))>>>0)/4294967296;};
function previewPoints(input) {
 const {curves=[],hills=[],laneOffsets=[],playerX=0,fraction=0}=input||{};
 // Start a little behind the chase camera so asphalt always extends under
 // the player's rear wheels; the road must not begin in front of the car.
 let x=-playerX*HALF_WIDTH, z=14+STEP*fraction, heading=0;
 const points=[];
 for(let i=0;i<=COUNT;i++){
   const curve=clamp(Number(curves[i])||0,-8,8);
   heading=clamp(heading+curve*.0058,-1.2,1.2);
   points.push({x,z,y:clamp((Number(hills[i])||0)/260,-5,5),heading});
   x+=Math.sin(heading)*STEP;
   z-=Math.cos(heading)*STEP;
 }
 return points;
}
function createFull3DScene(THREE,canvas) {
 if(!THREE?.WebGLRenderer || !canvas)throw new TypeError('WebGL canvas and Three.js required');
 const geometries=[],materials=[];
 let active=true, lost=false,ready=false;
 const geometry=g=>(geometries.push(g),g);
 const material=m=>(materials.push(m),m);
 const scene=new THREE.Scene();
 scene.background=new THREE.Color(0x10213b);
 scene.fog=new THREE.FogExp2(0x24364d,.0055);
 const camera=new THREE.PerspectiveCamera(66,16/9,.12,490);
 camera.position.set(0,3.6,10.4);
 camera.lookAt(0,1.0,-18);
 scene.add(new THREE.HemisphereLight(0xcce9ff,0x44516a,2.25));
 const sunlight=new THREE.DirectionalLight(0xffe6bf,2.35);
 sunlight.position.set(-36,80,-65);scene.add(sunlight);
 const renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(1);
 renderer.setClearColor(0x101b2e,1);
 renderer.outputEncoding=THREE.sRGBEncoding;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.35;
 let lastW=0,lastH=0,lastDpr=0;
 const roadMaterials=[
  material(new THREE.MeshStandardMaterial({color:0x303945,roughness:.94,side:THREE.DoubleSide})),
  material(new THREE.MeshStandardMaterial({color:0x59616b,roughness:1,side:THREE.DoubleSide})),
  material(new THREE.MeshBasicMaterial({color:0xecefe6,side:THREE.DoubleSide})),
  material(new THREE.MeshBasicMaterial({color:0x2ad9e7,side:THREE.DoubleSide}))
 ];
 const roads=[];
 const maxQuad=COUNT*2*5;
 function ribbon(mat){
  const g=geometry(new THREE.BufferGeometry());
  const arr=new Float32Array(maxQuad*18);
  const attr=new THREE.BufferAttribute(arr,3);
  attr.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('position',attr);
  g.setDrawRange(0,0);
  const m=new THREE.Mesh(g,mat);
  m.frustumCulled=false;
  scene.add(m);
  const r={mesh:m,positions:arr,used:0,attr};
  roads.push(r);return r;
 }
 roadMaterials.map(ribbon);
 const push=(r,a,b,c,d)=>{
  if(r.used+18>r.positions.length)return;
  const v=r.positions,i=r.used;
  v.set([a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z,a.x,a.y,a.z,c.x,c.y,c.z,d.x,d.y,d.z],i);
  r.used+=18;
 };
 const point=(center,lateral,height=0)=>{
  const s=Math.cos(center.heading),c=Math.sin(center.heading);
  return {x:center.x+lateral*s,y:center.y+height,z:center.z+lateral*c};
 };
 const boxG=geometry(new THREE.BoxGeometry(1,1,1));
 const coneG=geometry(new THREE.ConeGeometry(1,1,7));
 const buildingMat=material(new THREE.MeshStandardMaterial({color:0xffffff,roughness:.82,metalness:.12}));
 const glassMat=material(new THREE.MeshStandardMaterial({color:0x547a93,roughness:.28,metalness:.35,emissive:0x101e32,emissiveIntensity:.28}));
 const treesMat=material(new THREE.MeshStandardMaterial({color:0x305548,roughness:1}));
 const polesMat=material(new THREE.MeshStandardMaterial({color:0xc1c3bd,metalness:.4,roughness:.55}));
 const buildings=new THREE.InstancedMesh(boxG,buildingMat,120);
 const windows=new THREE.InstancedMesh(boxG,glassMat,120);
 const trees=new THREE.InstancedMesh(coneG,treesMat,120);
 const lights=new THREE.InstancedMesh(boxG,polesMat,50);
 for(const mesh of [buildings,windows,trees,lights]){
  mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
 }
 const dummy=new THREE.Object3D();
 const palette=[0xc5c0af,0x8aa0a6,0x747d8b,0xd6bda7,0x4c687d,0xa99f91,0x9fada1];
 const swatch=new THREE.Color();
 const sky=material(new THREE.MeshBasicMaterial({color:0xe5c2a2,fog:false}));
 const sun= new THREE.Mesh(geometry(new THREE.SphereGeometry(11,12,9)),sky);
 sun.position.set(-128,77,-275);scene.add(sun);
 const ground=new THREE.Mesh(geometry(new THREE.PlaneGeometry(6000,6000)),material(new THREE.MeshStandardMaterial({color:0x32484b,roughness:1})));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.22;scene.add(ground);
 let car=createVehicle3D(THREE,{color:0x1a2330});
 scene.add(car.root);
 const pose=createVehiclePose();
 let lastCarColor='';

 const tyreMat=material(new THREE.MeshStandardMaterial({color:0x10141a,roughness:.96}));
 const rearMat=material(new THREE.MeshBasicMaterial({color:0xff385d}));
 const trafficMeshes=[];
 for(let i=0;i<MAX_CARS;i++){
  const group=new THREE.Group();
  function part(g,m,s,p){
   const mesh=new THREE.Mesh(g,m);mesh.scale.set(...s);mesh.position.set(...p);group.add(mesh);return mesh;
  }
  const individualPaint=material(new THREE.MeshStandardMaterial({color:0xe4bc39,metalness:.38,roughness:.4}));
  const chassis=part(boxG,individualPaint,[1.7,.46,3.6],[0,.57,0]);
  const roof=part(boxG,glassMat,[1.29,.55,1.8],[0,1.0,-.12]);
  for(const side of [-1,1]){
   part(boxG,tyreMat,[.24,.64,.72],[side*.88,.36,-1.1]);
   part(boxG,tyreMat,[.24,.64,.72],[side*.88,.36,1.1]);
   part(boxG,rearMat,[.4,.12,.09],[side*.55,.65,1.82]);
  }
  group.visible=false;scene.add(group);trafficMeshes.push({group,chassis,roof,lastColor:null});
 }
 const lostHandler=e=>{e.preventDefault();lost=true;ready=false;canvas.style.visibility='hidden';};
 const restoredHandler=()=>{lost=false;ready=false;};
 canvas.addEventListener('webglcontextlost',lostHandler);
 canvas.addEventListener('webglcontextrestored',restoredHandler);

 function paintWorld(frame,pts){
  for(const r of roads)r.used=0;
  const corridors=frame.corridors||[];
  for(let i=0;i<COUNT;i++){
   const here=pts[i],there=pts[i+1];if(!there)break;
   const lanes=corridors[i]||[{center:0,half:1}];
   const next=corridors[i+1]||lanes;
   for(let k=0;k<Math.min(2,lanes.length);k++){
    const q=lanes[k],n=next[Math.min(k,next.length-1)];
    const left=q.center-q.half,right=q.center+q.half;
    const lf=n.center-n.half,rt=n.center+n.half;
    const w=HALF_WIDTH;
    push(roads[1],point(here,(left-.09)*w,.015),point(here,(right+.09)*w,.015),point(there,(rt+.09)*w,.015),point(there,(lf-.09)*w,.015));
    push(roads[0],point(here,left*w,.028),point(here,right*w,.028),point(there,rt*w,.028),point(there,lf*w,.028));
    // painted white outside borders and neon-reflective curb piping
    for(const side of [-1,1]){
     const a=(side<0?left:right)*w,b=(side<0?lf:rt)*w;
     push(roads[2],point(here,a-.06,.04),point(here,a+.06,.04),point(there,b+.06,.04),point(there,b-.06,.04));
     push(roads[3],point(here,a+side*.12,.045),point(here,a+side*.18,.045),point(there,b+side*.18,.045),point(there,b+side*.12,.045));
    }
    if(i%7<4 && q.half>.65){
      for(const ratio of [-1/3,1/3]){
       const a=(q.center+q.half*ratio)*w,b=(n.center+n.half*ratio)*w;
       push(roads[2],point(here,a-.04,.042),point(here,a+.04,.042),point(there,b+.04,.042),point(there,b-.04,.042));
      }
    }
   }
  }
  for(const r of roads){
   r.mesh.geometry.setDrawRange(0,r.used/3);
   if(r.used)r.attr.needsUpdate=true;
  }
  const urban=frame.archetype!=='mountain'&&frame.archetype!=='coastal';
  const routeSeed=frame.seed||1;
  let ib=0,iw=0,it=0,il=0;
  for(let i=5;i<COUNT;i+=3){
   const c=pts[i];
   const absolute=Math.floor(frame.segment||0)+i;
   for(const side of [-1,1]){
    const h=hash(absolute*37+side*99+routeSeed);
    const lateral=(1.75+h*2.3)*HALF_WIDTH*side;
    const anchor=point(c,lateral,-.15);
    if(urban){
      const height=7+h*23;const width=5+hash(absolute*11+side*33)*6;
      dummy.position.set(anchor.x,anchor.y+height/2,anchor.z);
      dummy.rotation.set(0,c.heading*.35,0);
      dummy.scale.set(width,height,width*.8);
      dummy.updateMatrix();if(ib<120){buildings.setMatrixAt(ib,dummy.matrix);
        swatch.setHex(palette[Math.floor(h*palette.length)]);buildings.setColorAt(ib,swatch);ib++;}
      dummy.scale.set(width*.91,Math.max(1,height*.47),width*.04);
      dummy.position.set(anchor.x,anchor.y+height*.63,anchor.z+width*.42);
      dummy.updateMatrix();if(iw<120){windows.setMatrixAt(iw++,dummy.matrix);}
    }else{
      const height=7+h*9;
      dummy.position.set(anchor.x,anchor.y+height/2,anchor.z);
      dummy.rotation.set(0,0,0);dummy.scale.set(2.7+h*2,height,2.7+h*2);
      dummy.updateMatrix();if(it<120)trees.setMatrixAt(it++,dummy.matrix);
    }
    if(i%12===5&&il<50){
      dummy.position.set(point(c,side*HALF_WIDTH*1.3).x,c.y+5.2,c.z);
      dummy.rotation.set(0,0,0);dummy.scale.set(.18,10,.18);
      dummy.updateMatrix();lights.setMatrixAt(il++,dummy.matrix);
    }
   }
  }
  const assignments=[[buildings,ib],[windows,iw],[trees,it],[lights,il]];
  for(const [m,count] of assignments){m.count=count;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
 }
 function updateTraffic(frame,pts){
  for(let i=0;i<trafficMeshes.length;i++){
   const mesh=trafficMeshes[i],item=frame.traffic?.[i];
   if(!item || !(item.distance>0&&item.distance<COUNT-2)){mesh.group.visible=false;continue;}
   const j=clamp(Math.floor(item.distance),0,COUNT-2);
   const frac=item.distance-j,a=pts[j],b=pts[j+1];
   mesh.group.visible=true;
   mesh.group.position.set(
    a.x+(b.x-a.x)*frac + (Number(item.x)||0)*HALF_WIDTH,
    a.y+(b.y-a.y)*frac+.05,
    a.z+(b.z-a.z)*frac
   );
   mesh.group.rotation.y=a.heading;
   const color=item.color||'#f3c21f';
   if(color!==mesh.lastColor){
    mesh.chassis.material.color.set(color);
    mesh.lastColor=color;
   }
  }
 }
 function render(frame,dt=0,width=960,height=540,quality='STANDARD'){
  if(!active||lost)return false;
  if(!frame?.curves?.length) return false;
  const points=previewPoints(frame);
  if(width!==lastW||height!==lastH){
   renderer.setSize(width,height,false);lastW=width;lastH=height;
   camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  const dpr=quality==='LOW'?.7:quality==='ULTRA'?1.15:1;
  if(lastDpr!==dpr){renderer.setPixelRatio(dpr);lastDpr=dpr;}
  paintWorld(frame,points);
  updateTraffic(frame,points);
  if(frame.carColor!==lastCarColor){
   const value=typeof frame.carColor==='string'?new THREE.Color(frame.carColor).getHex():0x202838;
   const previous=car;car=createVehicle3D(THREE,{color:value,quality});
   scene.add(car.root);previous.dispose();lastCarColor=frame.carColor;
  }
  updateVehiclePose(pose,{
   screenX:480,screenY:475,yawDeg:Number(frame.yawDeg)||0,
   rollDeg:Number(frame.rollDeg)||0,pitchDeg:Number(frame.pitchDeg)||0,
   steer:Number(frame.steer)||0,speedKmh:Math.max(0,Number(frame.speedKmh)||0),
   scaleX:1,direction:frame.direction===-1?-1:1,
   braking:!!frame.braking,boosting:!!frame.boosting
  },Math.max(0,dt));
  car.applyPose(pose);
  car.root.position.set(0,.02,3.15);
  car.root.scale.set(.92,.83,.92);
  // Camera sits behind +Z and looks down -Z: the rear (taillights +Z)
  // ALWAYS faces the camera. Do not rotate the car 180 degrees.
  camera.position.set(clamp(Number(frame.steer)||0,-1,1)*.12,3.55,10.35);
  camera.lookAt(clamp(Number(frame.steer)||0,-1,1)*.3,1.25,-19);
  scene.background.setHex(frame.night?0x10213b:0x6793ad);
  scene.fog.color.setHex(frame.night?0x233b58:0x809caa);
  renderer.render(scene,camera);
  canvas.style.visibility='visible';ready=true;return true;
 }
 function dispose(){
  if(!active)return;active=false;ready=false;
  canvas.removeEventListener('webglcontextlost',lostHandler);
  canvas.removeEventListener('webglcontextrestored',restoredHandler);
  car.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
  renderer.dispose();
 }
 return {render,dispose,get ready(){return ready&&!lost&&active},get contextLost(){return lost}};
}
module.exports={createFull3DScene,previewPoints};
