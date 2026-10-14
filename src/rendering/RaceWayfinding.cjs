'use strict';
// Physical start/finish/distance/fork boards restored from the 2D race data.
function createRaceWayfinding(T,scene,sample,offset,doc){
 let signature='',boards=[],disposed=false;
 const box=new T.BoxGeometry(1,1,1),plane=new T.PlaneGeometry(1,1);
 const frameMaterial=new T.MeshStandardMaterial({color:0xb9c8c5,roughness:.65,metalness:.3});
 const clear=()=>{for(const b of boards){scene.remove(b.group);b.texture?.dispose();b.material.dispose();}boards=[];};
 function textureFor(sign){
  if(!doc?.createElement)return null;
  const c=doc.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d');if(!g)return null;
  g.fillStyle=sign.kind==='finish'?'#152e3a':'#12664d';g.fillRect(0,0,1024,256);
  g.strokeStyle='#e1efcb';g.lineWidth=8;g.strokeRect(12,12,1000,232);g.fillStyle='#fffde2';g.textAlign='center';g.textBaseline='middle';
  const write=(text,y,size)=>{g.font=`bold ${size}px "Microsoft JhengHei", "PingFang TC", sans-serif`;while(g.measureText(text).width>960&&size>15){size-=2;g.font=`bold ${size}px "Microsoft JhengHei", "PingFang TC", sans-serif`;}g.fillText(text,512,y);};
  write(sign.label,90,66);write(sign.detail||'',180,46);
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;
 }
 function update(frame,points){
  if(disposed)return;
  const source=frame.raceSigns||[],key=(frame.routeId||'')+JSON.stringify(source);
  if(key!==signature){clear();signature=key;for(const sign of source){
   const texture=textureFor(sign),material=new T.MeshBasicMaterial({map:texture,color:texture?0xffffff:0x12664d,side:T.DoubleSide});
   const group=new T.Group();group.name='RaceBoard_'+sign.kind+'_'+sign.seg;
   const face=new T.Mesh(plane,material);face.position.y=6.3;face.scale.set(12,3,1);group.add(face);
   const posts=[-1,1].map(()=>{const m=new T.Mesh(box,frameMaterial);group.add(m);return m;});
   const crossbar=new T.Mesh(box,frameMaterial);crossbar.position.y=8;group.add(crossbar);
   scene.add(group);boards.push({group,posts,crossbar,texture,material,sign});
  }}
  for(const b of boards){const d=b.sign.seg-frame.segment;b.group.visible=d>-4&&d<123;if(!b.group.visible)continue;
   const at=sample(points,d),i=Math.max(0,Math.min(124,Math.floor(d)));
   const lanes=(frame.corridors||[]).slice(Math.max(0,i-2),i+3).flat();
   const left=offset(lanes,-1,.4,1.3),right=offset(lanes,1,.4,1.3);
   b.group.position.set(at.x,at.y,at.z);b.group.rotation.y=-at.heading;
   b.posts.forEach((m,i)=>{m.position.set(i?right:left,4,0);m.scale.set(.3,8,.3);});
   b.crossbar.position.x=(left+right)/2;b.crossbar.scale.set(right-left,.3,.3);
  }
 }
 return {update,dispose(){if(disposed)return;disposed=true;clear();box.dispose();plane.dispose();frameMaterial.dispose();}};
}
module.exports={createRaceWayfinding};
