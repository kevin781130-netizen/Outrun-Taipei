'use strict';
// CHAIN2 opt-in handling; no original ROM physics equations or assets.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const html=path.resolve(__dirname,'../index.html');
function simulate(cfg){
  const side=cfg.side,fps=cfg.fps,integration=cfg.integration,analog=cfg.analog||0;
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
  crashSequence=null;traffic=[];timeLeft=9999;collisionCooldown=100;
  playerX=0;playerZ=180*SEGMENT_LENGTH;speed=175;currentGear='HIGH';
  driveGear='D';motionDirection=1;roadGrip=1;nitro=24;nitroStock=1;boostRemaining=0;
  for(const seg of segments)seg.curve=side*.8;
  const dt=1/fps,rows=[],marks=[];
  function phase(duration,direction,init=false){
    const steps=Math.round(duration*fps);
    for(let i=0;i<steps;i++){
      const axis=direction;
      keys.KeyW=true;keys.KeyS=false;keys.ShiftLeft=init&&i===0;
      keys.ArrowRight=axis>.9;keys.ArrowLeft=axis<-.9;
      gamepadInput.steer=Math.abs(axis)<.9?axis:0;
      if(integration)update(dt);
      else{
        steer=axis;
        stepHandlingDrift(dt,false,true,axis,side*.8);
        stepArcadeMotion(dt,side*.8,true,false);
      }
      rows.push({yaw:driftAngle,slip:slipAngle,dir:driftDirection,
        state:driftState,active:isDrifting,age:driftAge,clean:cleanDriftTime,
        lateral:lateralVelocity,charge:driftChargeRate,blend:v59ChainBlend,
        prep:v59ChainPreparing,x:playerX,grip:roadGrip});
    }
    marks.push({...rows[rows.length-1]});
  }
  phase(.37,side,true);
  if(analog)phase(.95,-side*analog);
  else{
    phase(.85,-side);
    phase(.85,side);
    phase(.85,-side);
  }
  const after={record:bestRecordKey(),board:arcadeBoardKey(),
    nitro,nitroStock,profile:handlingProfile59,chain:v59Chain2,
    rows,marks,grip:roadGrip,active:isDrifting};
  resetDrivingState();
  after.cleared=v59ChainHold===0&&!v59ChainPreparing&&v59ChainBlend===1;
  return JSON.stringify(after);
}
function runCase(profile,cfg){
  const search=profile==='chain2'?'?handling=v59&drift=chain2':profile==='v59'?'?handling=v59':'';
  const game=load(html,{search});
  return JSON.parse(game.run('('+simulate.toString()+')('+JSON.stringify(cfg)+')'));
}
for(const side of [-1,1])for(const fps of [30,60,120])for(const integration of [false,true]){
  const cfg={side,fps,integration};
  const r=runCase('chain2',cfg);
  assert(r.profile&&r.chain&&r.cleared,'CHAIN2 must be isolated and resettable');
  assert(r.record.endsWith(':H59.2')&&r.board.endsWith(':H59.2'),'new handling uses isolated records');
  assert.equal(r.marks.length,4);
  for(const [index,dir] of [side,-side,side,-side].entries()){
    const m=r.marks[index];
    assert(m.active&&m.state!=='recover','slide cannot cut on transfer: '+JSON.stringify({cfg,index,m}));
    assert.equal(m.dir,dir,'chained drift direction must change: '+JSON.stringify({cfg,index,m}));
    assert(Math.sign(m.yaw)===dir&&Math.sign(m.slip)===dir,
      'body yaw and physical slip must follow transfer: '+JSON.stringify({cfg,index,m}));
  }
  assert(r.marks[3].clean>r.marks[0].clean,'reversals cannot reset drift combo');
  assert(r.nitroStock>=1&&r.nitro>=0,'reversal cannot consume nitro');
  assert(r.rows.every(x=>x.active&&x.state!=='recover'),'no intermediate re-arm or recover');
  for(let i=0;i<r.rows.length;i++){
    const x=r.rows[i];
    for(const key of ['yaw','slip','lateral','clean','x'])assert(Number.isFinite(x[key]));
    if(i>0){
      assert(Math.abs(x.yaw-r.rows[i-1].yaw)<12,'yaw must not snap on direction transfer');
      assert(Math.abs(x.slip-r.rows[i-1].slip)<7,'slip must not snap on direction transfer');
    }
  }
}
for(const side of [-1,1]){
  const r=runCase('chain2',{side,fps:60,integration:false,analog:.55});
  assert(r.marks[1].active&&r.marks[1].dir===side,'partial analog countersteer only trims slide');
  const v59=runCase('v59',{side,fps:60,integration:false});
  assert(!v59.chain&&v59.marks[1].dir===side&&v59.record.endsWith(':H59.1'));
  const legacy=runCase('legacy',{side,fps:60,integration:false});
  assert(!legacy.chain&&!legacy.profile&&!legacy.record.includes(':H59.'));
}
console.log('CHAIN2: L/R x 30/60/120 Hz x real update/isolated, triple handoff, analog trim and legacy isolation passed');
