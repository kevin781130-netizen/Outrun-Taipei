// Shared in-page probe sources (strings evaluated inside the game). Used by tools/gameplay-probes.cjs and by scenarios.cjs.
module.exports={
 CORNER:`(function(curve,v0,policy){
 v34Mode='sprint';selectedRoute=routeForId('1A');resetGame();gameStarted=true;raceActive=true;overlay.classList.add('hidden');traffic=[];timeLeft=9999;
 const A=300,LEN=150;for(let i=0;i<segments.length;i++)segments[i].curve=(i>=A&&i<A+LEN)?curve:0;
 const sgn=Math.sign(curve);for(const k of Object.keys(keys))keys[k]=false;
 playerX=0;playerZ=(A-40)*SEGMENT_LENGTH;speed=v0;currentGear=v0>168?'HIGH':'LOW';driveGear='D';motionDirection=1;crashSequence=null;collisionCooldown=0;
 let neutralRun=0,steerSteps=0,cornerSteps=0,t=0,maxX=0,offroad=0,minSpeed=v0,crashed=false,drifted=0,yawMax=0,physX=0,charge0=nitro+nitroStock*100,steps=0,lastIn=-1,exitT=null,coastTime=0;
 const lim=drivableHalf();
 const ctrl=(target,dead)=>{const e=target-playerX;keys.ArrowRight=e>dead;keys.ArrowLeft=e<-dead;};
 for(;steps<2400;steps++){
  const z=playerZ/SEGMENT_LENGTH,inCorner=z>=A&&z<A+LEN;
  keys.KeyW=true;keys.KeyS=false;keys.ShiftLeft=false;keys.ArrowRight=false;keys.ArrowLeft=false;
  const dEntry=A-z; // segments until corner
  if(policy==='coast'){/* no steer at all */}
  else{
   const tx=0;
   if(policy==='grip'){ctrl(tx,.04);}
   if(policy==='lift'){ if(dEntry<14&&dEntry>-6){keys.KeyW=false;} ctrl(tx,.04); }
   if(policy==='brake'){ if(dEntry<16&&dEntry>6){keys.KeyS=true;keys.KeyW=false;} ctrl(tx,.04); }
   if(policy==='drift'){
     if(dEntry<12&&dEntry>5){keys.KeyW=false;}               // lift to set the nose
     if(dEntry<=6&&z<A+LEN-6){const wantRelease=playerX*sgn>.30&&neutralRun<12;neutralRun=wantRelease?neutralRun+1:0;const away=playerX*sgn>.72;keys.ArrowRight=away?sgn<0:(!wantRelease&&sgn>0);keys.ArrowLeft=away?sgn>0:(!wantRelease&&sgn<0);if(!isDrifting&&dEntry>3)keys.ShiftLeft=true;} // steer into the bend, helper pulse at entry
     else if(z>=A+LEN-6&&z<A+LEN-1){keys.ArrowRight=sgn<0;keys.ArrowLeft=sgn>0;} // countersteer to exit
     else ctrl(tx,.04);
   }
  }
  if(keys.ArrowRight||keys.ArrowLeft)steerSteps++;const before=crashSequence;update(1/60);t+=1/60;if(inCorner)cornerSteps++;
  if(crashSequence&&!before){crashed=true;break;}
  const ax=Math.abs(playerX);if(inCorner){maxX=Math.max(maxX,ax);if(ax>lim)offroad+=1/60;minSpeed=Math.min(minSpeed,speed);if(isDrifting)drifted+=1/60;yawMax=Math.max(yawMax,Math.abs(v51DriftVisualYaw(curve)));}
  if(z>A+LEN+25){exitT=t;break;}
 }
 return {curve,v0,policy,crashed,maxX:+maxX.toFixed(2),offroad:+offroad.toFixed(2),minSpeed:Math.round(minSpeed),exitSpeed:Math.round(speed),time:+t.toFixed(2),driftSec:+drifted.toFixed(2),visYaw:Math.round(yawMax),charge:Math.round(nitro+nitroStock*100-charge0),duty:+(steerSteps/Math.max(1,steps)).toFixed(2)};
})`,
 SPEED:`(function(v,overlays){
 v34Mode='arcade';selectedRoute=routeForId('4D');setStage(...Object.values(routeForId('4D')));gameStarted=true;raceActive=true;overlay.classList.add('hidden');traffic=[];timeLeft=999;
 const sl=drawSpeedLines,cr=drawV50ComfortRush;if(!overlays){drawSpeedLines=()=>{};drawV50ComfortRush=()=>0;}
 playerX=0;speed=v;boosting=v>285;screenShake=0;flash=0;
 const grab=()=>{render(0);return ctx.getImageData(0,0,W,H).data;};
 const regions={road:[W*.30,H*.58,W*.40,H*.30],periphery:[0,H*.30,W*.22,H*.45],sky:[0,0,W,H*.30]};
 const out={v,overlays};let sums={road:0,periphery:0,sky:0,all:0},n=3;
 for(let k=0;k<n;k++){
  playerZ=(170+k*7)*SEGMENT_LENGTH;simulationTime=k*.5;const a=Uint8ClampedArray.from(grab());
  playerZ+=v*WORLD_SPEED/60;simulationTime+=1/60;const b=grab();
  const diff=(x0,y0,w,h)=>{let d=0,c=0;for(let y=Math.floor(y0);y<Math.floor(y0+h);y+=2)for(let x=Math.floor(x0);x<Math.floor(x0+w);x+=2){const i=(y*W+x)*4;d+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);c+=3;}return d/c;};
  for(const [name,r] of Object.entries(regions))sums[name]+=diff(...r)/n;sums.all+=diff(0,0,W,H)/n;
 }
 drawSpeedLines=sl;drawV50ComfortRush=cr;
 const ratio=clamp(v/COMPETITION.topSpeed,0,1);
 return {v,overlays,road:+sums.road.toFixed(2),periphery:+sums.periphery.toFixed(2),sky:+sums.sky.toFixed(2),all:+sums.all.toFixed(2),segPerSec:+(v*WORLD_SPEED/SEGMENT_LENGTH).toFixed(1),
   propsPerSec:+(v*WORLD_SPEED/SEGMENT_LENGTH/14).toFixed(2),engineHz:Math.round((42+clamp((900+(v/currentCar.lowMax)*7200)/8500,0,1.15)*140)),cropPx:Math.round(ratio*V51_HANDLING.speedZoom*W*.18),
   speedLines:(v<225&&!boosting)?0:(boosting?36:16),rushOn:v>=V50_ART.rushMin||boosting};
})`,
 TRAFFIC:`(function(id,policy,seconds){
 v34Mode='sprint';selectedRoute=routeForId(id);resetGame();gameStarted=true;raceActive=true;overlay.classList.add('hidden');timeLeft=9999;
 for(const k of Object.keys(keys))keys[k]=false;
 let cp=0;const orig=window.__origAward||awardClosePass;window.__origAward=orig;awardClosePass=function(c,d){cp++;return orig(c,d);};
 playerX=0;speed=200;currentGear='HIGH';let crashes=0,draft=0,t=0,dist0=playerZ,minGap=9,pass=0,lane=0;
 const seen=new Set();
 for(let i=0;i<seconds*60;i++){
  keys.KeyW=true;keys.ArrowLeft=false;keys.ArrowRight=false;
  if(speed<140&&!crashSequence)keys.KeyW=true;
  if(policy==='dodge'){
    let near=null;for(const c of traffic){const dz=c.z-playerZ-PLAYER_DEPTH;if(dz>0&&dz<7000&&Math.abs(c.x-playerX)<.32&&(!near||dz<near.dz))near={c,dz};}
    if(near){const away=playerX>=near.c.x?1:-1;keys.ArrowRight=away>0;keys.ArrowLeft=away<0;}
    else{keys.ArrowRight=playerX<-.08;keys.ArrowLeft=playerX>.08;}
  }
  const was=crashSequence;update(1/60);t+=1/60;
  if(crashSequence&&!was)crashes++;if(isDrafting)draft+=1/60;
  if(playerZ>=(FORK_WARN-40)*SEGMENT_LENGTH)break;
  for(const c of traffic){const dz=c.z-playerZ-PLAYER_DEPTH;if(dz<0&&dz>-400&&!seen.has(c)){seen.add(c);pass++;}}
 }
 awardClosePass=orig;
 return {id,policy,seconds:+t.toFixed(1),meters:Math.round((playerZ-dist0)/SEGMENT_LENGTH*SEGMENT_METERS),avgKmh:Math.round((playerZ-dist0)/SEGMENT_LENGTH/t*SEGMENT_METERS*3.6),crashes,closePasses:cp,passed:pass,draftSec:+draft.toFixed(1)};
})`,
 // Straight-line acceleration on flat road, throttle only, AT or MT. marks = speeds whose first-reach time is recorded.
 ACCEL:`(function(start,seconds,gearMode,nitroAt){
  v34Mode='cruise';selectedRoute=routeForId('1A');resetGame();gameStarted=true;raceActive=true;overlay.classList.add('hidden');traffic=[];timeLeft=9999;
  for(let i=0;i<segments.length;i++)segments[i].curve=0;for(const k of Object.keys(keys))keys[k]=false;
  const mtShift=String(gearMode).startsWith('MT')?Number(String(gearMode).split(':')[1]||118):null;autoGear=mtShift===null;playerX=0;playerZ=100*SEGMENT_LENGTH;speed=start;currentGear=start>140?'HIGH':'LOW';driveGear='D';motionDirection=1;crashSequence=null;collisionCooldown=0;
  const marks=[60,100,130,160,180,200,215,230,245,250,257,265,270,280,285,290,295,300,305],t={},trace=[];let t0=0,boostStart=null,boostMax=0;
  for(let i=0;i<seconds*60;i++){
   keys.KeyW=true;
   if(nitroAt&&speed>=nitroAt&&boostStart===null){nitroStock=1;keys.KeyN=true;update(1/60);keys.KeyN=false;boostStart=i/60;}
   else update(1/60);
   if(mtShift!==null&&currentGear==='LOW'&&speed>=mtShift)shiftGear('HIGH');
   playerZ=300*SEGMENT_LENGTH;traffic.length=0;
   const now=(i+1)/60;for(const m of marks)if(t[m]===undefined&&speed>=m)t[m]=+now.toFixed(2);
   if(boosting)boostMax=Math.max(boostMax,speed);
   if(i%60===59)trace.push(Math.round(speed));
  }
  return {start,gearMode,t,trace,final:Math.round(speed),boostMax:Math.round(boostMax)};
 })`,
 // Whole-route driving bot: grip line, dodges traffic, lifts for corners (HUD safe speed), no drift, no nitro. Measures time near the cap.
 DWELL:`(function(id,driftBot){
  v34Mode='sprint';selectedRoute=routeForId(id);resetGame();gameStarted=true;raceActive=true;overlay.classList.add('hidden');timeLeft=9999;
  for(const k of Object.keys(keys))keys[k]=false;autoGear=true;speed=0;
  const cap=COMPETITION.topSpeed;let neutralRun=0,nitroUses=0,boostT=0,near95=0,near=0,total=0,sum=0,hits=0,maxSpeed=0;const t0=raceElapsed;
  const end=soloFinishIndex()*SEGMENT_LENGTH;
  for(let i=0;i<60*400&&playerZ<end&&!gameOver;i++){
   const idx=Math.floor(playerZ/SEGMENT_LENGTH);let worst=0;const look=Math.round(clamp(speed*WORLD_SPEED*1.1/SEGMENT_LENGTH,10,40));
   for(let k=idx+4;k<Math.min(segments.length,idx+look);k++)worst=Math.max(worst,Math.abs(segments[k].curve));
   const safe=v52SafeCornerSpeed(worst);
   keys.KeyW=speed<safe+8;keys.KeyS=false;keys.ArrowLeft=false;keys.ArrowRight=false;
   let tgt=0,nearC=null;for(const c of traffic){const dz=c.z-playerZ-PLAYER_DEPTH;if(dz>0&&dz<7000&&Math.abs(c.x-playerX)<.32&&(!nearC||dz<nearC.dz))nearC={c,dz};}
   if(nearC)tgt=playerX>=nearC.c.x?Math.min(.6,nearC.c.x+.4):Math.max(-.6,nearC.c.x-.4);
   const e=tgt-playerX;keys.ArrowRight=e>.05;keys.ArrowLeft=e<-.05;
   if(driftBot){
    const cur=segments[idx].curve,sg=Math.sign(cur);keys.ShiftLeft=false;keys.KeyN=false;
    if(Math.abs(cur)>=1.0&&speed>110&&!nearC){
      keys.KeyW=true;const wantRelease=playerX*sg>.30&&neutralRun<12;neutralRun=wantRelease?neutralRun+1:0;const away=playerX*sg>.72;
      keys.ArrowRight=away?sg<0:(!wantRelease&&sg>0);keys.ArrowLeft=away?sg>0:(!wantRelease&&sg<0);
      if(!isDrifting&&Math.abs(steer)>.1)keys.ShiftLeft=true;
    } else if(worst<.3&&nitroStock>0&&speed>150&&!boosting&&!nearC){keys.KeyN=true;nitroUses++;}
    if(boosting)boostT+=1/60;
   }
   const was=crashSequence;update(1/60);if(crashSequence&&!was)hits++;
   if(crashSequence){continue;}
   total++;sum+=speed;maxSpeed=Math.max(maxSpeed,speed);if(speed>=cap*.98)near++;if(speed>=cap*.95)near95++;
  }
  return {id,seconds:+(raceElapsed-t0).toFixed(1),pctAtCap:+(100*near/Math.max(1,total)).toFixed(1),pct95:+(100*near95/Math.max(1,total)).toFixed(1),avg:Math.round(sum/Math.max(1,total)),max:Math.round(maxSpeed),crashes:hits,nitroUses,boostSec:+boostT.toFixed(1),finished:playerZ>=end};
 })`,
 // Arcade checkpoint timing: seconds for the grip/dodge bot to reach the first checkpoint and each stage fork.
 ARCADE_STAGE:`(function(id){
  v34Mode='arcade';selectedRoute=routeForId(id);setStage(...Object.values(routeForId(id)));gameStarted=true;raceActive=true;overlay.classList.add('hidden');
  const lvl0=stageLevel;timeLeft=9999;for(const k of Object.keys(keys))keys[k]=false;autoGear=true;speed=0;checkpointPassed=false;let tCp=null,t=0,hits=0;
  for(let i=0;i<60*300&&!gameOver;i++){
   const idx=Math.floor(playerZ/SEGMENT_LENGTH);let worst=0;const look=Math.round(clamp(speed*WORLD_SPEED*1.1/SEGMENT_LENGTH,10,40));
   for(let k=idx+4;k<Math.min(segments.length,idx+look);k++)worst=Math.max(worst,Math.abs(segments[k].curve));
   const safe=v52SafeCornerSpeed(worst);keys.KeyW=speed<safe+8;keys.ArrowLeft=false;keys.ArrowRight=false;
   let tgt=0,nearC=null;for(const c of traffic){const dz=c.z-playerZ-PLAYER_DEPTH;if(dz>0&&dz<7000&&Math.abs(c.x-playerX)<.32&&(!nearC||dz<nearC.dz))nearC={c,dz};}
   if(nearC)tgt=playerX>=nearC.c.x?Math.min(.6,nearC.c.x+.4):Math.max(-.6,nearC.c.x-.4);
   const e=tgt-playerX;keys.ArrowRight=e>.05;keys.ArrowLeft=e<-.05;
   const was=crashSequence;update(1/60);if(crashSequence&&!was)hits++;t+=1/60;
   if(checkpointPassed&&tCp===null){tCp=+t.toFixed(1);}
   if(stageTransition||stageLevel!==lvl0)break;
  }
  return {id,tCheckpoint:tCp,tStageEnd:+t.toFixed(1),hits,budget:dipSettings.time};
 })`
};
