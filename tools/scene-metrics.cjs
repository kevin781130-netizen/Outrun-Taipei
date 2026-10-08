'use strict';
// Pure pixel comparison used by manual V54 browser scene review.
function compareRgba(before, after, width, height, threshold=16) {
  if(!Number.isInteger(width)||width<=0||!Number.isInteger(height)||height<=0) throw Error('Invalid image size');
  if(!Number.isFinite(threshold)||threshold<0||threshold>255) throw Error('Invalid threshold');
  if(before.length!==width*height*4||after.length!==before.length) throw Error('RGBA buffer size mismatch');
  let changed=0,total=0,max=0,transparentChanged=0;
  for(let i=0;i<before.length;i+=4){
    let peak=0;
    for(let c=0;c<3;c++){
      const delta=Math.abs(before[i+c]-after[i+c]);
      total+=delta;peak=Math.max(peak,delta);
    }
    max=Math.max(max,peak);
    if(peak>threshold)changed++;
    if(before[i+3]!==after[i+3])transparentChanged++;
  }
  const pixels=width*height;
  return {
    pixels,width,height,threshold,
    changedPixels:changed,
    changedPixelsPercent:changed/pixels*100,
    meanAbsoluteRgbDifference:total/(pixels*3),
    maximumChannelDifference:max,
    changedAlphaPixels:transparentChanged
  };
}
module.exports={compareRgba};
