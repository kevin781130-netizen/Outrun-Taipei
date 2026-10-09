// P8 isolated five-building Taipei-style streetfront block.
// NO game, vehicle, collision, route or map imports; all coordinates are preview-local.
import * as THREE from 'three';
import {GLTFLoader} from '../../assets/vendor/three-r149/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from '../../assets/vendor/three-r149/jsm/controls/OrbitControls.js';
import {makeStreetblockPlan} from './streetblock-plan.mjs';
import {buildTaipeiStreetfrontPlan} from './taipei-streetfront.mjs';
import {decideFacadeLod,FACADE_LOD_THRESHOLDS} from './lod-policy.mjs';

const $=id=>document.getElementById(id);
const write=(id,v)=>{$(id).textContent=String(v)};
const assetDir='../../assets/third_party/quaternius-downtown/';
const models=Object.create(null);
const sourceTriangles=Object.create(null);
const ids={brick:'Brick_Plain_1',brickWindow:'Brick_RedWhite_DoubleWindow',
  metalWindow:'Metal_Window',door:'DoorFrame_Trim'};
const sourceNames=Object.values(ids);
const loader=new GLTFLoader();
const canvas=$('street-canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.04;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x24394d);
const camera=new THREE.PerspectiveCamera(51,1,.1,800);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.maxDistance=600;
controls.minDistance=4;controls.maxPolarAngle=Math.PI*.89;
const ambient=new THREE.HemisphereLight(0xe4f0ff,0x3c4b5a,1.95);
const sun=new THREE.DirectionalLight(0xffd9a5,2.4);
sun.position.set(-17,28,28);
const fill=new THREE.DirectionalLight(0xc4deff,.7);
fill.position.set(20,12,-7);
scene.add(ambient,sun,fill);
const concrete=new THREE.MeshStandardMaterial({color:0x65717b,roughness:.87});
const ground=new THREE.Mesh(new THREE.PlaneGeometry(130,26),concrete);
ground.rotation.x=-Math.PI/2;ground.position.set(0,-.035,-2);
scene.add(ground);
// This plane is an asset staging plinth, NOT a copy of a Taipei road/sidewalk.
const sharedBox=new THREE.BoxGeometry(1,1,1);
const tankGeo=new THREE.CylinderGeometry(.63,.63,.83,12);
const dummy=new THREE.Object3D();
const materials=new Map(),signs=new Map();
let activeBlock=null,activePlan=null,instances=[],night=false;
const status=message=>write('street-status',message);

function materialFor(style,palette,key){
 const cacheKey=style+':'+key;
 if(materials.has(cacheKey))return materials.get(cacheKey);
 const colors={
  plaster:palette.plaster,awning:palette.awning,awningAlt:palette.awningAlt,
  railing:palette.railing,condenser:palette.condenser,signBg:palette.signBg,
  accentGlow:palette.accent,
  building:style==='metal'?'#839297':style==='brick'?'#ae9488':'#999586',
  roof:'#626b70',shop:'#303742',glass:'#304552'
 };
 const m=new THREE.MeshStandardMaterial({
  color:colors[key]||colors.building,
  metalness:key==='railing'?.38:0,
  roughness:key==='glass'?.28:.84,
  emissive:key==='accentGlow'?new THREE.Color(palette.accent):new THREE.Color(0x000000),
  emissiveIntensity:key==='accentGlow'?(night?1.0:.16):0
 });
 materials.set(cacheKey,m);
 return m;
}
function batchBoxes(group,descriptors,style,palette){
 const byMaterial=new Map();
 for(const box of descriptors){
  if(!byMaterial.has(box.material))byMaterial.set(box.material,[]);
  byMaterial.get(box.material).push(box);
 }
 for(const [key,list] of byMaterial){
  const mesh=new THREE.InstancedMesh(sharedBox,materialFor(style,palette,key),list.length);
  mesh.name='P8_PreviewInstanced_'+key;
  list.forEach((x,index)=>{
   dummy.position.set(...x.position);
   dummy.rotation.set(0,0,0);
   dummy.scale.set(...x.scale);
   dummy.updateMatrix();
   mesh.setMatrixAt(index,dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;
  mesh.frustumCulled=false; // r149: avoid incorrect bounds on instanced facade boxes.
  group.add(mesh);
 }
 return descriptors.length*12;
}
function rect(scale,position,material){
 return {scale,position,material};
}
function textSign(shop,palette,vertical){
 const key=shop+'|'+palette.signBg+'|'+vertical;
 if(signs.has(key))return signs.get(key);
 const c=document.createElement('canvas');
 c.width=vertical?192:1024;c.height=vertical?512:192;
 const ctx=c.getContext('2d');
 if(!ctx)throw new Error('Chinese sign needs 2D canvas');
 ctx.clearRect(0,0,c.width,c.height);
 ctx.fillStyle=palette.signText;
 ctx.textAlign='center';ctx.textBaseline='middle';
 const font='700 '+(vertical?64:91)+'px "Microsoft JhengHei","Noto Sans TC","PingFang TC",sans-serif';
 ctx.font=font;
 if(vertical){
  const letters=[...shop.slice(-2)];
  letters.forEach((letter,i)=>ctx.fillText(letter,c.width/2,158+i*175,150));
 }else{
  ctx.fillText(shop,c.width/2,90,c.width-90);
  ctx.font='500 30px "Microsoft JhengHei","Noto Sans TC","PingFang TC",sans-serif';
  ctx.fillText('台北風格街屋・示範招牌',c.width/2,159,c.width-85);
 }
 const texture=new THREE.CanvasTexture(c);
 texture.encoding=THREE.sRGBEncoding;
 const mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,
  depthWrite:false,toneMapped:false});
 signs.set(key,mat);
 return mat;
}
function labelMesh(shop,palette,vertical,model){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),textSign(shop,palette,vertical));
 mesh.scale.set(model.size[0],model.size[1],1);
 mesh.position.set(...model.position);
 mesh.name='P8_OriginalChinese_'+(vertical?'vertical':'horizontal');
 return mesh;
}
function geometryCount(sceneRoot){
 let triangles=0;
 sceneRoot.traverse(obj=>{
  if(!obj.isMesh)return;
  const geo=obj.geometry;
  triangles+=Math.floor((geo.index?.count||geo.attributes.position?.count||0)/3);
 });
 return triangles;
}
function moduleClone(root,key,x,y,z=0){
 const name=ids[key];
 const source=models[name];
 if(!source)throw new Error('Missing Quaternius model '+name);
 const part=source.clone(true);
 part.position.set(x,y,z);root.add(part);
 return sourceTriangles[name];
}
function buildFacade(building){
 const plan=buildTaipeiStreetfrontPlan(building.style);
 const full=new THREE.Group(),proxy=new THREE.Group();
 const buildingRoot=new THREE.Group();
 buildingRoot.name='P8_PreviewLocalShop_'+building.id;
 buildingRoot.position.set(...building.position);
 buildingRoot.add(full,proxy);
 const wall=materialFor(building.style,plan.palette,'building');
 // P6 baseline geometry: keep original CC0 models at the same local anchors.
 const first=building.style==='metal'?'metalWindow':'brickWindow';
 const second=building.style==='brick'?'brickWindow':'metalWindow';
 const nearVolume=[
  rect([10.35,6.2,2.1],[0,3.1,-1.46],'building'),
  rect([10.65,.28,2.5],[0,6.32,-1.33],'roof'),
  rect([2,.12,.6],[0,.06,.32],'roof')
 ];
 let nearTris=batchBoxes(full,nearVolume.concat(plan.nearBoxes),building.style,plan.palette);
 nearTris+=moduleClone(full,first,-3,0);
 nearTris+=moduleClone(full,'door',0,0);
 nearTris+=moduleClone(full,second,3,0);
 nearTris+=moduleClone(full,first,-3,3);
 for(let y=3;y<6;y++)nearTris+=moduleClone(full,'brick',0,y);
 nearTris+=moduleClone(full,second,3,3);
 const farVolume=[
  rect([10.35,6.2,2.1],[0,3.1,-1.46],'building'),
  rect([10.65,.28,2.5],[0,6.32,-1.33],'roof'),
  rect([1.45,2.45,.07],[0,1.25,-.35],'shop')
 ];
 for(const y of [1.55,4.5])for(const x of [-3,3])
  farVolume.push(rect([2.9,1.7,.07],[x,y,-.35],'glass'));
 let farTris=batchBoxes(proxy,farVolume.concat(plan.farBoxes),building.style,plan.palette);
 for(const sign of plan.signs){
  full.add(labelMesh(building.shop,plan.palette,sign.id==='vertical',sign));
  nearTris+=2;
 }
 // Rooftop metal water tank and two mounting supports (stylistic, visual only).
 if(building.rooftop==='tank'){
  const support=[
   rect([.11,.42,.10],[1.95,6.60,-.88],'railing'),
   rect([.11,.42,.10],[3.05,6.60,-.88],'railing')
  ];
  nearTris+=batchBoxes(full,support,building.style,plan.palette);
  const tank=new THREE.Mesh(tankGeo,materialFor(building.style,plan.palette,'condenser'));
  tank.position.set(2.5,7.16,-.88);
  full.add(tank);
  nearTris+=geometryCount(tank);
  farTris+=batchBoxes(proxy,[rect([1.23,1.0,1.23],[2.5,7.05,-.88],'condenser')],building.style,plan.palette);
 }
 return {building,root:buildingRoot,full,proxy,nearTris,farTris,lod:'near'};
}
function cleanOld(){
 if(!activeBlock)return;
 scene.remove(activeBlock);
 activeBlock.traverse(obj=>{
  if(obj.isInstancedMesh&&typeof obj.dispose==='function')obj.dispose();
  // glTF geometries, text sign maps and materials are shared and retained.
  // Disposable plane geometries are owned by each sign.
  if(obj.name.startsWith('P8_OriginalChinese_'))obj.geometry.dispose();
 });
 activeBlock=null;
}
function resetView(){
 if(!activePlan)return;
 const aspect=Math.max(.3,canvas.clientWidth/Math.max(1,canvas.clientHeight));
 const fovRad=camera.fov*Math.PI/180;
 const dist=Math.max(25,(activePlan.totalWidth+7)/(2*Math.tan(fovRad/2)*aspect)*1.12);
 camera.position.set(0,Math.max(11,dist*.20),dist);
 controls.target.set(0,3.4,0);
 controls.update();
}
function buildBlock(count){
 const plan=makeStreetblockPlan(count);
 cleanOld();activePlan=plan;
 activeBlock=new THREE.Group();
 activeBlock.name='P8_IndependentPreviewBlock';
 instances=plan.buildings.map(buildFacade);
 for(const item of instances)activeBlock.add(item.root);
 scene.add(activeBlock);
 write('building-count',instances.length);
 write('shop-list',plan.buildings.map(b=>b.shop).join('　｜　'));
 write('block-width',plan.totalWidth.toFixed(2)+' m（僅預覽局部座標）');
 resetView();
 applyLod();
 status('已建立 '+instances.length+' 棟 Quaternius 台北風格街屋（僅獨立預覽）');
}
function applyLod(){
 if(!instances.length)return;
 const mode=$('lod-mode').value;
 let near=0,far=0,budget=0;
 const sample=new THREE.Vector3();
 for(const item of instances){
  sample.set(...item.building.position);
  sample.y=3;
  const distance=camera.position.distanceTo(sample);
  item.lod=decideFacadeLod({mode,distance,previous:item.lod,
    enterFar:FACADE_LOD_THRESHOLDS.enterFar,exitFar:FACADE_LOD_THRESHOLDS.exitFar});
  item.full.visible=item.lod==='near';item.proxy.visible=item.lod==='far';
  if(item.lod==='near'){near++;budget+=item.nearTris;}else{far++;budget+=item.farTris;}
 }
 write('lod-near',near);write('lod-far',far);
 write('budget',budget.toLocaleString());
}
function toggleNight(){
 night=!night;
 ambient.intensity=night?.64:1.95;
 sun.intensity=night?.28:2.4;
 fill.intensity=night?1.15:.7;
 scene.background.setHex(night?0x0c192c:0x24394d);
 for(const [key,m] of materials)if(key.endsWith(':accentGlow'))
  m.emissiveIntensity=night?1.0:.16;
 $('night').textContent=night?'改成日間':'改成夜間';
 $('night').setAttribute('aria-pressed',String(night));
}
$('count').addEventListener('change',e=>buildBlock(Number(e.target.value)));
$('lod-mode').addEventListener('change',applyLod);
$('night').addEventListener('click',toggleNight);
$('frame').addEventListener('click',resetView);
let oldT=0,frames=0,elapsed=0;
function tick(t){
 requestAnimationFrame(tick);
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
 const size=renderer.getSize(new THREE.Vector2());
 if(size.x!==w||size.y!==h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 controls.update();applyLod();
 renderer.render(scene,camera);
 write('calls',renderer.info.render.calls);
 write('triangles',renderer.info.render.triangles.toLocaleString());
 if(oldT&&t>oldT&&t-oldT<250){frames++;elapsed+=t-oldT;
  if(frames>=60){write('fps',(1000*frames/elapsed).toFixed(1));frames=0;elapsed=0;}
 }
 oldT=t;
}
requestAnimationFrame(tick);
try{
 const gltfs=await Promise.all(sourceNames.map(n=>new Promise((resolve,reject)=>
  loader.load(assetDir+n+'.gltf',resolve,undefined,reject))));
 for(let i=0;i<sourceNames.length;i++){
  models[sourceNames[i]]=gltfs[i].scene;
  sourceTriangles[sourceNames[i]]=geometryCount(gltfs[i].scene);
  if(!sourceTriangles[sourceNames[i]])throw new Error('Empty model '+sourceNames[i]);
 }
 buildBlock(Number($('count').value));
}catch(error){
 console.error('P8 preview setup failed',error);
 status('預覽載入失敗：'+(error.message||error)+'。請從專案根目錄啟動 HTTP 伺服器。');
}
