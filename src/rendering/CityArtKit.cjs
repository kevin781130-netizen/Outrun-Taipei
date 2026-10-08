'use strict';

// Modular, batched Taipei-inspired façade dressing for anonymous buildings.
// No borrowed brand marks, third-party textures, network assets or DOM canvas.
// Instance transforms and colors are deterministic from the supplied route seed.
const BODY_COLORS=[0x657886,0xb18e77,0x6c7c75,0x566d80,0x8c827a,0x798a9a,0x876e67,0x627c76];
const SIGN_COLORS=[0x18b5a4,0xcf633d,0x4077c9,0xcead44,0xc34473,0x36a0b4];
function createCityArtKit(THREE,scene,registerGeometry,registerMaterial,maxBuildings=120){
 if(!THREE?.InstancedMesh||!scene)throw new TypeError('Three.js scene is required');
 const box=registerGeometry(new THREE.BoxGeometry(1,1,1));
 const mat=(color,emissive=0)=>registerMaterial(new THREE.MeshStandardMaterial({
  color,emissive,emissiveIntensity:emissive?0.85:0,metalness:.08,roughness:.8
 }));
 const glass=mat(0x253744,0x06101b);
 const luminous=mat(0xffd29a,0xf0a45c);
 const awning=mat(0xffffff);
 const neon=mat(0xffffff,0x0e1929);
 const roof=mat(0x424950);
 const door=mat(0x1c3441);
 const darkWindows=new THREE.InstancedMesh(box,glass,maxBuildings*6);
 const litWindows=new THREE.InstancedMesh(box,luminous,maxBuildings*6);
 const signs=new THREE.InstancedMesh(box,neon,maxBuildings);
 const awnings=new THREE.InstancedMesh(box,awning,maxBuildings);
 const doors=new THREE.InstancedMesh(box,door,maxBuildings);
 const equipment=new THREE.InstancedMesh(box,roof,maxBuildings*2);
 const meshes=[darkWindows,litWindows,signs,awnings,doors,equipment];
 meshes.forEach(m=>{m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(m);});
 const dummy=new THREE.Object3D();
 const swatch=new THREE.Color();
 const count=[0,0,0,0,0,0];
 function append(index,item,localX,y,localZ,sx,sy,sz,paletteHex){
  const m=meshes[index],i=count[index];
  if(i>=m.instanceMatrix.count)return;
  const a=item.heading||0;
  dummy.position.set(item.x+Math.cos(a)*localX+Math.sin(a)*localZ,
   item.y+y,
   item.z-Math.sin(a)*localX+Math.cos(a)*localZ);
  dummy.rotation.set(0,a,0);
  dummy.scale.set(sx,sy,sz);
  dummy.updateMatrix();
  m.setMatrixAt(i,dummy.matrix);
  if(paletteHex!==undefined){swatch.setHex(paletteHex);m.setColorAt(i,swatch);}
  count[index]=i+1;
 }
 function update(buildings,night=false){
  count.fill(0);
  for(const item of buildings){
   if(!item||!Number.isFinite(item.height)||item.height<=0)continue;
   const front=item.depth*.45;
   const w=item.width;
   const h=item.height;
   const colorIndex=Math.abs(item.seed|0)%SIGN_COLORS.length;
   const sign=SIGN_COLORS[colorIndex];
   const wallZ=front+.055;
   // Six actual recessed windows in two columns / three floor bands,
   // rather than a single white panel as tall as the whole building.
   for(let row=0;row<3;row++){
    for(const side of [-1,1]){
     const lit=night&&((item.seed+row*11+side*7)&3)!==0;
     append(lit?1:0,item,side*w*.24,h*(.40+.17*row),wallZ,
      w*.24,Math.max(.55,h*.11),.09);
    }
   }
   append(2,item,0,2.65,wallZ+.17,w*.83,.88,.20,sign);
   append(3,item,0,2.05,wallZ+.48,w*.90,.15,.78,sign);
   append(4,item,-w*.12,1.06,wallZ+.085,w*.24,2.06,.14);
   append(5,item,w*.25,h+.24,-item.depth*.13,w*.21,.48,item.depth*.22);
   append(5,item,-w*.20,h+.34,item.depth*.15,w*.18,.68,item.depth*.18);
  }
  for(let i=0;i<meshes.length;i++){
   const m=meshes[i];
   m.count=count[i];
   if(count[i])m.instanceMatrix.needsUpdate=true;
   if(m.instanceColor&&count[i])m.instanceColor.needsUpdate=true;
  }
  luminous.emissiveIntensity=night?1.2:.24;
  neon.emissiveIntensity=night?1.05:.16;
  return {buildings:buildings.length,darkWindows:count[0],litWindows:count[1],
   signboards:count[2],awnings:count[3],doors:count[4],roofDetails:count[5]};
 }
 return {update,meshes,palette:BODY_COLORS,signColors:SIGN_COLORS,
  // Parent renderer owns/disposes shared registered assets; remove on teardown.
  dispose(){for(const mesh of meshes)scene.remove(mesh);}};
}
module.exports={createCityArtKit,BODY_COLORS,SIGN_COLORS};
