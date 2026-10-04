'use strict';
const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const P=require('../netplay/twin-link-protocol.js');
const {createTwinLinkServer}=require('../netplay/server.cjs');

function waitMessage(ws,predicate,timeout=2500){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();reject(new Error('message timeout'));},timeout);
    const onMessage=data=>{
      let msg;try{msg=JSON.parse(data.toString());}catch{return;}
      if(!predicate(msg))return;
      cleanup();resolve(msg);
    };
    const onClose=()=>{cleanup();reject(new Error('socket closed'));};
    function cleanup(){clearTimeout(timer);ws.off('message',onMessage);ws.off('close',onClose);}
    ws.on('message',onMessage);ws.on('close',onClose);
  });
}
function open(url){
  return new Promise((resolve,reject)=>{
    const ws=new WebSocket(url);
    ws.once('open',()=>resolve(ws));ws.once('error',reject);
  });
}
function send(ws,room,from,type,payload={}){ws.send(JSON.stringify(P.makeEnvelope(room,from,type,payload)));}

async function runNetplayServerTests(){
  let checks=0;const check=(value,message)=>{assert.equal(value,true,message);checks++;};
  const app=createTwinLinkServer({port:0,host:'127.0.0.1'});
  const address=await app.listen(0,'127.0.0.1');
  const url=`ws://127.0.0.1:${address.port}/twin-link`;
  const room='ABC234',aId='A-PLAYER',bId='B-PLAYER';
  let a,b;
  try{
    a=await open(url);
    const hostedPromise=waitMessage(a,m=>m.type==='HOSTED');
    send(a,room,aId,'HOST',{routeId:'4B'});
    const hosted=await hostedPromise;
    check(hosted.payload.seat==='A'&&hosted.payload.routeId==='4B','server accepts host and locks route');

    b=await open(url);
    const startA=waitMessage(a,m=>m.type==='START');
    const startB=waitMessage(b,m=>m.type==='START');
    send(b,room,bId,'JOIN',{routeId:'1A'});
    const [sa,sb]=await Promise.all([startA,startB]);
    check(sa.payload.routeId==='4B'&&sb.payload.routeId==='4B','server authority keeps host route for both seats');
    check(sa.payload.seed===sb.payload.seed&&sa.payload.startAt===sb.payload.startAt,'server shares one seed and start timestamp');
    check(sa.payload.startAt-sa.payload.serverTime>=3000&&sa.payload.startAt-sa.payload.serverTime<=5000,'server start includes authoritative clock reference');
    check(sa.payload.seat==='A'&&sb.payload.seat==='B','server assigns A/B seats');

    await new Promise(resolve=>setTimeout(resolve,45));
    const relayed=waitMessage(b,m=>m.type==='STATE'&&m.from===aId);
    send(a,room,aId,'STATE',{routeId:'4B',progress:.42,z:4200,x:.2,speed:222,raceElapsed:15.2,drifting:true,boosting:false});
    const state=await relayed;
    check(Math.abs(state.payload.progress-.42)<1e-9&&state.payload.speed===222,'server sanitizes and relays race state');

    const finishToB=waitMessage(b,m=>m.type==='FINISH'&&m.from===aId);
    send(a,room,aId,'FINISH',{cleared:true,time:51.4,at:Date.now()});
    await finishToB;
    const resultA=waitMessage(a,m=>m.type==='RESULT');
    const resultB=waitMessage(b,m=>m.type==='RESULT');
    send(b,room,bId,'FINISH',{cleared:true,time:52.1,at:Date.now()});
    const [ra,rb]=await Promise.all([resultA,resultB]);
    check(ra.payload.result==='WIN'&&rb.payload.result==='LOSE'&&ra.payload.winnerSeat==='A','server authoritatively resolves finish result');

    const resumeToken=sa.payload.resumeToken;
    a.close();
    await new Promise(resolve=>setTimeout(resolve,50));
    const a2=await open(url);
    const resumed=waitMessage(a2,m=>m.type==='RESUMED');
    send(a2,room,aId,'RESUME',{seat:'A',token:resumeToken});
    const rr=await resumed;
    check(rr.payload.seat==='A'&&rr.payload.matched===true,'seat can reconnect within grace window using resume token');
    a=a2;

    const health=await new Promise((resolve,reject)=>{
      require('node:http').get(`http://127.0.0.1:${address.port}/health`,res=>{
        let body='';res.on('data',d=>body+=d);res.on('end',()=>resolve(JSON.parse(body)));
      }).on('error',reject);
    });
    check(health.ok&&health.service==='taipei-twin-link','health endpoint reports service ready');
  }finally{
    a?.close();b?.close();await app.close();
  }
  return {checks};
}
module.exports={runNetplayServerTests};
