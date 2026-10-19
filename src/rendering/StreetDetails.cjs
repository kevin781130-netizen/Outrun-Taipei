'use strict';
// Original, deterministic startup textures: no canvas, external assets or driving RNG.
function createStreetDetailsTextures(T){
 const w=128,h=64,color=new Uint8Array(w*h*4),emission=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=(y*w+x)*4;
  const plinth=y<10,header=y>52,pillar=x%32<3;
  const shutter=x>=80&&x<118&&!header&&!plinth;
  const mullion=pillar||y===28||y===50;
  const lit=!header&&!plinth&&!mullion&&!shutter;
  let rgb=plinth?[63,65,61]:header?[31,70,63]:mullion?[80,88,82]:shutter?(y%5===0?[88,92,85]:[125,128,116]):[44,68,72];
  // Shelves and warm interior strips sit behind the glass, below the shop fascia.
  if(lit&&y%14<2)rgb=[132,115,80];
  if(header&&x%16>3&&x%16<12&&y>55&&y<61)rgb=[212,193,139];
  color.set([...rgb,255],k);
  const glow=lit&&y%14<2?155:header&&rgb[0]>200?95:0;
  emission.set([glow,Math.round(glow*.80),Math.round(glow*.50),255],k);
 }
 const shadowSize=64,shadow=new Uint8Array(shadowSize*shadowSize*4);
 for(let y=0;y<shadowSize;y++)for(let x=0;x<shadowSize;x++){
  const r=Math.hypot((x+.5)/shadowSize*2-1,(y+.5)/shadowSize*2-1);
  const a=Math.pow(Math.max(0,1-r*r),2);
  shadow.set([7,12,15,Math.round(a*255)],(y*shadowSize+x)*4);
 }
 function texture(data,width,height,srgb){
  const map=new T.DataTexture(data,width,height,T.RGBAFormat);
  map.encoding=srgb?T.sRGBEncoding:T.LinearEncoding;
  map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;
  map.generateMipmaps=true;map.needsUpdate=true;return map;
 }
 return {shopColor:texture(color,w,h,true),shopEmission:texture(emission,w,h,false),contact:texture(shadow,shadowSize,shadowSize,true)};
}
module.exports={createStreetDetailsTextures};
