'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');

const html=path.resolve(__dirname,'../index.html');

function driveAcrossBoundary(profile,choice,side){
  const game=load(html,{search:['chain2','chain3','chain4'].includes(profile)?'?handling=v59&drift='+profile:profile==='v59'?'?handling=v59':''});
  return JSON.parse(game.run(`(()=>{
    v34Mode='arcade';
    setStage(0,0,false);
    const choice='${choice}',side=${side};
    const nextColumn=choice==='right'?1:0;
    stageTransition={choice,nextLevel:1,nextColumn,next:STAGES[1][nextColumn],lastCenter:0,progress:1};
    playerZ=STAGE_SWITCH*SEGMENT_LENGTH+SEGMENT_LENGTH*.18;
    playerX=side*.17;
    speed=185;roadGrip=.94;steer=side;
    isDrifting=true;driftState='drift';driftDirection=side;
    driftAge=.8;cleanDriftTime=.9;driftAngle=side*24;
    yawRate=side*3.2;slipAngle=side*11;lateralVelocity=side*.37;
    v59LiftTime=.05;nitro=32;nitroStock=1;boostRemaining=.7;
    if(v59Arcade4){v59Arcade4PeakSlip=16;v59Arcade4ExitTimer=.21;}
    slideTrails=[{life:.41,points:[{x:0,y:0}],dir:side}];
    const before={angle:driftAngle,slip:slipAngle,yawRate,lateralVelocity,
      direction:driftDirection,state:driftState,drifting:isDrifting,
      age:driftAge,clean:cleanDriftTime,lift:v59LiftTime,
      grip:roadGrip,speed,nitro,nitroStock,boostRemaining,trail:slideTrails.length,
      peak:v59Arcade4PeakSlip,exitTimer:v59Arcade4ExitTimer};
    finishStageTransition();
    const after={angle:driftAngle,slip:slipAngle,yawRate,lateralVelocity,
      direction:driftDirection,state:driftState,drifting:isDrifting,
      age:driftAge,clean:cleanDriftTime,lift:v59LiftTime,
      grip:roadGrip,speed,nitro,nitroStock,boostRemaining,trail:slideTrails.length,
      peak:v59Arcade4PeakSlip,exitTimer:v59Arcade4ExitTimer};
    keys.KeyW=true;keys.ArrowRight=side>0;keys.ArrowLeft=side<0;
    stepHandlingDrift(1/60,false,true,side,side*.8);
    return JSON.stringify({before,after,next:currentNode.id,level:stageLevel,
      x:playerX,z:playerZ,continues:isDrifting&&driftState!=='recover',
      identity:taipeiRouteIdentityIntact(),profile:handlingProfile59});
  })()`));
}

for(const choice of ['left','right'])for(const side of [-1,1]){
  const v=driveAcrossBoundary('v59',choice,side);
  assert(v.profile,'V59 opt-in is active');
  assert.equal(v.next,choice==='left'?'2A':'2B','Taipei route choice is unchanged');
  assert.equal(v.level,1);
  assert(v.identity,'all Taipei route identities remain');
  assert.equal(v.z,200*.18,'only route-local Z resets at boundary');
  assert(Math.abs(v.x-side*.17)<1e-9,'vehicle must not jump sideways');
  assert.deepEqual(v.after,v.before,'V59 route change must preserve entire drift/inertia and boost snapshot');
  assert(v.continues,'next handling frame may not interrupt sustained slide');
  const chain=driveAcrossBoundary('chain2',choice,side);
  assert(chain.profile&&chain.continues&&chain.identity);
  assert.equal(chain.next,v.next,'CHAIN2 must use exactly the same Taipei route');
  assert.deepEqual(chain.before,chain.after,'CHAIN2 must preserve drift and boost through fork');
  for(const profile of ['chain3','chain4']){
    const tuned=driveAcrossBoundary(profile,choice,side);
    assert(tuned.profile&&tuned.continues&&tuned.identity,profile+' must continue through district change');
    assert.equal(tuned.next,v.next,profile+' must retain the exact Taipei route');
    assert.deepEqual(tuned.before,tuned.after,profile+' must retain yaw, slip, inertia, combo, boost and earned exit state');
    if(profile==='chain4')assert(tuned.after.peak===16&&tuned.after.exitTimer===.21);
  }
  const legacy=driveAcrossBoundary('legacy',choice,side);
  assert(!legacy.profile);
  assert(!legacy.after.drifting&&legacy.after.state==='grip',
    'legacy default retains its original stage-reset behavior');
  assert.equal(legacy.after.speed,legacy.before.speed,'legacy route switch keeps speed');
  assert.equal(legacy.after.nitroStock,legacy.before.nitroStock,'legacy route switch keeps nitro stock');
}
console.log('Stage36 route continuity: V59 drift, grip, inertia, boost and Taipei stage choice preserved (both forks/sides); legacy isolated');
