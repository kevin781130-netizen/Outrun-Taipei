'use strict';
const {inLandmarkVista}=require('./ScenicVisibility.cjs');
// Surface-aware scenery and race readability. All coordinates use the road
// tangent; every roadside object clears the full authored fork envelope.
function createRaceEnvironment(T,scene,sample,offset,doc){
 const geometries=[],materials=[],textures=[],meshes=[];
 const geo=g=>(geometries.push(g),g),mat=m=>(materials.push(m),m);
 const add=m=>(scene.add(m),meshes.push(m),m);
 function ribbon(color,quads=252){
  const g=geo(new T.BufferGeometry()),a=new T.BufferAttribute(new Float32Array(quads*18),3);a.setUsage(T.DynamicDrawUsage);g.setAttribute('position',a);const normals=new Float32Array(a.array.length);for(let i=1;i<normals.length;i+=3)normals[i]=1;g.setAttribute('normal',new T.BufferAttribute(normals,3));g.setDrawRange(0,0);
  const material=mat(new T.MeshStandardMaterial({color,roughness:.95,side:T.DoubleSide}));
  const mesh=add(new T.Mesh(g,material));mesh.frustumCulled=false;return {mesh,a,used:0};
 }
 const land=ribbon(0x526c51,504),water=ribbon(0x337f99),walk=ribbon(0x9b9181),deck=ribbon(0x64727e,504);
 deck.mesh.name='Race_ExpresswayDeck';water.mesh.name='Race_GeographicWater';land.mesh.name='Race_GeographicLand';
 function quad(r,a,b,c,d){if(r.used+18>r.a.array.length)return;r.a.array.set([a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z,a.x,a.y,a.z,c.x,c.y,c.z,d.x,d.y,d.z],r.used);r.used+=18;}
 const cube=geo(new T.BoxGeometry(1,1,1)),hill=geo(new T.SphereGeometry(1,10,6));
 function pool(g,color,size){const m=add(new T.InstancedMesh(g,mat(new T.MeshStandardMaterial({color,roughness:.9})),size));m.frustumCulled=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.count=0;return m;}
 const rails=pool(cube,0xc3c7be,600),supports=pool(cube,0x77828a,100),hills=pool(hill,0x49705b,40);
 const rocks=pool(hill,0x5f6260,64),teaRows=pool(cube,0x497745,160),houses=pool(cube,0xb18165,100),terraces=pool(cube,0x635e52,160),boats=pool(cube,0xe2e0cc,32),piers=pool(cube,0x8f7e63,32),waves=pool(cube,0xd6e9e7,64);
 const extras=[rocks,teaRows,houses,terraces,boats,piers,waves];
 ['Rocks','TeaRows','SlopeHouses','Terraces','Boats','Piers','Waves'].forEach((name,i)=>extras[i].name='Race_'+name);
 supports.name='Race_Supports';hills.name='Race_Hills';
 const markerGeo=geo(new T.PlaneGeometry(1,1));let tex=null;
 if(doc?.createElement){const c=doc.createElement('canvas');c.width=128;c.height=128;const ctx=c.getContext('2d');if(ctx){
  ctx.fillStyle='#f8d256';ctx.fillRect(0,0,128,128);ctx.fillStyle='#132632';ctx.beginPath();ctx.moveTo(28,15);ctx.lineTo(68,15);ctx.lineTo(104,64);ctx.lineTo(68,113);ctx.lineTo(28,113);ctx.lineTo(64,64);ctx.closePath();ctx.fill();
  tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;textures.push(tex);
 }}
 const arrows=add(new T.InstancedMesh(markerGeo,mat(new T.MeshBasicMaterial({map:tex,color:tex?0xffffff:0xf8d256,side:T.DoubleSide})),32));arrows.frustumCulled=false;arrows.instanceMatrix.setUsage(T.DynamicDrawUsage);
 const dummy=new T.Object3D();
 function put(mesh,p,w,h,d,heading=0,roll=0){if(mesh.count>=mesh.instanceMatrix.count)return;
  dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,-heading,roll);dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(mesh.count++,dummy.matrix);}
 let disposed=false;
 function update(frame,points,quality){
  if(disposed)return;
  for(const r of [land,water,walk,deck])r.used=0;
  for(const m of [rails,supports,hills,arrows,...extras])m.count=0;
  const arch=frame.archetype,coast=arch==='coastal',highway=arch==='expressway',mountain=arch==='mountain';
  land.mesh.material.color.set(frame.groundColor||'#526c51');
  hills.material.color.set(frame.mountainColor||'#49705b');
  const waterKind=frame.geography?.find(s=>s.water!=='none')?.water;
  water.mesh.material.color.setHex(frame.night?0x193d60:({river:0x587f79,estuary:0x4e8d91,marina:0x447d9b,sea:0x287daa,'distant-sea':0x547e9a}[waterKind]||0x337f99));water.mesh.material.roughness=.38;
  const kinds=new Set();water.mesh.userData.kinds=[];
  const lanesAt=i=>frame.corridors?.[Math.max(0,Math.min(125,i))]||[{center:0,half:1}];
  for(let i=0;i<points.length-1;i++){
   const absolute=(frame.segment||0)+i;
   const lanes=lanesAt(i),next=lanesAt(i+1),district=frame.geography?.[i];
   const isHigh=district?district.elevated:highway,kind=district?.water||(coast?'sea':'none');
   const height=isHigh?(frame.deckHeights?.[i]||0)/260:0;
   if(kind!=='none')kinds.add(kind);
   for(const side of [-1,1]){
    const a=offset(lanes,side,0,0),b=offset(next,side,0,0);
    const outer=side*180;
    const p=(index,x,y)=>{const p=sample(points,index,x);p.y+=y;return p;};
    // Water type controls finite river banks, sheltered harbor or open sea.
    if(district&&side<0&&kind!=='none'){
     const far=kind==='river'?48:kind==='estuary'?120:kind==='marina'?38:700;
     const near=kind==='distant-sea'?75:8,drop=kind==='distant-sea'?18:.65;
     quad(land,p(i,a+side*1.8,-.25-height),p(i,a+side*near,(kind==='distant-sea'?-drop:-.25)-height),p(i+1,b+side*near,(kind==='distant-sea'?-drop:-.25)-height),p(i+1,b+side*1.8,-.25-height));
     quad(water,p(i,a+side*near,-drop-height),p(i,a+side*far,-drop-height),p(i+1,b+side*far,-drop-height),p(i+1,b+side*near,-drop-height));
     if(far<180)quad(land,p(i,a+side*far,-.25-height),p(i,a+side*180,-.25-height),p(i+1,b+side*180,-.25-height),p(i+1,b+side*far,-.25-height));
    }else quad(!district&&coast&&side<0?water:land,p(i,a+side*1.8,-.25-height),p(i,a+outer,-.25-height),p(i+1,b+outer,-.25-height),p(i+1,b+side*1.8,-.25-height));
    quad(walk,p(i,a,-.03),p(i,a+side*1.8,-.03),p(i+1,b+side*1.8,-.03),p(i+1,b,-.03));
    if(district?(isHigh||kind!=='none'||district.hillSides.length>0):(highway||coast||mountain)){
     const here=sample(points,i,a+side*.8),there=sample(points,i+1,b+side*.8),mid={x:(here.x+there.x)/2,y:(here.y+there.y)/2+.57,z:(here.z+there.z)/2};
     const heading=Math.atan2(there.x-here.x,-(there.z-here.z));
     put(rails,mid,.16,.32,Math.hypot(there.x-here.x,there.z-here.z)+.08,heading);
     if(absolute%4===0)put(supports,{...here,y:here.y+.3},.15,.65,.15,heading);
    }
    if((district?district.hillSides.includes(side):mountain)&&absolute%12===0&&quality!=='LOW'&&!inLandmarkVista(frame.landmarks,absolute,side)){
     const p=sample(points,i,offset(lanes,side,22,16));p.y-=3;
     put(hills,p,12,8+(absolute%17),14,0);
    }
    if(district&&!inLandmarkVista(frame.landmarks,absolute,side)){
     if(district.id==='jiufen'&&absolute%12===0){
      for(let level=0;level<3;level++){
       const place=sample(points,i,offset(lanes,side,8,6+level*7));place.y+=level*3.0;
       const base=level*3.0+1.6;put(terraces,{...place,y:place.y-base/2},8,base,7,points[i].heading);
       put(houses,{...place,y:place.y+1.4},5.6,2.8,4.6,points[i].heading);
      }
     }
     if(district.id==='tea'&&absolute%8===0){
      for(let row=0;row<5;row++){const at=sample(points,i,offset(lanes,side,9,5+row*2));at.y+=.3+row*.4;put(teaRows,at,9,.6,1.0,points[i].heading);const base=row*.4+.5;put(terraces,{...at,y:at.y-.3-base/2},9,base,2.0,points[i].heading);}
     }
     if((district.id==='coast'||district.id==='volcanic')&&absolute%8===0){
      const at=sample(points,i,offset(lanes,side,2,3));put(rocks,{...at,y:at.y+.4},1.8,.9,2.0,points[i].heading);
     }
    }
    if(district&&side<0&&absolute%12===0){
     if(kind==='marina'){
      const at=sample(points,i,a-19);at.y-=.45;put(boats,at,1.6,.4,4,points[i].heading);
      const pier=sample(points,i,a-10);pier.y-=.2;put(piers,pier,9,.25,.8,points[i].heading);
     }
     if(kind==='sea')for(const distance of [15,35]){const at=sample(points,i,a-distance);at.y-=.58;put(waves,at,7,.045,.25,points[i].heading);}
    }
    if(Math.abs(frame.curves?.[i]||0)>1.35&&absolute%10===0&&Math.sign(frame.curves[i])===-side){
     const p=sample(points,i,offset(lanes,side,1.2,1.2));p.y+=1.9;
     put(arrows,p,1.3,1.3,1,points[i].heading,frame.curves[i]<0?Math.PI:0);
    }
   }
   if(isHigh){
    for(let j=0;j<lanes.length;j++){
     const a=lanes[j],b=next[Math.min(j,next.length-1)];
     for(const side of [-1,1]){const x=(a.center+side*a.half)*8,y=(b.center+side*b.half)*8;
      const p=sample(points,i,x),q=sample(points,i+1,y);quad(deck,p,q,{...q,y:q.y-1},{...p,y:p.y-1});}
     if(absolute%12===0&&height>1){const p=sample(points,i,a.center*8);p.y-=height/2;put(supports,p,.9,height,1.4,points[i].heading);}
    }
   }
  }
  for(const r of [land,water,walk,deck]){r.mesh.geometry.setDrawRange(0,r.used/3);r.a.needsUpdate=true;}
  water.mesh.userData.kinds=Array.from(kinds);
  for(const m of [rails,supports,hills,arrows,...extras])m.instanceMatrix.needsUpdate=true;
 }
 return {update,dispose(){if(disposed)return;disposed=true;for(const m of meshes)scene.remove(m);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}
module.exports={createRaceEnvironment};
