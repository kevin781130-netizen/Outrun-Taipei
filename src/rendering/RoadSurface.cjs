'use strict';
// Bounded startup-only material generation. No network, canvas or simulation RNG.
function grain(x,y,seed){let n=(Math.imul(x,374761393)^Math.imul(y,668265263)^seed)>>>0;n=Math.imul(n^(n>>>13),1274126177)>>>0;return ((n^(n>>>16))&65535)/65535;}
function createRoadSurfaceTextures(T,size=128){
 if(!Number.isInteger(size)||size<16||size>256||(size&(size-1)))throw new RangeError('power-of-two surface size 16..256 required');
 const result={};
 for(const kind of ['asphalt','pavement']){
  const color=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),height=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const n=grain(x,y,1729),i=y*size+x,k=i*4,cell=size/4;
   const joint=kind==='pavement'&&(x%cell<1||y%cell<1);
   let value;
   if(kind==='asphalt'){
    value=Math.round(47+(n-.5)*12+4*(grain(x>>3,y>>3,905)-.5)+2*Math.sin(2*Math.PI*x/size)*Math.cos(4*Math.PI*y/size)+(n>.985?7:0));
    color.set([value,value+2,value+4,255],k);height[i]=(n-.5)*.1;
   }else{
    value=Math.round((joint?117:145+grain(Math.floor(x/cell),Math.floor(y/cell),99)*14)+(n-.5)*7);
    color.set([value,value-3,value-9,255],k);height[i]=(joint?-.18:0)+(n-.5)*.01;
   }
   const r=kind==='asphalt'?Math.round(228+n*14):(joint?246:224);
   rough.set([r,r,r,255],k);
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const dx=height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size];
   const dy=height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x];
   const length=Math.hypot(dx,dy,1),k=(y*size+x)*4;
   normal.set([Math.round((.5-dx/length*.5)*255),Math.round((.5+dy/length*.5)*255),Math.round((.5+1/length*.5)*255),255],k);
  }
  for(const [channel,data] of Object.entries({color,rough,normal})){
   const texture=new T.DataTexture(data,size,size,T.RGBAFormat);
   texture.name='V80_'+kind+'_'+channel;
   texture.encoding=channel==='color'?T.sRGBEncoding:T.LinearEncoding;
   texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(4,4);
   texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;
   texture.generateMipmaps=true;texture.needsUpdate=true;result[kind+'_'+channel]=texture;
  }
 }
 return result;
}
module.exports={createRoadSurfaceTextures};
