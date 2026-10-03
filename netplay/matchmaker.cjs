'use strict';

const TWIN_LINK_RULES=Object.freeze({
  protocol:1,
  mode:'twin-link-1v1',
  maxPlayers:2,
  simulationHz:60,
  inputHz:30,
  snapshotHz:15,
  interpolationMs:100,
  playerCollision:false,
  sharedTrafficSeed:true,
  authoritative:['startAt','route','trafficSeed','checkpoint','finish','penalty']
});

function hashSeed(text){
  let h=2166136261>>>0;
  for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}
  return h||1;
}

class TwinLinkMatchmaker{
  constructor(){this.waiting=[];this.rooms=new Map();this.nextRoom=1;}
  join(player){
    if(!player||!player.playerId)throw new Error('playerId required');
    if(this.waiting.some(p=>p.playerId===player.playerId)||[...this.rooms.values()].some(r=>r.players.some(p=>p.playerId===player.playerId)))throw new Error('player already queued');
    const normalized={playerId:String(player.playerId),region:String(player.region||'global'),skill:Number.isFinite(player.skill)?player.skill:0,pingMs:Number.isFinite(player.pingMs)?player.pingMs:999};
    const idx=this.waiting.findIndex(p=>p.region===normalized.region&&Math.abs(p.skill-normalized.skill)<=400&&Math.max(p.pingMs,normalized.pingMs)<=180);
    if(idx<0){this.waiting.push(normalized);return {status:'queued',position:this.waiting.length};}
    const opponent=this.waiting.splice(idx,1)[0],roomId='TL-'+String(this.nextRoom++).padStart(6,'0');
    const players=[opponent,normalized].map((p,i)=>({...p,seat:i?'B':'A'}));
    const room={roomId,players,seed:hashSeed(roomId+':'+players.map(p=>p.playerId).sort().join(':')),rules:TWIN_LINK_RULES};
    this.rooms.set(roomId,room);
    return {status:'matched',room};
  }
  leave(playerId){
    const i=this.waiting.findIndex(p=>p.playerId===playerId);
    if(i>=0){this.waiting.splice(i,1);return true;}
    for(const [id,room] of this.rooms)if(room.players.some(p=>p.playerId===playerId)){this.rooms.delete(id);return true;}
    return false;
  }
}

module.exports={TWIN_LINK_RULES,TwinLinkMatchmaker,hashSeed};
