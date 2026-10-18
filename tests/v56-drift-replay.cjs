'use strict';
// Actual gameplay simulation, fixed time/seed, output traces (not WebGL QA).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const current=path.join(__dirname,'../index.html');
const output=path.join(__dirname,'../test-results/v56-drift-replay.json');
const cases=[
 {name:'straight-right',side:1,curve:0,speed:145,hold:39},
 {name:'straight-left',side:-1,curve:0,speed:145,hold:39},
 {name:'right-bend',side:1,curve:1.15,speed:165,hold:41},
 {name:'left-bend',side:-1,curve:-1.15,speed:165,hold:41},
 {name:'countersteer',side:1,curve:.85,speed:175,hold:26,counterFrom:26,counterUntil:49},
 {name:'lift-recover',side:-1,curve:-.75,speed:160,hold:32,liftFrom:22,liftUntil:74},
 {name:'nitro-drift',side:1,curve:1.1,speed:165,hold:45,nitroAt:20,stock:1}
];
const physical=['speed','playerX','playerZ','steer','driftState','isDrifting',
 'driftAngle','slipAngle','driftDirection','lateralVelocity','roadGrip',
 'cleanDriftTime','nitro','nitroStock','boostRemaining','boosting',
 'exitBoost','momentBoostWindow'];
function hash(s){
 let h=2166136261;
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0).toString(16).padStart(8,'0');
}
function fingerprints(html){
 const sections={
  drift:['function stepBrakeDrift(','function stepArcadeMotion(','0ad1637a'],
  motion:['function stepArcadeMotion(','function playerVisualTransform(','eeeb9b71'],
  rules:['const DRIFT51=Object.freeze(','const V52_CORNER=Object.freeze(','8d7b6491']
 };
 const result={};
 for(const [name,[start,end,expected]] of Object.entries(sections)){
  const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'missing '+name+' source range');
  result[name]=hash(html.slice(a,b));
  assert.equal(result[name],expected,'V90 audited '+name+' source fingerprint changed');
 }
 return result;
}
// Function is stringified into the original game's lexical environment;
// the real update() and steering/boost rules are exercised unmodified.
function runInsideGame(cfg){
 const dt=1/60,frames=108,oldRandom=Math.random;
 let seed=(0x56d123^(cfg.side*0x124fe)^(Math.round(cfg.speed)*131))>>>0;
 Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 try{
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  gameStarted=true;raceActive=true;paused=false;gameOver=false;inRadioScreen=false;
  crashSequence=null;traffic=[];timeLeft=9999;collisionCooldown=100;
  playerX=0;playerZ=180*SEGMENT_LENGTH;speed=cfg.speed;currentGear='HIGH';
  driveGear='D';motionDirection=1;roadGrip=1;nitro=0;nitroStock=cfg.stock||0;
  // Synthetic road curve applies only in test VM, not production.
  for(const segment of segments)segment.curve=cfg.curve;
  const rows=[],transitions=[];let prior=driftState;
  for(let frame=0;frame<frames;frame++){
   keys.KeyW=!(frame>=(cfg.liftFrom??999)&&frame<(cfg.liftUntil??999));
   keys.KeyS=false;keys.ShiftLeft=frame===0;
   let direction=frame<cfg.hold?cfg.side:0;
   if(frame>=(cfg.counterFrom??999)&&frame<(cfg.counterUntil??999))direction=-cfg.side;
   keys.ArrowRight=direction===1;keys.ArrowLeft=direction===-1;
   keys.KeyN=frame===cfg.nitroAt;
   update(dt);
   if(driftState!==prior){transitions.push({frame,from:prior,to:driftState});prior=driftState;}
   rows.push({frame,time:(frame+1)*dt,speed,playerX,playerZ,steer,driftState,
    isDrifting,driftAngle,slipAngle,driftDirection,lateralVelocity,roadGrip,
    cleanDriftTime,nitro,nitroStock,boostRemaining,boosting,
    exitBoost,momentBoostWindow,driftChargeRate,yawDeg:v51DriftVisualYaw()});
  }
  return JSON.stringify({name:cfg.name,route:currentNode.id,
   competitionVersion:COMPETITION.version,transitions,rows});
 }finally{Math.random=oldRandom;}
}
function replay(game,cfg){
 return JSON.parse(game.run('('+runInsideGame.toString()+')('+JSON.stringify(cfg)+')'));
}
function validate(result,cfg){
 assert.equal(result.route,'1A');
 assert.equal(result.competitionVersion,'91.0');
 assert.equal(result.rows.length,108);
 for(const row of result.rows)for(const [field,value] of Object.entries(row)){
  if(typeof value==='number')assert(Number.isFinite(value),cfg.name+'/'+field+' must be finite');
 }
 assert(result.transitions.some(x=>x.to==='entry'),cfg.name+' must enter drift');
 assert(result.rows.some(x=>x.isDrifting&&Math.abs(x.driftAngle)>2),
  cfg.name+' must develop actual yaw');
 if(cfg.counterFrom!==undefined){
  assert(result.transitions.some(x=>x.to==='recover'),'countersteer needs recovery');
 }
 if(cfg.nitroAt!==undefined){
  assert(result.rows.some(x=>x.boosting&&x.boostRemaining>0),'N did not trigger boost');
 }
}
function physicalRows(result){return result.rows.map(row=>physical.map(k=>row[k]));}
function main(){
 const v55Hashes=fingerprints(fs.readFileSync(current,'utf8'));
 const primary=load(current),repeated=load(current);
 const baselinePath=process.env.DRIFT_BASELINE_INDEX||null;
 const older=baselinePath?load(path.resolve(baselinePath)):null;
 const results=[];
 for(const cfg of cases){
  const one=replay(primary,cfg),two=replay(repeated,cfg);
  validate(one,cfg);
  assert.deepEqual(one,two,cfg.name+' is nondeterministic with same seed/dt');
  if(older)assert.deepEqual(physicalRows(one),physicalRows(replay(older,cfg)),
   cfg.name+' physical state differs from provided historical HTML');
  results.push(one);
 }
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify({
  status:'passed',scope:'physics replay only; WebGL not verified',
  dt:1/60,framesPerCase:108,seed:'0x56d123',
  v55SourceFingerprints:v55Hashes,baselineCompared:!!older,results
 },null,2)+'\n');
 console.log('DRIFT-00: '+results.length+' deterministic replay cases passed; '+(older?
  'historical runtime matches':'historical runtime not supplied'));
}
main();
