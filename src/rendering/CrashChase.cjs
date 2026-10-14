'use strict';
// Original stylized occupants. Presentation reads the existing crash animation clock;
// it never advances time, consumes gameplay randomness or writes physics state.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function sampleCrashChase(anim,side=1,passenger=false){
 const t=Math.max(0,Number(anim)||0),s=side<0?-1:1;
 const car={x:0,y:0,z:0,roll:0};
 if(t<.72){const u=t/.72;car.x=s*.9*u;car.roll=-s*Math.PI*2*u;car.y=Math.sin(u*Math.PI)*2.4+1-Math.cos(car.roll);}
 else if(t<1.5){const u=ease((t-.72)/.78);car.x=s*mix(.9,2,u);car.z=-3*u;}
 else if(t<3.85){const u=clamp((t-1.5)/2.35,0,1);car.x=s*(2+.2*u);car.z=-3-.4*u;}
 else{const u=1-ease((t-3.85)/.25);car.x=s*2.2*u;car.z=-3.4*u;}
 const tt=Math.max(0,t-(passenger?.12:0)),landing=-s*(passenger?1.9:1.2),seat=passenger?.34:-.34;
 const runner={x:seat,y:0,z:.2,roll:0,scale:1,phase:'tumble',visible:tt>=.2&&tt<3.96};
 if(tt<1.15){const u=clamp((tt-.2)/.95,0,1);runner.x=mix(seat,landing,ease(u));runner.y=Math.sin(u*Math.PI)*2.2;runner.z=mix(.2,1.3,ease(u));runner.roll=s*Math.PI*4*u;}
 else if(tt<1.65){runner.x=landing;runner.z=1.3;runner.phase='dazed';}
 else if(tt<3.6){const u=ease((tt-1.65)/1.95);runner.x=mix(landing,car.x+seat,u);runner.z=mix(1.3,car.z+.3,u);runner.phase='run';}
 else{const u=clamp((tt-3.6)/.36,0,1);runner.x=car.x+seat;runner.z=car.z+.3;runner.y=.3*ease(u)+Math.sin(u*Math.PI)*1.0;runner.scale=1-ease(u);runner.phase='board';}
 return {car,runner};
}
function createCrashChase(THREE,scene){
 const root=new THREE.Group();root.name='V59_CrashChase';root.visible=false;scene.add(root);
 const box=new THREE.BoxGeometry(1,1,1),ball=new THREE.SphereGeometry(1,10,8),star=new THREE.OctahedronGeometry(1,0);
 const geometries=[box,ball,star],materials=[];
 const mat=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0});materials.push(m);return m;};
 const skin=mat(0xf8c69f),cream=mat(0xfff1c5),pink=mat(0xf35a8a),blue=mat(0x426898),dark=mat(0x253b55),red=mat(0xc7334e),brown=mat(0x48322d),gold=mat(0xffd349),white=mat(0xfffbe8),ink=mat(0x152636),mouth=mat(0xa6344c);
 const dustMat=new THREE.MeshBasicMaterial({color:0xdbc99b,transparent:true,opacity:.28,depthWrite:false});materials.push(dustMat);
 function part(parent,g,m,size,pos){const mesh=new THREE.Mesh(g,m);mesh.scale.set(...size);mesh.position.set(...pos);parent.add(mesh);return mesh;}
 function actor(passenger){
  const pivot=new THREE.Group();pivot.name=passenger?'V59_Passenger':'V59_Driver';root.add(pivot);
  const body=new THREE.Group();body.position.y=-1.1;pivot.add(body);
  part(body,box,passenger?pink:cream,[.52,.58,.34],[0,1.13,0]);
  const head=new THREE.Group();head.position.set(0,1.73,0);body.add(head);
  part(head,ball,passenger?gold:brown,[.40,.41,.36],[0,.06,0]);
  part(head,ball,skin,[.36,.35,.34],[0,-.01,.055]);
  // Faces look back towards the chase camera while feet run down the road.
  for(const x of [-.14,.14]){part(head,ball,white,[.105,.12,.055],[x,.055,.36]);part(head,ball,ink,[.043,.067,.025],[x,.055,.409]);}
  part(head,ball,mouth,[.095,.12,.04],[0,-.17,.36]);
  if(passenger)part(head,ball,gold,[.21,.17,.42],[.40,.08,-.12]);
  const arms=[],legs=[];
  for(const s of [-1,1]){
   const arm=new THREE.Group();arm.position.set(s*.32,1.34,0);body.add(arm);arms.push(arm);
   part(arm,box,skin,[.13,.43,.14],[0,-.19,0]);part(arm,ball,skin,[.11,.11,.11],[0,-.43,0]);
   const leg=new THREE.Group();leg.position.set(s*.14,.86,0);body.add(leg);legs.push(leg);
   part(leg,box,passenger?skin:blue,[.18,.70,.19],[0,-.35,0]);
   part(leg,box,passenger?red:dark,[.26,.14,.40],[0,-.77,-.085]);
   part(leg,box,white,[.27,.04,.41],[0,-.85,-.085]);
  }
  const stars=[];
  for(let i=0;i<4;i++)stars.push(part(body,star,gold,[.09,.09,.09],[0,2.25,0]));
  return {pivot,body,arms,legs,stars};
 }
 const actors=[actor(false),actor(true)];
 const dust=new THREE.InstancedMesh(ball,dustMat,8);dust.name='V59_ChaseDust';dust.frustumCulled=false;dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(dust);
 const dummy=new THREE.Object3D();let active=true;
 function update(crash,anchor,aspect=16/9,quality='STANDARD'){
  if(!active)return null;
  root.visible=!!crash;if(!crash)return null;
  const t=Math.max(0,Number(crash.anim)||0),side=crash.side<0?-1:1;
  const layout=clamp(aspect/(16/9),.42,1);
  const sampled=sampleCrashChase(t,side),car=sampled.car;
  car.x*=layout;
  root.position.set(0,anchor.y,anchor.z);root.rotation.set(anchor.pitch,anchor.yaw,0);
  root.userData.anim=t;let count=0;
  for(let i=0;i<2;i++){
   const a=actors[i],p=sampleCrashChase(t,side,i===1).runner,wave=Math.sin(t*31+i*1.2),run=p.phase==='run';
   a.pivot.visible=p.visible;a.pivot.position.set(p.x*layout,p.y+1.1,p.z);a.pivot.rotation.set(0,0,p.roll);a.pivot.scale.setScalar(p.scale);a.pivot.userData.phase=p.phase;
   a.body.rotation.set(run?-.18:0,0,p.phase==='dazed'?Math.sin(t*15)*.04:0);
   if(run)a.pivot.position.y+=Math.abs(wave)*.10;
   for(let j=0;j<2;j++){const sign=j===0?-1:1;a.legs[j].rotation.x=run?sign*wave*1.05:0;a.arms[j].rotation.x=run?-sign*wave*1.1:-.45;}
   for(let j=0;j<a.stars.length;j++){const star=a.stars[j],angle=t*7+j*Math.PI/2;star.visible=p.phase==='dazed';star.position.set(Math.cos(angle)*.55,2.25+Math.sin(angle)*.10,Math.sin(angle)*.35);}
   if(run&&p.visible)for(let j=0;j<(quality==='LOW'?2:4);j++){
    const u=((t*2+j*.23)%1+1)%1;dummy.position.set(p.x*layout+Math.sin(j*8+i)*.18,.07+u*.12,p.z+.3+u*.9);dummy.rotation.set(0,0,0);dummy.scale.set(.12+u*.15,.045+u*.05,.12+u*.15);dummy.updateMatrix();dust.setMatrixAt(count++,dummy.matrix);
   }
  }
  dust.count=count;dust.visible=count>0;dust.instanceMatrix.needsUpdate=true;
  return car;
 }
 function dispose(){if(!active)return;active=false;root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
 return {root,update,dispose};
}
module.exports={sampleCrashChase,createCrashChase};
