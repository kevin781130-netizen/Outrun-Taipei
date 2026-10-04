'use strict';

const http=require('node:http');
const crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
const P=require('./twin-link-protocol.js');

const DEFAULT_PATH='/twin-link';
const RECONNECT_GRACE_MS=20000;
const ROOM_TTL_MS=20*60*1000;
const MAX_STATE_HZ=25;

function safeRoute(value){
  const route=String(value||'1A').toUpperCase();
  return /^[1-5][A-E]$/.test(route)?route:'1A';
}
function safeNumber(value,min,max,fallback=0){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function cleanState(payload={}){
  return {
    protocol:1,
    roomId:String(payload.roomId||'').slice(0,16),
    seat:payload.seat==='B'?'B':'A',
    routeId:safeRoute(payload.routeId),
    progress:safeNumber(payload.progress,0,1,0),
    z:safeNumber(payload.z,-1e7,1e7,0),
    x:safeNumber(payload.x,-4,4,0),
    speed:safeNumber(payload.speed,0,500,0),
    raceElapsed:safeNumber(payload.raceElapsed,0,86400,0),
    drifting:!!payload.drifting,
    boosting:!!payload.boosting,
    gameOver:!!payload.gameOver
  };
}
function cleanFinish(payload={}){
  return {
    cleared:!!payload.cleared,
    time:safeNumber(payload.time,0,86400,86400),
    at:safeNumber(payload.at,0,Date.now()+60000,Date.now())
  };
}
function token(){return crypto.randomBytes(18).toString('base64url');}

function createTwinLinkServer(options={}){
  const wsPath=options.path||process.env.TWIN_PATH||DEFAULT_PATH;
  const allowedOrigins=String(options.allowedOrigins??process.env.TWIN_ALLOWED_ORIGINS??'')
    .split(',').map(x=>x.trim()).filter(Boolean);
  const rooms=new Map();
  const server=options.server||http.createServer((req,res)=>{
    if(req.url==='/health'||req.url==='/'){
      res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
      return res.end(JSON.stringify({ok:true,service:'taipei-twin-link',protocol:P.PROTOCOL_VERSION,rooms:rooms.size}));
    }
    res.writeHead(404,{'content-type':'application/json; charset=utf-8'});
    res.end(JSON.stringify({ok:false,error:'not_found'}));
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:32768,perMessageDeflate:false});

  function originAllowed(origin){
    if(!allowedOrigins.length)return true;
    return !!origin&&allowedOrigins.includes(origin);
  }
  function sendRaw(ws,obj){
    if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));
  }
  function sendServer(ws,room,type,payload={}){
    sendRaw(ws,P.makeEnvelope(room,'SERVER',type,payload));
  }
  function sendFrom(ws,room,from,type,payload={}){
    sendRaw(ws,P.makeEnvelope(room,from,type,payload));
  }
  function roomPeer(room,seat){return seat==='A'?room.players.B:room.players.A;}
  function closeRoom(room,reason='room_closed'){
    for(const player of [room.players.A,room.players.B]){
      if(player?.ws?.readyState===WebSocket.OPEN)sendServer(player.ws,room.code,'ROOM_CLOSED',{reason});
      if(player?.ws)player.ws._twin=null;
    }
    rooms.delete(room.code);
  }
  function matchedPayload(room,player){
    const peer=roomPeer(room,player.seat);
    return {
      seat:player.seat,
      peerId:peer?.id||'',
      routeId:room.routeId,
      startAt:room.startAt,
      seed:room.seed,
      resumeToken:player.token,
      serverTime:Date.now()
    };
  }
  function sendStart(room){
    const a=room.players.A,b=room.players.B;
    if(!a||!b)return;
    room.seed=P.hashSeed(room.code+':'+[a.id,b.id].sort().join(':'));
    room.startAt=Date.now()+3500;
    room.updatedAt=Date.now();
    sendServer(a.ws,room.code,'START',matchedPayload(room,a));
    sendServer(b.ws,room.code,'START',matchedPayload(room,b));
  }
  function attachPlayer(ws,room,seat,id,resumeToken){
    const player={id:String(id),seat,token:resumeToken||token(),ws,disconnectedAt:0,lastStateAt:0};
    room.players[seat]=player;ws._twin={room:room.code,seat,id:player.id};
    room.updatedAt=Date.now();
    return player;
  }
  function fail(ws,room,code,message){
    const safeRoom=P.normalizeRoomCode(room)||'AAAAAA';
    sendServer(ws,safeRoom,'ERROR',{code,message});
  }
  function handleHost(ws,msg){
    if(rooms.has(msg.room))return fail(ws,msg.room,'ROOM_EXISTS','房號已存在');
    const room={code:msg.room,routeId:safeRoute(msg.payload.routeId),seed:0,startAt:0,
      players:{A:null,B:null},finishes:{A:null,B:null},createdAt:Date.now(),updatedAt:Date.now()};
    const host=attachPlayer(ws,room,'A',msg.from);
    rooms.set(room.code,room);
    sendServer(ws,room.code,'HOSTED',{seat:'A',routeId:room.routeId,resumeToken:host.token,serverTime:Date.now()});
  }
  function handleJoin(ws,msg){
    const room=rooms.get(msg.room);
    if(!room||!room.players.A)return fail(ws,msg.room,'ROOM_NOT_FOUND','找不到房間');
    if(!room.players.A.ws||room.players.A.ws.readyState!==WebSocket.OPEN)return fail(ws,msg.room,'HOST_OFFLINE','A 座目前離線，請稍後再加入');
    if(room.players.B)return fail(ws,msg.room,'ROOM_FULL','房間已有兩位玩家');
    attachPlayer(ws,room,'B',msg.from);
    sendStart(room);
  }
  function established(ws,msg){
    const link=ws._twin;if(!link||link.room!==msg.room||link.id!==msg.from)return null;
    const room=rooms.get(link.room);if(!room)return null;
    const player=room.players[link.seat];
    return player&&player.ws===ws?{room,player}:null;
  }
  function handleResume(ws,msg){
    const room=rooms.get(msg.room),seat=msg.payload.seat==='B'?'B':'A';
    const player=room?.players?.[seat];
    if(!room||!player||player.id!==msg.from||player.token!==String(msg.payload.token||'')){
      return fail(ws,msg.room,'RESUME_REJECTED','重連憑證無效或房間已結束');
    }
    if(player.ws&&player.ws!==ws&&player.ws.readyState===WebSocket.OPEN)player.ws.close(4001,'replaced');
    player.ws=ws;player.disconnectedAt=0;ws._twin={room:room.code,seat,id:player.id};room.updatedAt=Date.now();
    sendServer(ws,room.code,'RESUMED',{...matchedPayload(room,player),matched:!!(room.players.A&&room.players.B)});
    const peer=roomPeer(room,seat);
    if(peer?.ws?.readyState===WebSocket.OPEN)sendServer(peer.ws,room.code,'PEER_RESUMED',{seat});
  }
  function handleState(ws,msg){
    const link=established(ws,msg);if(!link)return;
    const now=Date.now();
    if(now-link.player.lastStateAt<1000/MAX_STATE_HZ)return;
    link.player.lastStateAt=now;link.room.updatedAt=now;
    const peer=roomPeer(link.room,link.player.seat);
    if(peer?.ws?.readyState===WebSocket.OPEN)sendFrom(peer.ws,link.room.code,link.player.id,'STATE',cleanState(msg.payload));
  }
  function handleFinish(ws,msg){
    const link=established(ws,msg);if(!link)return;
    const finish=cleanFinish(msg.payload);
    link.room.finishes[link.player.seat]=finish;link.room.updatedAt=Date.now();
    const peer=roomPeer(link.room,link.player.seat);
    if(peer?.ws?.readyState===WebSocket.OPEN)sendFrom(peer.ws,link.room.code,link.player.id,'FINISH',finish);
    const a=link.room.finishes.A,b=link.room.finishes.B;
    if(a&&b){
      const cmp=P.compareFinish(a,b);
      const winnerSeat=cmp===0?null:cmp<0?'A':'B';
      for(const seat of ['A','B']){
        const p=link.room.players[seat];if(!p?.ws)continue;
        sendServer(p.ws,link.room.code,'RESULT',{
          result:winnerSeat===null?'PHOTO FINISH':winnerSeat===seat?'WIN':'LOSE',
          winnerSeat,finishes:{A:a,B:b}
        });
      }
    }
  }
  function handleLeave(ws,msg){
    const link=established(ws,msg);if(!link)return;
    closeRoom(link.room,'player_left');
  }
  function handleMessage(ws,data){
    if(typeof data!=='string'&&!(data instanceof Buffer))return;
    let msg;try{msg=JSON.parse(data.toString());}catch{return;}
    if(!P.validateEnvelope(msg))return;
    if(msg.type==='HOST')return handleHost(ws,msg);
    if(msg.type==='JOIN')return handleJoin(ws,msg);
    if(msg.type==='RESUME')return handleResume(ws,msg);
    if(msg.type==='PING')return sendServer(ws,msg.room,'PONG',{serverTime:Date.now()});
    if(msg.type==='STATE')return handleState(ws,msg);
    if(msg.type==='FINISH')return handleFinish(ws,msg);
    if(msg.type==='LEAVE')return handleLeave(ws,msg);
  }

  wss.on('connection',ws=>{
    ws.isAlive=true;
    ws.on('pong',()=>{ws.isAlive=true;});
    ws.on('message',data=>handleMessage(ws,data));
    ws.on('close',()=>{
      const link=ws._twin;if(!link)return;
      const room=rooms.get(link.room),player=room?.players?.[link.seat];
      if(!room||!player||player.ws!==ws)return;
      player.ws=null;player.disconnectedAt=Date.now();room.updatedAt=Date.now();
      const peer=roomPeer(room,link.seat);
      if(peer?.ws?.readyState===WebSocket.OPEN)sendServer(peer.ws,room.code,'PEER_DISCONNECTED',{seat:link.seat,graceMs:RECONNECT_GRACE_MS});
    });
  });
  server.on('upgrade',(req,socket,head)=>{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname!==wsPath||!originAllowed(req.headers.origin)){socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  });

  const maintenance=setInterval(()=>{
    const now=Date.now();
    for(const room of rooms.values()){
      const stale=now-room.createdAt>ROOM_TTL_MS;
      const expiredDisconnect=['A','B'].some(seat=>room.players[seat]?.disconnectedAt&&now-room.players[seat].disconnectedAt>RECONNECT_GRACE_MS);
      if(stale||expiredDisconnect)closeRoom(room,stale?'room_ttl':'reconnect_timeout');
    }
    for(const ws of wss.clients){
      if(ws.isAlive===false){ws.terminate();continue;}
      ws.isAlive=false;ws.ping();
    }
  },5000);
  maintenance.unref?.();

  async function listen(port=Number(options.port??process.env.PORT??8080),host=options.host||'0.0.0.0'){
    if(server.listening)return server.address();
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>{server.off('error',reject);resolve();});});
    return server.address();
  }
  async function close(){
    clearInterval(maintenance);
    for(const ws of wss.clients)ws.terminate();
    await new Promise(resolve=>wss.close(()=>resolve()));
    if(server.listening)await new Promise(resolve=>server.close(()=>resolve()));
  }
  return {server,wss,rooms,listen,close,path:wsPath};
}

if(require.main===module){
  const app=createTwinLinkServer();
  app.listen().then(address=>{
    const port=typeof address==='object'&&address?address.port:process.env.PORT||8080;
    console.log(`Twin Link WebSocket server listening on :${port}${app.path}`);
  }).catch(error=>{console.error(error);process.exitCode=1;});
}

module.exports={createTwinLinkServer,cleanState,cleanFinish,RECONNECT_GRACE_MS};
