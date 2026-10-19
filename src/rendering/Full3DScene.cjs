'use strict';
const {createVehicle3D} = require('./Vehicle3D.cjs');
const {createVehiclePose, updateVehiclePose} = require('./VehiclePoseBridge.cjs');
const {createDrivingVisualSnapshot,updateDrivingVisualSnapshot} = require('./DrivingVisualSnapshot.cjs');
const {createDriftVisualRig,updateDriftVisualRig} = require('./DriftVisualRig.cjs');
const {createDrivingEffects}=require('./DrivingEffects.cjs');
const {createTaipeiLandmarks}=require('./TaipeiLandmarks.cjs');
const {createRaceEnvironment}=require('./RaceEnvironment.cjs');
const {createRaceWayfinding}=require('./RaceWayfinding.cjs');
const {inLandmarkVista}=require('./ScenicVisibility.cjs');
const {createRoadSurfaceTextures}=require('./RoadSurface.cjs');
const {createEnvironmentLighting}=require('./EnvironmentLighting.cjs');
const {createStreetFacadeTextures}=require('./StreetFacade.cjs');
const {createStreetDetailsTextures}=require('./StreetDetails.cjs');
const {districtAt,presentationFrame}=require('./DistrictGeography.cjs');

// Full WebGL road/world renderer. This is intentionally NOT a Canvas overlay.
// World coordinates: +X right, +Y up, -Z forward. Camera is behind the car (+Z).
// The game supplies existing physics/route data; this module never changes them.
const COUNT=125, STEP=2.7, HALF_WIDTH=8, MAX_CARS=15;
const DEG=Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(n)=>{let x=(n|0)^0x6b7f4a21;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return ((x^(x>>>16))>>>0)/4294967296;};
// Attachment-style tangent/normal coordinates, driven by the original route.
const PLAYER_Z=3.15;
function sampleRoadPoint(points,index,lateral=0){
 const j=clamp(Math.floor(index),0,points.length-2),t=index-j;
 const a=points[j],b=points[j+1];
 const heading=a.heading+(b.heading-a.heading)*t;
 return {x:a.x+(b.x-a.x)*t+Math.cos(heading)*lateral,
  y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t+Math.sin(heading)*lateral,heading};
}
function previewPoints(input) {
 const {curves=[],hills=[],playerX=0,fraction=0}=input||{};
 let x=0,z=0,heading=0;
 const points=[];
 for(let i=0;i<=COUNT;i++){
   points.push({x,z,y:(Number(hills[i])||0)/260,heading});
   heading=clamp(heading+clamp(Number(curves[i])||0,-8,8)*.0058,-1.2,1.2);
   x+=Math.sin(heading)*STEP;
   z-=Math.cos(heading)*STEP;
 }
 // Anchor the actual collision position, including its subsegment fraction.
 const origin=sampleRoadPoint(points,clamp(fraction,0,1),playerX*HALF_WIDTH);
 for(const p of points){p.x-=origin.x;p.y-=origin.y;p.z+=PLAYER_Z-origin.z;}
 return points;
}
function roadVehiclePose(points,frame){
 const f=clamp(Number(frame.fraction)||0,0,1),lateral=(Number(frame.playerX)||0)*HALF_WIDTH;
 const at=sampleRoadPoint(points,f,lateral);
 const front=sampleRoadPoint(points,f+.4,lateral),rear=sampleRoadPoint(points,f-.4,lateral);
 return {yaw:-at.heading||0,pitch:Math.atan2(front.y-rear.y,Math.hypot(front.x-rear.x,front.z-rear.z))};
}
function createChaseRig(){return {initialized:false,x:0,y:3.55,z:10.35,lookX:0,lookY:1.25,lookZ:-19,fov:66};}
function updateChaseRig(rig,points,frame,sway,dt){
 if(!Number.isFinite(dt)||dt<0)throw new TypeError('nonnegative camera dt required');
 const f=clamp(Number(frame.fraction)||0,0,1);
 const lateral=(Number(frame.playerX)||0)*HALF_WIDTH;
 const ahead=sampleRoadPoint(points,f+8,lateral),behind=sampleRoadPoint(points,f-2,lateral);
 const steer=clamp(Number(frame.steer)||0,-1,1),speed=clamp((Number(frame.speedKmh)||0)/325,0,1);
 const target={x:sway+steer*.08,y:3.55+clamp(behind.y,-1.1,1.1),z:10.35,
  lookX:clamp(ahead.x*.48,-3.2,3.2)+sway*.4,
  lookY:1.25+clamp(ahead.y*.65,-2,3),lookZ:-19,
  fov:66+speed*1.2+(frame.boosting?1.8:0)};
 // Exponential damping gives the same response at 30/60/120 FPS. Pause freezes it.
 const alpha=rig.initialized?1-Math.exp(-Math.min(dt,.1)*5):1;
 for(const key of Object.keys(target))rig[key]+=(target[key]-rig[key])*alpha;
 rig.initialized=true;return rig;
}
const TAIPEI_SIGNS=['老街牛肉麵','台北茶行','萬華當舖','光華電器','豆花冰品','機車修理'];
const SIGN_COLORS=[0xaf2839,0x175b59,0x4d285c,0x225b89,0xcf852d,0x243747];
function streetOffset(corridors,side,width,margin=2){
 const lanes=corridors?.length?corridors:[{center:0,half:1}];
 const edge=Math.max(...lanes.map(q=>side*q.center+q.half));
 return side*(edge*HALF_WIDTH+width/2+margin);
}
function createFacadeTexture(THREE){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const mortar=y%8===0||(x+(Math.floor(y/8)%2)*8)%16===0;
  const value=mortar?155:235;
  const k=(y*size+x)*4;data[k]=data[k+1]=data[k+2]=value;data[k+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.encoding=THREE.sRGBEncoding;texture.needsUpdate=true;return texture;
}
function createSignTexture(THREE,text,color,doc){
 if(!doc?.createElement)return null;
 const c=doc.createElement('canvas');c.width=128;c.height=512;
 const g=c.getContext('2d');if(!g)return null;
 g.fillStyle='#'+color.toString(16).padStart(6,'0');g.fillRect(0,0,128,512);
 g.strokeStyle='#ffd17a';g.lineWidth=6;g.strokeRect(5,5,118,502);
 g.fillStyle='#fff6d7';g.textAlign='center';g.textBaseline='middle';
 g.font='bold 76px "Microsoft JhengHei", "PingFang TC", sans-serif';
 const chars=Array.from(text),step=440/chars.length;
 chars.forEach((ch,i)=>g.fillText(ch,64,36+step*(i+.5),104));
 const texture=new THREE.CanvasTexture(c);texture.encoding=THREE.sRGBEncoding;return texture;
}
function createFull3DScene(THREE,canvas) {
 if(!THREE?.WebGLRenderer || !canvas)throw new TypeError('WebGL canvas and Three.js required');
 const geometries=[],materials=[],textures=[];
 let active=true, lost=false,ready=false;
 const geometry=g=>(geometries.push(g),g);
 const material=m=>(materials.push(m),m);
 const scene=new THREE.Scene();
 scene.background=new THREE.Color(0x10213b);
 scene.fog=new THREE.FogExp2(0x24364d,.0055);
 const camera=new THREE.PerspectiveCamera(66,16/9,.12,490);
 camera.position.set(0,3.6,10.4);
 camera.lookAt(0,1.0,-18);
 const hemisphere=new THREE.HemisphereLight(0xcce9ff,0x44516a,.9);
 hemisphere.name='V85_SkyFill';scene.add(hemisphere);
 const lighting=createEnvironmentLighting(THREE);
 const sunlight=new THREE.DirectionalLight(0xffe6bf,1.25);sunlight.name='V85_KeyLight';
 sunlight.position.set(-36,80,-65);scene.add(sunlight);
 const renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(1);
 renderer.setClearColor(0x101b2e,1);
 renderer.outputEncoding=THREE.sRGBEncoding;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.0;
 let lastW=0,lastH=0,lastDpr=0;
 const surfaces=createRoadSurfaceTextures(THREE);textures.push(...Object.values(surfaces));
 const roadMaterials=[
  material(new THREE.MeshStandardMaterial({color:0xffffff,map:surfaces.asphalt_color,roughnessMap:surfaces.asphalt_rough,normalMap:surfaces.asphalt_normal,normalScale:new THREE.Vector2(.19,.19),roughness:1,metalness:0,side:THREE.DoubleSide})),
  material(new THREE.MeshStandardMaterial({color:0xffffff,map:surfaces.pavement_color,roughnessMap:surfaces.pavement_rough,normalMap:surfaces.pavement_normal,normalScale:new THREE.Vector2(.14,.14),roughness:1,metalness:0,side:THREE.DoubleSide})),
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
  const uvAttr=new THREE.BufferAttribute(new Float32Array(maxQuad*12),2);uvAttr.setUsage(THREE.DynamicDrawUsage);g.setAttribute('uv',uvAttr);
  const normals=new Float32Array(arr.length);for(let i=1;i<normals.length;i+=3)normals[i]=1;
  g.setAttribute('normal',new THREE.BufferAttribute(normals,3));
  g.setDrawRange(0,0);
  const m=new THREE.Mesh(g,mat);
  m.frustumCulled=false;
  scene.add(m);
  const r={mesh:m,positions:arr,used:0,attr,uvAttr};
  roads.push(r);return r;
 }
 roadMaterials.map(ribbon);roads[0].mesh.name='V58_Asphalt';roads[1].mesh.name='V80_Pavement';
 const push=(r,a,b,c,d)=>{
  if(r.used+18>r.positions.length)return;
  const v=r.positions,i=r.used;
  v.set([a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z,a.x,a.y,a.z,c.x,c.y,c.z,d.x,d.y,d.z],i);
  r.uvAttr.array.set([a.u||0,a.v||0,b.u||0,b.v||0,c.u||0,c.v||0,a.u||0,a.v||0,c.u||0,c.v||0,d.u||0,d.v||0],i/3*2);
  r.used+=18;
 };
 const point=(center,lateral,height=0,segment=0)=>{
  const s=Math.cos(center.heading),c=Math.sin(center.heading);
  return {x:center.x+lateral*s,y:center.y+height,z:center.z+lateral*c,u:lateral/8,v:segment*STEP/8};
 };
 const boxG=geometry(new THREE.BoxGeometry(1,1,1));
 const streetAlphas=new THREE.InstancedBufferAttribute(new Float32Array(120),1);
 streetAlphas.setUsage(THREE.DynamicDrawUsage);boxG.setAttribute('v93StreetAlpha',streetAlphas);
 const coneG=geometry(new THREE.ConeGeometry(1,1,7));
 const facadeTexture=createFacadeTexture(THREE);textures.push(facadeTexture);
 const buildingMat=material(new THREE.MeshStandardMaterial({color:0xffffff,map:facadeTexture,roughness:.92,metalness:.04}));
 const glassMat=material(new THREE.MeshStandardMaterial({color:0x547a93,roughness:.28,metalness:.35,emissive:0x101e32,emissiveIntensity:.28}));
 const treesMat=material(new THREE.MeshStandardMaterial({color:0x305548,roughness:1}));
 const polesMat=material(new THREE.MeshStandardMaterial({color:0xc1c3bd,metalness:.4,roughness:.55}));
 // V93: spatial fade at the existing scenery boundaries, without camera shake or denser buildings.
 function streetFade(mat){
  mat.transparent=true;mat.depthWrite=true;
  mat.onBeforeCompile=shader=>{
   shader.vertexShader='attribute float v93StreetAlpha; varying float v93StreetFade;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',
    '#include <project_vertex>\nv93StreetFade=v93StreetAlpha;');
   shader.fragmentShader='varying float v93StreetFade;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
    '#include <color_fragment>\ndiffuseColor.a *= v93StreetFade; if(diffuseColor.a<0.001) discard;');
  };
  mat.customProgramCacheKey=()=> 'v93-street-fade';
 }
 streetFade(buildingMat);
 const buildings=new THREE.InstancedMesh(boxG,buildingMat,120);
 const facadeMaps=createStreetFacadeTextures(THREE);textures.push(...Object.values(facadeMaps));
 const facadeMat=material(new THREE.MeshStandardMaterial({color:0xffffff,map:facadeMaps.color,
  emissive:0xffd39b,emissiveMap:facadeMaps.emission,emissiveIntensity:.06,roughness:.52,metalness:.12}));
 const roofMat=material(new THREE.MeshStandardMaterial({color:0xa2aaa2,roughness:.92}));
 const corniceMat=material(new THREE.MeshStandardMaterial({color:0xc6c3b4,roughness:.9}));
 const windows=new THREE.InstancedMesh(boxG,facadeMat,120);
 const rooftops=new THREE.InstancedMesh(boxG,roofMat,120);
 const cornices=new THREE.InstancedMesh(boxG,corniceMat,120);
 for(const mat of [facadeMat,roofMat,corniceMat])streetFade(mat);
 buildings.name='V89_BuildingShells';windows.name='V89_StreetWindows';
 rooftops.name='V89_RoofSetbacks';cornices.name='V89_Cornices';
 const details=createStreetDetailsTextures(THREE);textures.push(...Object.values(details));
 const shopMat=material(new THREE.MeshStandardMaterial({map:details.shopColor,emissiveMap:details.shopEmission,emissive:0xffddb1,emissiveIntensity:.16,roughness:.52,metalness:.12}));
 const awningMat=material(new THREE.MeshStandardMaterial({color:0x526a60,roughness:.86}));
 for(const mat of [shopMat,awningMat])streetFade(mat);
 const shops=new THREE.InstancedMesh(boxG,shopMat,120),awnings=new THREE.InstancedMesh(boxG,awningMat,120);
 shops.name='V94_Storefronts';awnings.name='V94_ShopAwnings';
 for(const mesh of [shops,awnings]){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);}
 const trees=new THREE.InstancedMesh(coneG,treesMat,120);
 const lights=new THREE.InstancedMesh(boxG,polesMat,50);
 for(const mesh of [buildings,windows,rooftops,cornices,trees,lights]){
  mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
 }
 const dummy=new THREE.Object3D();
 const palette=[0xaf6250,0xcead86,0x9daeb2,0xbd8772,0x83999d,0xd4c1a1,0xa6b6a5];
 const swatch=new THREE.Color();
 const skyMaterial=material(new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:new THREE.Color(0x53416f)},horizon:{value:new THREE.Color(0xf4ae78)}},
  vertexShader:'varying vec3 vSky; void main(){vSky=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform vec3 top; uniform vec3 horizon; varying vec3 vSky; void main(){float h=normalize(vSky).y; gl_FragColor=vec4(mix(horizon,top,smoothstep(-0.06,0.65,h)),1.0);}'
 }));
 const skyDome=new THREE.Mesh(geometry(new THREE.SphereGeometry(450,24,16)),skyMaterial);skyDome.renderOrder=-10;scene.add(skyDome);
 const sunMaterial=material(new THREE.MeshBasicMaterial({color:0xffd17c,fog:false,toneMapped:false}));
 const sun=new THREE.Mesh(geometry(new THREE.SphereGeometry(18,16,12)),sunMaterial);sun.name='V57_SunsetSun';scene.add(sun);
 const doc=canvas.ownerDocument||(typeof document!=='undefined'?document:null);
 const wayfinding=createRaceWayfinding(THREE,scene,sampleRoadPoint,streetOffset,doc);
 const landmarks=createTaipeiLandmarks(THREE,scene,sampleRoadPoint,streetOffset);
 const environment=createRaceEnvironment(THREE,scene,sampleRoadPoint,streetOffset,doc);
 const signs=TAIPEI_SIGNS.map((text,i)=>{
  const texture=createSignTexture(THREE,text,SIGN_COLORS[i],doc);if(texture)textures.push(texture);
  const mat=material(new THREE.MeshBasicMaterial({map:texture,color:texture?0xffffff:SIGN_COLORS[i],side:THREE.DoubleSide,toneMapped:false}));
  streetFade(mat);
  const mesh=new THREE.InstancedMesh(geometry(new THREE.PlaneGeometry(1,1)),mat,40);
  const alpha=new THREE.InstancedBufferAttribute(new Float32Array(40),1);alpha.setUsage(THREE.DynamicDrawUsage);mesh.geometry.setAttribute('v93StreetAlpha',alpha);
  mesh.name='V57_StreetSign_'+i;mesh.userData.text=text;mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);return mesh;
 });
 const ground=new THREE.Mesh(geometry(new THREE.PlaneGeometry(6000,6000)),material(new THREE.MeshStandardMaterial({color:0x32484b,roughness:1})));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.22;scene.add(ground);
 let car=createVehicle3D(THREE,{color:0x1a2330});
 scene.add(car.root);
 const pose=createVehiclePose();
 const driving=createDrivingVisualSnapshot();
 const driftRig=createDriftVisualRig();
 const chaseRig=createChaseRig();
 const effects=createDrivingEffects(THREE);scene.add(camera);
 const contactShadow=new THREE.Mesh(geometry(new THREE.CircleGeometry(1,24)),material(new THREE.MeshBasicMaterial({color:0xffffff,map:details.contact,transparent:true,opacity:.48,depthWrite:false})));
 contactShadow.name='V58_ContactShadow';contactShadow.rotation.x=-Math.PI/2;contactShadow.scale.set(1.12*.97,1.95*.97,1);scene.add(contactShadow);
 const tyreContacts=new THREE.InstancedMesh(contactShadow.geometry,contactShadow.material,4);
 tyreContacts.name='V94_TyreContacts';tyreContacts.frustumCulled=false;tyreContacts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(tyreContacts);
 const wheelPosition=new THREE.Vector3();
 const gripFrame=createDrivingVisualSnapshot();
 let lastCarColor='',renderRandomSeed=0x6f34ac19;
 function with3DOnlyRandom(callback){
  const original=Math.random;
  Math.random=()=>{
   renderRandomSeed^=renderRandomSeed<<13;
   renderRandomSeed^=renderRandomSeed>>>17;
   renderRandomSeed^=renderRandomSeed<<5;
   return (renderRandomSeed>>>0)/4294967296;
  };
  try{return callback();}finally{Math.random=original;}
 }

 const tyreMat=material(new THREE.MeshStandardMaterial({color:0x10141a,roughness:.96}));
 const rearMat=material(new THREE.MeshBasicMaterial({color:0xff385d}));
 // Shared original low-poly coachwork, contained within the old traffic envelope.
 function trafficLoft(sections){
  const vertices=[],indices=[];
  for(const [z,w,topWidth,bottom,top] of sections){
   vertices.push(-w,bottom,z,w,bottom,z,topWidth,top,z,-topWidth,top,z);
  }
  // Outward winding; the end caps keep the silhouette closed.
  indices.push(0,1,2,0,2,3);
  for(let j=0;j<sections.length-1;j++)for(let i=0;i<4;i++){
   const a=j*4+i,b=j*4+(i+1)%4,c=b+4,d=a+4;indices.push(a,d,c,a,c,b);
  }
  const n=(sections.length-1)*4;indices.push(n,n+2,n+1,n,n+3,n+2);
  for(let i=0;i<indices.length;i+=3){const b=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=b;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return geometry(g);
 }
 const trafficBody=trafficLoft([[-1.8,.70,.65,.39,.64],[-1.35,.85,.80,.34,.80],[1.35,.85,.80,.34,.80],[1.8,.76,.71,.39,.75]]);
 const trafficCabin=trafficLoft([[-1.02,.645,.59,.725,.80],[-.58,.645,.47,.725,1.275],[.40,.645,.47,.725,1.275],[.78,.645,.59,.725,.82]]);
 const trafficTyre=geometry(new THREE.CylinderGeometry(.32,.32,.24,12));
 const trafficTrim=material(new THREE.MeshStandardMaterial({color:0x18212b,roughness:.68}));
 const plateMat=material(new THREE.MeshStandardMaterial({color:0xd9e0df,roughness:.8}));
 const trafficMeshes=[];
 for(let i=0;i<MAX_CARS;i++){
  const group=new THREE.Group();group.name=`V88_Traffic_${i}`;
  function part(g,m,s,p){
   const mesh=new THREE.Mesh(g,m);mesh.scale.set(...s);mesh.position.set(...p);group.add(mesh);return mesh;
  }
  const individualPaint=material(new THREE.MeshStandardMaterial({color:0xe4bc39,metalness:.38,roughness:.4}));
  const chassis=part(trafficBody,individualPaint,[1,1,1],[0,0,0]);chassis.name='traffic-body';
  const roof=part(trafficCabin,glassMat,[1,1,1],[0,0,0]);roof.name='traffic-glass';
  part(boxG,individualPaint,[.94,.035,.98],[0,1.2575,-.09]).name='traffic-roof-cap';
  part(boxG,trafficTrim,[1.48,.23,.04],[0,.64,1.805]).name='traffic-rear-trim';
  part(boxG,plateMat,[.28,.10,.015],[0,.59,1.84]).name='traffic-plate';
  for(const side of [-1,1]){
   for(const z of [-1.1,1.1]){const wheel=part(trafficTyre,tyreMat,[1,1,1],[side*.88,.36,z]);wheel.rotation.z=Math.PI/2;wheel.name='traffic-wheel';}
   part(boxG,rearMat,[.4,.12,.09],[side*.55,.65,1.82]);
  }
  group.visible=false;scene.add(group);trafficMeshes.push({group,chassis,roof,lastColor:null});
 }
 const lostHandler=e=>{e.preventDefault();lost=true;ready=false;canvas.style.visibility='hidden';};
 const restoredHandler=()=>{lost=false;ready=false;};
 canvas.addEventListener('webglcontextlost',lostHandler);
 canvas.addEventListener('webglcontextrestored',restoredHandler);

 function paintWorld(frame,pts,quality){
  for(const r of roads)r.used=0;
  const corridors=frame.corridors||[];
  for(let i=-5;i<COUNT;i++){
   // Extend asphalt behind the player without shifting traffic/collision data.
   const here=i<0?sampleRoadPoint(pts,i):pts[i];
   const there=i<0?sampleRoadPoint(pts,i+1):pts[i+1];if(!there)break;
   const lanes=corridors[Math.max(0,i)]||[{center:0,half:1}];
   const next=corridors[i+1]||lanes;
   for(let k=0;k<Math.min(2,lanes.length);k++){
    const q=lanes[k],n=next[Math.min(k,next.length-1)];
    const left=q.center-q.half,right=q.center+q.half;
    const lf=n.center-n.half,rt=n.center+n.half;
    const w=HALF_WIDTH;
    const absolute=(Math.floor(frame.segment)||0)+i;
    push(roads[1],point(here,(left-.09)*w,.015,absolute),point(here,(right+.09)*w,.015,absolute),point(there,(rt+.09)*w,.015,absolute+1),point(there,(lf-.09)*w,.015,absolute+1));
    push(roads[0],point(here,left*w,.028,absolute),point(here,right*w,.028,absolute),point(there,rt*w,.028,absolute+1),point(there,lf*w,.028,absolute+1));
    // painted white outside borders and neon-reflective curb piping
    for(const side of [-1,1]){
     const a=(side<0?left:right)*w,b=(side<0?lf:rt)*w;
     // Grounded urban paving only. Never bridge a fork, water or elevated deck.
     if(frame.archetype==='urban'&&lanes.length===1&&next.length===1){
      push(roads[1],point(here,a+side*.24,.06,absolute),point(here,a+side*2.0,.06,absolute),point(there,b+side*2.0,.06,absolute+1),point(there,b+side*.24,.06,absolute+1));
     }
     push(roads[2],point(here,a-.06,.04),point(here,a+.06,.04),point(there,b+.06,.04),point(there,b-.06,.04));
     push(roads[3],point(here,a+side*.12,.045),point(here,a+side*.18,.045),point(there,b+side*.18,.045),point(there,b+side*.12,.045));
    }
    if(((Math.floor(frame.segment||0)+i)%7+7)%7<4 && q.half>.65){
      for(const ratio of [-1/3,1/3]){
       const a=(q.center+q.half*ratio)*w,b=(n.center+n.half*ratio)*w;
       push(roads[2],point(here,a-.04,.042),point(here,a+.04,.042),point(there,b+.04,.042),point(there,b-.04,.042));
      }
    }
   }
  }
  for(const r of roads){
   r.mesh.geometry.setDrawRange(0,r.used/3);
   if(r.used){r.attr.needsUpdate=true;r.uvAttr.needsUpdate=true;}
  }
  const geography=districtAt(frame);
  const urban=frame.archetype!=='mountain'&&frame.archetype!=='coastal';
  const routeSeed=frame.seed||1;
  let ib=0,iw=0,ir=0,ic=0,it=0,il=0,is=0,ia=0;
  const signCounts=Array(signs.length).fill(0);
  for(let i=5;i<COUNT;i++){
   const c=pts[i];
   const distance=i-clamp(Number(frame.fraction)||0,0,1);
   const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a),0,1);return u*u*(3-2*u);};
   const fade=smooth(5,18,distance)*(1-smooth(COUNT-25,COUNT-1,distance));
   const absolute=Math.floor(frame.segment||0)+i;
   if(absolute%3!==0)continue;
   for(const side of [-1,1]){
    const h=hash(absolute*37+side*99+routeSeed);
    const width=5+hash(absolute*11+side*33)*6;
    // Scan the building footprint so widened forks keep their clear shoulder.
    const neighborhood=corridors.slice(Math.max(0,i-3),i+4).flat();
    const lateral=streetOffset(neighborhood,side,width,2+h*7);
    const landmarkZone=inLandmarkVista(frame.landmarks,absolute,side);
    if(landmarkZone)continue;
    const anchor=point(c,lateral,-.15);
    const district=districtAt(frame,absolute);
    if((district.authored?district.buildings:urban&&frame.archetype!=='expressway')&&!(district.waterSide===side&&district.waterWidth>1)){
      const height=7+h*23;
      const streetDrop=district.deck?-(frame.deckHeights?.[i]||0)/260:0;
      anchor.y+=streetDrop;
      dummy.position.set(anchor.x,anchor.y+height/2,anchor.z);
      dummy.rotation.set(0,-c.heading,0);
      dummy.scale.set(width,height,width*.8);
      dummy.updateMatrix();if(ib<120){buildings.setMatrixAt(ib,dummy.matrix);streetAlphas.setX(ib,fade);
        swatch.setHex(palette[Math.floor(h*palette.length)]);buildings.setColorAt(ib,swatch);ib++;}
      // Face the street normal, not the direction of travel. The panel sits
      // inside the existing shoulder margin and spans the shell's street wall.
      const facade=point(c,lateral-side*(width/2+.025),height*.53-.15+streetDrop);
      dummy.position.set(facade.x,facade.y,facade.z);
      dummy.scale.set(.04,height*.76,width*.68);
      dummy.updateMatrix();if(iw<120)windows.setMatrixAt(iw++,dummy.matrix);
      if(quality!=='LOW'){
       // Street-facing shop base and awning remain outside the existing shoulder.
       const shop=point(c,lateral-side*(width/2+.035),1.3+streetDrop);
       dummy.position.set(shop.x,shop.y,shop.z);dummy.scale.set(.05,2.6,width*.74);
       dummy.updateMatrix();if(is<120)shops.setMatrixAt(is++,dummy.matrix);
       const awning=point(c,lateral-side*(width/2+.25),2.72+streetDrop);
       dummy.position.set(awning.x,awning.y,awning.z);dummy.scale.set(.70,.16,width*.76);
       dummy.updateMatrix();if(ia<120)awnings.setMatrixAt(ia++,dummy.matrix);
       const roofHeight=.7+h*.8,roof=point(c,lateral,height+roofHeight/2-.15+streetDrop);
       dummy.position.set(roof.x,roof.y,roof.z);dummy.scale.set(width*.62,roofHeight,width*.46);
       dummy.updateMatrix();if(ir<120)rooftops.setMatrixAt(ir++,dummy.matrix);
       const cornice=point(c,lateral,height-.15+streetDrop);
       dummy.position.set(cornice.x,cornice.y,cornice.z);dummy.scale.set(width*.98,.22,width*.78);
       dummy.updateMatrix();if(ic<120)cornices.setMatrixAt(ic++,dummy.matrix);
      }
      if(quality!=='LOW'&&absolute%6===0){
       const signIndex=Math.floor(hash(absolute*13+side*41+routeSeed)*signs.length),n=signCounts[signIndex];
       if(n<40){
        const sign=point(c,lateral-side*(width/2+.15),6.5+streetDrop);
        dummy.position.set(sign.x,sign.y,sign.z);
        dummy.rotation.set(0,side>0?-Math.PI/2-c.heading:Math.PI/2-c.heading,0);
        dummy.scale.set(1.3,5.2,1);dummy.updateMatrix();signs[signIndex].setMatrixAt(n,dummy.matrix);signs[signIndex].geometry.attributes.v93StreetAlpha.setX(n,fade);signCounts[signIndex]++;
       }
      }
    }else if(!district.deck && !(district.waterSide===side&&district.waterWidth>1)){
      const height=7+h*9;
      dummy.position.set(anchor.x,anchor.y+height/2,anchor.z);
      dummy.rotation.set(0,0,0);dummy.scale.set(2.7+h*2,height,2.7+h*2);
      dummy.updateMatrix();if(it<120)trees.setMatrixAt(it++,dummy.matrix);
    }
    if(absolute%12===0&&il<50){
      const lamp=point(c,streetOffset(neighborhood,side,.18,.7),5.2);
      dummy.position.set(lamp.x,lamp.y,lamp.z);
      dummy.rotation.set(0,0,0);dummy.scale.set(.18,10,.18);
      dummy.updateMatrix();lights.setMatrixAt(il++,dummy.matrix);
    }
   }
  }
  const assignments=[[shops,is],[awnings,ia],[buildings,ib],[windows,iw],[rooftops,ir],[cornices,ic],[trees,it],[lights,il],...signs.map((m,i)=>[m,signCounts[i]])];
  for(const [m,count] of assignments){m.count=count;m.instanceMatrix.needsUpdate=true;if(m.geometry.attributes.v93StreetAlpha)m.geometry.attributes.v93StreetAlpha.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
 }
 function updateTraffic(frame,pts){
  for(let i=0;i<trafficMeshes.length;i++){
   const mesh=trafficMeshes[i],item=frame.traffic?.[i];
   if(!item || item.eligible===false || !(item.distance>-2&&item.distance<COUNT-2)){mesh.group.visible=false;continue;}
   const road=sampleRoadPoint(pts,item.distance+(Number(frame.fraction)||0),(Number(item.x)||0)*HALF_WIDTH);
   mesh.group.visible=true;
   mesh.group.position.set(road.x,road.y+.05,road.z);
   mesh.group.rotation.y=-road.heading;
   mesh.group.scale.x=Number.isFinite(item.halfWidth)?Math.max(.1,item.halfWidth*16/1.7):1;
   const color=item.color||'#f3c21f';
   if(color!==mesh.lastColor){
    mesh.chassis.material.color.set(color);
    mesh.lastColor=color;
   }
  }
 }
 const trafficBounds=new THREE.Box3(),corner=new THREE.Vector3();
 function trafficVisibility(frame,pts,width,height){
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const boxes=[];
  for(let i=0;i<trafficMeshes.length;i++){
   const mesh=trafficMeshes[i].group,item=frame.traffic?.[i];if(!mesh.visible||!item)continue;
   trafficBounds.setFromObject(mesh);
   // Hills can hide the entire vehicle; test the sightline to its highest point.
   const top=trafficBounds.max.y,tx=mesh.position.x,tz=mesh.position.z;
   const blocked=pts.some((p,j)=>{
    const t=(p.z-camera.position.z)/(tz-camera.position.z);
    if(!(t>0&&t<1))return false;
    const x=camera.position.x+(tx-camera.position.x)*t;
    const y=camera.position.y+(top-camera.position.y)*t;
    if(p.y+.028<=y)return false;
    const lateral=(x-p.x)*Math.cos(p.heading)/HALF_WIDTH;
    return (frame.corridors?.[j]||[{center:0,half:1}]).some(q=>Math.abs(lateral-q.center)<=q.half);
   });
   if(blocked){mesh.visible=false;continue;}
   let l=Infinity,r=-Infinity,t=Infinity,b=-Infinity,front=false;
   for(const x of [trafficBounds.min.x,trafficBounds.max.x])for(const y of [trafficBounds.min.y,trafficBounds.max.y])for(const z of [trafficBounds.min.z,trafficBounds.max.z]){
    corner.set(x,y,z).applyMatrix4(camera.matrixWorldInverse);
    if(corner.z>=-camera.near)continue;
    front=true;corner.applyMatrix4(camera.projectionMatrix);
    const sx=(corner.x+1)*width/2,sy=(1-corner.y)*height/2;
    l=Math.min(l,sx);r=Math.max(r,sx);t=Math.min(t,sy);b=Math.max(b,sy);
   }
   if(!front||r<=0||l>=width||b<=0||t>=height){mesh.visible=false;continue;}
   l=clamp(l,0,width);r=clamp(r,0,width);t=clamp(t,0,height);b=clamp(b,0,height);
   if(r>l&&b>t)boxes.push({sourceIndex:item.sourceIndex??i,l,r,t,b,cx:(l+r)/2,cy:(t+b)/2});
  }
  return boxes;
 }
 function prepareTrafficVisibility(frame,width=960,height=540){
  if(!active||lost||!ready)return [];
  frame=presentationFrame(frame);
  const points=previewPoints(frame);updateTraffic(frame,points);
  return trafficVisibility(frame,points,width,height);
 }
 function render(frame,dt=0,width=960,height=540,quality='STANDARD'){
  if(!active||lost)return false;
  if(!frame?.curves?.length) return false;
  frame=presentationFrame(frame);
  const points=previewPoints(frame);
  if(width!==lastW||height!==lastH){
   renderer.setSize(width,height,false);lastW=width;lastH=height;
   camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  const dpr=quality==='LOW'?.7:quality==='ULTRA'?1.15:1;
  if(lastDpr!==dpr){renderer.setPixelRatio(dpr);lastDpr=dpr;}
  paintWorld(frame,points,quality);
  environment.update(frame,points,quality);
  // Three allocates UUIDs while a route's models/signs are first constructed.
  // Those visual allocations must not advance traffic/gameplay randomness.
  with3DOnlyRandom(()=>{
   landmarks.update(frame,points);
   wayfinding.update(frame,points);
  });
  updateTraffic(frame,points);
  if(frame.carColor!==lastCarColor){
   const value=typeof frame.carColor==='string'?new THREE.Color(frame.carColor).getHex():0x202838;
   const previous=car;car=with3DOnlyRandom(()=>createVehicle3D(THREE,{color:value,quality}));
   scene.add(car.root);previous.dispose();lastCarColor=frame.carColor;
  }
  updateDrivingVisualSnapshot(driving,frame.driving||gripFrame);
  updateDriftVisualRig(driftRig,driving,Math.max(0,dt));
  // Gameplay +yaw/+steer means nose right (+X). The mesh faces -Z, so a
  // positive Three.js Y rotation points its nose LEFT. Convert once here;
  // never flip lateral velocity, drift direction or the road frame to hide it.
  updateVehiclePose(pose,{
   screenX:480,screenY:475,yawDeg:-(Number(frame.yawDeg)||0),
   rollDeg:Number(frame.rollDeg)||0,pitchDeg:Number(frame.pitchDeg)||0,
   steer:-(Number(frame.steer)||0),speedKmh:Math.max(0,Number(frame.speedKmh)||0),
   scaleX:1,direction:frame.direction===-1?-1:1,
   braking:!!frame.braking,boosting:!!frame.boosting
  },Math.max(0,dt));
  car.applyPose(pose);
  const roadPose=roadVehiclePose(points,frame);
  car.root.rotation.set(roadPose.pitch,roadPose.yaw,0);
  car.root.position.set(driftRig.offsetX,.02,PLAYER_Z);
  car.root.scale.set(.92*.97,.83*.97,.92*.97); // V84: 3% smaller visual model only.
  contactShadow.position.set(driftRig.offsetX,.049,PLAYER_Z);
  contactShadow.rotation.set(-Math.PI/2+roadPose.pitch,0,roadPose.yaw+pose.yawRad);
  car.root.updateMatrixWorld(true);tyreContacts.count=quality==='LOW'?0:4;
  for(let i=0;i<tyreContacts.count;i++){
   car.parts.wheelSpinners[i].getWorldPosition(wheelPosition);
   dummy.position.set(wheelPosition.x,.052-Math.sin(roadPose.pitch)*(wheelPosition.z-PLAYER_Z),wheelPosition.z);
   dummy.rotation.copy(contactShadow.rotation);dummy.scale.set(.15,.28,1);dummy.updateMatrix();
   tyreContacts.setMatrixAt(i,dummy.matrix);
  }
  tyreContacts.instanceMatrix.needsUpdate=true;
  // Camera sits behind +Z and looks down -Z: the rear (taillights +Z)
  // ALWAYS faces the camera. Do not rotate the car 180 degrees.
  updateChaseRig(chaseRig,points,frame,driftRig.cameraX,Math.max(0,dt));
  camera.position.set(chaseRig.x,chaseRig.y,chaseRig.z);
  camera.lookAt(chaseRig.lookX,chaseRig.lookY,chaseRig.lookZ);
  if(camera.fov!==chaseRig.fov){camera.fov=chaseRig.fov;camera.updateProjectionMatrix();}
  skyDome.position.copy(camera.position);
  skyMaterial.uniforms.top.value.set(frame.skyColors?.[0]||(frame.night?'#08152f':'#53416f'));
  skyMaterial.uniforms.horizon.value.set(frame.skyColors?.[2]||(frame.night?'#344861':'#e5ba91'));
  sun.visible=!frame.night;sun.position.set(camera.position.x-110,camera.position.y+40,camera.position.z-290);
  sunlight.color.setHex(frame.night?0x9dbbff:0xffcf9f);
  sunlight.intensity=frame.night?.28:1.35;
  hemisphere.color.setHex(frame.night?0x718ebd:0xb6d5ef);
  hemisphere.groundColor.setHex(frame.night?0x192335:0x4b4945);
  hemisphere.intensity=frame.night?.42:.62;
  scene.environment=lighting.environment(!!frame.night,quality);
  car.parts.paint.envMapIntensity=frame.night?.65:.85;
  car.parts.glazing.envMapIntensity=frame.night?.5:.7;
  glassMat.emissiveIntensity=frame.night?.7:.12;
  shopMat.emissiveIntensity=frame.night?(quality==='LOW'?.25:.65):.16;
  facadeMat.emissiveIntensity=frame.night?(quality==='LOW'?.35:.8):.06;
  scene.background.setHex(frame.night?0x10213b:0xf4ae78);
  scene.fog.color.setHex(frame.night?0x233b58:0xc7ad98);
  // A flat ground plane must never cover a descending road.
  ground.position.y=Math.min(-.22,...points.map((p,i)=>p.y-.3-(frame.deckHeights?.[i]||0)/260));
  trafficVisibility(frame,points,width,height);
  effects.update(frame,Math.max(0,dt),quality,camera,car);
  renderer.render(scene,camera);
  canvas.style.visibility='visible';ready=true;return true;
 }
 function dispose(){
  if(!active)return;active=false;ready=false;
  canvas.removeEventListener('webglcontextlost',lostHandler);
  canvas.removeEventListener('webglcontextrestored',restoredHandler);
  wayfinding.dispose();landmarks.dispose();environment.dispose();effects.dispose();car.dispose();for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
  scene.environment=null;lighting.dispose();renderer.dispose();
 }
 return {render,dispose,prepareTrafficVisibility,get ready(){return ready&&!lost&&active},get contextLost(){return lost}};
}
module.exports={createFull3DScene,previewPoints,sampleRoadPoint,roadVehiclePose,createChaseRig,updateChaseRig,streetOffset,TAIPEI_SIGNS};
