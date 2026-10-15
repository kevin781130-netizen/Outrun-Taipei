'use strict';
// Behavior tests for opt-in handling; old replay fingerprints remain separate and unchanged.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const file=path.resolve(__dirname,'../index.html');
const game=load(file,{search:'?handling=v59'}),legacy=load(file);
function simulate(cfg){
 v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
 gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
 crashSequence=null;traffic=[];timeLeft=9999;collisionCooldown=100;
 playerX=0;playerZ=180*SEGMENT_LENGTH;speed=175;currentGear='HIGH';
 driveGear='D';motionDirection=1;roadGrip=1;nitro=0;nitroStock=1;
 for(const seg of segments)seg.curve=cfg.side*.8;
 const dt=1/cfg.fps,rows=[];
 function phase(seconds,input,gas=true){
  for(let n=0;n<Math.round(seconds*cfg.fps);n++){
   const direction=input*cfg.side;
   keys.KeyW=gas;keys.KeyS=false;keys.ShiftLeft=rows.length===0;
   keys.ArrowRight=direction>0;keys.ArrowLeft=direction<0;
   if(cfg.integration)update(dt);
   else{steer=direction;stepHandlingDrift(dt,false,gas,direction,cfg.side*.8);stepArcadeMotion(dt,cfg.side*.8,gas,false);}
   rows.push({state:driftState,active:isDrifting,yaw:driftAngle,slip:slipAngle,x:playerX,lateral:lateralVelocity,charge:driftChargeRate});
  }
 }
 phase(.30,1);phase(1.5,-1);
 const held=rows.at(-1),heldRows=rows.slice(Math.round(.6*cfg.fps));
 phase(.7,cfg.exit==='neutral'?0:-1,cfg.exit==='neutral');
 const recovered=rows.at(-1);
 if(cfg.integration){
  // Same update dispatcher must keep drift-charge compatible with nitro use.
  resetDrivingState();playerX=0;speed=175;roadGrip=1;keys.KeyW=true;keys.ArrowRight=cfg.side===1;keys.ArrowLeft=cfg.side===-1;keys.ShiftLeft=true;
  update(dt);keys.ShiftLeft=false;for(let n=0;n<Math.round(.25*cfg.fps);n++)update(dt);
  keys.KeyN=true;update(dt);keys.KeyN=false;
 }
 const nitroCheck={boosting,boostRemaining,isDrifting,driftChargeRate};
 // Pausing must not advance the new recovery clock or heading.
 paused=true;const frozen=[v59LiftTime,driftAngle,slipAngle,playerX];update(dt);
 const pauseFrozen=frozen.every((x,i)=>x===[v59LiftTime,driftAngle,slipAngle,playerX][i]);
 paused=false;resetDrivingState();
 return JSON.stringify({held,heldRows,recovered,nitroCheck,pauseFrozen,resetLift:v59LiftTime,record:bestRecordKey(),board:arcadeBoardKey(),profile:handlingProfile59});
}
function run(g,cfg){return JSON.parse(g.run('('+simulate.toString()+')('+JSON.stringify(cfg)+')'));}
const results=[];
for(const integration of [false,true])for(const fps of [30,60,120])for(const side of [-1,1])for(const exit of ['neutral','lift']){
 const cfg={integration,fps,side,exit},r=run(game,cfg);
 assert(r.profile,'URL must select V59');
 assert(r.held.active&&r.held.state==='drift','throttled countersteer must sustain slide: '+JSON.stringify(cfg));
 assert(r.heldRows.every(row=>row.active&&row.state!=='recover'),'no timed countersteer recovery');
 assert.equal(Math.sign(r.held.yaw),side,'countersteer must not auto-flip body heading');
 assert(Math.abs(r.held.yaw)>5&&Math.abs(r.held.slip)>2,'countersteer retains meaningful slip');
 assert(r.held.charge>0,'balanced slide must charge nitro');
 assert(!r.recovered.active,'neutral/lift must finish recovery');
 assert(r.pauseFrozen&&r.resetLift===0,'pause and reset must preserve/reset new state');
 assert(r.record.endsWith(':H59.1')&&r.board.endsWith(':H59.1'),'do not mix handling records');
 if(integration)assert(r.nitroCheck.boosting&&r.nitroCheck.isDrifting&&r.nitroCheck.driftChargeRate>0,'boost and drift-charge coexist');
 for(const row of [...r.heldRows,r.recovered])for(const v of Object.values(row))if(typeof v==='number')assert(Number.isFinite(v));
 results.push({cfg,...r,heldRows:undefined});
}
// Analog countersteer must progressively trim yaw/slip rather than act as an on/off exit.
const analog=[];
for(const amount of [.25,.6,1]){
 analog.push(JSON.parse(game.run(`(()=>{resetDrivingState();speed=175;roadGrip=1;driveGear='D';motionDirection=1;steer=1;keys.ShiftLeft=true;stepHandlingDrift(1/60,false,true,1,.8);keys.ShiftLeft=false;for(let i=0;i<18;i++)stepHandlingDrift(1/60,false,true,1,.8);steer=-${amount};for(let i=0;i<90;i++)stepHandlingDrift(1/60,false,true,-${amount},.8);return JSON.stringify({yaw:driftAngle,slip:slipAngle,active:isDrifting});})()`)));
}
assert(analog.every(x=>x.active));
assert(analog[0].yaw>analog[1].yaw&&analog[1].yaw>analog[2].yaw,'analog correction progressively trims body yaw');
assert(analog[0].slip>analog[1].slip&&analog[1].slip>analog[2].slip,'analog correction progressively trims slip');
const collision=JSON.parse(game.run(`(()=>{v59LiftTime=.12;collisionCooldown=0;crashSequence=null;speed=175;const before=crashCount;triggerCrash(null,null,true);triggerCrash(null,null,true);return JSON.stringify({lift:v59LiftTime,drifting:isDrifting,count:crashCount-before,clock:crashSequence.t});})()`));
assert.deepEqual(collision,{lift:0,drifting:false,count:1,clock:0},'collision clears handling once without extra penalty or crash clock');
const old=run(legacy,{fps:60,side:1,exit:'neutral',integration:false});
assert(!old.profile&&!old.held.active,'legacy countersteer keeps original recovery');
assert(!old.record.endsWith(':H59.1')&&!old.board.endsWith(':H59.1'));
// Left/right symmetry on the isolated handling/motion model and bounded frame-rate variation.
for(const fps of [30,60,120]){
 const left=results.find(r=>!r.cfg.integration&&r.cfg.fps===fps&&r.cfg.side===-1);
 const right=results.find(r=>!r.cfg.integration&&r.cfg.fps===fps&&r.cfg.side===1);
 assert(Math.abs(left.held.yaw+right.held.yaw)<1e-8);
 assert(Math.abs(left.held.lateral+right.held.lateral)<1e-8);
}
const model=results.filter(r=>!r.cfg.integration&&r.cfg.side===1&&r.cfg.exit==='neutral');
assert(Math.max(...model.map(r=>r.held.yaw))-Math.min(...model.map(r=>r.held.yaw))<.1,'30/60/120 Hz settled yaw must agree');
fs.mkdirSync(path.resolve(__dirname,'../test-results'),{recursive:true});
fs.writeFileSync(path.resolve(__dirname,'../test-results/v59-countersteer.json'),JSON.stringify({scope:'simulation, not deployed visual/device acceptance',results},null,2));
console.log('V59: 24 countersteer/lift/neutral simulations passed; 30/60/120 Hz, both sides, full update + isolated model, legacy isolation');
