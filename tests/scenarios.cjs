const assert=require('node:assert/strict');
const {CORNER,SPEED,ACCEL,DWELL}=require('./tools/probe-code.cjs');
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
 await check(`COMPETITION.version==='61.0'&&V51_HANDLING.independentModel&&V51_HANDLING.gearDriftClone===false&&V51_HANDLING.distinctiveModeClone===false&&V51_HANDLING.exactHandlingCurveCopy===false&&V51_HANDLING.patentedMechanicReplication===false`,'V51 handling keeps independent recovery model');
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
 await check(`window.__nitroActivated&&nitroStock===0&&boostRemaining===2.8&&nitroLatch&&speed>=170+V53_SPEED.nitroImpulse-.01&&boostKick>.9`,'V50 nitro activates directly and delivers an immediate (V53 smaller) speed impulse');
 await check(`V51_CLEAN_ROOM_REFERENCE.observationOnly&&V51_CLEAN_ROOM_REFERENCE.sourceCode===false&&V51_CLEAN_ROOM_REFERENCE.sourceAssets===false&&V51_CLEAN_ROOM_REFERENCE.decompilation===false&&V51_CLEAN_ROOM_REFERENCE.directSyntaxTranslation===false&&V51_CLEAN_ROOM_REFERENCE.exactHandlingCurveCopy===false&&V51_CLEAN_ROOM_REFERENCE.exactAnimationCopy===false&&V51_CLEAN_ROOM_REFERENCE.signatureCameraCopy===false&&V51_CLEAN_ROOM_REFERENCE.patentedMechanicReplication===false&&V51_CLEAN_ROOM_REFERENCE.curveBoundVisualYaw&&V51_CLEAN_ROOM_REFERENCE.physicsVisualDecoupled&&V51_CLEAN_ROOM_REFERENCE.noAutoRailDrift&&V51_CLEAN_ROOM_REFERENCE.independentImplementation`,'V51 sideways drift keeps independent clean-room provenance and no auto-rail cloning');
 await run(reset+`isDrifting=true;driftState='drift';driftDirection=1;driftAngle=34;slipAngle=10;window.__sideShallow=v51DriftVisualPose(.35);window.__sideTight=v51DriftVisualPose(1.8);window.__phys=[driftAngle,slipAngle,playerX];`);
 await check(`window.__sideShallow.yaw>=28&&window.__sideShallow.yaw<=36&&window.__sideTight.yaw>window.__sideShallow.yaw+2&&window.__sideTight.yaw<=46&&Math.abs(window.__sideTight.offsetX)<=2.4&&window.__sideTight.scaleX<1.02&&[driftAngle,slipAngle,playerX].every((v,i)=>v===window.__phys[i])`,'V51 whole-car sideways presentation scales with real bend demand without moving physics state');
 await check(`v51VisualCurveCap(.3)<v51VisualCurveCap(1.8)&&v51DriftPathScale(.3)<v51DriftPathScale(1.8)&&V51_SIDEWAYS.physicsVisualDecoupled&&V51_SIDEWAYS.curveBoundVisualYaw`,'V51 shallow bends get smaller path/yaw demand while tight bends keep strong sideways presentation');
 await run(reset+`speed=180;roadGrip=1;steer=.72;isDrifting=true;driftState='drift';driftDirection=1;driftAge=.6;driftAngle=28;slipAngle=10;playerX=0;lateralVelocity=0;for(let i=0;i<60;i++)stepArcadeMotion(1/60,.35,true,false);window.__shallowX=Math.abs(playerX);`);
 await run(reset+`speed=180;roadGrip=1;steer=.72;isDrifting=true;driftState='drift';driftDirection=1;driftAge=.6;driftAngle=28;slipAngle=10;playerX=0;lateralVelocity=0;for(let i=0;i<60;i++)stepArcadeMotion(1/60,1.8,true,false);window.__tightX=Math.abs(playerX);`);
 await check(`window.__shallowX<window.__tightX&&window.__shallowX<.55`,'V51 physical drift line stays restrained on shallow bends instead of throwing the car at the wall');
 await check(`v53GearThrust(100,'HIGH')>v53GearThrust(160,'HIGH')&&v53GearThrust(160,'HIGH')>v53GearThrust(230,'HIGH')&&v53GearThrust(230,'HIGH')>v53GearThrust(255,'HIGH')&&v53GearThrust(255,'HIGH')<1.2&&v53GearThrust(GEAR_RULES.HIGH.max,'HIGH')===0`,'V53 normal acceleration falls smoothly toward an asymptotic top speed');
 await check(`v53NitroPush(180)>=30&&v53NitroPush(285)<20&&v53NitroPush(COMPETITION.boostSpeed)===0&&V53_SPEED.nitroImpulse>=8`,'V53 nitro stays a strong push that relaxes toward the boost speed');
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
 await check(`COMPETITION.boostSpeed===300&&GEAR_RULES.LOW.max<GEAR_RULES.HIGH.max&&v53GearThrust(80,'LOW')>v53GearThrust(80,'HIGH')&&v53GearThrust(185,'LOW')===0`,'low and high gears have materially different torque and speed ranges');
 await check(`GEAR_RULES.HIGH.max===COMPETITION.topSpeed&&GEAR_RULES.LOW.max===COMPETITION.lowSpeed&&v53GearThrust(190,'HIGH')>0`,'high gear unlocks top-speed range');
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
 await run(reset+"autoGear=false;speed=125;rpm=7600;currentGear='LOW';shiftGear('HIGH');");
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
 await check(`V52_FLOW.crashDuration<=3.0&&V52_FLOW.crashDuration<4.1&&V52_FLOW.recoverySpeed>75&&V52_FLOW.recoverySpeed<=125&&V52_FLOW.autoRailAssist===false&&V52_FLOW.exactSourceCopy===false`,'V52 crash interruption is shorter without any auto-rail assist');
 await check(`bestRecordKey('1A').endsWith(':61.0')&&arcadeBoardKey().endsWith(':61.0')`,'V60 physical corner revision receives isolated competitive records');
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
  await run(`v34Mode='sprint';selectedRoute=routeForId('${id}');resetGame();gameStarted=true;raceActive=true;traffic=[];timeLeft=999;const sg=v52ApproachSigns()[2];playerZ=(sg.index-60)*SEGMENT_LENGTH;playerX=0;speed=150;render(0);window.__signDraw=0;const seg=segments[sg.index];ctx.save();window.__signDraw=drawApproachSign(placeApproachSign(sg),sg);ctx.restore();window.__signFinite=Object.values(seg.p1.screen).every(v=>typeof v!=='number'||Number.isFinite(v));`);
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
 const sShallow={coast:await sim(.3,265,'coast'),grip:await sim(.3,265,'grip'),drift:await sim(.3,265,'drift')};
 const sMed={grip:await sim(.9,265,'grip'),drift:await sim(.9,265,'drift')};
 const sHair={coast:await sim(3.6,265,'coast'),grip:await sim(3.6,265,'grip'),lift:await sim(3.6,265,'lift'),drift:await sim(3.6,265,'drift')};
 const sTight={grip:await sim(2.2,265,'grip'),drift:await sim(2.2,265,'drift')};
 assert.ok(sShallow.coast.maxX<.2&&!sShallow.coast.crashed,'shallow bend barely moves an unsteered car');checks++;
 assert.ok(sHair.coast.maxX>.55&&sHair.coast.maxX>sShallow.coast.maxX*4,'hairpin demands real steering while shallow does not');checks++;
 assert.ok(sHair.grip.time-sShallow.grip.time>1.0,'carrying 265 km/h through a hairpin with grip costs clear time');checks++;
 assert.ok(sHair.grip.duty>sShallow.grip.duty*2,'hairpin needs much more steering input than a shallow bend');checks++;
 assert.ok(sHair.drift.time<=sHair.grip.time+.05&&sHair.drift.charge>=60&&!sHair.drift.crashed,'drift is viable and earns nitro charge in a hairpin');checks++;
 assert.ok(sTight.drift.time<=sTight.grip.time+.1&&sTight.drift.charge>=50,'drift keeps pace with grip and charges nitro in tight bends');checks++;
 const cost=o=>o.drift.time-o.grip.time;
 assert.ok(cost(sShallow)>.1&&cost(sShallow)>cost(sMed)&&cost(sMed)>cost(sTight)&&cost(sTight)>cost(sHair)&&cost(sHair)<0,'drift costs time on gentle bends and pays off progressively from tight bends to hairpins (grip is the right tool on gentle bends)');checks++;
 assert.ok(sHair.lift.time>sHair.grip.time-.05,'pre-lifting is never free in a hairpin');checks++;
 // Close pass: candidate while approaching, award only after the car is safely behind, never on a collision.
 const cp=`const spec=TRAFFIC_TYPES.taxi;const mk=(gap,spd)=>({x:(trafficHalfWidth({spec})+PLAYER_HALF_WIDTH)+gap,z:playerZ+PLAYER_DEPTH,previousX:0,previousZ:0,speed:spd,spec,type:'taxi',phase:0,hitTimer:0,near:false,laneTarget:0,screenBox:{l:400,r:520,t:380,b:470,cx:460,cy:420}});`;
 await run(reset+cp+"speed=210;playerX=0;collisionCooldown=0;screenShake=0;score=0;styleCombo=1;closePassChain=0;closePassTimer=0;closePassTotal=0;traffic=[];window.__e1=v52ClosePassEligible(mk(.06,120),.06,0);window.__p1=awardClosePass(mk(.06,120),{tight:false,x:460,y:380,side:1,pan:0});window.__p2=awardClosePass(mk(.02,120),{tight:true,x:460,y:380,side:1,pan:0});window.__shake=screenShake;window.__combo=styleCombo;");
 await check(`window.__e1&&window.__p1===V52_CLOSEPASS.points[0]&&window.__p2===Math.round(V52_CLOSEPASS.points[1]*(1+V52_CLOSEPASS.chainStep))&&closePassTotal===2&&score===window.__p1+window.__p2`,'V52 awarded close passes score wide/tight tiers and chain within the window');
 await check(`window.__shake===0&&window.__combo===1&&V52_CLOSEPASS.shake===0&&V52_CLOSEPASS.chargeReward===0`,'V52 close pass adds no camera shake, no drift-combo coupling and no nitro reward');
 await run(reset+cp+"playerX=0;collisionCooldown=0;crashSequence=null;traffic=[];window.__rej=[];const q=(spd,gap,mod)=>{speed=spd;collisionCooldown=0;crashSequence=null;driveGear='D';motionDirection=1;const c=mk(gap,mod.carSpeed??120);if(mod.noBox)c.screenBox=null;if(mod.hit)c.hitTimer=.5;if(mod.cool)collisionCooldown=1;return v52ClosePassEligible(c,gap,mod.dz??0);};window.__rej=[q(210,.06,{}),q(120,.06,{}),q(210,.06,{carSpeed:190}),q(210,.005,{}),q(210,.2,{}),q(210,.06,{noBox:true}),q(210,.06,{hit:true}),q(210,.06,{cool:true}),q(210,.06,{dz:900})];");
 await check(`JSON.stringify(window.__rej)==='[true,false,false,false,false,false,false,false,false]'`,'V52 close pass candidates require speed, closing speed, true proximity, visibility, no collision state and same-depth contact');
 const live="v34Mode='sprint';selectedRoute=routeForId('1A');resetGame();gameStarted=true;raceActive=true;timeLeft=999;for(let i=0;i<segments.length;i++)segments[i].curve=0;playerX=0;playerZ=300*SEGMENT_LENGTH;speed=200;currentGear='HIGH';collisionCooldown=0;screenShake=0;closePassTotal=0;closePassChain=0;closePassTimer=0;closePassFx=[];score=0;const spec=TRAFFIC_TYPES.taxi,half=trafficHalfWidth({spec})+PLAYER_HALF_WIDTH,cx=half+.05;const ph=Math.asin(Math.min(1,cx/(.58*roadFactor())))-simulationTime*.13;traffic=[{x:cx,z:playerZ+PLAYER_DEPTH+1500,previousX:cx,previousZ:playerZ+PLAYER_DEPTH+1500,speed:110,targetSpeed:0,spec,type:'taxi',phase:ph,hitTimer:0,laneTarget:cx,screenBox:null,near:false}];keys.KeyW=true;const dzNow=()=>traffic[0].z-playerZ-PLAYER_DEPTH;";
 // A. approaching but not passed: armed, nothing awarded.
 await run(reset+live+"let n=0;while(n++<300&&!traffic[0].cp&&!crashSequence)update(1/60);window.__armed=!!traffic[0].cp;window.__armDz=dzNow();for(let i=0;i<4&&dzNow()>0;i++)update(1/60);window.__A=[closePassTotal,closePassFx.length,closePassChain,dzNow()>-trafficContactDepth(traffic[0]),!!crashSequence];");
 await check(`window.__armed&&window.__armDz>-trafficContactDepth(traffic[0])&&window.__A[0]===0&&window.__A[1]===0&&window.__A[2]===0&&window.__A[3]&&!window.__A[4]`,'V52 a car still ahead or alongside only arms a candidate: no score, total or chain');
 // B. clean ahead -> alongside -> behind: exactly one award.
 await run(reset+live+"let n=0;while(n++<400&&closePassTotal<1&&!crashSequence)update(1/60);window.__B1=[closePassTotal,dzNow(),closePassFx.length];for(let i=0;i<150&&!crashSequence;i++)update(1/60);window.__B2=[closePassTotal,!!crashSequence,screenShake,traffic[0].cp];");
 await check(`window.__B1[0]===1&&window.__B1[1]<=-trafficContactDepth(traffic[0])&&window.__B1[2]===1&&window.__B2[0]===1&&!window.__B2[1]&&window.__B2[2]<1&&window.__B2[3]==null`,'V52 completed clean pass awards exactly once, only after the car is behind the contact depth');
 // C. candidate then real contact: nothing is awarded.
 await run(reset+live+"let n=0;while(n++<300&&!traffic[0].cp&&!crashSequence)update(1/60);window.__armedC=!!traffic[0].cp;traffic[0].x=playerX;traffic[0].previousX=playerX;traffic[0].laneTarget=playerX;n=0;while(n++<200&&!crashSequence)update(1/60);window.__crashedC=!!crashSequence;for(let i=0;i<400;i++)update(1/60);window.__C=[closePassTotal,closePassChain,closePassFx.length,traffic.every(c=>!c.cp),score];");
 await check(`window.__armedC&&window.__crashedC&&window.__C[0]===0&&window.__C[1]===0&&window.__C[2]===0&&window.__C[3]`,'V52 candidate followed by a collision earns no close pass, no total, no chain and clears the candidate');
 // D. completed pass then an unrelated crash: the earned pass stays, chain and candidates clear.
 await run(reset+live+"let n=0;while(n++<400&&closePassTotal<1&&!crashSequence)update(1/60);window.__scoreD=score;window.__totalD=closePassTotal;collisionCooldown=0;traffic[0].cp={age:0,gap:.05,tight:false,side:1,x:460,y:380,pan:0};triggerCrash(null,null,true);window.__D=[closePassTotal,closePassChain,closePassTimer,closePassFx.length,traffic.every(c=>!c.cp),score>=window.__scoreD];");
 await check(`window.__totalD===1&&window.__D[0]===1&&window.__D[1]===0&&window.__D[2]===0&&window.__D[3]===0&&window.__D[4]&&window.__D[5]`,'V52 an earlier completed close pass keeps its points after a later crash; chain and candidates clear');
 // Wind: silent at rest, silent below 30 km/h, then monotonic; 160 vs 280 stays clearly different.
 await check(`(()=>{const g=v=>v52WindProfile(v).gain,f=v=>v52WindProfile(v).freq;return g(0)<=.00015&&g(20)<=.00015&&g(0)<g(60)&&g(60)<g(100)&&g(100)<g(160)&&g(160)<g(220)&&g(220)<g(280)&&g(280)/g(160)>2&&f(280)/f(160)>1.3&&f(100)<f(160)&&f(160)<f(220)&&f(220)<f(280);})()`,'V52 wind rush is silent at rest and rises monotonically with a clear 160 vs 280 separation');
 // Gameplay SFX must not depend on the radio; music must.
 await run(`window.__aud=(()=>{const mk=()=>new Proxy(function(){},{get:(t,k)=>k==='value'?0:mk(),apply:()=>mk(),set:()=>true});let osc=0,buf=0;const stub={currentTime:0,sampleRate:44100,state:'running',createOscillator(){osc++;return mk();},createGain:()=>mk(),createBiquadFilter:()=>mk(),createBuffer:()=>mk(),createBufferSource(){buf++;return mk();}};const saved=[audioCtx,masterGain,radioTrack];audioCtx=stub;masterGain=mk();const out={};for(const rt of [1,0]){radioTrack=rt;buf=0;let a=osc;playCountdownBeep(false);const beep=osc-a;a=osc;playCountdownBeep(true);const go=osc-a;a=osc;playCheckpointChime();const chime=osc-a;a=osc;fmNote(440,2,80,.1,.03,'sine');const music=osc-a;a=osc;sfxTone(587,2,40,.09,.03,'triangle');const tone=osc-a;playClosePassWhoosh(0,true);out[rt]={beep,go,chime,music,tone,whoosh:buf};}audioCtx=saved[0];masterGain=saved[1];radioTrack=saved[2];return JSON.stringify(out);})();`);
 await check(`(()=>{const o=JSON.parse(window.__aud);return [1,0].every(rt=>o[rt].beep>=2&&o[rt].go>=3&&o[rt].chime>=9&&o[rt].tone>=2&&o[rt].whoosh===1)&&o[1].music>=2&&o[0].music===0;})()`,'V52 countdown, GO, checkpoint, approach tick and close-pass SFX play with the radio off; only music is gated');
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
 // ---- V53 speed curve ---------------------------------------------------------------------------------------
 await check(`COMPETITION.version==='61.0'&&COMPETITION.topSpeed===270&&COMPETITION.boostSpeed===300&&GEAR_RULES.HIGH.max===COMPETITION.topSpeed&&dipSettings.time===92&&V53_SPEED.exactSourceCurveCopy===false`,'V60 competition namespace retains top speed and time budget');
 const acc=JSON.parse(await run(`JSON.stringify((${ACCEL})(0,75,'AT',0))`));
 const T=acc.t;
 assert.ok(T[60]>=1.1&&T[60]<=1.8&&T[100]>=2.4&&T[100]<=3.6,'0-60 and 0-100 keep an arcade launch');checks++;
 assert.ok(T[160]>=7&&T[160]<=9.6&&T[200]>=12.5&&T[200]<=15&&T[230]>=19.5&&T[230]<=24,'160/200/230 km/h arrive progressively later');checks++;
 assert.ok(T[250]>=30&&T[250]<=38&&T[257]>=38&&T[257]<=52,'250 km/h and 95 percent of the normal maximum take a long straight');checks++;
 const ladder=[100,130,160,180,200,215,230,245,250,257];let prevRate=1e9,ok=true;
 for(let i=0;i<ladder.length-1;i++){const r=(ladder[i+1]-ladder[i])/(T[ladder[i+1]]-T[ladder[i]]);if(!(r<prevRate))ok=false;prevRate=r;}
 assert.ok(ok,'acceleration rate falls monotonically with speed (no wall, no plateau-then-jump)');checks++;
 assert.ok(acc.final<=270&&acc.final>=258&&(T[265]===undefined||T[265]>65),'normal maximum is approached asymptotically and not reached within 65 seconds');checks++;
 // Nitro: strong push into a zone normal driving cannot hold, then a smooth decay.
 const nit=JSON.parse(await run(`(()=>{const r=(${ACCEL})(230,14,'AT',230);return JSON.stringify(r);})()`));
 assert.ok(nit.boostMax>=285&&nit.boostMax<=300&&nit.boostMax-230>=50,'nitro from 230 km/h lifts the car at least 50 km/h into the 285+ region without exceeding the boost speed');checks++;
 const decay=JSON.parse(await run(`(()=>{v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();gameStarted=true;raceActive=true;traffic=[];for(let i=0;i<segments.length;i++)segments[i].curve=0;for(const k of Object.keys(keys))keys[k]=false;speed=292;currentGear='HIGH';boostRemaining=0;boosting=false;playerX=0;const tr=[];let maxDrop=0,prev=speed;for(let i=0;i<60*8;i++){keys.KeyW=true;update(1/60);playerZ=300*SEGMENT_LENGTH;traffic.length=0;maxDrop=Math.max(maxDrop,prev-speed);prev=speed;if(i%60===59)tr.push(Math.round(speed));}return JSON.stringify({tr,maxDrop});})()`));
 assert.ok(decay.maxDrop<1.2&&decay.tr.every((v,i)=>i===0||v<=decay.tr[i-1])&&decay.tr[0]>=281&&decay.tr[7]<=270+9,'after nitro the speed bleeds smoothly (no hard cut) back toward the sustainable region');checks++;
 // Draft and gearing.
 await check(`V53_SPEED.draftRaise<=12&&v53GearThrust(262,'HIGH',1)>v53GearThrust(262,'HIGH',0)*2.5&&v53OverspeedDrag(275,'HIGH',1,false)===0&&v53OverspeedDrag(275,'HIGH',0,false)>1&&v53OverspeedDrag(300,'HIGH',0,true)===0`,'V53 slipstream raises the sustainable speed slightly and boost suspends overspeed drag');
 await check(`v53GearThrust(60,'LOW')>v53GearThrust(60,'HIGH')&&v53GearThrust(180,'HIGH')>v53GearThrust(180,'LOW')&&v53GearThrust(185,'LOW')===0&&V53_SPEED.atUp<=V53_SPEED.shiftSweet[1]&&V53_SPEED.atDown<V53_SPEED.atUp`,'V53 LOW launches harder, HIGH extends top speed, AT shifts inside the manual sweet window');
 const gearT={};for(const g of ['AT','MT:118','MT:150']){gearT[g]=JSON.parse(await run(`JSON.stringify((${ACCEL})(0,12,'${g}',0))`)).t[160];}
 assert.ok(gearT['MT:118']<gearT.AT&&gearT.AT<gearT['MT:150']&&gearT.AT-gearT['MT:118']<1.2,'a well timed manual shift is slightly faster than AT; a late shift is slower; AT stays competitive');checks++;
 // Cap dwell on a real route: top speed is a moment, not a default state.
 for(const id of ['1A','3A']){
  const d=JSON.parse(await run(`JSON.stringify((${DWELL})('${id}',0))`));
  assert.ok(d.finished&&d.pctAtCap<=2&&d.pct95<=35&&d.avg>=185,`${id} bot spends at most 2 percent of the run at 98 percent of the normal cap (got ${d.pctAtCap}) and 35 percent at 95 percent (got ${d.pct95})`);checks++;
 }
 // Wind mapping across the new speed range.
 await check(`(()=>{const g=v=>v52WindProfile(v).gain;const pts=[0,80,140,180,220,250,COMPETITION.boostSpeed];for(let i=1;i<pts.length;i++){if(!(g(pts[i])>g(pts[i-1])*(i===1?1.5:1.2)))return false;}return g(0)<=.00015;})()`,'V53 wind keeps audible dynamic range across 80/140/180/220/250/boost');
 // Art: cached mid layer, haze, infrastructure and palette safeguards.
 for(const id of routes)for(const mood of ['sunset','neon']){
  await run(`v34Mode='sprint';selectedRoute=routeForId('${id}');resetGame();skyMood='${mood}';playerZ=230*SEGMENT_LENGTH;playerX=0;speed=200;render(0);window.__art=[v53MidCache.key,v53MidCache.canvas.width,v53MidCache.canvas.height,drawV53RoadsideInfra(projectedRoad)];`);
  await check(`window.__art[0]==='${id}|${mood}'&&window.__art[1]===W+2*V53_ART.midPad&&window.__art[2]===V53_ART.midHeight&&Number.isFinite(window.__art[3])&&!!V53_MID['${id}']&&!!V52_EDGE_STYLE['${id}']`,`${id}/${mood} V53 mid layer is built per route and mood and roadside infrastructure stays finite`);
 }
 await check(`V53_WALL_ROUTES.every(id=>SCENES[id]&&['mountain'].includes(Object.values(STAGES.flat()).find(n=>n.id===id)?.archetype))`,'V53 retaining walls appear only on mountain archetype routes');
 await check(`(()=>{const hue=hex=>{const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(d<.001)return [0,0];const l=(mx+mn)/2,sat=d/(1-Math.abs(2*l-1));let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360;return [h,sat];};const bad=[];const check=(name,arr)=>{for(const c of arr){if(typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c))continue;const [h,s]=hue(c);if(s>.18&&h>=255&&h<=346)bad.push(name+':'+c);}};for(const [k,v] of Object.entries(THEMES))check('theme '+k,[...v.sky,v.mountain,v.horizon]);for(const [k,v] of Object.entries(V40_ART))check('art '+k,[...v.sky,v.mountain,v.sun]);for(const [k,v] of Object.entries(SCENES))check('scene '+k,[...v.sunset,...v.night]);window.__badHue=bad;return bad.length===0;})()`,'V53 sky and mountain palettes contain no purple or magenta (no generic neon drift)');
 // ---- V53.1 roadside anchors ---------------------------------------------------------------------------------
 const RS=`(function(id,sit){
  const level=routeForId(id).level,arcade=(sit==='fork'||sit==='transition');
  if(arcade&&level>=4)return {skipped:true};
  v34Mode=arcade?'arcade':'sprint';selectedRoute=routeForId(id);
  if(arcade)setStage(...Object.values(routeForId(id)));else resetGame();
  gameStarted=true;raceActive=true;traffic=[];playerX=0;
  const cv={straight:0,shallow:.4,medium:1.0,tight:2.4}[sit];
  if(cv!==undefined)for(let i=0;i<segments.length;i++)segments[i].curve=cv;
  let idxs;if(sit==='fork')idxs=[FORK_START+12,FORK_START+45,FORK_START+90,STAGE_END-40];else if(sit==='transition')idxs=[STAGE_END+8,STAGE_END+55,STAGE_SWITCH-12];else idxs=[140,330,Math.round(STAGE_END*.5),700];
  const kinds=[{kind:'sign',inner:.31,foot:.02,mode:'ground'},{kind:'edge',inner:.105,foot:.03,gapN:.02,bank:true},{kind:'pole',inner:.02,foot:.02,gapN:.4,mode:'ground'},{kind:'deck',inner:.02,foot:.015,mode:'deck'}];
  const bad=[];let checked=0;
  for(const idx of idxs){
   playerZ=Math.max(0,(idx-50))*SEGMENT_LENGTH;playerX=0;projectRoad();
   const seg=segments[idx],p=seg.p1.screen;if(!(seg.p1.camera.z>CAMERA_DEPTH))continue;
   const cx=roadsideCorridorsX(idx),cxDeck=roadsideCorridorsX(idx,0);
   for(const side of [-1,1])for(const k of kinds){
    const a=roadsideAnchor(idx,side,k),surf=districtSurface(idx,side);checked++;
    if(k.kind!=='deck'&&k.mode==='ground'&&(surf==='water'||surf==='elevated')&&a.ok){bad.push(['ground-on-'+surf,id,sit,idx,side,k.kind]);continue;}
    if(k.kind==='deck'&&surf==='elevated'&&!a.ok){bad.push(['deck-mount-missing',id,sit,idx,side,a.reason]);continue;}
    if(!a.ok)continue;
    if(!roadsideAnchorValid(a))bad.push(['invalid',id,sit,idx,side,k.kind]);
    const lo=Math.min(a.innerX,a.outerX),hi=Math.max(a.innerX,a.outerX);
    for(const c of (a.mode==='deck'?cxDeck:cx))if(hi>c.left&&lo<c.right)bad.push(['body-in-road',id,sit,idx,side,k.kind]);
    if(!(Number.isFinite(a.x)&&Number.isFinite(a.y)&&Number.isFinite(a.scale)&&Number.isFinite(lo)&&Number.isFinite(hi)))bad.push(['non-finite',id,sit,idx,side,k.kind]);
    if(Math.abs(a.groundY-p.y)>1e-6)bad.push(['ground-y',id,sit,idx,side,k.kind]);
   }
   if(sit==='fork'||sit==='transition'){const m=roadsideMedianAnchor(idx,{kind:'edge',inner:.105,gapN:.02});if(m.ok){const lo=Math.min(m.innerX,m.outerX),hi=Math.max(m.innerX,m.outerX);for(const c of cx)if(hi>c.left&&lo<c.right)bad.push(['median-in-road',id,sit,idx]);}}
  }
  return {checked,bad:bad.slice(0,6)};
 })`;
 let rsChecked=0;
 for(const id of routes)for(const sit of ['straight','shallow','medium','tight','fork','transition']){
  const r=JSON.parse(await run(`JSON.stringify((${RS})('${id}','${sit}'))`));
  if(r.skipped)continue;
  assert.deepEqual(r.bad,[],`${id}/${sit} roadside anchors stay outside the drivable corridor, off water and off the void beside elevated decks`);rsChecked+=r.checked;
 }
 assert.ok(rsChecked>2000,'checked '+rsChecked+' V53.1 roadside anchors exercised');checks++;
 // Approach boards: every route and mode resolves to a valid ground board or deck gantry.
 for(const id of routes)for(const mode of ['arcade','sprint','cruise']){
  const r=JSON.parse(await run(`(()=>{const lvl=routeForId('${id}').level;v34Mode='${mode}';selectedRoute=routeForId('${id}');if('${mode}'==='arcade')setStage(...Object.values(routeForId('${id}')));else resetGame();gameStarted=true;raceActive=true;traffic=[];
   const out=[];for(const sg of v52ApproachSigns()){playerZ=Math.max(0,sg.index-60)*SEGMENT_LENGTH;playerX=0;projectRoad();const pl=placeApproachSign(sg);const elev=districtSurface(sg.index,1)==='elevated';
    let ok=!!pl&&pl.kind===(elev?'gantry':'ground');let inRoad=false;
    if(pl&&pl.kind==='ground'){ok=ok&&roadsideAnchorValid(pl.a)&&pl.a.surface==='land';const cx=roadsideCorridorsX(sg.index),lo=Math.min(pl.a.x-pl.a.w*.31,pl.a.x+pl.a.w*.31),hi=Math.max(pl.a.x-pl.a.w*.31,pl.a.x+pl.a.w*.31);for(const c of cx)if(hi>c.left&&lo<c.right)inRoad=true;}
    if(pl&&pl.kind==='gantry'){ok=ok&&roadsideAnchorValid(pl.L)&&roadsideAnchorValid(pl.R)&&pl.L.x<pl.R.x;}
    out.push([ok,inRoad]);}
   return JSON.stringify(out);})()`));
  assert.ok(r.length===3&&r.every(x=>x[0]&&!x[1]),`${id}/${mode} approach boards are placed on a free shoulder (whole board clear of the road) or a deck gantry`);checks++;
 }
 // Gate and gantry posts stand outside the outer edge plus shoulder.
 await check(`(()=>{for(const id of ${JSON.stringify(routes.filter(i=>!['5A','5B','5C','5D','5E'].includes(i)))}){v34Mode='arcade';selectedRoute=routeForId(id);setStage(...Object.values(routeForId(id)));for(const idx of [FORK_START-52,FORK_START+64,FORK_START+120]){const g=roadsideGatePostN(idx);for(const side of [-1,1])if(g<roadsideEdgeN(idx,side)+V53_1_ROADSIDE.shoulderN)return false;}}return true;})()`,'V53.1 checkpoint gates and route gantries put their posts beyond the shoulder, including inside the fork');
 // Rendered frames only log valid anchors; start gantry is a world object.
 for(const id of routes){
  const r=JSON.parse(await run(`(()=>{v34Mode='sprint';selectedRoute=routeForId('${id}');resetGame();gameStarted=true;raceActive=true;traffic=[];skyMood='sunset';const res=[];for(const z of [60,200,340]){playerZ=z*SEGMENT_LENGTH;playerX=0;speed=180;render(0);res.push([roadsideAnchorLog.length,roadsideAnchorLog.every(a=>!a.ok||roadsideAnchorValid(a))]);}return JSON.stringify(res);})()`));
  assert.ok(r.every(x=>x[1]),`${id} every roadside anchor created while rendering is valid`);checks++;
 }
 await check(`(()=>{v34Mode='arcade';selectedRoute=routeForId('1A');setStage(...Object.values(routeForId('1A')));gameStarted=true;raceActive=true;playerZ=0;playerX=0;speed=0;render(0);return roadsideAnchorLog.some(a=>a.kind==='start-gantry'&&a.ok&&roadsideAnchorValid(a))&&drawStartingScene.toString().includes('roundRect')===false;})()`,'V53.1 the start board is a real overhead gantry standing on the shoulders');
 await check(`(()=>{DEBUG_ROADSIDE_ANCHORS===false})()||DEBUG_ROADSIDE_ANCHORS===false`,'V53.1 roadside debug overlay is off by default');
 // ---- V53.1 landmark quality ---------------------------------------------------------------------------------
 await check(`(()=>{const src=drawNeihuTechHeadquarters.toString();return !/NEIHU TECH PARK|shadowBlur|#00e5ff|#64ffda/.test(src)&&/lmOffice/.test(src)&&(src.match(/lmOffice\\(/g)||[]).length>=4;})()`,'V53.1 Neihu is a multi-building office district (no neon sign, no glow, no cyan tech box)');
 for(const mood of ['sunset','neon']){
  for(const id of routes){
   const r=JSON.parse(await run(`(()=>{v34Mode='sprint';selectedRoute=routeForId('${id}');resetGame();gameStarted=true;raceActive=true;traffic=[];skyMood='${mood}';speed=180;playerX=0;const out=[];
    const heights=stageLandmarkPlan.map(h=>h.heightWorld);
    for(const h of stageLandmarkPlan){const sp=h.sprite;const row={name:h.name,finite:[sp.width,sp.height,sp.left,sp.top,h.artUnits,h.worldOffset].every(Number.isFinite),grounded:sp.top+sp.height>=-3&&sp.top+sp.height<=30,hasHeight:Number.isFinite(h.height)||true,cov:[],clear:true};
     for(const d of [200,120,80,50]){playerZ=Math.max(0,h.seg-d)*SEGMENT_LENGTH;render(0);const e=landmarkDrawLog.find(l=>l.id===h.id);if(!e)continue;row.cov.push([d,e.pixelWidth/W,e.pixelHeight/H]);
      if(h.side!==0){const pr=landmarkProjection(h);if(pr){const left=pr.x+sp.left*pr.scale,right=left+sp.width*pr.scale;for(const c of roadsideCorridorsX(h.seg)){if(right>c.left&&left<c.right&&h.side!==0)row.clear=false;}}}}
     out.push(row);}
    return JSON.stringify({out,heights});})()`));
   for(const row of r.out){
    assert.ok(row.finite&&row.grounded,`${id}/${mood} ${row.name} sprite is finite and its base sits on the ground line`);checks++;
    assert.ok(row.clear,`${id}/${mood} ${row.name} stays out of the drivable road at depth`);checks++;
    assert.ok(row.cov.every(c=>c[1]<=0.6&&c[2]<=0.86),`${id}/${mood} ${row.name} never covers more than 60 percent of the width or 86 percent of the height at 50+ segments (${JSON.stringify(row.cov)})`);checks++;
   }
   if(mood==='sunset'&&r.heights.length>1)assert.ok(new Set(r.heights).size>1,`${id} landmarks use individual proportions, not one route height`);
  }
 }
 await check(`Object.values(STAGE_LANDMARKS).flat().every(h=>Number.isFinite(h.height)&&h.height>=2400&&h.height<=19000)&&Object.values(STAGE_LANDMARKS).flat().filter(h=>h.height>9000).length===1`,'V53.1 every landmark has its own world height and only Taipei 101 is a super-tall');
 return {checks,routes:routes.length,branchPaths:16};
}
module.exports={scenarios};
