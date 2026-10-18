'use strict';
// Original deterministic facade maps. One atlas, no external downloads or RNG.
function createStreetFacadeTextures(THREE){
 const width=128,height=256,color=new Uint8Array(width*height*4),emission=new Uint8Array(color.length);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const col=Math.floor(x/32),floor=Math.floor(y/32),u=x%32,v=y%32;
  const pane=u>=5&&u<27&&v>=6&&v<26;
  const mullion=pane&&(u===15||u===16);
  const lit=((col*13+floor*7+floor*floor)%11)<4;
  const rgb=!pane?[108,113,112]:mullion?[50,61,67]:lit?[145,158,154]:[38+floor*2,66+floor,83+col*3];
  const i=(y*width+x)*4;
  color.set([...rgb,255],i);
  const glow=pane&&!mullion&&lit?255:0;
  emission.set([glow,glow,glow,255],i);
 }
 const make=(data,encoding)=>{
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);
  texture.encoding=encoding;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
 };
 return {color:make(color,THREE.sRGBEncoding),emission:make(emission,THREE.LinearEncoding)};
}
module.exports={createStreetFacadeTextures};
