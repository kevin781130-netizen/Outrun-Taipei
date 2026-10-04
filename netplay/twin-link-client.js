(()=>{
'use strict';
const P=window.TwinLinkProtocol,B=window.TwinLinkBridge;
if(!P||!B)return;

const CHANNEL_NAME='taipei-twin-link-v1';
const SERVER_KEY='taipeiTwinServerV53';
const state={
  room:'',role:'',peerId:'',matched:false,startAt:0,routeId:'',seed:0,
  localFinish:null,remoteFinish:null,lastRemote:null,lastStateAt:0,
  transport:'local',resumeToken:'',serverResult:'',reconnecting:false
};
let channel=null,socket=null,heartbeat=null,snapshotTimer=null,reconnectTimer=null,reconnectAttempt=0,intentionalClose=false;
const playerId='P-'+Math.random().toString(36).slice(2,9).toUpperCase();

const style=document.createElement('style');
style.textContent=`
#twin-link-modal{position:absolute;inset:0;z-index:38;display:none;align-items:center;justify-content:center;background:rgba(2,7,15,.94);backdrop-filter:blur(8px);padding:18px;color:#e7f7ff}
#twin-link-modal.open{display:flex}
#twin-link-card{width:min(610px,96%);background:#0a1826;border:2px solid #35dce8;border-radius:12px;padding:18px;box-shadow:0 0 34px #00d8ff33;font:12px/1.5 system-ui,sans-serif}
#twin-link-card h2{margin:0;color:#ffd56b;letter-spacing:.08em}
#twin-link-card .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}
#twin-link-room{flex:1;min-width:130px;background:#06111c;color:#fff;border:1px solid #477084;border-radius:7px;padding:10px;font:800 18px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
#twin-link-server{width:100%;background:#06111c;color:#bceef6;border:1px solid #365d70;border-radius:7px;padding:9px;font:700 11px/1.2 ui-monospace,monospace}
#twin-link-status{margin-top:12px;padding:10px;border:1px solid #294a5a;border-radius:8px;background:#07131d;color:#a9dce7;min-height:42px}
#twin-link-note{display:block;margin-top:10px;color:#8da9b5;font-size:10px}
#twin-link-hud{position:absolute;left:50%;top:63px;transform:translateX(-50%);z-index:11;display:none;min-width:250px;padding:6px 10px;border:1px solid #49d8e4;background:#04111de8;color:#dffaff;border-radius:6px;font:800 10px/1.35 ui-monospace,monospace;pointer-events:none;text-align:center}
#twin-link-hud.show{display:block}
#twin-link-bar{height:5px;margin-top:5px;background:#163341;border-radius:9px;overflow:hidden}
#twin-link-bar i{display:block;height:100%;width:0;background:#ffd45f}
@media(max-width:760px){#twin-link-hud{top:54px;min-width:195px;font-size:8px}#twin-link-card{padding:13px}}
`;
document.head.appendChild(style);

const modal=document.createElement('div');
modal.id='twin-link-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
modal.innerHTML=`
<div id="twin-link-card">
  <div class="row" style="justify-content:space-between;margin-top:0">
    <div><small style="color:#55dce7;font-weight:900">V53 TWIN LINK NET</small><h2>雙座 1v1 網路連線</h2></div>
    <button class="btn" id="twin-link-close">✕ 關閉</button>
  </div>
  <p>填入 WebSocket 伺服器即可跨裝置連線；留空則使用同網站分頁本機模式。A 座選好路段後建立房號，B 座輸入同一房號加入。</p>
  <div class="row"><input id="twin-link-server" autocomplete="url" spellcheck="false" placeholder="wss://your-server.example/twin-link（留空＝本機分頁）"></div>
  <div class="row">
    <input id="twin-link-room" maxlength="6" inputmode="text" autocomplete="off" placeholder="ROOM">
    <button class="btn" id="twin-link-create">建立 A 座</button>
    <button class="btn" id="twin-link-join">加入 B 座</button>
    <button class="btn" id="twin-link-leave">離開</button>
  </div>
  <div id="twin-link-status">尚未連線。網路模式由伺服器權威決定路段、shared seed 與同步起跑時間。</div>
  <small id="twin-link-note">NET：WebSocket 跨裝置 · LOCAL：BroadcastChannel 雙分頁 fallback · 斷線時保留 20 秒重連窗口。</small>
</div>`;
document.getElementById('game-container').appendChild(modal);

const hud=document.createElement('div');hud.id='twin-link-hud';
hud.innerHTML='<div id="twin-link-hud-text">TWIN LINK</div><div id="twin-link-bar"><i></i></div>';
document.getElementById('game-container').appendChild(hud);

const menuTools=document.getElementById('menu-tools');
if(menuTools&&!document.getElementById('menu-twin-link')){
  const b=document.createElement('button');b.className='btn';b.id='menu-twin-link';b.textContent='Twin Link 1v1';menuTools.insertBefore(b,menuTools.querySelector('#mode-note'));
}
const utility=document.getElementById('utility-bar');
if(utility&&!document.getElementById('twin-link-btn')){
  const b=document.createElement('button');b.className='btn';b.id='twin-link-btn';b.textContent='Twin Link';utility.insertBefore(b,utility.firstChild);
}

const roomInput=document.getElementById('twin-link-room');
const serverInput=document.getElementById('twin-link-server');
const statusEl=document.getElementById('twin-link-status');
const hudText=document.getElementById('twin-link-hud-text');
const hudBar=document.querySelector('#twin-link-bar i');
try{
  const query=new URLSearchParams(location.search).get('twinws');
  serverInput.value=query||localStorage.getItem(SERVER_KEY)||'';
}catch(e){}

function setStatus(text){statusEl.textContent=text;}
function openModal(){modal.classList.add('open');roomInput.value=state.room||roomInput.value;roomInput.focus();}
function closeModal(){modal.classList.remove('open');}
function endpoint(){
  const value=serverInput.value.trim();
  if(!value)return '';
  try{const url=new URL(value);return url.protocol==='ws:'||url.protocol==='wss:'?url.href:'';}catch{return '';}
}
function ensureChannel(){
  if(channel)return true;
  if(!('BroadcastChannel' in window)){setStatus('此瀏覽器不支援本機 Twin Link；請填入 WebSocket 伺服器。');return false;}
  channel=new BroadcastChannel(CHANNEL_NAME);channel.onmessage=event=>handleMessage(event.data,false);return true;
}
function closeSocket(){
  intentionalClose=true;
  if(socket){try{socket.close(1000,'leave');}catch(e){}socket=null;}
  setTimeout(()=>{intentionalClose=false;},0);
}
function connectSocket(resume=false){
  const url=endpoint();
  if(!url)return Promise.resolve(false);
  if(socket&&socket.readyState===WebSocket.OPEN)return Promise.resolve(true);
  return new Promise((resolve,reject)=>{
    intentionalClose=false;
    const ws=new WebSocket(url);socket=ws;
    const timer=setTimeout(()=>{try{ws.close();}catch(e){}reject(new Error('connection timeout'));},5000);
    ws.addEventListener('open',()=>{
      clearTimeout(timer);reconnectAttempt=0;state.reconnecting=false;
      if(resume&&state.room&&state.resumeToken)send('RESUME',{seat:state.role,token:state.resumeToken});
      resolve(true);
    },{once:true});
    ws.addEventListener('message',event=>{let msg;try{msg=JSON.parse(event.data);}catch{return;}handleMessage(msg,true);});
    ws.addEventListener('error',()=>{clearTimeout(timer);});
    ws.addEventListener('close',()=>{
      clearTimeout(timer);if(socket===ws)socket=null;
      if(!intentionalClose&&state.transport==='ws'&&state.room&&state.resumeToken)scheduleReconnect();
    });
  });
}
function scheduleReconnect(){
  if(reconnectTimer||state.reconnecting)return;
  state.reconnecting=true;const delay=Math.min(4000,500*Math.pow(2,reconnectAttempt++));
  setStatus(`網路中斷，${(delay/1000).toFixed(1)} 秒後嘗試重連…`);
  reconnectTimer=setTimeout(async()=>{
    reconnectTimer=null;
    try{await connectSocket(true);}catch(e){state.reconnecting=false;if(reconnectAttempt<6)scheduleReconnect();else setStatus('重連失敗，房間可能已結束。');}
  },delay);
}
async function chooseTransport(){
  const url=endpoint();
  if(url){
    state.transport='ws';
    try{localStorage.setItem(SERVER_KEY,url);}catch(e){}
    try{await connectSocket(false);return true;}catch(e){setStatus('WebSocket 伺服器連線失敗。請檢查網址或服務狀態。');return false;}
  }
  state.transport='local';
  return ensureChannel();
}
function send(type,payload={}){
  if(!state.room)return false;
  const msg=P.makeEnvelope(state.room,playerId,type,payload);
  if(state.transport==='ws'){
    if(!socket||socket.readyState!==WebSocket.OPEN)return false;
    socket.send(JSON.stringify(msg));return true;
  }
  if(!ensureChannel())return false;
  channel.postMessage(msg);return true;
}
function resetSession(notify=true){
  if(notify&&state.room)send('LEAVE',{seat:state.role});
  if(reconnectTimer){clearTimeout(reconnectTimer);reconnectTimer=null;}
  closeSocket();
  state.room='';state.role='';state.peerId='';state.matched=false;state.startAt=0;state.routeId='';state.seed=0;
  state.localFinish=null;state.remoteFinish=null;state.lastRemote=null;state.lastStateAt=0;state.resumeToken='';state.serverResult='';state.reconnecting=false;
  B.setRivalState(null);B.leave();hud.classList.remove('show');hudBar.style.width='0%';
  if(heartbeat){clearInterval(heartbeat);heartbeat=null;}if(snapshotTimer){clearInterval(snapshotTimer);snapshotTimer=null;}
}
function startTimers(){
  if(heartbeat)clearInterval(heartbeat);
  heartbeat=setInterval(()=>{if(state.room)send('PING',{matched:state.matched});},1000);
  if(snapshotTimer)clearInterval(snapshotTimer);
  snapshotTimer=setInterval(()=>{
    if(!state.matched)return;
    B.tick(Date.now());const snap=B.snapshot();send('STATE',snap);
    if(snap.finish&&!state.localFinish){state.localFinish=snap.finish;send('FINISH',snap.finish);}
    renderHud(snap);
  },67);
}
function prepareStart(payload,seat,peer){
  state.role=seat;state.peerId=peer||state.peerId;state.matched=true;
  const serverTime=Number(payload.serverTime),serverStart=Number(payload.startAt);
  const clockOffset=Number.isFinite(serverTime)?serverTime-Date.now():0;
  state.startAt=Number.isFinite(serverStart)?serverStart-clockOffset:Date.now()+3000;
  state.routeId=String(payload.routeId||B.getLobbyState().routeId);state.seed=Number(payload.seed)||P.hashSeed(state.room);
  if(payload.resumeToken)state.resumeToken=String(payload.resumeToken);
  if(!B.prepareRace({roomId:state.room,seat:state.role,startAt:state.startAt,routeId:state.routeId,seed:state.seed})){
    setStatus('目前賽事狀態無法切入 Twin Link；請回主選單再建立房間。');return;
  }
  closeModal();setStatus(`${state.role} 座已連線 · ${state.transport==='ws'?'NET':'LOCAL'} · ${state.routeId}`);
  hud.classList.add('show');startTimers();
}
function localHostMatch(peer){
  if(state.transport!=='local'||state.role!=='A'||state.matched)return;
  state.peerId=peer;const lobby=B.getLobbyState(),startAt=Date.now()+3500,seed=P.hashSeed(state.room+':'+[playerId,peer].sort().join(':'));
  const payload={routeId:lobby.routeId,startAt,seed};send('START',payload);prepareStart(payload,'A',peer);
}
async function createRoom(){
  resetSession(false);state.room=P.generateRoomCode();state.role='A';roomInput.value=state.room;
  if(!await chooseTransport()){state.room='';state.role='';return;}
  startTimers();
  if(state.transport==='ws'){
    setStatus(`NET · 建立 A 座 ${state.room}…`);send('HOST',{routeId:B.getLobbyState().routeId});
  }else{
    setStatus(`LOCAL · A 座房號 ${state.room} · 等待另一分頁加入 B 座`);send('HOST',{routeId:B.getLobbyState().routeId});
  }
}
async function joinRoom(){
  const code=P.normalizeRoomCode(roomInput.value);if(code.length!==6){setStatus('請輸入完整 6 碼房號。');return;}
  resetSession(false);state.room=code;state.role='B';roomInput.value=code;
  if(!await chooseTransport()){state.room='';state.role='';return;}
  startTimers();setStatus(`${state.transport==='ws'?'NET':'LOCAL'} · B 座正在加入 ${code}…`);send('JOIN',{routeId:B.getLobbyState().routeId});
}
function resultText(local,remote){
  if(state.serverResult)return state.serverResult;
  const cmp=P.compareFinish(local,remote);if(cmp===null)return '';
  return cmp<0?'WIN':cmp>0?'LOSE':'PHOTO FINISH';
}
function renderHud(local=B.snapshot()){
  if(!state.matched){hud.classList.remove('show');return;}
  hud.classList.add('show');const remote=state.lastRemote;
  const lp=Math.max(0,Math.min(1,Number(local.progress)||0)),rp=Math.max(0,Math.min(1,Number(remote?.progress)||0));
  const delta=Math.round((lp-rp)*1000)/10,countdown=state.startAt>Date.now()?Math.ceil((state.startAt-Date.now())/1000):0;
  let text=`TWIN ${state.role} · ${state.transport==='ws'?'NET':'LOCAL'} · ${state.room} · ${state.routeId}`;
  if(state.reconnecting)text+=' · RECONNECT';
  else if(countdown>0)text+=` · START ${countdown}`;
  else if(remote)text+=` · 差距 ${delta>=0?'+':''}${delta.toFixed(1)}%`;
  else text+=' · 等待對手狀態';
  if(state.serverResult)text+=` · ${state.serverResult}`;
  else if(state.localFinish&&state.remoteFinish)text+=` · ${resultText(state.localFinish,state.remoteFinish)}`;
  else if(state.remoteFinish&&!state.localFinish)text+=' · 對手已完賽';
  hudText.textContent=text;hudBar.style.width=(lp*100).toFixed(1)+'%';
}
function handleMessage(msg,fromServer){
  if(!P.validateEnvelope(msg)||msg.room!==state.room)return;
  if(!fromServer&&msg.from===playerId)return;
  if(msg.type==='HOSTED'&&fromServer){
    state.role='A';state.resumeToken=String(msg.payload.resumeToken||'');setStatus(`NET · A 座房號 ${state.room} · 等待 B 座加入`);return;
  }
  if(msg.type==='JOIN'&&!fromServer&&state.role==='A'){localHostMatch(msg.from);return;}
  if(msg.type==='START'){
    const seat=fromServer?(msg.payload.seat==='B'?'B':'A'):'B';
    if(state.matched&&fromServer)return;
    prepareStart(msg.payload,seat,msg.payload.peerId||msg.from);return;
  }
  if(msg.type==='STATE'&&state.matched){
    if(state.peerId&&msg.from!==state.peerId)return;
    state.peerId=msg.from;state.lastRemote=msg.payload;state.lastStateAt=Date.now();B.setRivalState(msg.payload);renderHud();return;
  }
  if(msg.type==='FINISH'&&state.matched){
    state.remoteFinish=msg.payload;renderHud();setStatus(`對手完賽 ${Number(msg.payload.time||0).toFixed(2)} s`);return;
  }
  if(msg.type==='RESULT'&&fromServer){
    state.serverResult=String(msg.payload.result||'');renderHud();setStatus(`伺服器判定：${state.serverResult}`);return;
  }
  if(msg.type==='RESUMED'&&fromServer){
    state.reconnecting=false;state.resumeToken=String(msg.payload.resumeToken||state.resumeToken);
    setStatus(`NET · ${state.role} 座重連成功`);renderHud();return;
  }
  if(msg.type==='PEER_DISCONNECTED'&&fromServer){setStatus('對手斷線，保留重連窗口…');return;}
  if(msg.type==='PEER_RESUMED'&&fromServer){setStatus('對手已重新連線。');return;}
  if(msg.type==='ROOM_CLOSED'&&fromServer){setStatus('Twin Link 房間已結束。');resetSession(false);return;}
  if(msg.type==='ERROR'&&fromServer){setStatus(`伺服器：${msg.payload.message||msg.payload.code||'連線錯誤'}`);return;}
  if(msg.type==='PING'&&!fromServer){send('PONG',{matched:state.matched});return;}
  if(msg.type==='LEAVE'&&!fromServer&&(!state.peerId||msg.from===state.peerId)){
    state.peerId='';state.matched=false;state.lastRemote=null;B.setRivalState(null);setStatus('對手已離開房間。');renderHud();
  }
}

document.getElementById('menu-twin-link')?.addEventListener('click',openModal);
document.getElementById('twin-link-btn')?.addEventListener('click',openModal);
document.getElementById('twin-link-close').addEventListener('click',closeModal);
document.getElementById('twin-link-create').addEventListener('click',()=>createRoom());
document.getElementById('twin-link-join').addEventListener('click',()=>joinRoom());
document.getElementById('twin-link-leave').addEventListener('click',()=>{resetSession(true);roomInput.value='';setStatus('已離開 Twin Link。');});
roomInput.addEventListener('input',()=>{roomInput.value=P.normalizeRoomCode(roomInput.value);});
serverInput.addEventListener('change',()=>{try{const value=endpoint();if(value)localStorage.setItem(SERVER_KEY,value);else localStorage.removeItem(SERVER_KEY);}catch(e){}});
window.addEventListener('pagehide',()=>resetSession(true));
})();
