'use strict';
// Presentation only: no random calls, wall clock, or writes to driving physics.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function createEffectState(){return {time:0,speed:0,smoke:0,boost:0};}
function updateEffectState(state,frame,dt){
 if(!Number.isFinite(dt)||dt<0)throw new TypeError('nonnegative effect dt required');
 if(dt===0)return state;
 const step=Math.min(dt,.1),blend=1-Math.exp(-step*9);
 const speed=Math.max(0,Number(frame.speedKmh)||0),drive=frame.driving||{};
 const boost=frame.boosting===true?1:0;
 const smoke=drive.isDrifting&&speed>55?clamp((Math.abs(drive.slipAngleDeg||0)-3)/15,0,1):0;
 state.time+=step;
 state.speed+=(clamp((speed-170)/155,0,1)-state.speed)*blend;
 state.smoke+=(smoke-state.smoke)*blend;
 state.boost+=(boost-state.boost)*blend;
 return state;
}
function createDrivingEffects(THREE){
 const state=createEffectState();
 const smokeGeometry=new THREE.SphereGeometry(1,7,5);
 const smokeMaterial=new THREE.MeshBasicMaterial({color:0xcbd6de,transparent:true,opacity:0,depthWrite:false});
 const smoke=new THREE.InstancedMesh(smokeGeometry,smokeMaterial,24);
 smoke.name='V57_DriftSmoke';smoke.frustumCulled=false;
 smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 const lineGeometry=new THREE.BufferGeometry();
 const positions=new Float32Array(16*6),attribute=new THREE.BufferAttribute(positions,3);
 attribute.setUsage(THREE.DynamicDrawUsage);lineGeometry.setAttribute('position',attribute);
 const lineMaterial=new THREE.LineBasicMaterial({color:0x9cdeff,transparent:true,opacity:0,depthTest:false,depthWrite:false,toneMapped:false});
 const lines=new THREE.LineSegments(lineGeometry,lineMaterial);
 lines.name='V57_PeripheralSpeedLines';lines.frustumCulled=false;lines.renderOrder=10;
 const dummy=new THREE.Object3D();let disposed=false;
 function update(frame,dt,quality,camera,car){
  if(disposed)return;
  updateEffectState(state,frame,dt);
  // Reattach the same pool when the player chooses a different vehicle.
  if(smoke.parent!==car.parts.pitch)car.parts.pitch.add(smoke);
  if(lines.parent!==camera)camera.add(lines);
  const count=quality==='LOW'?8:24;
  smoke.visible=state.smoke>.015;smoke.count=count;
  smokeMaterial.opacity=state.smoke*.17;
  for(let i=0;i<count;i++){
   const phase=(state.time*1.15+i/count)%1,side=i%2?1:-1;
   dummy.position.set(side*(.88+phase*.45),.25+phase*.6,1.18+phase*2.3);
   dummy.rotation.set(0,0,0);const size=.12+phase*.4;
   dummy.scale.set(size,size*.75,size);dummy.updateMatrix();smoke.setMatrixAt(i,dummy.matrix);
  }
  smoke.instanceMatrix.needsUpdate=true;
  const intensity=Math.max(state.speed*.65,state.boost),lineCount=quality==='LOW'?6:16;
  lines.visible=intensity>.02;lineMaterial.opacity=intensity*.24;
  const halfY=Math.tan(camera.fov*Math.PI/360)*5,halfX=halfY*camera.aspect;
  for(let i=0;i<lineCount;i++){
   const phase=(state.time*(1.3+state.boost)+i*.618)%1,side=i%2?1:-1;
   // Stay in the outer fifth of the view, leaving the driving line readable.
   const x=side*halfX*(.81+phase*.15),y=halfY*((i*7%17)/8-1)*.85;
   const stretch=1.04+intensity*.045;
   positions.set([x,y,-5,x*stretch,y*stretch,-5],i*6);
  }
  lineGeometry.setDrawRange(0,lineCount*2);attribute.needsUpdate=true;
  for(const flame of car.parts.exhaustFlames){
   const pulse=1+state.boost*(.3+.1*Math.sin(state.time*28));
   flame.scale.set(1,pulse,1);
  }
 }
 function dispose(){
  if(disposed)return;disposed=true;
  smoke.removeFromParent();lines.removeFromParent();
  smokeGeometry.dispose();smokeMaterial.dispose();lineGeometry.dispose();lineMaterial.dispose();
 }
 return {update,dispose,state};
}
module.exports={createEffectState,updateEffectState,createDrivingEffects};
