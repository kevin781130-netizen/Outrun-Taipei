const assert=require('node:assert/strict');
async function scenarios(run,{render=true}={}){
 let checks=0;
 async function check(code,message){const value=await run(code);assert.equal(value,true,message);checks++;}
 const reset="v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();gameStarted=true;raceActive=true;traffic=[];timeLeft=999;";
 const routes=['1A','2A','2B','3A','3B','3C','4A','4B','4C','4D','5A','5B','5C','5D','5E'];
 for(const id of routes){
  for(const mode of ['arcade','sprint']){
   await run(`v34Mode='${mode}';setStage(...Object.values(routeForId('${id}')));`);
   await check(`segments.every((s,i)=>Number.isFinite(s.p1.world.y)&&Number.isFinite(s.curve)&&s.p2.world.y===segments[Math.min(i+1,segments.length-1)].p1.world.y)`,`${id} continuous segment endpoints`);
   await check(`stageLandmarkPlan.every(h=>currentNode.archetype!=='coastal'||h.side===(h.name.includes('橋')?-1:1))`,`${id} buildings on dry land`);
   await check(`currentNode.archetype!=='coastal'||(districtSurface(80,-1)==='water'&&districtSurface(80,1)==='land'&&districtPlacement(80,-1).surface==='water')`,`${id} coastal generic scenery separates water and land`);
   await check(`currentNode.archetype!=='expressway'||(!canPlaceBelowDeckDistrict(0)&&canPlaceBelowDeckDistrict(Math.round(STAGE_END*.5))&&!canPlaceBelowDeckDistrict(STAGE_END+80))`,`${id} elevated district respects deck clearance`);
   await check(`stageLandmarkPlan.every(h=>h.side===0||Math.abs(h.worldOffset)>=ROAD_WIDTH*roadFactor()*1.12+h.sprite.width*h.artUnits/W+999)`,`${id} landmark footprint clears roadway`);
   await check(`currentNode.archetype!=='expressway'||traffic.every(car=>!car.spec.scooter)`,`${id} highway traffic restrictions`);
   for(const mood of ['sunset','neon']){
    await run(`skyMood='${mood}';stageLandmarkPlan=planLandmarks();`);
    for(const marker of ['0','180','Math.round(STAGE_END*.5)','FORK_LOCK','STAGE_SWITCH-2']){
     await check(`playerZ=(${marker})*SEGMENT_LENGTH;playerX=0;${render?'render(0);':'projectRoad();'}projectedRoad.length>0&&projectedRoad.every(s=>Object.values(s.p1.screen).every(Number.isFinite)&&Object.values(s.p2.screen).every(Number.isFinite)&&s.clipY>=0&&s.clipY<=H)`,`${id}/${mode}/${mood}/${marker} valid projection`);
    }
   }
   await run(`speed=0;collisionCooldown=9;crashSequence=null;pendingChoice='right';choiceLocked=false;`);
   for(const index of ['20','FORK_LOCK','STAGE_END+80']){
    await check(`playerX=10;resolveRoadBoundary(${index});roadCorridors(${index}).some(q=>Math.abs(playerX-q.center)<=q.half+.12*roadFactor()-PLAYER_HALF_WIDTH+.00001)`,`${id}/${mode} right boundary`);
    await check(`playerX=-10;resolveRoadBoundary(${index});roadCorridors(${index}).some(q=>Math.abs(playerX-q.center)<=q.half+.12*roadFactor()-PLAYER_HALF_WIDTH+.00001)`,`${id}/${mode} left boundary`);
   }
  }
 }
 await run(reset);
 await check(`nitro=99.8;driftChargeRate=24;chargeDriftNitro(1/60);nitroStock===1&&nitro>0&&nitro<1`,'full gauge stores boost and carries overflow');
 await check(`nitro=99.8;chargeDriftNitro(1/60);nitroStock===2&&nitro===0`,'stock capacity is two');
 await check(`chargeDriftNitro(60);nitroStock===2&&nitro===0`,'full stock cannot overflow');
 await check(`speed=30;!activateNitro()&&nitroStock===2`,'low-speed boost blocked');
 await check(`speed=190;activateNitro()&&nitroStock===1&&boostRemaining===2.8`,'boost consumes one stored unit');
 await check(`!activateNitro()&&nitroStock===1`,'active boost cannot consume another unit');
 await check(`roadGrip=1;steer=.45;isDrifting=true;driftState='drift';driftAge=1;driftDirection=1;slipAngle=8;stepBrakeDrift(1/60,false,true,.45,0);chargeDriftNitro(1/60);nitro>0`,'boost drift charges on straight sections');
 await check(`roadGrip=.5;nitro=0;chargeDriftNitro(1);nitro===0`,'off-road cannot charge');
 await run(reset+"speed=150;roadGrip=1;isDrifting=true;driftState='recover';cleanDriftTime=.8;driftAngle=0;slipAngle=0;");
 await check(`stepBrakeDrift(1/60,false,true,0,0);!isDrifting&&exitBoost>=.55`,'clean drift exit grants a short acceleration pulse');
 await run(reset+"speed=190;nitroStock=2;keys.KeyW=true;keys.KeyN=true;");
 await check(`for(let i=0;i<240;i++)update(1/60);nitroStock===1&&boostRemaining===0&&!boosting`,'holding N never automatically burns the second boost');
 await run(reset+"speed=190;nitroStock=1;keys.KeyW=true;activateNitro();keys.KeyS=true;update(1/60);");
 await check(`boostRemaining===0&&!boosting`,'braking cancels active boost');
 await run(reset+"speed=190;nitroStock=1;selectDriveGear('R',1000);selectDriveGear('D',1200);");
 await check(`nitroStock===0&&boostRemaining>0&&driveGear==='D'`,'Z to A legacy boost works');
 await run(reset+"speed=190;nitroStock=1;selectDriveGear('R',1000);selectDriveGear('D',1600);");
 await check(`nitroStock===1&&boostRemaining===0`,'expired Z to A window cannot consume stock');
 await run(reset);
 await check(`playerX=0;playerZ=2000;!!trafficContact({x:0,z:0},{x:0,z:1200,previousX:0,previousZ:1200,spec:TRAFFIC_TYPES.taxi})`,'swept collision catches complete high-speed crossing');
 await check(`playerZ=0;!!trafficContact({x:0,z:2000},{x:0,z:1500,previousX:0,previousZ:1500,spec:TRAFFIC_TYPES.taxi})`,'reverse crossing collision');
 await check(`playerX=.7;!trafficContact({x:.7,z:0},{x:-.7,z:1200,previousX:-.7,previousZ:1200,spec:TRAFFIC_TYPES.taxi})`,'parallel adjacent lanes remain separate');
 await run(reset+"speed=180;playerX=4;resolveRoadBoundary(20);");
 await check(`!!crashSequence&&crashCount===1&&Math.abs(playerX)<=1`,'barrier collision contains vehicle');
 await run(reset+"speed=180;playerZ=20000;const spec=TRAFFIC_TYPES.taxi;traffic=[{x:0,z:playerZ+PLAYER_DEPTH+300,previousX:0,speed:0,spec,type:'taxi',phase:0,hitTimer:0}];keys.KeyW=true;update(1/60);");
 await check(`!!crashSequence&&crashCount===1`,'real update triggers traffic crash without relying on rendering');
 await run(reset+"nitroStock=1;boostRemaining=1.5;keys.KeyW=true;togglePause();window.__pausedTime=timeLeft;window.__pausedZ=playerZ;update(.25);");
 await check(`paused&&timeLeft===window.__pausedTime&&playerZ===window.__pausedZ&&boostRemaining===1.5&&!inputHeld('KeyW')`,'pause freezes simulation and boost');
 await run(`togglePause();gamepadInput={steer:1,gas:true,brake:false,drift:true,nitro:true};gyroSteer=1;clearInputs();`);
 await check(`!gamepadInput.gas&&gamepadInput.steer===0&&gyroSteer===0`,'clearInputs resets all devices');
 await check(`competitiveBoards[raceBoardKey]={broken:true};showLeaderboardAndEntry(false);leaderboard.length===0`,'malformed leaderboard handled');
 await check(`competitiveBoards[raceBoardKey]=[null,{score:NaN},{score:10,name:'<img>',route:'<svg>',goal:'<script>'}];showLeaderboardAndEntry(false);leaderboard.length===1&&!leaderboard[0].name.includes('<')&&!leaderboard[0].goal.includes('<')`,'invalid leaderboard entries sanitised');
 // Every binary route through the pyramid, with both checkpoint and transition gates.
 for(let path=0;path<16;path++){
  await run(`v34Mode='arcade';resetGame();gameStarted=true;raceActive=true;timeLeft=999;traffic=[];`);
  for(let level=0;level<4;level++){
   const side=(path>>level)&1?'right':'left';
   await check(`playerZ=(FORK_START-51)*SEGMENT_LENGTH;speed=190;playerX=0;traffic=[];update(1/60);checkpointPassed`,`${path}/${level} checkpoint gate`);
   await check(`pendingChoice='${side}';playerZ=STAGE_END*SEGMENT_LENGTH;beginStageTransition('${side}');speed=215;playerX=transitionGeometry(STAGE_SWITCH,'${side}').center*roadFactor();playerZ=STAGE_SWITCH*SEGMENT_LENGTH+17;finishStageTransition();stageLevel===${level+1}&&playerZ===17&&speed===215&&!stageTransition&&Number.isFinite(playerX)`,`${path}/${level} route transition preserves progress`);
  }
  await check(`traffic=[];speed=190;playerX=0;playerZ=FINISH_LINE*SEGMENT_LENGTH-1;update(1/60);gameOver&&!raceActive&&routeHistory.length===5`,`${path} goal flow`);
 }
 await run(`v34Mode='sprint';selectedRoute=routeForId('4A');resetGame();gameStarted=true;raceActive=true;timeLeft=999;traffic=[];speed=190;playerZ=soloFinishIndex()*SEGMENT_LENGTH-1;update(1/60);`);
 await check(`gameOver&&!raceActive&&bestTimes[bestRecordKey()]===raceElapsed`,'sprint finish saves versioned time');
 await run(`v34Mode='cruise';selectedRoute=routeForId('4A');resetGame();gameStarted=true;raceActive=true;traffic=[];speed=190;playerZ=soloFinishIndex()*SEGMENT_LENGTH-1;window.__cruiseTime=timeLeft;update(1/60);`);
 await check(`!gameOver&&playerZ===0&&timeLeft===window.__cruiseTime`,'cruise loops without countdown');
 await run(`stageVisualBlend=1;nitroStock=2;boostRemaining=2;resetGame();`);
 await check(`nitroStock===0&&boostRemaining===0&&stageVisualBlend===0&&!crashSequence`,'new run clears transient effects and boosts');
 return {checks,routes:routes.length,branchPaths:16};
}
module.exports={scenarios};
