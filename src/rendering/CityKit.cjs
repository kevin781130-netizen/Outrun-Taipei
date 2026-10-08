'use strict';
// Original Taipei-inspired modular facades. Instanced geometry: no borrowed maps, logos or GLTF.
// Building bodies are owned by Full3DScene; this adds balconies, shopfronts and actual windows.
function createCityKit(THREE, scene, registerGeometry, registerMaterial, boxGeometry, point, hash) {
 const MAX= {glass:3500, bands:1100, shops:140, signs:140, canopies:140, roof:140};
 const materials={
  glass:registerMaterial(new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false})),
  bands:registerMaterial(new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false})),
  shops:registerMaterial(new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false})),
  signs:registerMaterial(new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false})),
  canopies:registerMaterial(new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false})),
  roof:registerMaterial(new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}))
 };
 const meshes={},count={},dummy=new THREE.Object3D(),swatch=new THREE.Color();
 for(const key of Object.keys(MAX)){
  const mesh=new THREE.InstancedMesh(boxGeometry,materials[key],MAX[key]);
  mesh.name='TaipeiCityKit_'+key;
  mesh.count=0;mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);meshes[key]=mesh;count[key]=0;
 }
 const facades=[0x293a48,0x37494b,0x4c5863,0x60584e,0x374d5d,0x655448,0x374b47,0x4c5360];
 const warmWindows=[0x223748,0x395268,0xb1a171,0x4c6872,0xcfad70,0x334b60];
 const shopColors=[0x234c59,0x6c3e49,0x3e5653,0x67543f,0x2a4558,0x70485a];
 const signColors=[0xe8a45c,0x47c8c5,0xd16b79,0xf5cf82,0x77b5c9];
 function add(key,x,y,z,w,h,d,rotation,color){
  const i=count[key]++;if(i>=MAX[key]){count[key]=MAX[key];return;}
  dummy.position.set(x,y,z);
  dummy.rotation.set(0,rotation,0);
  dummy.scale.set(w,h,d);
  dummy.updateMatrix();meshes[key].setMatrixAt(i,dummy.matrix);
  swatch.setHex(color);meshes[key].setColorAt(i,swatch);
 }
 function update(frame,points,halfWidth){
  for(const key of Object.keys(count))count[key]=0;
  const urban=frame.archetype!=='mountain'&&frame.archetype!=='coastal';
  if(urban){
   const seed=Number(frame.seed)||1,segment=Math.floor(frame.segment||0);
   for(let i=5;i<125;i+=3){
    const c=points[i],absolute=segment+i;
    for(const side of [-1,1]){
     const h=hash(absolute*37+side*99+seed);
     const width=5+hash(absolute*11+side*33)*6;
     const height=7+h*23;
     const lateral=(1.75+h*2.3)*halfWidth*side;
     // Roadward face: +X for buildings to the left, -X for those on the right.
     const toward=-side;
     const frontage=point(c,lateral+toward*(width*.5+.07),-.15);
     const rot=-c.heading, floors=Math.min(9,Math.max(2,Math.floor((height-1.9)/2.8)));
     const style=Math.floor(hash(absolute*19+seed)*facades.length);
     const bandColor=facades[style],base=point(c,lateral,-.15);
     // Distinct ground-floor shop depth, projecting canopy, and colored sign fascia.
     add('shops',frontage.x,frontage.y+1.07,frontage.z,.10,2.05,width*.86,rot,shopColors[(style+Math.abs(absolute))%shopColors.length]);
     add('signs',frontage.x+toward*.11,frontage.y+2.3,frontage.z,.15,.48,width*.86,rot,signColors[(style+absolute+side+signColors.length*100)%signColors.length]);
     add('canopies',frontage.x+toward*.27,frontage.y+2.03,frontage.z,.53,.09,width*.94,rot,0x263b47);
     for(let floor=0;floor<floors;floor++){
      const y=frontage.y+3.4+floor*2.8;
      if(y>base.y+height-1.0)break;
      // Thin 3D balcony ledges and setbacks are silhouette cues, not decals.
      add('bands',frontage.x+toward*.12,y-.76,frontage.z,.38,.12,width*.94,rot,bandColor);
      for(let column=0;column<3;column++){
       const v=(column-1)*width*.27;
       const x=frontage.x+Math.sin(c.heading)*v;
       const z=frontage.z+Math.cos(c.heading)*v;
       const light=hash(absolute*199+side*131+floor*17+column*43);
       const tint=warmWindows[Math.floor(light*warmWindows.length)];
       add('glass',x+toward*.10,y,z,.09,1.24,width*.19,rot,tint);
      }
      // Windows also on the camera-facing end wall; avoid blank billboard slabs.
      const endZ=base.z+Math.cos(c.heading)*width*.39,endX=base.x+Math.sin(c.heading)*width*.39;
      for(const n of [-1,1]){
       const x=endX+Math.cos(c.heading)*n*width*.22,z=endZ+Math.sin(c.heading)*n*width*.22;
       const tint=warmWindows[Math.floor(hash(absolute*73+floor*29+n*11+1000)*warmWindows.length)];
       add('glass',x,y,z,width*.17,1.1,.10,rot,tint);
      }
     }
     // Mechanical penthouse/roof silhouette instead of featureless flat white cuboids.
     add('roof',base.x,base.y+height+.45,base.z,width*.45,.85,width*.33,rot,0x273541);
    }
   }
  }
  for(const key of Object.keys(meshes)){
   const mesh=meshes[key];mesh.count=count[key];
   mesh.instanceMatrix.needsUpdate=true;
   if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  }
 }
 function dispose(){for(const mesh of Object.values(meshes))scene.remove(mesh);}
 return {update,dispose,meshes};
}
module.exports={createCityKit};