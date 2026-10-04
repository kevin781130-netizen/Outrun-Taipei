(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.TwinLinkProtocol=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const PROTOCOL_VERSION=1;
  const ROOM_RE=/^[A-Z0-9]{6}$/;
  const ROOM_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function normalizeRoomCode(value){
    return String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
  }
  function fillRandom(bytes){
    if(typeof globalThis!=='undefined'&&globalThis.crypto&&typeof globalThis.crypto.getRandomValues==='function'){
      globalThis.crypto.getRandomValues(bytes);return bytes;
    }
    for(let i=0;i<bytes.length;i++) bytes[i]=Math.floor(Math.random()*256);
    return bytes;
  }
  function generateRoomCode(randomSource){
    const bytes=new Uint8Array(6);
    (typeof randomSource==='function'?randomSource:fillRandom)(bytes);
    let out='';
    for(const value of bytes) out+=ROOM_ALPHABET[value%ROOM_ALPHABET.length];
    return out;
  }
  function hashSeed(text){
    let h=2166136261>>>0;
    for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}
    return h||1;
  }
  function makeEnvelope(room,from,type,payload={},now=Date.now()){
    const normalized=normalizeRoomCode(room);
    const sender=String(from||'').trim();
    const event=String(type||'').trim().toUpperCase();
    if(!ROOM_RE.test(normalized)) throw new Error('valid six-character room code required');
    if(!sender) throw new Error('sender id required');
    if(!event) throw new Error('event type required');
    return {v:PROTOCOL_VERSION,room:normalized,from:sender,type:event,at:Number(now)||0,payload:payload&&typeof payload==='object'?payload:{}};
  }
  function validateEnvelope(message){
    return !!message&&message.v===PROTOCOL_VERSION&&ROOM_RE.test(String(message.room||''))&&
      typeof message.from==='string'&&message.from.length>0&&typeof message.type==='string'&&message.type.length>0&&
      Number.isFinite(message.at)&&!!message.payload&&typeof message.payload==='object';
  }
  function compareFinish(a,b){
    if(!a||!b) return null;
    if(!!a.cleared!==!!b.cleared) return a.cleared?-1:1;
    const at=Number(a.time),bt=Number(b.time);
    if(!Number.isFinite(at)||!Number.isFinite(bt)) return 0;
    if(Math.abs(at-bt)<0.001) return 0;
    return at<bt?-1:1;
  }
  return Object.freeze({PROTOCOL_VERSION,normalizeRoomCode,generateRoomCode,hashSeed,makeEnvelope,validateEnvelope,compareFinish});
});
