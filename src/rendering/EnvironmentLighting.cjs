'use strict';
// Small, deterministic linear-radiance panoramas. No remote HDRI or game RNG.
// Three r149 caches its roughness-prefiltered environment per source texture.
const SIZE=256;
function createEnvironmentLighting(THREE){
 const panoramas=[];
 for(const night of [false,true]){
  const data=new Uint8Array(SIZE*(SIZE/2)*4);
  for(let y=0;y<SIZE/2;y++)for(let x=0;x<SIZE;x++){
   const latitude=((y+.5)/(SIZE/2)-.5)*Math.PI;
   const longitude=((x+.5)/SIZE-.5)*Math.PI*2;
   const up=Math.sin(latitude),horizontal=Math.cos(latitude);
   const dx=horizontal*Math.cos(longitude),dz=horizontal*Math.sin(longitude);
   const high=Math.pow(Math.max(0,up),.55);
   const horizon=night?[.075,.10,.17]:[.68,.36,.17];
   const zenith=night?[.008,.018,.055]:[.12,.23,.43];
   const ground=night?[.008,.012,.021]:[.045,.052,.065];
   const rgb=horizon.map((v,i)=>up>=0?v+(zenith[i]-v)*high:ground[i]+(v*.42-ground[i])*Math.exp(up*10));
   // A broad warm horizon source and cooler upper-sky fill reveal paint creases.
   const sunDot=dx*(-.35)+up*.13+dz*(-.927);
   const sun=night?0:Math.pow(Math.max(0,sunDot),96)*.65;
   const fill=Math.pow(Math.max(0,dx*.68+up*.73),12)*(night?.05:.22);
   // Static skyline interruptions make the horizon reflection less featureless.
   const skyline=.035+.045*(1+Math.sin(longitude*13)*Math.sin(longitude*7));
   const blocked=up>0&&up<skyline;
   for(let k=0;k<3;k++){
    const value=(blocked?rgb[k]*.42:rgb[k])+sun*[1,.68,.32][k]+fill*[.66,.82,1][k];
    data[(y*SIZE+x)*4+k]=Math.round(Math.max(0,Math.min(1,value))*255);
   }
   data[(y*SIZE+x)*4+3]=255;
  }
  const texture=new THREE.DataTexture(data,SIZE,SIZE/2,THREE.RGBAFormat);
  texture.name=night?'V85_NightRadiance':'V85_SunsetRadiance';
  texture.mapping=THREE.EquirectangularReflectionMapping;
  texture.encoding=THREE.LinearEncoding;
  texture.minFilter=texture.magFilter=THREE.LinearFilter;
  texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.generateMipmaps=false;texture.needsUpdate=true;panoramas.push(texture);
 }
 let disposed=false;
 return {
  // Reuse both source identities on mood/quality switches; never regenerate per frame.
  environment(night,quality){return disposed||quality==='LOW'?null:panoramas[night?1:0];},
  dispose(){if(disposed)return;disposed=true;for(const texture of panoramas)texture.dispose();}
 };
}
module.exports={createEnvironmentLighting};
