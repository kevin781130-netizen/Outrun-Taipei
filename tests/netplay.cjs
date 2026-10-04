'use strict';
const assert=require('node:assert/strict');
const {TwinLinkMatchmaker,TWIN_LINK_RULES,hashSeed}=require('../netplay/matchmaker.cjs');
const TwinLinkProtocol=require('../netplay/twin-link-protocol.js');

function runNetplayTests(){
  let checks=0;
  const check=(value,message)=>{assert.equal(value,true,message);checks++;};
  const mm=new TwinLinkMatchmaker();
  const a=mm.join({playerId:'A',region:'tw',skill:1200,pingMs:36});
  check(a.status==='queued'&&a.position===1,'first player queues');
  const b=mm.join({playerId:'B',region:'tw',skill:1320,pingMs:42});
  check(b.status==='matched'&&b.room.players.length===2,'compatible second player matches');
  check(b.room.players[0].seat==='A'&&b.room.players[1].seat==='B','twin seats assigned');
  check(b.room.rules.mode==='twin-link-1v1'&&b.room.rules.playerCollision===false,'network duel uses no direct player collision');
  check(TWIN_LINK_RULES.simulationHz===60&&TWIN_LINK_RULES.inputHz===30&&TWIN_LINK_RULES.snapshotHz===15,'network cadence is explicit');
  const c=mm.join({playerId:'C',region:'jp',skill:1200,pingMs:40});
  check(c.status==='queued','different region remains queued');
  check(hashSeed('same')===hashSeed('same')&&hashSeed('same')!==hashSeed('different'),'room seed hashing deterministic');
  check(mm.leave('C')&&!mm.waiting.length,'queued player can leave cleanly');

  check(TwinLinkProtocol.normalizeRoomCode(' ab-12cd ')==='AB12CD','browser room codes normalize deterministically');
  const generated=TwinLinkProtocol.generateRoomCode(bytes=>bytes.set([0,1,2,3,4,5]));
  check(generated==='ABCDEF','room generation maps random bytes into safe alphabet');
  const envelope=TwinLinkProtocol.makeEnvelope('ab12cd','seat-a','state',{progress:.5},123);
  check(TwinLinkProtocol.validateEnvelope(envelope)&&envelope.room==='AB12CD'&&envelope.type==='STATE','browser transport envelope validates');
  check(!TwinLinkProtocol.validateEnvelope({...envelope,v:99}),'protocol rejects incompatible version');
  check(TwinLinkProtocol.hashSeed('room')===hashSeed('room'),'browser and server room seed hashing agree');
  check(TwinLinkProtocol.compareFinish({cleared:true,time:55.2},{cleared:true,time:56.1})===-1,'lower clear time wins');
  check(TwinLinkProtocol.compareFinish({cleared:false,time:40},{cleared:true,time:70})===1,'a clear beats a timeout');
  return {checks};
}
module.exports={runNetplayTests};
