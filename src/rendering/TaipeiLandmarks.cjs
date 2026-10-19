'use strict';
const {landmarkLayout}=require('./DistrictGeography.cjs');
// Original low-poly interpretations of the authored 2D landmarks. Names/order
// come from stageLandmarkPlan; this catalog supplies geometry, never route rules.
const ROUTE_MODELS=Object.freeze({
 '1A':['gate','office','liberty'], '2A':['hotel','trail'], '2B':['digital'],
 '3A':['guandu','spring'], '3B':['wheel','museum'], '3C':['dome','chimney'],
 '4A':['fort','pier'], '4B':['volcano','pavilion'], '4C':['market','tech','rainbow'],
 '4D':['village','skyline'], '5A':['danjiang','lovers'], '5B':['lighthouse'],
 '5C':['teahouse'], '5D':['101'], '5E':['gondola','tea']
});
const C={cream:0xe5d8b8,red:0xb43f38,roof:0x316963,gold:0xdbac52,glass:0x659ba7,
 dark:0x243442,white:0xe7eeea,wood:0x6c4e37,leaf:0x528455,stone:0x77827a,light:0xffcc73};
function createLandmarkGeometry(T,kind){
 const positions=[],normals=[],colors=[],roles=[];
 const obj=new T.Object3D(),normal=new T.Matrix3(),p=new T.Vector3(),n=new T.Vector3(),color=new T.Color();
 function part(g,c,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,role=null){
  const raw=g.index?g.toNonIndexed():g;if(raw!==g)g.dispose();
  obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);obj.rotation.set(rx,ry,rz);obj.updateMatrix();normal.getNormalMatrix(obj.matrix);color.setHex(c);
  const a=raw.attributes.position,b=raw.attributes.normal;
  for(let i=0;i<a.count;i++){
   p.fromBufferAttribute(a,i).applyMatrix4(obj.matrix);n.fromBufferAttribute(b,i).applyMatrix3(normal).normalize();
   positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);colors.push(color.r,color.g,color.b);
   roles.push(role??(c===C.glass?1:c===C.light?4:c===C.leaf?5:c===C.roof?3:c===C.gold||c===C.dark||c===0xaab6b8?2:0));
  }raw.dispose();
 }
 const box=(x,y,z,w,h,d,c=C.cream,ry=0)=>part(new T.BoxGeometry(1,1,1),c,x,y,z,w,h,d,0,ry);
 // Hipped roof with projecting eaves, replacing the generic four-sided cone.
 function roof(x,y,z,w,d,c=C.roof){
  w*=.75;d*=.75;const rise=Math.max(1.2,Math.min(4,w*.25));
  const v=[],lower=[[-w,-d],[w,-d],[w,d],[-w,d]],upper=[[-w*.62,-d*.12],[w*.62,-d*.12],[w*.62,d*.12],[-w*.62,d*.12]];
  for(let i=0;i<4;i++){const j=(i+1)%4,a=lower[i],b=lower[j],q=upper[i],r=upper[j];v.push(a[0],0,a[1],b[0],0,b[1],r[0],rise,r[1],a[0],0,a[1],r[0],rise,r[1],q[0],rise,q[1]);}
  v.push(-w*.62,rise,-d*.12,w*.62,rise,-d*.12,w*.62,rise,d*.12,-w*.62,rise,-d*.12,w*.62,rise,d*.12,-w*.62,rise,d*.12);
  for(let i=0;i<v.length;i+=9)for(let j=0;j<3;j++){const a=v[i+3+j];v[i+3+j]=v[i+6+j];v[i+6+j]=a;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();part(g,c,x,y,z,1,1,1);
  box(x,y-.12,z,w*2.06,.20,d*2.06,c);
 }
 function bevel(w0,w1,h,d0=w0,d1=w1){
  const ring=(w,d)=>[[-w*.5,-d*.38],[-w*.38,-d*.5],[w*.38,-d*.5],[w*.5,-d*.38],[w*.5,d*.38],[w*.38,d*.5],[-w*.38,d*.5],[-w*.5,d*.38]];
  const a=ring(w0,d0),b=ring(w1,d1),v=[];
  for(let i=0;i<8;i++){const j=(i+1)%8;v.push(a[i][0],-h/2,a[i][1],a[j][0],-h/2,a[j][1],b[j][0],h/2,b[j][1],a[i][0],-h/2,a[i][1],b[j][0],h/2,b[j][1],b[i][0],h/2,b[i][1]);
   v.push(0,-h/2,0,a[j][0],-h/2,a[j][1],a[i][0],-h/2,a[i][1],0,h/2,0,b[i][0],h/2,b[i][1],b[j][0],h/2,b[j][1]);}
  for(let i=0;i<v.length;i+=9)for(let j=0;j<3;j++){const a=v[i+3+j];v[i+3+j]=v[i+6+j];v[i+6+j]=a;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();return g;
 }
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
  const span=type==='lovers'?46:40,half=span/2;
  box(0,2.2,0,span,.55,4.8,C.stone);
  for(const x of [-half,half]){box(x,.5,0,4,3,7,C.stone);box(x,2.7,0,6,.35,8,C.cream);}
  for(const side of [-1,1]){
   beam([-half,3.3,side*2.35],[half,3.3,side*2.35],.075,C.white);
   for(let x=-half;x<=half;x+=1.5)beam([x,2.5,side*2.35],[x,3.3,side*2.35],.04,C.white);
  }
  if(type==='guandu'){
   for(const center of [-13,0,13])for(const side of [-1,1]){
    const z=side*2.5;
    for(let i=0;i<24;i++){
     const a=i*Math.PI/24,b=(i+1)*Math.PI/24;
     beam([center+6.5*Math.cos(a),2.7+7*Math.sin(a),z],[center+6.5*Math.cos(b),2.7+7*Math.sin(b),z],.23,C.red);
    }
    for(let x=-5;x<=5;x+=1.25)beam([center+x,2.5,z],[center+x,2.7+7*Math.sqrt(1-(x/6.5)**2),z],.055,C.red);
   }
   for(const x of [-6.5,6.5])box(x,.4,0,1.2,4.2,5.7,C.stone);
  }else if(type==='rainbow'){
   for(let i=0;i<32;i++){
    const a=i*Math.PI/32,b=(i+1)*Math.PI/32;
    beam([19*Math.cos(a),2.7+11*Math.sin(a),-1],[19*Math.cos(b),2.7+11*Math.sin(b),-1],.32,C.red);
   }
   for(let x=-17;x<=17;x+=2.5)beam([x,2.5,1.8],[x,2.7+11*Math.sqrt(1-(x/19)**2),-1],.065,C.white);
  }else{
   beam([-6,2.4,0],[-1,24,0],.52,C.white);beam([4,2.4,0],[-1,24,0],.35,C.white);
   for(const side of [-1,1])for(let x=-21;x<=21;x+=3)beam([-1,23,side*.15],[x,2.5,side*2.1],.045,C.white);
   for(const x of [-17,-9,9,17]){box(x,.4,9,5,.7,2.3,C.white);box(x,1.2,9,2.5,1.2,2,C.glass);pole(x,3,9,.045,5,C.dark);}
   box(-24,.2,0,8,.4,13,C.stone);box(24,.2,0,8,.4,13,C.stone);
  }
 }

 switch(kind){
 case 'gate':
  box(0,2,0,13,4,7,C.red);box(0,2,3.6,2.8,3.8,.2,C.dark);box(0,5,0,9,2,5,C.cream);roof(0,6.8,0,9,6,C.gold);roof(0,8,0,6,4,C.gold);break;
 case 'office':
  box(0,.35,0,43,.7,15,C.stone);
  for(const side of [-1,1]){
   box(side*12,4.6,0,19,8.4,10,C.red);
   for(const y of [1.1,3.6,6.1,8.7])box(side*12,y,5.08,19.2,.28,.22,C.cream);
   windows(side*12,4.5,5.15,17.5,6.8,3,9);
   for(let x=3;x<=21;x+=3)box(side*x,4.6,5.24,.28,7.8,.18,C.cream);
   roof(side*12,9,0,13.4,7.6,C.dark);
   box(side*19.5,5,0,4.2,9,12,C.red);roof(side*19.5,9.7,0,3.6,8.3,C.dark);
  }
  box(0,5.1,1,6,9.8,12,C.cream);box(0,12,0,4.8,9,5.6,C.red);
  for(const y of [8,10,12,14,16])box(0,y,2.9,5.1,.3,.2,C.cream);
  windows(0,11.8,2.96,3.8,6.6,3,3);box(0,17,0,5.8,1.2,6.3,C.cream);
  part(new T.CircleGeometry(.7,20),C.cream,0,15.8,3.05);beam([0,15.8,3.12],[0,16.3,3.12],.04,C.dark);beam([0,15.8,3.12],[.35,15.8,3.12],.04,C.dark);
  roof(0,17.6,0,4.15,4.55,C.dark);pole(0,20.3,0,.055,3,C.dark);
  box(0,3,6.5,3.6,4.8,1,C.dark);for(const x of [-2.2,2.2])pole(x,3.4,7,.25,5.4,C.cream);
  box(0,6.3,7,6.2,.45,2.7,C.cream);break;
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
 case 'danjiang':
  box(0,2.5,0,76,.8,7,C.stone);
  for(const x of [-35,-16,17,35])box(x,.4,0,1.7,4.5,5,C.stone);
  const towerLegs=[[[-17,2.8,-.8],[-16,11,-.4],[-15,22,0],[-14,30,.1],[-12,34,-.8]],[[-8,2.8,1],[-9,11,1.3],[-10.7,23,1],[-11.5,31,0],[-12,34,-.8]]];
  for(const [index,leg] of towerLegs.entries())for(let i=0;i<leg.length-1;i++)beam(leg[i],leg[i+1],index?.55:.8,C.white);
  for(const z of [-3,3])for(let x=-35;x<=35;x+=3.5)beam([-12,32.5,-.8],[x,3,z],.045,C.white);
  for(const z of [-3.5,3.5])beam([-38,3.8,z],[38,3.8,z],.08,C.white);
  for(const x of [-38,38])box(x,1.5,0,5,3.2,11,C.stone);
  break;
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
 case 'dome':{
  box(0,.3,0,53,.6,40,C.stone);
  part(new T.CylinderGeometry(1,1,4.2,64),C.glass,0,2.6,0,23,1,16);
  part(new T.SphereGeometry(1,48,18,0,Math.PI*2,0,Math.PI/2),0xaab6b8,0,4.7,0,24,8.4,17);
  const at=(theta,phi)=>[24*Math.sin(theta)*Math.cos(phi),4.7+8.4*Math.cos(theta),17*Math.sin(theta)*Math.sin(phi)];
  for(let ring=1;ring<=4;ring++)for(let j=0;j<48;j++)beam(at(ring*Math.PI/8,j*Math.PI/24),at(ring*Math.PI/8,(j+1)*Math.PI/24),.045,C.dark);
  for(let j=0;j<24;j++)for(let k=0;k<10;k++)beam(at(k*Math.PI/20,j*Math.PI/12),at((k+1)*Math.PI/20,j*Math.PI/12),.04,C.white);
  for(let j=0;j<48;j++){const phi=j*Math.PI/24;pole(22.8*Math.cos(phi),2.5,15.8*Math.sin(phi),.13,4.4,C.cream);}
  for(const z of [-18,18]){box(0,.8,z,34,.4,3.5,C.cream);box(0,1.2,z,31,.4,2.4,C.stone);}
  break;}
 case 'chimney':
  box(0,1.6,0,19,3.2,8,C.red);roof(0,3.5,0,14,6,C.dark);pole(6,7,-3,1.0,14,C.red);pole(6,14,-3,1.3,.5,C.cream);windows(0,1.6,4.1,17,2,1,10);break;
 case 'fort':
  box(0,.3,0,20,.6,14,C.stone);box(0,3.4,0,15,6.4,10,C.red);
  windows(0,3.5,5.06,12.8,4.8,2,6);for(const y of [.9,3.3,6.6])box(0,y,5.12,15.3,.18,.2,C.cream);
  box(0,6.8,0,15.6,.4,10.6,C.red);box(0,3,5.2,2.4,4,.2,C.dark);pole(5,9,0,.055,4.5,C.dark);break;
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
 case '101':{
  box(0,.45,0,19,.9,19,C.stone);part(bevel(15,13,5),C.glass,0,3.2,0);part(bevel(9.2,8,5),C.glass,0,8,0);
  for(let i=0;i<8;i++){
   const y=12+i*4.9;part(bevel(7.1,8.5,4.7),C.glass,0,y,0);
   part(bevel(8.65,8.65,.25),C.dark,0,y+2.38,0);
   for(let row=0;row<7;row++){
    const yy=y-1.95+row*.60,w=7.25+(yy-y+2.35)/4.7*1.4;
    for(const side of [-1,1]){box(0,yy,side*w/2,w*.76,.045,.045,C.dark);box(side*w/2,yy,0,.045,.045,w*.76,C.dark);}
   }
   for(const side of [-1,1])for(let x=-2.4;x<=2.41;x+=.8){
    beam([x,y-2.2,side*3.6],[x*1.13,y+2.2,side*4.2],.022,C.white);
    beam([side*3.6,y-2.2,x],[side*4.2,y+2.2,x*1.13],.022,C.white);
   }
  }
  part(bevel(6,4.8,5),C.glass,0,52,0);box(0,56,0,3,3,3,C.glass);pole(0,61,0,.17,8,C.white);
  for(const side of [-1,1])for(const z of [-1,1])part(new T.TorusGeometry(.6,.12,6,16),C.gold,side*4.1,10.3,z*3.7);
  break;}
 case 'gondola':{
  const cableY=x=>20+x*.20-2.1*(1-(x/27)**2);
  for(const x of [-27,0,27]){
   const top=cableY(x)+.3;
   for(const z of [-1.5,1.5]){beam([x-1.2,0,z],[x-.4,top,z],.20,C.white);beam([x+1.2,0,z],[x+.4,top,z],.20,C.white);
    for(let y=2;y<top-1;y+=2.5){beam([x-1,y,z],[x+1,y+2,z],.07,C.dark);beam([x+1,y,z],[x-1,y+2,z],.07,C.dark);}}
   box(x,top,0,6,.35,6,C.white);
   for(const z of [-2,2])for(const dx of [-1.8,0,1.8])part(new T.CylinderGeometry(.3,.3,.25,12),C.dark,x+dx,top+.22,z,1,1,1,Math.PI/2);
  }
  for(const z of [-2,2])for(let x=-27;x<27;x+=1.5)beam([x,cableY(x),z],[x+1.5,cableY(x+1.5),z],.042,C.dark);
  for(const x of [-19,-6,9,21])for(const z of [-2,2]){
   const y=cableY(x)-2.4;
   beam([x,cableY(x),z],[x,y+.4,z],.07,C.dark);
   part(bevel(2.1,2.35,1.5,2.3,2.5),C.glass,x,y-.6,z);
   part(bevel(1.8,2.1,.65,2.1,2.3),x<0?C.white:C.roof,x,y-1.65,z);
   box(x,y+.2,z,2.45,.18,2.6,C.white);
   for(const side of [-1,1])box(x+side*.95,y-.55,z+1.24,.10,1.4,.05,C.white);
   box(x,y-.6,z+1.28,.07,1.5,.05,C.dark);
  }
  break;}
 case 'tea':
  for(let i=0;i<7;i++)box(0,.6+i*.32,-i*2,24,1,1.3,C.leaf);
  box(0,2,5,17,.4,5,C.wood);for(let x=-8;x<=8;x+=2)pole(x,2.7,7,.08,1.4,C.wood);beam([-8,3.3,7],[8,3.3,7],.1,C.wood);pavilion(5,4,6);break;
 default:throw new Error('Unknown Taipei landmark: '+kind);
 }
 const geometry=new T.BufferGeometry(),pos=[],nor=[],col=[];
 for(let role=0;role<6;role++){
  const start=pos.length/3;
  for(let i=0;i<roles.length;i++)if(roles[i]===role){pos.push(...positions.slice(i*3,i*3+3));nor.push(...normals.slice(i*3,i*3+3));col.push(...colors.slice(i*3,i*3+3));}
  if(pos.length/3>start)geometry.addGroup(start,pos.length/3-start,role);
 }
 geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));
 geometry.setAttribute('normal',new T.Float32BufferAttribute(nor,3));
 geometry.setAttribute('color',new T.Float32BufferAttribute(col,3));geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData={kind,revision:'V95',source:'original authored geometry'};return geometry;
}
function createLandmarkMaterials(T){
 return [
  {roughness:.91,metalness:0}, {roughness:.21,metalness:.40,envMapIntensity:1.15},
  {roughness:.40,metalness:.65,envMapIntensity:.8}, {roughness:.82,metalness:.08},
  {roughness:.48,metalness:0,emissive:0xffd29a,emissiveIntensity:.25}, {roughness:1,metalness:0}
 ].map(p=>new T.MeshStandardMaterial({vertexColors:true,transparent:true,...p}));
}

