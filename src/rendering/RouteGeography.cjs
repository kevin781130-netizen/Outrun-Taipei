'use strict';
const data=require('../../data/world-v59/scene-profiles.json');
const styles={};
for(const [id,s] of Object.entries(data.styles))styles[id]=Object.freeze({id,elevated:false,...s,hillSides:Object.freeze(s.hillSides)});
function geographyAt(routeId,absolute,landmarks=[]){
 const route=data.routes[routeId];if(!route)return null;
 let index=0;
 while(index<route.zones.length-1&&landmarks[index+1]&&absolute>=(landmarks[index].seg+landmarks[index+1].seg)/2)index++;
 return styles[route.zones[index]];
}
function resolveGeographicFrame(frame){
 if(frame?.geographyProfile!==data.profile||!data.routes[frame.routeId])return frame;
 const geography=Array.from({length:126},(_,i)=>geographyAt(frame.routeId,(frame.segment||0)+i,frame.landmarks));
 const elevated=frame.routeId==='2B';
 return {...frame,geography,deckHeights:(frame.deckHeights||[]).map((h,i)=>geography[i]?.elevated?h:0),
  landmarks:(frame.landmarks||[]).map(h=>({...h,groundDrop:elevated?h.groundDrop:0}))};
}
module.exports={geographyAt,resolveGeographicFrame,profileId:data.profile};
