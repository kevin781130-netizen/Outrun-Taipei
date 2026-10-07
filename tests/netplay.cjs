'use strict';
const assert=require('node:assert/strict');
const {TwinLinkMatchmaker,TWIN_LINK_RULES,hashSeed}=require('../netplay/matchmaker.cjs');

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
  const numeric=new TwinLinkMatchmaker();numeric.join({playerId:123,region:'tw',skill:1200,pingMs:40});
  assert.throws(()=>numeric.join({playerId:123,region:'tw',skill:1200,pingMs:40}),/already queued/);checks++;
  check(numeric.leave(123)&&!numeric.waiting.length,'numeric player IDs leave using their normalized identity');
  const matched=new TwinLinkMatchmaker();matched.join({playerId:123,region:'tw',pingMs:40});matched.join({playerId:'B',region:'tw',pingMs:40});
  assert.throws(()=>matched.join({playerId:123,region:'tw',pingMs:40}),/already queued/);checks++;
  return {checks};
}
module.exports={runNetplayTests};
