(()=>{
'use strict';
const P=window.TwinLinkProtocol,B=window.TwinLinkBridge;
if(!P||!B)return;

const CHANNEL_NAME='taipei-twin-link-v1';
const state={
  room:'',role:'',peerId:'',matched:false,startAt:0,routeId:'',seed:0,
  localFinish:null,remoteFinish:null,lastRemote:null,lastStateAt:0
};
let channel=null;
let heartbeat=null;
let snapshotTimer=null;
const playerId='P-'+Math.random().toString(36).slice(2,9).toUpperCase();

const style=document.createElement('style');
style.textContent=`
#twin-link-modal{position:absolute;inset:0;z-index:38;display:none;align-items:center;justify-content:center;background:rgba(2,7,15,.94);backdrop-filter:blur(8px);padding:18px;color:#e7f7ff}
#twin-link-modal.open{display:flex}
#twin-link-card{width:min(560px,96%);background:#0a1826;border:2px solid #35dce8;border-radius:12px;padding:18px;box-shadow:0 0 34px #00d8ff33;font:12px/1.5 system-ui,sans-serif}
#twin-link-card h2{margin:0;color:#ffd56b;letter-spacing:.08em}
#twin-link-card .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}
#twin-link-room{flex:1;min-width:130px;background:#06111c;color:#fff;border:1px solid #477084;border-radius:7px;padding:10px;font:800 18px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}
#twin-link-status{margin-top:12px;padding:10px;border:1px solid #294a5a;border-radius:8px;background:#07131d;color:#a9dce7;min-height:42px}
#twin-link-note{display:block;margin-top:10px;color:#8da9b5;font-size:10px}
#twin-link-hud{position:absolute;left:50%;top:63px;transform:translateX(-50%);z-index:11;display:none;min-width:230px;padding:6px 10px;border:1px solid #49d8e4;background:#04111de8;color:#dffaff;border-radius:6px;font:800 10px/1.35 ui-monospace,monospace;pointer-events:none;text-align:center}
#twin-link-hud.show{display:block}
#twin-link-bar{height:5px;margin-top:5px;background:#163341;border-radius:9px;overflow:hidden}
#twin-link-bar i{display:block;height:100%;width:0;background:#ffd45f}
@media(max-width:760px){#twin-link-hud{top:54px;min-width:190px;font-size:8px}#twin-link-card{padding:13px}}
`;
document.head.appendChild(style);

const modal=document.createElement('div');
modal.id='twin-link-modal';
modal.setAttribute('role','dialog');
modal.setAttribute('aria-modal','true');
modal.innerHTML=`
<div id="twin-link-card">
  <div class="row" style="justify-content:space-between;margin-top:0">
    <div><small style="color:#55dce7;font-weight:900">V52 TWIN LINK</small><h2>雙座 1v1 測試連線</h2></div>
    <button class="btn" id="twin-link-close">✕ 關閉</button>
  </div>
  <p>先在 A 座建立房號，再於另一個同網站分頁輸入相同房號加入 B 座。比賽會同步路段、起跑時間、進度與完賽結果。</p>
  <div class="row">
    <input id="twin-link-room" maxlength="6" inputmode="text" autocomplete="off" placeholder="ROOM">
    <button class="btn" id="twin-link-create">建立 A 座</button>
    <button class="btn" id="twin-link-join">加入 B 座</button>
    <button class="btn" id="twin-link-leave">離開</button>
  </div>
  <div id="twin-link-status">尚未連線。先在主選單選好要比賽的路段。</div>
  <small id="twin-link-note">目前 transport 使用同來源 BroadcastChannel，目的是把前端房間／同步協定正式接上遊戲；跨裝置網路版只需替換 transport 為 WebSocket。</small>
</div>`;
document.getElementById('game-container').appendChild(modal);

const hud=document.createElement('div');
hud.id='twin-link-hud';
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
const statusEl=document.getElementById('twin-link-status');
const hudText=document.getElementById('twin-link-hud-text');
const hudBar=document.querySelector('#twin-link-bar i');

function setStatus(text){statusEl.textContent=text;}
function openModal(){modal.classList.add('open');roomInput.value=state.room||roomInput.value;roomInput.focus();}
function closeModal(){modal.classList.remove('open');}
function ensureChannel(){
  if(channel)return true;
  if(!('BroadcastChannel' in window)){setStatus('此瀏覽器不支援 BroadcastChannel。');return false;}
  channel=new BroadcastChannel(CHANNEL_NAME);channel.onmessage=onMessage;return true;
}
function send(type,payload={}){
  if(!state.room||!ensureChannel())return;
  channel.postMessage(P.makeEnvelope(state.room,playerId,type,payload));
}
function resetSession(notify=true){
  if(notify&&state.room)send('LEAVE',{seat:state.role});
  state.room='';state.role='';state.peerId='';state.matched=false;state.startAt=0;state.routeId='';state.seed=0;
  state.localFinish=null;state.remoteFinish=null;state.lastRemote=null;state.lastStateAt=0;
  B.setRivalState(null);B.leave();
  hud.classList.remove('show');hudBar.style.width='0%';
  if(heartbeat){clearInterval(heartbeat);heartbeat=null;}
  if(snapshotTimer){clearInterval(snapshotTimer);snapshotTimer=null;}
}
function startTimers(){
  if(heartbeat)clearInterval(heartbeat);
  heartbeat=setInterval(()=>{if(state.room)send('PING',{matched:state.matched});},1000);
  if(snapshotTimer)clearInterval(snapshotTimer);
  snapshotTimer=setInterval(()=>{
    if(!state.matched)return;
    B.tick(Date.now());
    const snap=B.snapshot();
    send('STATE',snap);
    if(snap.finish&&!state.localFinish){state.localFinish=snap.finish;send('FINISH',snap.finish);}
    renderHud(snap);
  },67);
}
function prepareStart(payload,seat,peer){
  state.role=seat;state.peerId=peer||state.peerId;state.matched=true;state.startAt=Number(payload.startAt)||Date.now()+3000;
  state.routeId=String(payload.routeId||B.getLobbyState().routeId);state.seed=Number(payload.seed)||P.hashSeed(state.room);
  if(!B.prepareRace({roomId:state.room,seat:state.role,startAt:state.startAt,routeId:state.routeId,seed:state.seed})){
    setStatus('目前賽事狀態無法切入 Twin Link；請回主選單再建立房間。');return;
  }
  setStatus(`${state.role} 座已連線 · ${state.routeId} · 約 ${Math.max(0,(state.startAt-Date.now())/1000).toFixed(1)} 秒後同步起跑`);
  hud.classList.add('show');startTimers();
}
function hostMatch(peer){
  if(state.role!=='A'||state.matched)return;
  state.peerId=peer;state.matched=true;
  const lobby=B.getLobbyState(),startAt=Date.now()+3500,seed=P.hashSeed(state.room+':'+[playerId,peer].sort().join(':'));
  const payload={routeId:lobby.routeId,startAt,seed};
  send('START',payload);prepareStart(payload,'A',peer);
}
function createRoom(){
  resetSession(false);if(!ensureChannel())return;
  state.room=P.generateRoomCode();state.role='A';roomInput.value=state.room;
  setStatus(`A 座房號 ${state.room} · 等待另一分頁加入 B 座`);
  startTimers();send('HOST',{routeId:B.getLobbyState().routeId});
}
function joinRoom(){
  const code=P.normalizeRoomCode(roomInput.value);
  if(code.length!==6){setStatus('請輸入完整 6 碼房號。');return;}
  resetSession(false);if(!ensureChannel())return;
  state.room=code;state.role='B';roomInput.value=code;
  setStatus(`B 座正在加入 ${code}…`);
  startTimers();send('JOIN',{routeId:B.getLobbyState().routeId});
}
function resultText(local,remote){
  const cmp=P.compareFinish(local,remote);
  if(cmp===null)return '';
  if(cmp<0)return 'WIN';
  if(cmp>0)return 'LOSE';
  return 'PHOTO FINISH';
}
function renderHud(local=B.snapshot()){
  if(!state.matched){hud.classList.remove('show');return;}
  hud.classList.add('show');
  const remote=state.lastRemote;
  const lp=Math.max(0,Math.min(1,Number(local.progress)||0)),rp=Math.max(0,Math.min(1,Number(remote?.progress)||0));
  const delta=Math.round((lp-rp)*1000)/10;
  const countdown=state.startAt>Date.now()?Math.ceil((state.startAt-Date.now())/1000):0;
  let text=`TWIN ${state.role} · ${state.room} · ${state.routeId}`;
  if(countdown>0)text+=` · START ${countdown}`;
  else if(remote)text+=` · 差距 ${delta>=0?'+':''}${delta.toFixed(1)}%`;
  else text+=' · 等待對手狀態';
  if(state.localFinish&&state.remoteFinish)text+=` · ${resultText(state.localFinish,state.remoteFinish)}`;
  else if(state.remoteFinish&&!state.localFinish)text+=' · 對手已完賽';
  hudText.textContent=text;hudBar.style.width=(lp*100).toFixed(1)+'%';
}
function onMessage(event){
  const msg=event.data;
  if(!P.validateEnvelope(msg)||msg.from===playerId||msg.room!==state.room)return;
  if(msg.type==='JOIN'&&state.role==='A'){hostMatch(msg.from);return;}
  if(msg.type==='START'&&state.role==='B'&&!state.matched){prepareStart(msg.payload,'B',msg.from);return;}
  if(msg.type==='STATE'&&state.matched){
    if(state.peerId&&msg.from!==state.peerId)return;
    state.peerId=msg.from;state.lastRemote=msg.payload;state.lastStateAt=Date.now();B.setRivalState(msg.payload);renderHud();return;
  }
  if(msg.type==='FINISH'&&state.matched){
    state.remoteFinish=msg.payload;renderHud();setStatus(`對手完賽 ${Number(msg.payload.time||0).toFixed(2)} s`);return;
  }
  if(msg.type==='PING'){send('PONG',{matched:state.matched});return;}
  if(msg.type==='LEAVE'&&(!state.peerId||msg.from===state.peerId)){
    state.peerId='';state.matched=false;state.lastRemote=null;B.setRivalState(null);setStatus('對手已離開房間。');renderHud();return;
  }
}

document.getElementById('menu-twin-link')?.addEventListener('click',openModal);
document.getElementById('twin-link-btn')?.addEventListener('click',openModal);
document.getElementById('twin-link-close').addEventListener('click',closeModal);
document.getElementById('twin-link-create').addEventListener('click',createRoom);
document.getElementById('twin-link-join').addEventListener('click',joinRoom);
document.getElementById('twin-link-leave').addEventListener('click',()=>{resetSession(true);roomInput.value='';setStatus('已離開 Twin Link。');});
roomInput.addEventListener('input',()=>{roomInput.value=P.normalizeRoomCode(roomInput.value);});
window.addEventListener('pagehide',()=>resetSession(true));
})();
