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
     if(dEntry<=6&&z<A+LEN-6){const wantRelease=playerX*sgn>.30&&neutralRun<12;neutralRun=wantRelease?neutralRun+1:0;keys.ArrowRight=!wantRelease&&sgn>0;keys.ArrowLeft=!wantRelease&&sgn<0;if(!isDrifting&&dEntry>3)keys.ShiftLeft=true;} // steer into the bend, helper pulse at entry
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
})`
};
