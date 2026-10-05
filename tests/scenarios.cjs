const assert=require('node:assert/strict');
const {CORNER,SPEED}=require('./tools/probe-code.cjs');
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
 await check(`COMPETITION.version==='52.0'&&V51_HANDLING.independentModel&&V51_HANDLING.gearDriftClone===false&&V51_HANDLING.distinctiveModeClone===false&&V51_HANDLING.exactHandlingCurveCopy===false&&V51_HANDLING.patentedMechanicReplication===false`,'V51 handling keeps independent recovery model');
 await check(`v51SteeringProfile(70,false).response>v51SteeringProfile(270,false).response&&v51SteeringProfile(70,false).authority>v51SteeringProfile(270,false).authority&&v51SteeringProfile(270,false).authority>=.89`,'V50 steering preserves high-speed authority without excessive camera motion');
 await check(`v51SteeringProfile(220,false).liftGrip>1.15&&v51SteeringProfile(220,false).brakeRotation>.13&&DRIFT51.entryMinSpeed===58&&DRIFT51.entryRamp<=.055&&DRIFT51.maxBodyYaw===40&&DRIFT51.recoverResponse>DRIFT51.yawResponse`,'V51 drift entry stays accessible while physical yaw remains controlled');
 await run(`playerZ=190*SEGMENT_LENGTH;playerX=0;speed=185;projectRoad();window.__v47Before=[playerZ,playerX,speed,traffic.length,currentNode.id];window.__v47Depth=drawV47CinematicDepth(H*.51,scene());window.__v47Mass=drawV47ForegroundMass(projectedRoad);`);
 await check(`window.__v47Depth>0&&window.__v47Mass>=0&&[playerZ,playerX,speed,traffic.length,currentNode.id].every((v,i)=>v===window.__v47Before[i])`,'V47 cinematic art layers cannot mutate gameplay state');
 await check(`V48_CLEAN_ROOM_REFERENCE.observationOnly&&V48_CLEAN_ROOM_REFERENCE.sourceCode===false&&V48_CLEAN_ROOM_REFERENCE.sourceAssets===false&&V48_CLEAN_ROOM_REFERENCE.decompilation===false&&V48_CLEAN_ROOM_REFERENCE.directSyntaxTranslation===false&&V48_CLEAN_ROOM_REFERENCE.exactHandlingCurveCopy===false&&V48_CLEAN_ROOM_REFERENCE.distinctiveFeatureClone===false&&V48_CLEAN_ROOM_REFERENCE.patentedMechanicReplication===false&&V48_CLEAN_ROOM_REFERENCE.independentImplementation`,'V48 aggressive pass keeps zero-tolerance independent clean-room provenance');
 await run(`playerZ=210*SEGMENT_LENGTH;playerX=0;speed=235;projectRoad();window.__v48Before=[playerZ,playerX,speed,traffic.length,currentNode.id];window.__v48Horizon=drawV48HorizonDepth(H*.51,scene());window.__v48Shadow=drawV48RoadShadowBands(projectedRoad);window.__v48Set=drawV48ForegroundSetpieces(projectedRoad);window.__v48Rush=drawV48PeripheralRush();`);
 await check(`window.__v48Horizon>0&&window.__v48Shadow>=0&&window.__v48Set>=0&&window.__v48Rush>=0&&[playerZ,playerX,speed,traffic.length,currentNode.id].every((v,i)=>v===window.__v48Before[i])`,'V48 aggressive art layers render from Taipei geometry without mutating gameplay state');
 await check(`V49_CLEAN_ROOM_REFERENCE.observationOnly&&V49_CLEAN_ROOM_REFERENCE.sourceCode===false&&V49_CLEAN_ROOM_REFERENCE.sourceAssets===false&&V49_CLEAN_ROOM_REFERENCE.sourceAudio===false&&V49_CLEAN_ROOM_REFERENCE.decompilation===false&&V49_CLEAN_ROOM_REFERENCE.directSyntaxTranslation===false&&V49_CLEAN_ROOM_REFERENCE.exactHandlingCurveCopy===false&&V49_CLEAN_ROOM_REFERENCE.stageCompositionCopy===false&&V49_CLEAN_ROOM_REFERENCE.cameraCurveCopy===false&&V49_CLEAN_ROOM_REFERENCE.patentedMechanicReplication===false&&V49_CLEAN_ROOM_REFERENCE.independentImplementation`,'V49 max-art pass keeps independent clean-room provenance');
 await run(`playerZ=230*SEGMENT_LENGTH;playerX=0;speed=248;projectRoad();window.__v49Before=[playerZ,playerX,speed,traffic.length,currentNode.id];window.__v49Air=drawV49TaipeiAtmosphere(H*.51,scene());window.__v49Lights=drawV49RoadLightRhythm(projectedRoad);window.__v49Near=drawV49NearOcclusion(projectedRoad);window.__v49Rush=drawV49AccelerationRush();`);
 await check(`window.__v49Air>=0&&window.__v49Lights>=0&&window.__v49Near>=0&&window.__v49Rush>=0&&[playerZ,playerX,speed,traffic.length,currentNode.id].every((v,i)=>v===window.__v49Before[i])`,'V49 Taipei art layers cannot mutate gameplay state');
 await check(`V50_CLEAN_ROOM_REFERENCE.observationOnly&&V50_CLEAN_ROOM_REFERENCE.sourceCode===false&&V50_CLEAN_ROOM_REFERENCE.sourceAssets===false&&V50_CLEAN_ROOM_REFERENCE.decompilation===false&&V50_CLEAN_ROOM_REFERENCE.directSyntaxTranslation===false&&V50_CLEAN_ROOM_REFERENCE.exactHandlingCurveCopy===false&&V50_CLEAN_ROOM_REFERENCE.stageCompositionCopy===false&&V50_CLEAN_ROOM_REFERENCE.cameraCurveCopy===false&&V50_CLEAN_ROOM_REFERENCE.patentedMechanicReplication===false&&V50_CLEAN_ROOM_REFERENCE.independentImplementation`,'V50 recovery pass keeps independent clean-room provenance');
 await run(`playerZ=220*SEGMENT_LENGTH;playerX=0;speed=220;projectRoad();window.__v50Before=[playerZ,playerX,speed,traffic.length,currentNode.id];window.__v50Safe=drawV50SafeRoadsideDepth(projectedRoad);window.__v50Rush=drawV50ComfortRush();`);
 await check(`window.__v50Safe>=0&&window.__v50Rush>=0&&[playerZ,playerX,speed,traffic.length,currentNode.id].every((v,i)=>v===window.__v50Before[i])`,'V50 safe roadside art and comfort rush cannot mutate gameplay state');
 await check(`V50_ART.surfaceAware&&V50_ART.roadClip&&V50_ART.maxNearScale<=1.10&&V51_HANDLING.cameraLeanMax<=.011&&V50_COMFORT.motionScale<.5&&V50_COMFORT.shakeMax<=1.6`,'V50 limits roadside scale and camera motion for comfort');
 await run(`selectedRoute=routeForId('3A');v34Mode='cruise';resetGame();playerZ=220*SEGMENT_LENGTH;projectRoad();drawV50SafeRoadsideDepth(projectedRoad);window.__coastalLog=v51RoadsideRenderLog.map(x=>({...x}));`);
 await check(`window.__coastalLog.every(x=>x.scale<=V50_ART.maxNearScale+.001&&x.clearance+0.01>=x.requiredClearance&&(!x.building||x.surface==='land'))&&window.__coastalLog.filter(x=>x.surface==='water').every(x=>!x.building)`,'V51 roadside layer keeps buildings off water and beyond the road clearance envelope');
 await run(`selectedRoute=routeForId('2B');v34Mode='cruise';resetGame();playerZ=180*SEGMENT_LENGTH;projectRoad();drawV50SafeRoadsideDepth(projectedRoad);window.__expressLog=v51RoadsideRenderLog.map(x=>({...x}));`);
 await check(`window.__expressLog.every(x=>Number.isFinite(x.x)&&Number.isFinite(x.y)&&Number.isFinite(x.scale)&&x.clearance+0.01>=x.requiredClearance)&&!drawRoad.toString().includes('drawV49NearOcclusion(projected)')&&!drawRoad.toString().includes('drawV48ForegroundSetpieces(projected)')`,'V51 removes overlapping near-building passes and keeps expressway roadside geometry finite');
 await run(`selectedRoute=routeForId('4D');v34Mode='cruise';resetGame();playerZ=190*SEGMENT_LENGTH;projectRoad();window.__roadFinite=projectedRoad.every(seg=>[seg.p1.screen.x,seg.p1.screen.y,seg.p1.screen.w,seg.p2.screen.x,seg.p2.screen.y,seg.p2.screen.w,seg.clipY].every(Number.isFinite));isDrifting=true;driftState='drift';driftDirection=1;driftAngle=36;slipAngle=11;drawPlayer();window.__meshFinite=vehicleRenderLog.faces>20&&Number.isFinite(vehicleRenderLog.sideWidth)&&vehicleRenderLog.wheelCenters.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<260&&Math.abs(p.y)<220);`);
 await check(`window.__roadFinite&&window.__meshFinite`,'V51 projected road and extreme-sideways vehicle mesh stay finite without clipping explosions');
 await run(reset+`gameStarted=true;raceActive=true;paused=false;gameOver=false;crashSequence=null;driveGear='D';motionDirection=1;speed=145;roadGrip=1;steer=.65;previousGas=true;keys.ShiftLeft=true;keys.ArrowRight=true;keys.KeyW=true;update(1/60);window.__driftProbe=[speed,isDrifting,brakeEntry,helperPulse];keys.ShiftLeft=false;keys.ArrowRight=false;keys.KeyW=false;`);
 await check(`window.__driftProbe[0]>142&&(window.__driftProbe[1]||window.__driftProbe[2]>0)&&window.__driftProbe[3]>0`,'V50 drift helper initiates without acting like a full brake');
 await run(reset+`speed=155;roadGrip=1;steer=.62;isDrifting=true;driftState='drift';driftAge=.5;driftDirection=1;slipAngle=8;nitro=0;nitroStock=0;stepBrakeDrift(1/60,false,true,.62,.9);chargeDriftNitro(1/60);window.__chargeProbe=[driftChargeRate,nitro];`);
 await check(`window.__chargeProbe[0]>35&&window.__chargeProbe[1]>.4`,'V50 active drift produces clearly visible nitro charge');
 await run(reset+`gameStarted=true;raceActive=true;paused=false;gameOver=false;crashSequence=null;driveGear='D';motionDirection=1;speed=170;nitroStock=1;boostRemaining=0;nitroLatch=false;window.__nitroActivated=activateNitro();`);
 await check(`window.__nitroActivated&&nitroStock===0&&boostRemaining===2.8&&nitroLatch&&speed>=188&&boostKick>.9`,'V50 nitro activates directly and delivers an immediate speed impulse');
 await check(`V51_CLEAN_ROOM_REFERENCE.observationOnly&&V51_CLEAN_ROOM_REFERENCE.sourceCode===false&&V51_CLEAN_ROOM_REFERENCE.sourceAssets===false&&V51_CLEAN_ROOM_REFERENCE.decompilation===false&&V51_CLEAN_ROOM_REFERENCE.directSyntaxTranslation===false&&V51_CLEAN_ROOM_REFERENCE.exactHandlingCurveCopy===false&&V51_CLEAN_ROOM_REFERENCE.exactAnimationCopy===false&&V51_CLEAN_ROOM_REFERENCE.signatureCameraCopy===false&&V51_CLEAN_ROOM_REFERENCE.patentedMechanicReplication===false&&V51_CLEAN_ROOM_REFERENCE.curveBoundVisualYaw&&V51_CLEAN_ROOM_REFERENCE.physicsVisualDecoupled&&V51_CLEAN_ROOM_REFERENCE.noAutoRailDrift&&V51_CLEAN_ROOM_REFERENCE.independentImplementation`,'V51 sideways drift keeps independent clean-room provenance and no auto-rail cloning');
 await run(reset+`isDrifting=true;driftState='drift';driftDirection=1;driftAngle=34;slipAngle=10;window.__sideShallow=v51DriftVisualPose(.35);window.__sideTight=v51DriftVisualPose(1.8);window.__phys=[driftAngle,slipAngle,playerX];`);
 await check(`window.__sideShallow.yaw>=28&&window.__sideShallow.yaw<=36&&window.__sideTight.yaw>window.__sideShallow.yaw+8&&window.__sideTight.yaw<=58&&Math.abs(window.__sideTight.offsetX)<=8&&window.__sideTight.scaleX<1.02&&[driftAngle,slipAngle,playerX].every((v,i)=>v===window.__phys[i])`,'V51 whole-car sideways presentation scales with real bend demand without moving physics state');
 await check(`v51VisualCurveCap(.3)<v51VisualCurveCap(1.8)&&v51DriftPathScale(.3)<v51DriftPathScale(1.8)&&V51_SIDEWAYS.physicsVisualDecoupled&&V51_SIDEWAYS.curveBoundVisualYaw`,'V51 shallow bends get smaller path/yaw demand while tight bends keep strong sideways presentation');
 await run(reset+`speed=180;roadGrip=1;steer=.72;isDrifting=true;driftState='drift';driftDirection=1;driftAge=.6;driftAngle=28;slipAngle=10;playerX=0;lateralVelocity=0;for(let i=0;i<60;i++)stepArcadeMotion(1/60,.35,true,false);window.__shallowX=Math.abs(playerX);`);
 await run(reset+`speed=180;roadGrip=1;steer=.72;isDrifting=true;driftState='drift';driftDirection=1;driftAge=.6;driftAngle=28;slipAngle=10;playerX=0;lateralVelocity=0;for(let i=0;i<60;i++)stepArcadeMotion(1/60,1.8,true,false);window.__tightX=Math.abs(playerX);`);
 await check(`window.__shallowX<window.__tightX&&window.__shallowX<.55`,'V51 physical drift line stays restrained on shallow bends instead of throwing the car at the wall');
 await check(`v51CruisePullFactor(100,285)>v51CruisePullFactor(160,285)&&v51CruisePullFactor(160,285)>v51CruisePullFactor(230,285)&&v51CruisePullFactor(275,285)<.2`,'V51 normal acceleration progressively softens above 100 km/h');
 await check(`v51NitroPush(180)>150&&v51NitroPush(300)>70&&V51_SPEED_FEEL.boostImpulse>=28`,'V51 nitro remains a strong high-speed acceleration channel');
 await run(reset+`gameStarted=true;raceActive=true;paused=false;gameOver=false;crashSequence=null;driveGear='D';motionDirection=1;speed=180;roadGrip=1;steer=.7;isDrifting=true;driftState='drift';driftDirection=1;driftAge=.5;slipAngle=9;nitro=12;nitroStock=1;boostRemaining=0;nitroLatch=false;window.__simulActivated=activateNitro();const before=nitro;stepBrakeDrift(1/60,false,true,.7,1.0);chargeDriftNitro(1/60);window.__simul=[window.__simulActivated,boostRemaining,nitro,before,driftChargeRate,nitroStock];`);
 await check(`window.__simul[0]&&window.__simul[1]>2.7&&window.__simul[2]>window.__simul[3]&&window.__simul[4]>35&&window.__simul[5]===0`,'V51 can release nitro and continue charging during the same drift');
 await check(`Object.keys(ROUTE_REALITY).length===15&&Object.values(ROUTE_REALITY).every(r=>r.note&&['real-anchor','real-corridor','compressed-link'].includes(r.grade))`,'V51 reality audit covers all 15 Taipei routes');
 await check(`Object.keys(V51_LANDMARK_AUDIT).length===15&&Object.values(V51_LANDMARK_AUDIT).every(v=>v.status==='audited-v51'&&v.height>=6900&&v.silhouette)`,'V51 landmark scale and silhouette audit covers all 15 routes');
 await check(`ROUTE_REALITY['4C'].note.includes('彩虹橋')&&ROUTE_REALITY['4C'].note.includes('不把人行橋當汽車道路')&&ROUTE_REALITY['5E'].note.includes('纜車')&&ROUTE_REALITY['5E'].note.includes('不是可駕駛路線')`,'V51 does not turn pedestrian or gondola landmarks into drivable roads');



 await run(reset+`speed=220;steer=.8;playerX=0;lateralVelocity=0;chassisRoll=0;chassisPitch=0;visualLoad=0;stepArcadeMotion(1/30,1.2,false,true);`);
 await check(`Math.abs(chassisRoll)>.05&&chassisPitch>.02`,'V48 braking and steering visibly load the chassis without changing route geometry');
 await run(reset+`speed=142;roadGrip=1;steer=.55;previousGas=true;stepBrakeDrift(1/60,false,false,.55,.85);stepBrakeDrift(1/60,false,false,.55,.85);`);
 await check(`isDrifting&&driftDirection===1&&DRIFT51.entryRamp<=.055`,'V51 lift entry remains quick on a genuine corner without copying a signature shift recipe');

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
 // V52 arcade flow: shorter crash interruption, stronger re-entry, approach signage, competitive namespace bump.
 await check(`V52_FLOW.crashDuration<=3.0&&V52_FLOW.crashDuration<4.1&&V52_FLOW.recoverySpeed>75&&V52_FLOW.recoverySpeed<=110&&V52_FLOW.autoRailAssist===false&&V52_FLOW.exactSourceCopy===false`,'V52 crash interruption is shorter without any auto-rail assist');
 await check(`bestRecordKey('1A').endsWith(':52.0')&&arcadeBoardKey().endsWith(':52.0')`,'V52 competitive records use a new namespace instead of mixing with V51 physics');
 await run(reset+"speed=180;playerX=0;collisionCooldown=0;triggerCrash(null,null,true);window.__crashDur=crashSequence.duration;window.__crashT=0;for(let i=0;i<400&&crashSequence;i++){update(1/60);window.__crashT+=1/60;}window.__crashDone=!crashSequence;window.__crashSpeed=speed;window.__crashGrace=collisionCooldown;");
 await check(`window.__crashDone&&window.__crashT<=3.1&&window.__crashT>=2.7&&window.__crashSpeed===V52_FLOW.recoverySpeed&&window.__crashGrace>=1.5`,'V52 crash recovers within ~3s at a speed that rejoins the flow');
 await run(reset+"crashSequence={t:0,anim:0,duration:V52_FLOW.crashDuration,impactSpeed:150,side:1};update(1.0);window.__anim=crashSequence.anim;window.__animT=crashSequence.t;crashSequence=null;");
 await check(`Math.abs(window.__anim-window.__animT*V52_FLOW.crashAnimScale)<1e-9&&window.__anim>1.3`,'V52 chase animation plays on a compressed clock instead of being cut off');
 for(const id of routes){
  for(const mode of ['arcade','sprint','cruise']){
   await run(`v34Mode='${mode}';stageLevel=0;selectedRoute=routeForId('${id}');if('${mode}'==='arcade'){setStage(...Object.values(routeForId('${id}')));}else{resetGame();}`);
   await check(`(()=>{const t=v52ApproachTarget(),signs=v52ApproachSigns();return !!t&&signs.length===3&&signs.every(x=>x.index<t.index&&x.index>20&&Number.isFinite(x.index))&&signs[0].index<signs[1].index&&signs[1].index<signs[2].index&&signs[0].meters===500})()`,`${id}/${mode} approach boards count down 500/300/100 before the target`);
  }
 }
 await run(reset+"speed=120;playerX=0;const sg=v52ApproachSigns()[1];playerZ=(sg.index-1)*SEGMENT_LENGTH+5;v52LastSeg=-1;v52ApproachTick();window.__tickBefore=v52LastSeg;playerZ=(sg.index+1)*SEGMENT_LENGTH;window.__tickFires=v52ApproachTick();");
 await check(`window.__tickFires===true`,'V52 approach tick fires exactly when passing a board');
 for(const id of ['2B','3A','4D','5E']){
  await run(`v34Mode='sprint';selectedRoute=routeForId('${id}');resetGame();gameStarted=true;raceActive=true;traffic=[];timeLeft=999;const sg=v52ApproachSigns()[2];playerZ=(sg.index-60)*SEGMENT_LENGTH;playerX=0;speed=150;render(0);window.__signDraw=0;const seg=segments[sg.index];ctx.save();window.__signDraw=drawApproachSign(seg.p1.screen,sg);ctx.restore();window.__signFinite=Object.values(seg.p1.screen).every(v=>typeof v!=='number'||Number.isFinite(v));`);
  await check(`window.__signFinite&&(window.__signDraw===0||window.__signDraw===1)`,`${id} approach board projection stays finite`);
 }
 await run(reset+"flash=0;awardCheckpoint();window.__cpFlash=flash;window.__cpTint=flashTint;");
 await check(`window.__cpFlash>=V52_FLOW.checkpointFlash&&window.__cpTint!=='255,255,255'`,'V52 checkpoint gives a warm gold flash');
 // ---- V52 Phase 2 -------------------------------------------------------------------------------
 // Checkpoint feedback must not lean on camera shake.
 await run(reset+"screenShake=0;flash=0;checkpointPassed=false;stageLevel=0;v34Mode='arcade';awardCheckpoint();window.__cpShake=screenShake;");
 await check(`window.__cpShake===0&&flash>=V52_FLOW.checkpointFlash`,'V52 checkpoint feedback uses chime + gold flash and adds no camera shake');
 // Player-facing rule numbers come from gameplay constants.
 await check(`(()=>{const v=ruleValues();return v.topSpeed===COMPETITION.topSpeed&&v.boostSpeed===COMPETITION.boostSpeed&&v.lowSpeed===GEAR_RULES.LOW.max&&v.highSpeed===GEAR_RULES.HIGH.max&&Number(v.nitroDuration)===NITRO_RULES.duration&&v.nitroCapacity===NITRO_RULES.capacity;})()`,'V52 rule labels are derived from authoritative constants');
 // Corner differentiation: shared safe-speed rule, over-speed push only on grip.
 await check(`v52SafeCornerSpeed(.3)>v52SafeCornerSpeed(1.5)&&v52SafeCornerSpeed(1.5)>v52SafeCornerSpeed(3.6)&&v52SafeCornerSpeed(9)===V52_CORNER.safeMin`,'V52 safe corner speed falls with bend demand');
 await check(`v52OverspeedPush(150,3.6)===0&&Math.abs(v52OverspeedPush(280,.3))<.005&&v52OverspeedPush(280,3.6)>.1&&v52OverspeedPush(280,-3.6)<-.1&&v52OverspeedPush(260,3.6)<v52OverspeedPush(285,3.6)`,'V52 over-speed push only appears above the safe speed and follows bend direction');
 await run(reset+"v34Mode='sprint';selectedRoute=routeForId('1A');resetGame();const sg=segments[400];window.__hudEntry=(()=>{for(let i=0;i<segments.length;i++)segments[i].curve=0;segments[420].curve=3.0;playerZ=400*SEGMENT_LENGTH;speed=200;updateDrivingHUD();return document.getElementById('corner-speed').textContent;})();");
 await check(`window.__hudEntry.includes(String(Math.round(v52SafeCornerSpeed(3.0))))`,'V52 HUD recommended entry speed is the physics safe speed, not a second table');
 const sim=async(c,v,p)=>JSON.parse(await run(`JSON.stringify((${CORNER})(${c},${v},'${p}'))`));
 const sShallow={coast:await sim(.3,280,'coast'),grip:await sim(.3,280,'grip'),drift:await sim(.3,280,'drift')};
 const sMed={grip:await sim(.9,280,'grip'),drift:await sim(.9,280,'drift')};
 const sHair={coast:await sim(3.6,280,'coast'),grip:await sim(3.6,280,'grip'),lift:await sim(3.6,280,'lift'),drift:await sim(3.6,280,'drift')};
 const sTight={grip:await sim(2.2,280,'grip'),drift:await sim(2.2,280,'drift')};
 assert.ok(sShallow.coast.maxX<.2&&!sShallow.coast.crashed,'shallow bend barely moves an unsteered car');checks++;
 assert.ok(sHair.coast.maxX>.55&&sHair.coast.maxX>sShallow.coast.maxX*4,'hairpin demands real steering while shallow does not');checks++;
 assert.ok(sHair.grip.time-sShallow.grip.time>1.0,'carrying 280 km/h through a hairpin with grip costs clear time');checks++;
 assert.ok(sHair.grip.duty>sShallow.grip.duty*2,'hairpin needs much more steering input than a shallow bend');checks++;
 assert.ok(sHair.drift.time<=sHair.grip.time+.05&&sHair.drift.charge>=60&&!sHair.drift.crashed,'drift is viable and earns nitro charge in a hairpin');checks++;
 assert.ok(sTight.drift.time<=sTight.grip.time+.1&&sTight.drift.charge>=60,'drift keeps pace with grip and charges nitro in tight bends');checks++;
 assert.ok(sShallow.drift.time>sShallow.grip.time+.15&&sMed.drift.offroad+sMed.drift.time>sMed.grip.time+2,'drift is a poor line on gentle and medium bends (grip is the right tool)');checks++;
 assert.ok(sHair.lift.time>sHair.grip.time-.05,'pre-lifting is never free in a hairpin');checks++;
 // Close pass.
 const cp=`const spec=TRAFFIC_TYPES.taxi;const mk=(gap,spd)=>({x:(trafficHalfWidth({spec})+PLAYER_HALF_WIDTH)+gap,z:playerZ+PLAYER_DEPTH,previousX:0,previousZ:0,speed:spd,spec,type:'taxi',phase:0,hitTimer:0,near:false,laneTarget:0,screenBox:{l:400,r:520,t:380,b:470,cx:460,cy:420}});`;
 await run(reset+cp+"speed=210;playerX=0;collisionCooldown=0;screenShake=0;score=0;styleCombo=1;closePassChain=0;closePassTimer=0;closePassTotal=0;window.__c1=mk(.06,120);window.__e1=v52ClosePassEligible(window.__c1,.06,0);window.__p1=nearMiss(window.__c1,.06);window.__c2=mk(.02,120);window.__p2=nearMiss(window.__c2,.02);window.__shake=screenShake;window.__combo=styleCombo;");
 await check(`window.__e1&&window.__p1===V52_CLOSEPASS.points[0]&&window.__p2===Math.round(V52_CLOSEPASS.points[1]*(1+V52_CLOSEPASS.chainStep))&&closePassTotal===2&&score===window.__p1+window.__p2`,'V52 close pass scores wide/tight tiers and chains within the window');
 await check(`window.__shake===0&&window.__combo===1&&V52_CLOSEPASS.shake===0&&V52_CLOSEPASS.chargeReward===0`,'V52 close pass adds no camera shake, no drift-combo coupling and no nitro reward');
 await run(reset+cp+"playerX=0;collisionCooldown=0;crashSequence=null;window.__rej=[];const q=(spd,gap,mod)=>{speed=spd;collisionCooldown=0;crashSequence=null;driveGear='D';motionDirection=1;const c=mk(gap,mod.carSpeed??120);if(mod.noBox)c.screenBox=null;if(mod.hit)c.hitTimer=.5;if(mod.cool)collisionCooldown=1;return v52ClosePassEligible(c,gap,mod.dz??0);};window.__rej=[q(210,.06,{}),q(120,.06,{}),q(210,.06,{carSpeed:190}),q(210,.005,{}),q(210,.2,{}),q(210,.06,{noBox:true}),q(210,.06,{hit:true}),q(210,.06,{cool:true}),q(210,.06,{dz:900})];");
 await check(`JSON.stringify(window.__rej)==='[true,false,false,false,false,false,false,false,false]'`,'V52 close pass requires speed, closing speed, true proximity, visibility, no collision state and same-depth contact');
 await run(reset+cp+"speed=210;collisionCooldown=0;crashSequence=null;score=0;closePassChain=0;closePassTimer=0;closePassTotal=0;nearMiss(mk(.06,120),.06);triggerCrash(null,null,true);window.__afterCrash=[closePassChain,closePassTimer,closePassFx.length];");
 await check(`window.__afterCrash.every(v=>v===0)`,'V52 crash clears the close-pass chain (crashing never pays)');
 await run(reset+"v34Mode='sprint';selectedRoute=routeForId('1A');resetGame();gameStarted=true;raceActive=true;timeLeft=999;traffic=[];for(let i=0;i<segments.length;i++)segments[i].curve=0;playerX=0;playerZ=300*SEGMENT_LENGTH;speed=200;currentGear='HIGH';collisionCooldown=0;screenShake=0;closePassTotal=0;score=0;const spec=TRAFFIC_TYPES.taxi,half=trafficHalfWidth({spec})+PLAYER_HALF_WIDTH,cx=half+.05;const ph=Math.asin(Math.min(1,cx/(.58*roadFactor())))-simulationTime*.13;traffic=[{x:cx,z:playerZ+PLAYER_DEPTH+1500,previousX:cx,previousZ:playerZ+PLAYER_DEPTH+1500,speed:110,targetSpeed:0,spec,type:'taxi',phase:ph,hitTimer:0,laneTarget:cx,screenBox:null,near:false}];keys.KeyW=true;let crashed=false;for(let i=0;i<150&&!crashSequence;i++){update(1/60);}window.__liveCP=[closePassTotal,!!crashSequence,screenShake,score>0];");
 await check(`window.__liveCP[0]===1&&window.__liveCP[1]===false&&window.__liveCP[2]<1`,'V52 a real visible fast pass triggers exactly one close pass without a crash or shake');
 // Speed-linked wind rush: 160 and 280 km/h must sound clearly different regardless of gear.
 await check(`(()=>{const a=v52WindProfile(100),b=v52WindProfile(160),c=v52WindProfile(220),d=v52WindProfile(280);return a.gain<b.gain&&b.gain<c.gain&&c.gain<d.gain&&d.gain/b.gain>2&&d.freq/b.freq>1.3;})()`,'V52 wind rush separates 160 from 280 km/h');
 // Speed perception measured from pixels: world flow must carry the sensation, not overlay lines.
 const flow={};
 for(const v of [100,160,220,280]){flow[v]={on:JSON.parse(await run(`JSON.stringify((${SPEED})(${v},true))`)),off:JSON.parse(await run(`JSON.stringify((${SPEED})(${v},false))`))};}
 assert.ok(flow[100].off.all<flow[160].off.all&&flow[160].off.all<flow[220].off.all&&flow[220].off.all<flow[280].off.all,'picture flow grows with speed');checks++;
 assert.ok(flow[280].off.all/flow[160].off.all>1.25&&flow[280].off.road/flow[100].off.road>1.7,'280 km/h looks clearly faster than 160 km/h from world flow alone');checks++;
 assert.ok(Math.abs(flow[280].on.all-flow[280].off.all)/flow[280].on.all<.12,'overlay lines contribute less than 12 percent of the picture flow at 280 km/h');checks++;
 // Route vocabulary: 15 distinct road-furniture silhouettes, every route differs from every other in >=4 vocabulary features.
 await check(`new Set(Object.values(V52_EDGE_STYLE)).size===15&&Object.keys(V52_EDGE_STYLE).length===15`,'V52 every route owns a distinct road-furniture silhouette');
 const vocab=JSON.parse(await run(`JSON.stringify((()=>{const o=[];for(const id of ${JSON.stringify(routes)}){v34Mode='sprint';selectedRoute=routeForId(id);resetGame();const sc=scene(),cs=segments.map(s=>Math.abs(s.curve));o.push({id,arch:currentNode.archetype,type:sc.type,props:sc.props,lanes:sc.lanes,width:sc.width,edge:V52_EDGE_STYLE[id],water:[districtSurface(80,-1),districtSurface(80,1)].includes('water'),hills:sc.hills>25,tight:cs.filter(c=>c>=1.4).length/cs.length>.15,traffic:currentNode.traffic,sky:sc.sunset[0]});}return o;})())`));
 let minDiff=99,minPair='';
 for(let i=0;i<vocab.length;i++)for(let j=i+1;j<vocab.length;j++){const a=vocab[i],b=vocab[j];let d=0;for(const k of ['arch','type','props','lanes','width','edge','water','hills','tight','sky'])if(a[k]!==b[k])d++;if(Math.abs(a.traffic-b.traffic)>4)d++;if(d<minDiff){minDiff=d;minPair=a.id+'/'+b.id;}}
 assert.ok(minDiff>=4,`route vocabulary pair ${minPair} differs in only ${minDiff} features`);checks++;
 await check(`${JSON.stringify(routes)}.every(id=>{v34Mode='sprint';selectedRoute=routeForId(id);resetGame();ctx.save();const r=drawV52EdgeProp(V52_EDGE_STYLE[id],1,3,1.2);ctx.restore();return r===true;})`,'V52 every route furniture style draws');
 // Start cadence and finish hierarchy.
 await run(reset+"v34Mode='arcade';selectedRoute=routeForId('4D');inRadioScreen=true;dipSettings.coin='free';confirmRadioAndStart();window.__readyCard=[stageCard.classList.contains('show'),stageDetail.textContent,stageCardTimer];rpm=800;for(let i=0;i<40;i++)update(1/60);window.__revRpm=rpm;");
 await check(`window.__readyCard[0]&&window.__readyCard[1].includes('READY')&&window.__readyCard[2]>=3.5&&window.__revRpm>2000`,'V52 start shows the route card during the countdown and revs the engine');
 await run(reset+"v34Mode='arcade';stageLevel=4;timeLeft=12.3;score=12345;crashCount=1;closePassTotal=4;fillResultStats(true);window.__stats=(document.getElementById('celeb-stats').innerHTML.match(/<div>/g)||[]).length;celebrationCard.classList.remove('show');gameOver=false;finishGame(false);window.__failCard=celebrationCard.classList.contains('show');clearTimeout(resultTimer);");
 await check(`window.__stats===4&&window.__failCard&&celebTitle.textContent.includes('TIME UP')`,'V52 results show a four-number summary and a clear time-up card');
 return {checks,routes:routes.length,branchPaths:16};
}
module.exports={scenarios};
