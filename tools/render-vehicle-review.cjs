'use strict';
// CPU geometry review only: painter's algorithm + diffuse shading, not WebGL/PBR.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas}=require('@napi-rs/canvas');
const context={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/vendor/three-r149.min.js'),'utf8'),context);
const T=context.THREE;
const output=process.argv[2],baseline=process.argv[3];
if(!output||!baseline)throw new Error('usage: node tools/render-vehicle-review.cjs OUTPUT.png BASELINE.cjs');
const factories=[require(path.resolve(baseline)).createVehicle3D,require('../src/rendering/Vehicle3D.cjs').createVehicle3D];
const c=createCanvas(1440,1000),g=c.getContext('2d');
g.fillStyle='#0d1624';g.fillRect(0,0,c.width,c.height);
function render(factory,column,row){
 const w=720,h=460,x0=column*w,y0=80+row*h;
 const camera=new T.PerspectiveCamera(33,w/h,.1,100);
 camera.position.set(row===0?3.8:-3.8,2.45,row===0?5.4:-5.4);camera.lookAt(0,.55,0);camera.updateMatrixWorld();
 const car=factory(T);car.root.updateMatrixWorld(true);
 const light=new T.Vector3(-.4,.9,.5).normalize(),faces=[];
 const project=v=>v.clone().project(camera);
 car.root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible||mesh.name==='contact-shadow')return;
  const a=mesh.geometry.getAttribute('position'),ix=mesh.geometry.index;
  for(let i=0;i<(ix?ix.count:a.count);i+=3){
   const points=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(a,ix?ix.getX(i+k):i+k).applyMatrix4(mesh.matrixWorld));
   const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
   if(normal.lengthSq()<1e-12)continue;normal.normalize();
   const front=normal.dot(camera.position.clone().sub(points[0]))>0;
   if(!front&&mesh.material.side!==T.DoubleSide)continue;
   if(!front)normal.negate();
   const mat=mesh.material,color=mat.color.clone();
   const brightness=.38+Math.max(0,normal.dot(light))*.65;
   color.multiplyScalar(brightness);
   if(mat.emissive)color.add(mat.emissive.clone().multiplyScalar(Math.min(.5,mat.emissiveIntensity*.18)));

   const p=points.map(project);
   faces.push({p,depth:p.reduce((s,v)=>s+v.z,0)/3,color:'#'+color.getHexString()});
  }
 });
 g.save();g.beginPath();g.rect(x0,y0,w,h);g.clip();
 const grad=g.createLinearGradient(0,y0,0,y0+h);grad.addColorStop(0,'#172940');grad.addColorStop(1,'#243547');g.fillStyle=grad;g.fillRect(x0,y0,w,h);
 const floor=v=>{const p=project(v);return [x0+(p.x+1)*w/2,y0+(1-p.y)*h/2];};
 g.strokeStyle='#486074';g.globalAlpha=.35;g.lineWidth=1;
 for(let i=-8;i<=8;i++){
  for(const pair of [[new T.Vector3(i,0,-8),new T.Vector3(i,0,8)],[new T.Vector3(-8,0,i),new T.Vector3(8,0,i)]]){
   const a=floor(pair[0]),b=floor(pair[1]);g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();
  }
 }
 g.globalAlpha=1;
 // Soft ellipse is an illustrative floor shadow, not the WebGL shadow map.
 const cp=floor(new T.Vector3(0,0,0));g.fillStyle='rgba(0,0,0,.20)';g.beginPath();g.ellipse(cp[0],cp[1]+4,145,40,0,0,Math.PI*2);g.fill();
 faces.sort((a,b)=>b.depth-a.depth);
 for(const f of faces){g.fillStyle=f.color;g.beginPath();f.p.forEach((p,i)=>g[i?'lineTo':'moveTo'](x0+(p.x+1)*w/2,y0+(1-p.y)*h/2));g.closePath();g.fill();g.strokeStyle=f.color;g.lineWidth=.55;g.stroke();}
 g.fillStyle='#dce9f3';g.font='bold 18px sans-serif';g.fillText((column?'V83':'V82')+' / '+(row===0?'REAR QUARTER':'FRONT QUARTER'),x0+28,y0+30);
 g.restore();car.dispose();
}
for(let r=0;r<2;r++)for(let col=0;col<2;col++)render(factories[col],col,r);
g.fillStyle='#f0f6fc';g.font='bold 26px sans-serif';g.fillText('VEHICLE GEOMETRY REVIEW',28,35);
g.fillStyle='#9fb3c6';g.font='15px sans-serif';g.fillText('CPU diffuse preview — silhouette / mesh occlusion only. WebGL lighting, PBR and textures require in-game review.',28,62);
fs.writeFileSync(output,c.toBuffer('image/png'));console.log(output);
