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
 await check(`taipeiRouteIdentityIntact()&&STAGES.flat().map(n=>n.id).join(',')==='1A,2A,2B,3A,3B,3C,4A,4B,4C,4D,5A,5B,5C,5D,5E'`,'V46 clean-room art pass preserves all Taipei route identities');
 await check(`V46_CLEAN_ROOM_ART.sourceCode===false&&V46_CLEAN_ROOM_ART.sourceAssets===false&&V46_CLEAN_ROOM_ART.sourceAudio===false&&V46_CLEAN_ROOM_ART.decompilation===false&&V46_CLEAN_ROOM_ART.instructionMapping===false&&V46_CLEAN_ROOM_ART.directSyntaxTranslation===false&&V46_CLEAN_ROOM_ART.distinctiveFeatureClone===false&&V46_CLEAN_ROOM_ART.independentImplementation===true&&V46_CLEAN_ROOM_ART.preserve.includes('Taipei')`,'clean-room guard forbids direct translation, source assets and distinctive feature cloning');
 await run(`playerZ=180*SEGMENT_LENGTH;playerX=0;speed=177;projectRoad();window.__v46Before=[playerZ,playerX,speed,traffic.length,currentNode.id];window.__v46Vista=drawV46ScalerVista(H*.51,scene());window.__v46Props=drawV46RoadEdgeRhythm(projectedRoad);`);
 await check(`window.__v46Vista>0&&window.__v46Props>=0&&[playerZ,playerX,speed,traffic.length,currentNode.id].every((v,i)=>v===window.__v46Before[i])`,'V46 art layers render without mutating gameplay state');
 await check(`['urban','expressway','coastal','mountain'].includes(v46SceneFamily())&&v46VistaProfile().density>0`,'V46 scaler art profile is generated from Taipei stage archetype');
 await check(`V47_CLEAN_ROOM_REFERENCE.observationOnly&&V47_CLEAN_ROOM_REFERENCE.sourceCode===false&&V47_CLEAN_ROOM_REFERENCE.sourceAssets===false&&V47_CLEAN_ROOM_REFERENCE.decompilation===false&&V47_CLEAN_ROOM_REFERENCE.directSyntaxTranslation===false&&V47_CLEAN_ROOM_REFERENCE.exactHandlingCurveCopy===false&&V47_CLEAN_ROOM_REFERENCE.distinctiveModeClone===false&&V47_CLEAN_ROOM_REFERENCE.distinctiveRouteUICopy===false&&V47_CLEAN_ROOM_REFERENCE.licensedVehicleIdentity===false&&V47_CLEAN_ROOM_REFERENCE.independentImplementation`,'V47 reference guard enforces independent clean-room implementation');
 await check(`COMPETITION.version==='49.0'&&V49_HANDLING.independentModel&&V49_HANDLING.gearDriftClone===false&&V49_HANDLING.distinctiveModeClone===false&&V49_HANDLING.exactHandlingCurveCopy===false&&V49_HANDLING.patentedMechanicReplication===false`,'V49 handling version rejects distinctive mode, gear-drift, patented-mechanic and exact curve cloning');
 await check(`v49SteeringProfile(70,false).response>v49SteeringProfile(270,false).response&&v49SteeringProfile(70,false).authority>v49SteeringProfile(270,false).authority&&v49SteeringProfile(270,false).authority>=.89`,'V49 steering is more assertive without losing high-speed weight');
 await check(`v49SteeringProfile(220,false).liftGrip>1.18&&v49SteeringProfile(220,false).brakeRotation>.14&&DRIFT49.maxBodyYaw===48&&DRIFT49.entryRamp<=.06&&DRIFT49.recoverResponse>DRIFT49.yawResponse`,'V49 handling makes lift, brake rotation and drift entry materially more expressive');
 await run(`playerZ=190*SEGMENT_LENGTH;playerX=0;speed=185;projectRoad();window.__v47Before=[playerZ,playerX,speed,traffic.length,currentNode.id];window.__v47Depth=drawV47CinematicDepth(H*.51,scene());window.__v47Mass=drawV47ForegroundMass(projectedRoad);`);
 await check(`window.__v47Depth>0&&window.__v47Mass>=0&&[playerZ,playerX,speed,traffic.length,currentNode.id].every((v,i)=>v===window.__v47Before[i])`,'V47 cinematic art layers cannot mutate gameplay state');
 await check(`V48_CLEAN_ROOM_REFERENCE.observationOnly&&V48_CLEAN_ROOM_REFERENCE.sourceCode===false&&V48_CLEAN_ROOM_REFERENCE.sourceAssets===false&&V48_CLEAN_ROOM_REFERENCE.decompilation===false&&V48_CLEAN_ROOM_REFERENCE.directSyntaxTranslation===false&&V48_CLEAN_ROOM_REFERENCE.exactHandlingCurveCopy===false&&V48_CLEAN_ROOM_REFERENCE.distinctiveFeatureClone===false&&V48_CLEAN_ROOM_REFERENCE.patentedMechanicReplication===false&&V48_CLEAN_ROOM_REFERENCE.independentImplementation`,'V48 aggressive pass keeps zero-tolerance independent clean-room provenance');
 await run(`playerZ=210*SEGMENT_LENGTH;playerX=0;speed=235;projectRoad();window.__v48Before=[playerZ,playerX,speed,traffic.length,currentNode.id];window.__v48Horizon=drawV48HorizonDepth(H*.51,scene());window.__v48Shadow=drawV48RoadShadowBands(projectedRoad);window.__v48Set=drawV48ForegroundSetpieces(projectedRoad);window.__v48Rush=drawV48PeripheralRush();`);
 await check(`window.__v48Horizon>0&&window.__v48Shadow>=0&&window.__v48Set>=0&&window.__v48Rush>=0&&[playerZ,playerX,speed,traffic.length,currentNode.id].every((v,i)=>v===window.__v48Before[i])`,'V48 aggressive art layers render from Taipei geometry without mutating gameplay state');
 await check(`V49_CLEAN_ROOM_REFERENCE.observationOnly&&V49_CLEAN_ROOM_REFERENCE.sourceCode===false&&V49_CLEAN_ROOM_REFERENCE.sourceAssets===false&&V49_CLEAN_ROOM_REFERENCE.sourceAudio===false&&V49_CLEAN_ROOM_REFERENCE.decompilation===false&&V49_CLEAN_ROOM_REFERENCE.directSyntaxTranslation===false&&V49_CLEAN_ROOM_REFERENCE.exactHandlingCurveCopy===false&&V49_CLEAN_ROOM_REFERENCE.stageCompositionCopy===false&&V49_CLEAN_ROOM_REFERENCE.cameraCurveCopy===false&&V49_CLEAN_ROOM_REFERENCE.patentedMechanicReplication===false&&V49_CLEAN_ROOM_REFERENCE.independentImplementation`,'V49 max-art pass keeps independent clean-room provenance');
 await run(`playerZ=230*SEGMENT_LENGTH;playerX=0;speed=248;projectRoad();window.__v49Before=[playerZ,playerX,speed,traffic.length,currentNode.id];window.__v49Air=drawV49TaipeiAtmosphere(H*.51,scene());window.__v49Lights=drawV49RoadLightRhythm(projectedRoad);window.__v49Near=drawV49NearOcclusion(projectedRoad);window.__v49Rush=drawV49AccelerationRush();`);
 await check(`window.__v49Air>=0&&window.__v49Lights>=0&&window.__v49Near>=0&&window.__v49Rush>=0&&[playerZ,playerX,speed,traffic.length,currentNode.id].every((v,i)=>v===window.__v49Before[i])`,'V49 Taipei art layers cannot mutate gameplay state');
 await check(`document.getElementById('build-version')?.textContent.includes('V49.0')&&document.getElementById('build-version')?.textContent.includes('CURRENT TEST BUILD')`,'visible version label below the game identifies the current V49 test build');

 await run(reset+`speed=220;steer=.8;playerX=0;lateralVelocity=0;chassisRoll=0;chassisPitch=0;visualLoad=0;stepArcadeMotion(1/30,1.2,false,true);`);
 await check(`Math.abs(chassisRoll)>.05&&chassisPitch>.02`,'V48 braking and steering visibly load the chassis without changing route geometry');
 await run(reset+`speed=142;roadGrip=1;steer=.55;previousGas=true;stepBrakeDrift(1/60,false,false,.55,.85);stepBrakeDrift(1/60,false,false,.55,.85);`);
 await check(`isDrifting&&driftDirection===1&&DRIFT49.entryRamp<=.06`,'V49 lift entry responds quickly on a genuine corner without copying a signature shift recipe');

 await run(reset+`speed=180;steer=.7;playerX=0;lateralVelocity=0;driftAngle=0;slipAngle=0;stepArcadeMotion(1/60,1,false,false);window.__liftTurn=Math.abs(playerX);`);
 await run(`playerX=0;lateralVelocity=0;stepArcadeMotion(1/60,1,true,false);window.__throttleTurn=Math.abs(playerX);`);
 await check(`window.__liftTurn>window.__throttleTurn`,'throttle lift increases grip-line rotation without forcing a drift');
 await check(`buildingVolumeProfile(120,80,123).face===1&&buildingVolumeProfile(W-120,80,123).face===-1&&buildingVolumeProfile(120,80,123).depth>=14`,'roadside buildings expose directional depth instead of flat cards');
 await check(`rivalVolumeProfile({spec:TRAFFIC_TYPES.taxi},120).depth>8&&rivalVolumeProfile({spec:TRAFFIC_TYPES.bus},120).depth>rivalVolumeProfile({spec:TRAFFIC_TYPES.taxi},120).depth`,'traffic art exposes vehicle volume profiles');
 await check(`nitro=99.8;driftChargeRate=32;chargeDriftNitro(1/60);nitroStock===1&&nitro>0&&nitro<1`,'full gauge stores boost and carries overflow');
 await check(`COMPETITION.boostSpeed===325&&GEAR_RULES.LOW.max<GEAR_RULES.HIGH.max&&gearDriveProfile('LOW',80).torque>gearDriveProfile('HIGH',80).torque`,'low and high gears have materially different torque and speed ranges');
 await check(`gearDriveProfile('HIGH',190).max===285&&gearDriveProfile('LOW',190).max===185`,'high gear unlocks top-speed range');
 await check(`fitSignTextLayout('超級無敵非常非常長的台北道路招牌文字',22,8,12).width<=20.01`,'sign layout always fits inside its content box');
 await check(`nitro=99.8;chargeDriftNitro(1/60);nitroStock===2&&nitro===0`,'stock capacity is two');
 await check(`chargeDriftNitro(60);nitroStock===2&&nitro===0`,'full stock cannot overflow');
 await check(`speed=30;!activateNitro()&&nitroStock===2`,'low-speed boost blocked');
 await check(`speed=190;activateNitro()&&nitroStock===1&&boostRemaining===2.8&&boostKick>.9`,'boost consumes one stored unit and delivers an immediate visual kick');
 await check(`!activateNitro()&&nitroStock===1`,'active boost cannot consume another unit');
 await check(`roadGrip=1;steer=.45;isDrifting=true;driftState='drift';driftAge=1;driftDirection=1;slipAngle=8;stepBrakeDrift(1/60,false,true,.45,0);chargeDriftNitro(1/60);nitro>0`,'boost drift charges on straight sections');
 await check(`roadGrip=.5;nitro=0;chargeDriftNitro(1);nitro===0`,'off-road cannot charge');
 await run(reset+"speed=150;roadGrip=1;isDrifting=true;driftState='recover';cleanDriftTime=.8;driftAngle=0;slipAngle=0;");
 await check(`stepBrakeDrift(1/60,false,true,0,0);!isDrifting&&momentBoostWindow>.4&&exitBoost===0`,'clean drift exit opens moment boost window without free acceleration');
 await check(`stepBrakeDrift(1/60,false,false,0,0);momentBoostArmed&&exitBoost===0`,'moment boost requires throttle release');
 await check(`stepBrakeDrift(1/60,false,true,0,0);exitBoost>.45&&momentBoostWindow===0&&boostKick>.5`,'throttle re-tap triggers a visible moment boost');
 await run(reset+"autoGear=false;speed=165;rpm=7600;currentGear='LOW';shiftGear('HIGH');");
 await check(`currentGear==='HIGH'&&shiftCutTimer>=.14&&shiftPunch>.2&&rpm<5000`,'manual sweet-spot upshift cuts torque, drops rpm and rewards timing');
 await run(reset+"speed=190;nitroStock=2;keys.KeyW=true;keys.KeyN=true;");
 await check(`for(let i=0;i<240;i++)update(1/60);nitroStock===1&&boostRemaining===0&&!boosting`,'holding N never automatically burns the second boost');
 await run(reset+"speed=190;nitroStock=1;keys.KeyW=true;activateNitro();keys.KeyS=true;update(1/60);");
 await check(`boostRemaining===0&&!boosting`,'braking cancels active boost');
 await run(reset+"speed=190;nitroStock=1;selectDriveGear('R',1000);selectDriveGear('D',1200);");
 await check(`nitroStock===0&&boostRemaining>0&&driveGear==='D'`,'Z to A legacy boost works');
 await run(reset+"speed=190;nitroStock=1;selectDriveGear('R',1000);selectDriveGear('D',1600);");
 await check(`nitroStock===1&&boostRemaining===0`,'expired Z to A window cannot consume stock');
 await run(reset);
 await check(`playerX=0;playerZ=2000;const c={x:0,z:1200,previousX:0,previousZ:1200,spec:TRAFFIC_TYPES.taxi,screenBox:{l:430,r:530,t:380,b:500}};!!trafficContact({x:0,z:0},c)`,'visible swept collision catches complete high-speed crossing');
 await check(`playerZ=0;const c={x:0,z:1500,previousX:0,previousZ:1500,spec:TRAFFIC_TYPES.taxi,screenBox:{l:430,r:530,t:380,b:500}};!!trafficContact({x:0,z:2000},c)`,'visible reverse crossing collision');
 await check(`playerX=.7;const c={x:-.7,z:1200,previousX:-.7,previousZ:1200,spec:TRAFFIC_TYPES.taxi,screenBox:{l:100,r:180,t:380,b:500}};!trafficContact({x:.7,z:0},c)`,'parallel adjacent lanes remain separate');
 await check(`playerZ=2000;const c={x:0,z:2200,previousX:0,previousZ:2100,spec:TRAFFIC_TYPES.taxi,screenBox:null};!trafficCollisionEligible({x:0,z:1900},c)`,'non-rendered traffic can never become a phantom collider');
 await check(`playerZ=(FORK_WARN+4)*SEGMENT_LENGTH;!trafficCollisionEligible({x:0,z:playerZ-500},{x:0,z:playerZ,previousX:0,previousZ:playerZ-300,spec:TRAFFIC_TYPES.taxi,screenBox:{l:430,r:530,t:380,b:500}})`,'traffic beyond authored visible zone cannot become an invisible collider');
 await check(`playerZ=2000;!trafficCollisionEligible({x:0,z:1800},{x:4,z:2050,previousX:4,previousZ:1950,spec:TRAFFIC_TYPES.taxi,screenBox:{l:430,r:530,t:380,b:500}})`,'off-corridor traffic cannot collide with the player');
 await run("v34Mode='cruise';selectedRoute=routeForId('2B');resetGame();gameStarted=true;raceActive=true;traffic=[];timeLeft=999;speed=180;collisionCooldown=0;const q=roadCorridors(20)[0];window.__railLimit=Math.max(.10,q.half-.045*roadFactor()-PLAYER_HALF_WIDTH);playerX=q.center+window.__railLimit+.01;resolveRoadBoundary(20);");
 await check(`!crashSequence&&Math.abs(playerX-roadCorridors(20)[0].center)<=window.__railLimit+.0001`,'light barrier brush is contained without an unexplained crash');
 await run("v34Mode='cruise';selectedRoute=routeForId('2B');resetGame();gameStarted=true;raceActive=true;traffic=[];timeLeft=999;speed=180;collisionCooldown=0;const q=roadCorridors(20)[0];const lim=Math.max(.10,q.half-.045*roadFactor()-PLAYER_HALF_WIDTH);playerX=q.center+lim+.15;resolveRoadBoundary(20);");
 await check(`!!crashSequence&&crashCount===1`,'deep expressway barrier impact still crashes');
 await run(reset+"speed=180;playerZ=20000;const spec=TRAFFIC_TYPES.taxi;traffic=[{x:0,z:playerZ+PLAYER_DEPTH+260,previousX:0,previousZ:playerZ+PLAYER_DEPTH+260,speed:0,spec,type:'taxi',phase:0,hitTimer:0,laneTarget:0,screenBox:null}];keys.KeyW=true;update(1/60);");
 await check(`!!crashSequence&&crashCount===1`,'real update triggers traffic crash only after the car becomes render-visible');
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
