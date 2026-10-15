'use strict';
// Independent Taipei traffic intention model. No third-party code, assets, RNG, or gameplay writes.
// All longitudinal distances are in the existing game's world-Z coordinates.
const RULES=Object.freeze({
  speedToWorld:18,
  closingKph:14,
  forwardLook:6500,
  rearLook:4000,
  decisionHorizon:2.5,
  frontGap:1300,
  rearGap:1300,
  lateralGap:0.07,
  roadMargin:0.04,
  forkBuffer:4200,
  playerBuffer:8000,
  cooldownSeconds:3.2
});
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const number=(x,fallback)=>finite(x)?x:fallback;
const blocked=(target,from,peer,ownHalf,frontGap,rearGap)=>{
  const margin=peer.halfWidth+ownHalf+RULES.lateralGap;
  const nearTarget=Math.abs(peer.x-target)<=margin;
  const nearPath=peer.x+margin>=Math.min(from,target) && peer.x-margin<=Math.max(from,target);
  const dz=peer.z;
  // A car directly ahead in the original lane motivates a lane change; it must
  // not veto every destination. Still reject immediate side-swipe crossings.
  if(nearPath&&Math.abs(dz)<950)return true;
  return nearTarget&&(dz>=0?dz<frontGap:-dz<rearGap);
};
function planLaneIntent(input){
  const own=input?.self;
  const origin=number(own?.laneTarget,number(own?.x,0));
  const hold=reason=>({action:'hold',target:origin,reason,cooldown:0});
  if(!own||![own.x,own.z,own.speed,own.halfWidth].every(finite)||own.halfWidth<=0||own.speed<0)return hold('invalid-self');
  if(input?.allow!==true)return hold('disabled');
  if(number(input?.cooldown,0)>0)return hold('cooldown');
  if(!Array.isArray(input.corridors)||input.corridors.length===0||input.corridors.some(q=>!Array.isArray(q)||q.length!==1||!finite(q[0]?.center)||!finite(q[0]?.half)||q[0].half<=0))return hold('split-or-invalid-road');
  const player=input.player;
  if(player!=null){
    if(!finite(player.z))return hold('invalid-player');
    if(Math.abs(own.z-player.z)<RULES.playerBuffer)return hold('player-proximity');
  }
  if(finite(input.forkWarningZ)&&own.z>=input.forkWarningZ-RULES.forkBuffer)return hold('fork-approach');
  if(!Array.isArray(input.others))return hold('invalid-peers');
  if(input.others.some(p=>p!==own&&(!p||![p.x,p.z,p.speed,p.halfWidth].every(finite)||p.halfWidth<=0)))return hold('invalid-peers');
  const road=input.corridors[0][0];
  const lanes=[road.center-road.half*.52,road.center,road.center+road.half*.52];
  const inside=lane=>input.corridors.every(segment=>segment.some(q=>Math.abs(lane-q.center)+own.halfWidth+RULES.roadMargin<=q.half));
  const legal=lanes.map(inside);
  if(!legal.some(Boolean))return hold('narrow-road');
  const current=lanes.reduce((best,x,i)=>Math.abs(x-origin)<Math.abs(lanes[best]-origin)?i:best,0);
  if(!legal[current])return hold('out-of-corridor');
  const peers=input.others.filter(p=>p!==own && !(own.id!=null && p.id!=null && p.id===own.id)).map(p=>({...p,dz:p.z-own.z}));
  const leader=peers.filter(p=>p.dz>0&&p.dz<RULES.forwardLook
    &&Math.abs(p.x-lanes[current])<=p.halfWidth+own.halfWidth+RULES.lateralGap)
    .sort((a,b)=>a.dz-b.dz||String(a.id).localeCompare(String(b.id)))[0];
  if(!leader||own.speed-leader.speed<RULES.closingKph)return hold('no-slow-leader');
  const candidates=[current-1,current+1].filter(i=>i>=0&&i<lanes.length&&legal[i]);
  for(const index of candidates){
    const target=lanes[index];
    const unsafe=peers.some(peer=>{
      const relative=peer.dz;
      if(relative>RULES.forwardLook||relative<-RULES.rearLook)return false;
      const front=RULES.frontGap+Math.max(0,own.speed-peer.speed)*RULES.speedToWorld*RULES.decisionHorizon;
      const rear=RULES.rearGap+Math.max(0,peer.speed-own.speed)*RULES.speedToWorld*RULES.decisionHorizon;
      return blocked(target,own.x,{...peer,z:relative},own.halfWidth,front,rear);
    });
    if(!unsafe)return {action:'change',target,reason:'safe-pass',cooldown:RULES.cooldownSeconds};
  }
  return hold('adjacent-lanes-blocked');
}
module.exports={RULES,planLaneIntent};
