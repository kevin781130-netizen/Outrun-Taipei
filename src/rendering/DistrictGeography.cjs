'use strict';
// Compressed driving corridors, with explicit land/water/deck rules per district.
// These are authored visual relationships, not a surveyed navigation map.
const PROFILES=Object.freeze({
 '1A':{kind:'civic',buildings:true,relief:0,ground:'#a49b8c',heading:'northbound Chongqing South Road'},
 '2A':{kind:'park-city',buildings:true,relief:.35,ground:'#65715b'},
 '2B':{kind:'city-deck',buildings:true,relief:.25,ground:'#797a73',deck:true},
 '3A':{kind:'river-to-spring',buildings:true,relief:.6,ground:'#64715b'},
 '3B':{kind:'park-city',buildings:true,relief:.45,ground:'#697264'},
 '3C':{kind:'dome-city',buildings:true,relief:0,ground:'#92918a'},
 '4A':{kind:'river-town',buildings:true,relief:.30,ground:'#8b9276',waterSide:-1,waterWidth:115},
 '4B':{kind:'volcanic-hills',buildings:false,relief:1,ground:'#738362'},
 '4C':{kind:'river-city-deck',buildings:true,relief:.35,ground:'#747b72',deck:true},
 '4D':{kind:'xinyi-city',buildings:true,relief:0,ground:'#858a89'},
 '5A':{kind:'harbor',buildings:true,relief:.2,ground:'#93957e',waterSide:-1,waterWidth:125},
 '5B':{kind:'ocean-coast',buildings:false,relief:.65,ground:'#777e6c',waterSide:-1,waterWidth:180},
 '5C':{kind:'hill-town',buildings:true,relief:1,ground:'#71634e'},
 '5D':{kind:'xinyi-city',buildings:true,relief:0,ground:'#858a89'},
 '5E':{kind:'tea-hills',buildings:false,relief:1,ground:'#607b4e'}
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function districtAt(frame,index=frame.segment||0){
 const p=PROFILES[frame.routeId];
 if(!p)return {kind:frame.archetype,buildings:frame.archetype==='urban',relief:1,ground:frame.groundColor||'#526c51',deck:frame.archetype==='expressway',waterSide:frame.archetype==='coastal'?-1:0,waterWidth:180,authored:false};
 const out={waterSide:0,waterWidth:0,deck:false,authored:true,...p};
 const u=clamp(index/Math.max(1,frame.stageEnd||1200),0,1);
 if(frame.routeId==='3A'){
  const t=clamp((u-.34)/.18,0,1),river=1-t*t*(3-2*t);
  out.waterSide=river>.001?-1:0;out.waterWidth=95*river;
  out.kind=river>.5?'guandu-river':'beitou-spring-town';
 }
 // Huandong has a bounded Keelung River view only toward the Raohe approach.
 if(frame.routeId==='4C'&&u>.56){out.waterSide=-1;out.waterWidth=80;}
 return out;
}
function presentationFrame(frame){
 if(!PROFILES[frame.routeId])return frame;
 const geo=districtAt(frame),deck=frame.deckHeights||[],origin=deck[0]||0;
 const hills=(frame.hills||[]).map((y,i)=>{
  const deckDelta=((deck[i]||0)-origin)/260;
  return (y-deckDelta)*geo.relief+deckDelta;
 });
 return {...frame,hills,groundColor:geo.ground};
}
const HEIGHTS=Object.freeze({gate:8,office:14,liberty:7,hotel:22,museum:12,trail:9,digital:19,guandu:12,spring:6,wheel:24,dome:12,chimney:13,fort:8,pier:5,volcano:19,pavilion:8,market:10,tech:25,rainbow:11,village:6,skyline:30,lovers:14,danjiang:25,lighthouse:13,teahouse:12,'101':68,gondola:22,tea:9});
function landmarkLayout(frame,mark,kind){
 const authored=!!PROFILES[frame.routeId],side=mark.side<0?-1:1;
 // Facades face the carriageway; bridge spans remain across the river view.
 const facing=authored&&!['guandu','rainbow','lovers','danjiang','gondola','wheel'].includes(kind)?-side*Math.PI/2:0;
 const geo=districtAt(frame,mark.seg),span=['guandu','rainbow','danjiang'].includes(kind)?geo.waterWidth:0;
 return {yaw:facing,span,margin:kind==='gate'&&frame.routeId==='1A'?34:kind==='liberty'&&frame.routeId==='1A'?45:7,height:authored?HEIGHTS[kind]:null};
}
module.exports={PROFILES,HEIGHTS,districtAt,presentationFrame,landmarkLayout};
