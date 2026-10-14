'use strict';
// Original low-poly interpretations of the authored 2D landmarks. Names/order
// come from stageLandmarkPlan; this catalog supplies geometry, never route rules.
const ROUTE_MODELS=Object.freeze({
 '1A':['gate','office','liberty'], '2A':['hotel','trail'], '2B':['digital'],
 '3A':['guandu','spring'], '3B':['wheel','museum'], '3C':['dome','chimney'],
 '4A':['fort','pier'], '4B':['volcano','pavilion'], '4C':['market','tech','rainbow'],
 '4D':['village','skyline'], '5A':['lovers'], '5B':['lighthouse'],
 '5C':['teahouse'], '5D':['101'], '5E':['gondola','tea']
});
const C={cream:0xe5d8b8,red:0xb43f38,roof:0x316963,gold:0xdbac52,glass:0x659ba7,
 dark:0x243442,white:0xe7eeea,wood:0x6c4e37,leaf:0x528455,stone:0x77827a,light:0xffcc73};
function createLandmarkGeometry(T,kind){
 const positions=[],normals=[],colors=[];
 const obj=new T.Object3D(),normal=new T.Matrix3(),p=new T.Vector3(),n=new T.Vector3(),color=new T.Color();
 function part(g,c,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
  const raw=g.index?g.toNonIndexed():g;if(raw!==g)g.dispose();
  obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);obj.rotation.set(rx,ry,rz);obj.updateMatrix();normal.getNormalMatrix(obj.matrix);color.setHex(c);
  const a=raw.attributes.position,b=raw.attributes.normal;
  for(let i=0;i<a.count;i++){
   p.fromBufferAttribute(a,i).applyMatrix4(obj.matrix);n.fromBufferAttribute(b,i).applyMatrix3(normal).normalize();
   positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);colors.push(color.r,color.g,color.b);
  }raw.dispose();
 }
 const box=(x,y,z,w,h,d,c=C.cream,ry=0)=>part(new T.BoxGeometry(1,1,1),c,x,y,z,w,h,d,0,ry);
 const roof=(x,y,z,w,d,c=C.roof)=>part(new T.CylinderGeometry(0,1,1,4,1),c,x,y,z,w,1.6,d,0,Math.PI/4);
 const sphere=(x,y,z,w,h,d,c)=>part(new T.SphereGeometry(1,16,10),c,x,y,z,w,h,d);
 const pole=(x,y,z,r,h,c=C.white)=>part(new T.CylinderGeometry(r,r,h,8),c,x,y,z);
 function beam(a,b,r,c=C.white){
  const start=new T.Vector3(...a),end=new T.Vector3(...b),dir=end.clone().sub(start),mid=start.clone().add(end).multiplyScalar(.5);
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir.clone().normalize());
  const e=new T.Euler().setFromQuaternion(q);part(new T.CylinderGeometry(r,r,dir.length(),6),c,mid.x,mid.y,mid.z,1,1,1,e.x,e.y,e.z);
 }
 function windows(x,y,z,w,h,rows=3,cols=6){
  for(let r=0;r<rows;r++)for(let j=0;j<cols;j++)box(x-w/2+(j+.5)*w/cols,y-h/2+(r+.5)*h/rows,z,w/cols*.42,h/rows*.48,.09,(r+j)%3===0?C.light:C.glass);
 }
 function pavilion(x=0,z=0,w=9){
  box(x,.4,z,w, .8,6,C.stone);for(const dx of [-1,1])for(const dz of [-1,1])pole(x+dx*w*.36,3,z+dz*2,.22,5,C.red);
  roof(x,6,z,w*.78,5,C.roof);
 }
 function palace(hotel=false){
  const floors=hotel?6:2,w=hotel?24:27;
  box(0,floors+1,0,w,floors*2,8,hotel?C.red:C.cream);
  for(let f=1;f<=floors;f++){
   box(0,f*2,4.3,w+1,.25,.8,C.gold);windows(0,f*2-.7,4.08,w-2,1.2,1,12);
  }
  roof(0,floors*2+2,0,w*.8,8,hotel?C.gold:C.roof);
  for(const s of [-1,1]){box(s*12,2,1,8,4,9,C.cream);roof(s*12,5,1,7,7,hotel?C.gold:C.roof);}
 }
 function tower(x,z,w,h){box(x,h/2,z,w,h,w,C.glass);for(let y=2;y<h;y+=2)box(x,y,z+w*.51,w,.12,.12,C.cream);box(x,h+.3,z,w*.8,.6,w*.8,C.dark);}
 function bridge(type){
  box(0,2,0,38,.7,4,type==='rainbow'?C.red:C.white);
  for(const x of [-16,0,16])box(x,.8,0,1.1,2,3,C.stone);
  if(type==='guandu'){
   for(const x of [-12,0,12])for(const z of [-1.7,1.7]){
    part(new T.TorusGeometry(5.7,.3,6,24,Math.PI),C.red,x,2.6,z);
    for(let i=-4;i<=4;i+=2){const y=Math.sqrt(5.7*5.7-i*i);beam([x+i,2.3,z],[x+i,2.6+y,z],.07,C.red);}
   }
  }else if(type==='rainbow'){
   part(new T.TorusGeometry(14,.4,6,32,Math.PI),C.red,0,2.5,0,1,.65,1);
   for(let x=-12;x<=12;x+=3)beam([x,2.5,0],[x,2.5+Math.sqrt(196-x*x)*.65,0],.06,C.white);
  }else{
   beam([-7,2,0],[-2,17,0],.55);beam([-2,17,0],[4,2,0],.4);
   for(let x=-17;x<=17;x+=3)beam([-2,16,0],[x,2.5,1.5],.06,C.white);
   for(let x=-14;x<=14;x+=7){box(x,.8,7,4,.8,2,C.white);pole(x,3,7,.05,4);}
  }
 }
 switch(kind){
 case 'gate':
  box(0,2,0,13,4,7,C.red);box(0,2,3.6,2.8,3.8,.2,C.dark);box(0,5,0,9,2,5,C.cream);roof(0,6.8,0,9,6,C.gold);roof(0,8,0,6,4,C.gold);break;
 case 'office':
  for(const s of [-1,1]){box(s*10,3,0,16,6,6,C.red);windows(s*10,3,3.05,15,5,3,9);}
  box(0,4,0,5,8,7,C.cream);box(0,10,0,3.3,7,3.5,C.red);box(0,14,0,4,1.2,4,C.cream);roof(0,15,0,3,3,C.red);pole(0,17,0,.06,3);break;
 case 'liberty':
  for(let x=-12;x<=12;x+=6){box(x,3.5,0,.7,7,1,C.white);roof(x,7.8,0,4,2,C.roof);}
  for(let x=-9;x<=9;x+=6){box(x,6,0,5.5,1.2,.8,C.white);roof(x,7.2,0,5,2,C.roof);}break;
 case 'hotel':palace(true);break;
 case 'museum':palace(false);box(0,.3,6,16,.6,6,C.white);break;
 case 'trail':
  for(let i=0;i<12;i++)box(-6+i, i*.4,.4*i,4,.35,1.6,C.stone);
  pavilion(7,4,7);for(const x of [-10,-6,12]){pole(x,2,-2,.35,4,C.wood);sphere(x,5,-2,2.5,4,2.5,C.leaf);}break;
 case 'digital':
  box(-7,4,0,12,8,11,C.cream);box(6,6,0,11,12,12,C.glass);
  for(let x=-11;x<=-2;x+=2)box(x,4,5.6,.4,7,.2,C.red);
  for(let y=2;y<12;y+=2)box(6,y,6.1,10,.6,.2,C.light);break;
 case 'guandu':case 'rainbow':case 'lovers':bridge(kind);break;
 case 'spring':
  sphere(0,0,0,12,1,8,C.stone);sphere(0,.65,0,9,.2,6,0x6cc3b1);
  for(let i=0;i<7;i++)sphere(-5+i*1.5,1.3+(i%3)*.7,-2,1.3,1.7,1,0xc8d9c9);
  pavilion(11,0,6);break;
 case 'wheel':
  part(new T.TorusGeometry(9,.26,6,48),C.roof,0,11,0);
  for(let i=0;i<16;i++){const a=i*Math.PI/8,x=Math.sin(a)*9,y=11+Math.cos(a)*9;
   beam([0,11,0],[x,y,0],.065,C.white);box(x,y-.5,0,1.2,1.2,1.4,i%2?C.red:C.gold);}
  for(const s of [-1,1])beam([s*5,0,1],[0,11,0],.35,C.cream);box(0,.4,0,13,.8,7,C.dark);break;
 case 'dome':box(0,1.4,0,28,2.8,17,C.cream);sphere(0,2.5,0,15,5,9,0xaab6b8);break;
 case 'chimney':
  box(0,1.6,0,19,3.2,8,C.red);roof(0,3.5,0,14,6,C.dark);pole(6,7,-3,1.0,14,C.red);pole(6,14,-3,1.3,.5,C.cream);windows(0,1.6,4.1,17,2,1,10);break;
 case 'fort':
  box(0,3,0,14,6,9,C.red);for(const x of [-6,6])for(const z of [-3.7,3.7])box(x,4,z,2,8,2,C.red);
  windows(0,3,4.6,12,4,2,5);for(let x=-7;x<=7;x+=2)box(x,6.4,4,1,.8,1,C.cream);pole(5,10,0,.08,5);break;
 case 'pier':
  box(0,1,0,27,.5,6,C.wood);for(let x=-12;x<=12;x+=3){pole(x,0,2,.18,2,C.wood);pole(x,0,-2,.18,2,C.wood);}
  pavilion(5,0,8);for(const x of [-7,1]){box(x,.4,7,6,.8,2.4,C.white);box(x,1.2,7,3,1,2,C.glass);}break;
 case 'volcano':
  sphere(0,0,0,14,8,10,C.stone);sphere(-3,5,3,4,1.3,3,0xd8cc8e);
  for(let i=0;i<6;i++)sphere(-3+i*.3,6+i*1.3,3,1.1+i*.22,1.3,1.2,0xc8d9cb);break;
 case 'pavilion':sphere(0,-1,0,16,2,12,C.leaf);pavilion();break;
 case 'market':
  for(const x of [-8,8])box(x,4,0,1.4,8,2,C.red);box(0,6.5,0,18,1.7,2,C.gold);
  roof(0,8.5,0,14,3,C.gold);for(let x=-6;x<=6;x+=3)sphere(x,5,0,.55,.75,.55,C.red);
  for(const s of [-1,1])for(let i=0;i<4;i++){box(s*11,1.4,-i*4,4,2.8,3,C.wood);roof(s*11,3,-i*4,3,3,C.red);}break;
 case 'tech':case 'skyline':
  for(let i=0;i<5;i++)tower((i-2)*6,(i%2)*5,4.5,9+(i*7)%15);break;
 case 'village':
  for(let i=0;i<6;i++){const x=(i%3-1)*7,z=Math.floor(i/3)*7;box(x,1.6,z,6,3.2,5,C.cream);roof(x,3.5,z,4.8,4.3,C.red);windows(x,1.6,z+2.6,5,2,1,3);}break;
 case 'lighthouse':
  for(let i=0;i<6;i++)part(new T.CylinderGeometry(2.3-i*.1,2.4-i*.1,2,8),i%2?C.dark:C.white,0,1+i*2,0);
  part(new T.CylinderGeometry(2.5,2.5,.4,8),C.dark,0,12.2,0);pole(0,13.1,0,1.6,1.7,C.glass);roof(0,14.5,0,2.3,2.3,C.dark);box(5,1.4,0,6,2.8,5,C.white);break;
 case 'teahouse':
  for(let f=0;f<4;f++){box(0,1.2+f*2.5,f*.6,18-f*2,2.4,7,C.wood);roof(0,2.7+f*2.5,f*.6,14-f*1.4,6,C.roof);
   for(let x=-7+f;x<=7-f;x+=2){box(x,1.8+f*2.5,3.6+f*.6,.7,1.2,.1,C.light);sphere(x,.8+f*2.5,4+f*.6,.4,.6,.4,C.red);}}
  break;
 case '101':
  box(0,2,0,12,4,12,C.glass);box(0,6,0,7,4,7,C.glass);
  for(let i=0;i<8;i++){const y=9+i*3.2;part(new T.CylinderGeometry(5.3,4.4,3,4),C.glass,0,y,0,1,1,1,0,Math.PI/4);box(0,y+1.5,0,7.6,.25,7.6,C.cream);}
  box(0,36,0,3.2,7,3.2,C.glass);pole(0,42,0,.2,6,C.white);break;
 case 'gondola':
  for(const x of [-13,13]){pole(x,6,0,.35,12);box(x,12,0,5,.4,2,C.white);}
  for(const z of [-1,1])beam([-18,12,z],[18,12,z],.055,C.dark);
  for(const x of [-8,0,8]){beam([x,12,1],[x,10,1],.08);box(x,9,1,2,2,2,C.white);box(x,9.5,2.05,1.6,.8,.1,C.glass);}break;
 case 'tea':
  for(let i=0;i<7;i++)box(0,.6+i*.32,-i*2,24,1,1.3,C.leaf);
  box(0,2,5,17,.4,5,C.wood);for(let x=-8;x<=8;x+=2)pole(x,2.7,7,.08,1.4,C.wood);beam([-8,3.3,7],[8,3.3,7],.1,C.wood);pavilion(5,4,6);break;
 default:throw new Error('Unknown Taipei landmark: '+kind);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
function createTaipeiLandmarks(T,scene,sample,offset){
 let route=null,items=[],disposed=false;
 const clear=()=>{for(const item of items){scene.remove(item.mesh);item.mesh.geometry.dispose();item.mesh.material.dispose();}items=[];};
 function update(frame,points){
  if(disposed)return;
  const source=frame.landmarks||[],signature=(frame.routeId||'')+':'+source.map(h=>h.id).join('|');
  if(signature!==route){
   clear();route=signature;
   for(const h of source){const model=ROUTE_MODELS[frame.routeId]?.[h.modelIndex];if(!model)continue;
    const geometry=createLandmarkGeometry(T,model),bounds=geometry.boundingBox;
    const height=Math.min(68,Math.max(12,(h.heightWorld||5000)/260));
    const scale=height/Math.max(1,bounds.max.y-bounds.min.y);
    const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:.12,transparent:true}));
    mesh.name='Taipei_'+h.id+'_'+model;mesh.userData.landmarkName=h.name;mesh.scale.setScalar(scale);mesh.visible=false;scene.add(mesh);
    items.push({mesh,id:h.id,scale,halfWidth:Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x))*scale,
     halfDepth:Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z))*scale,bottom:bounds.min.y*scale});
   }
  }
  const placements=[];
  for(const item of items){
   const h=source.find(h=>h.id===item.id);if(!h){item.mesh.visible=false;continue;}
   const distance=h.seg-frame.segment;
   if(distance< -14||distance>124){item.mesh.visible=false;continue;}
   const i=Math.max(0,Math.min(points.length-2,distance));
   const radius=Math.ceil(item.halfDepth/2.7)+2;
   const lanes=(frame.corridors||[]).slice(Math.max(0,i-radius),Math.min(points.length,i+radius+1)).flat();
   // Visual-only landmarks never straddle the race surface, even gondolas.
   const lateral=offset(lanes,h.side<0?-1:1,item.halfWidth*2,5);
   const anchor=sample(points,distance,lateral),drop=Math.max(0,Number(h.groundDrop)||0)/260;
   item.mesh.position.set(anchor.x,anchor.y-item.bottom-drop,anchor.z);item.mesh.rotation.y=-anchor.heading;
   item.mesh.visible=true;item.mesh.material.opacity=Math.min(1,(125-distance)/14,(distance+15)/8);
   item.mesh.material.emissive.setHex(frame.night?0x1a2531:0);item.mesh.material.emissiveIntensity=.25;
   placements.push({id:h.id,lateral,halfWidth:item.halfWidth,distance});
  }
  return placements;
 }
 return {update,dispose(){if(disposed)return;disposed=true;clear();},get count(){return items.length;}};
}
module.exports={ROUTE_MODELS,createLandmarkGeometry,createTaipeiLandmarks};
