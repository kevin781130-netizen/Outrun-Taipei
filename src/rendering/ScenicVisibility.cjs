'use strict';
// Authored, absolute segment windows keep the foreground clear while approaching
// a landmark. The window does not move with the camera, so props cannot pop away
// as the player drives. Opposite-side street scenery remains intact.
function inLandmarkVista(landmarks,segment,side){
 return (landmarks||[]).some(mark=>{
  if(!Number.isFinite(mark.seg)||(mark.side<0?-1:1)!==side)return false;
  const approach=mark.seg-segment;
  return approach>=-18&&approach<=90;
 });
}
module.exports={inLandmarkVista};
