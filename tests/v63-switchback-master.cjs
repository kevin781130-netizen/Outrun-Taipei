'use strict';
// V63: opposite-direction *earned* apexes get a bounded switchback bonus.
// Same-direction, broken-flow and stage-transition pairs must not count.
const assert=require('node:assert/strict');
const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const game=load(path.join(__dirname,'../index.html'));
const result=JSON.parse(game.run(`(()=>{
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();
  playerZ=200*SEGMENT_LENGTH;roadGrip=1;collisionCooldown=0;
  speed=190;steer=.25;isDrifting=false;
  const physical=()=>({speed,steer,nitro,nitroStock,boostRemaining,
    lateralVelocity,driftAngle,slipAngle});
  const before=physical();
  function earn(curve,drift=false){
    playerZ+=55*SEGMENT_LENGTH;
    v61ApexStep(1/60,curve);
    for(let i=0;i<40;i++){
      playerZ+=SEGMENT_LENGTH;isDrifting=drift;
      v61ApexStep(1/60,curve);
    }
    isDrifting=false;playerZ+=4*SEGMENT_LENGTH;
    const apex=v61ApexStep(1/60,Math.sign(curve)*.2);
    const flow=v62OnApexAward(apex);
    return {apex,flow,score,streak:v63SwitchbackTotal,popup:
      document.getElementById('style-main').textContent,sub:
      document.getElementById('style-sub').textContent};
  }
  const right=earn(2.4),rightAgain=earn(2.2,true);
  const left=earn(-2.3,true),reverseBack=earn(2.0);
  const leftAgain=earn(-2.4,true),sameLeft=earn(-2.0);
  const scoreAfterSix=score,afterPhysics=physical();
  // A rejected corner cannot update the switchback-direction register.
  playerZ+=60*SEGMENT_LENGTH;
  v61ApexStep(1/60,2.3);
  playerZ+=3*SEGMENT_LENGTH;
  const invalid=v61ApexStep(1/60,.2);
  const unchanged={direction:v63LastDirection,streak:v63SwitchbackTotal,score};
  v62FlowTick(16.01);
  const timeout={direction:v63LastDirection,count:v62FlowCount,streak:v63SwitchbackTotal};
  const fresh=earn(2.2),freshOpposite=earn(-2.2);
  const beforeStage={direction:v63LastDirection,count:v62FlowCount,streak:v63SwitchbackTotal};
  setStage(0,0,false);
  const afterStage={direction:v63LastDirection,count:v62FlowCount,streak:v63SwitchbackTotal};
  playerZ=200*SEGMENT_LENGTH;speed=190;
  const afterStageFirst=earn(-2.5,true);
  const afterStageSecond=earn(2.4,true);
  collisionCooldown=0;triggerCrash(null,null,true);
  const afterCrash={direction:v63LastDirection,count:v62FlowCount};
  resetGame();
  const reset={direction:v63LastDirection,count:v62FlowCount,streak:v63SwitchbackTotal};
  return JSON.stringify({version:COMPETITION.version,board:arcadeBoardKey(),
    right,rightAgain,left,reverseBack,leftAgain,sameLeft,scoreAfterSix,
    before,afterPhysics,invalid,unchanged,timeout,fresh,freshOpposite,
    beforeStage,afterStage,afterStageFirst,afterStageSecond,afterCrash,reset});
})()`));
assert.equal(result.version,'90.0');
assert(result.board.endsWith(':90.0'),'new scoring rules isolated from V62');
assert.equal(result.right.apex.direction,1);
assert.equal(result.right.flow.chain,1);
assert.equal(result.right.streak,0);
assert.equal(result.rightAgain.apex.direction,1);
assert.equal(result.rightAgain.streak,0,'same-direction corners cannot claim switchback bonus');
assert.equal(result.rightAgain.score,1010);
assert.equal(result.left.apex.direction,-1);
assert.equal(result.left.flow.chain,3);
assert.equal(result.left.streak,1);
assert.equal(result.left.score,2200,'opposite clean drift earns exactly +300 extra');
assert.equal(result.left.popup,'SWITCHBACK MASTER!');
assert(result.left.sub.includes('+300 S-TURN'),'visible popup itemizes bonus');
assert.equal(result.reverseBack.streak,2);
assert.equal(result.reverseBack.score,3100);
assert.equal(result.leftAgain.streak,3);
assert.equal(result.leftAgain.score,4410);
assert.equal(result.sameLeft.streak,3);
assert.equal(result.sameLeft.score,5010,'same-direction no additional switch bonus');
assert.equal(result.scoreAfterSix,5010);
assert.deepEqual(result.afterPhysics,result.before,'scoring must not change V60 handling variables');
assert.equal(result.invalid,null);
assert.deepEqual(result.unchanged,{direction:-1,streak:3,score:5010},
  'short unearned bend cannot overwrite prior qualified direction');
assert.deepEqual(result.timeout,{direction:0,count:0,streak:3},
  'expired chain drops direction but keeps the run statistic');
assert.equal(result.fresh.streak,3,'first new apex after timeout cannot switchback');
assert.equal(result.fresh.score,5250);
assert.equal(result.freshOpposite.streak,4);
assert.equal(result.freshOpposite.score,5910);
assert.deepEqual(result.beforeStage,{direction:-1,count:2,streak:4});
assert.deepEqual(result.afterStage,{direction:0,count:0,streak:4});
assert.equal(result.afterStageFirst.streak,4,'first new-stage bend has no cross-stage bonus');
assert.equal(result.afterStageSecond.streak,5,'new-stage opposite bend qualifies normally');
assert.deepEqual(result.afterCrash,{direction:0,count:0});
assert.deepEqual(result.reset,{direction:0,count:0,streak:0});
console.log('V63: same/opposite curvature, signed dominant direction, no short-turn farming, stage/timeout/crash reset and score isolation passed');
