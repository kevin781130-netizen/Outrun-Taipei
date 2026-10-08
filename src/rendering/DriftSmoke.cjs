'use strict';

// Lightweight GPU-instanced tyre haze. 3D-only, has no physics interactions.
// Deterministic placement (no Math.random); bounded fixed allocation.
function createDriftSmoke(THREE,scene,registerGeometry,registerMaterial){
 const count=52, geom=registerGeometry(new THREE.SphereGeometry(1,6,5));
 const mat=registerMaterial(new THREE.MeshBasicMaterial({
  color:0xc4d4d9,transparent:true,opacity:.32,depthWrite:false,
  blending:THREE.NormalBlending
 }));
 const mesh=new THREE.InstancedMesh(geom,mat,count);
 mesh.frustumCulled=false;mesh.count=0;scene.add(mesh);
 const particles=Array.from({length:count},()=>({life:0,x:0,y:0,z:0,radius:0}));
 const marker=new THREE.Object3D();
 let cursor=0,emit=0,totalEmitted=0,disposed=false;
 function step(visual,dt,carX,carZ,speed){
  if(disposed)return;
  const elapsed=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.05));
  const intensity=Math.max(0,Math.min(1,Number.isFinite(visual?.smoke)?visual.smoke:0));
  emit=Math.min(3,emit+elapsed*intensity*20);
  // 2 particles per emission, one off each driven rear tyre.
  while(emit>=1){
   emit-=1;
   for(const side of [-1,1]){
    const p=particles[cursor++%count];
    p.life=.62;
    p.x=carX+side*.76;p.y=.28;p.z=carZ+1.35;
    p.radius=.16;
    totalEmitted++;
   }
  }
  let used=0;
  for(const p of particles){
   if(p.life<=0)continue;
   p.life=Math.max(0,p.life-elapsed);
   if(!p.life)continue;
   p.z+=(Math.min(300,Math.max(0,speed||0))/80)*elapsed;
   p.y+=elapsed*.29;
   p.radius+=elapsed*.64;
   marker.position.set(p.x,p.y,p.z);
   const scale=p.radius*(.35+.65*(p.life/.62));
   marker.scale.set(scale,scale*.7,scale);
   marker.updateMatrix();
   mesh.setMatrixAt(used++,marker.matrix);
  }
  mesh.count=used;
  if(used)mesh.instanceMatrix.needsUpdate=true;
 }
 function dispose(){if(disposed)return;disposed=true;scene.remove(mesh);}
 return {mesh,step,dispose,get emitted(){return totalEmitted}};
}
module.exports={createDriftSmoke};