function createTaipeiLandmarks(T,scene,sample,offset){
 let route=null,items=[],disposed=false;
 const clear=()=>{for(const item of items){scene.remove(item.mesh);item.mesh.geometry.dispose();for(const m of item.mesh.material)m.dispose();}items=[];};
 function update(frame,points){
  if(disposed)return;
  const source=frame.landmarks||[],signature=(frame.routeId||'')+':'+source.map(h=>h.id).join('|');
  if(signature!==route){
   clear();route=signature;
   for(const h of source){const model=ROUTE_MODELS[frame.routeId]?.[h.modelIndex];if(!model)continue;
    const geometry=createLandmarkGeometry(T,model),bounds=geometry.boundingBox;
    const layout=landmarkLayout(frame,h,model);
    const height=layout.height||Math.min(68,Math.max(12,(h.heightWorld||5000)/260));
    const scale=height/Math.max(1,bounds.max.y-bounds.min.y);
    const stretch=layout.span>0?Math.max(1,layout.span/Math.max(1,(bounds.max.x-bounds.min.x)*scale)):1;
    const mesh=new T.Mesh(geometry,createLandmarkMaterials(T));
    mesh.name='Taipei_'+h.id+'_'+model;mesh.userData.landmarkName=h.name;mesh.scale.set(scale*stretch,scale,scale);mesh.visible=false;scene.add(mesh);
    items.push({mesh,id:h.id,kind:model,scale,halfWidth:Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x))*scale*stretch,
     halfDepth:Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z))*scale,bottom:bounds.min.y*scale});
   }
  }
  const placements=[];
  for(const item of items){
   const h=source.find(h=>h.id===item.id);if(!h){item.mesh.visible=false;continue;}
   const distance=h.seg-frame.segment;
   if(distance< -14||distance>124){item.mesh.visible=false;continue;}
   const i=Math.max(0,Math.min(points.length-2,distance));
   const layout=landmarkLayout(frame,h,item.kind);
   const extentX=Math.abs(Math.cos(layout.yaw))*item.halfWidth+Math.abs(Math.sin(layout.yaw))*item.halfDepth;
   const extentZ=Math.abs(Math.sin(layout.yaw))*item.halfWidth+Math.abs(Math.cos(layout.yaw))*item.halfDepth;
   const radius=Math.ceil(extentZ/2.7)+2;
   const lanes=(frame.corridors||[]).slice(Math.max(0,i-radius),Math.min(points.length,i+radius+1)).flat();
   // Visual-only landmarks never straddle the race surface, even gondolas.
   const lateral=offset(lanes,h.side<0?-1:1,extentX*2,layout.margin);
   const anchor=sample(points,distance,lateral),drop=Math.max(0,Number(h.groundDrop)||0)/260;
   item.mesh.position.set(anchor.x,anchor.y-item.bottom-drop,anchor.z);item.mesh.rotation.y=-anchor.heading+layout.yaw;
   item.mesh.visible=true;
   for(const [index,material] of item.mesh.material.entries()){
    material.opacity=Math.min(1,(125-distance)/14,(distance+15)/8);
    material.emissive.setHex(index===4?0xffd29a:0);material.emissiveIntensity=index===4?(frame.night?.65:.04):0;
   }
   placements.push({id:h.id,lateral,halfWidth:extentX,distance,yaw:layout.yaw,kind:item.kind});
  }
  return placements;
 }
 return {update,dispose(){if(disposed)return;disposed=true;clear();},get count(){return items.length;}};
}
module.exports={ROUTE_MODELS,createLandmarkGeometry,createLandmarkMaterials,createTaipeiLandmarks};
