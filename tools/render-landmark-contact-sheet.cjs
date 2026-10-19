'use strict';
// CPU geometry inspection only; does not emulate GPU PBR/reflections.
const fs=require('fs'),vm=require('vm'),path=require('path'),root=path.resolve(__dirname,'..'),ctx={};vm.runInNewContext(fs.readFileSync(root+'/assets/vendor/three-r149.min.js','utf8'),ctx);const T=ctx.THREE;
const {createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');const {createLandmarkGeometry}=require(root+'/src/rendering/TaipeiLandmarks.cjs');
const kinds=['office','dome','101','gondola','guandu','lovers','fort','rainbow','hotel','danjiang','chimney','museum'];const canvas=createCanvas(1350,1440),g=canvas.getContext('2d');g.fillStyle='#e4e7e4';g.fillRect(0,0,1350,1440);g.fillStyle='#26383b';g.font='bold 22px sans-serif';g.fillText('V95 / Original landmark geometry - CPU preview, GPU materials differ',18,30);
for(let tile=0;tile<kinds.length;tile++){
 const kind=kinds[tile],geo=createLandmarkGeometry(T,kind),p=geo.attributes.position,n=geo.attributes.normal,c=geo.attributes.color,b=geo.boundingBox,center=new T.Vector3();b.getCenter(center);const size=b.getSize(new T.Vector3()),scale=Math.max(size.x,size.y,size.z);
 const camera=new T.PerspectiveCamera(36,450/310,.01,30);camera.position.set(.95,.70,1.5);camera.lookAt(0,0,0);camera.updateMatrixWorld();const tris=[],normal=new T.Vector3(),v=new T.Vector3(),light=new T.Vector3(-.4,.8,.9).normalize();
 for(let i=0;i<p.count;i+=3){const vertices=[],world=new T.Vector3(),color=new T.Color(0,0,0);normal.set(0,0,0);let depth=0;
  for(let j=0;j<3;j++){v.fromBufferAttribute(p,i+j).sub(center).divideScalar(scale);world.add(v);normal.add(new T.Vector3().fromBufferAttribute(n,i+j));depth+=v.distanceToSquared(camera.position);v.project(camera);vertices.push([v.x*225+225,-v.y*155+165]);color.r+=c.getX(i+j)/3;color.g+=c.getY(i+j)/3;color.b+=c.getZ(i+j)/3;}
  normal.normalize();world.divideScalar(3);if(normal.dot(camera.position.clone().sub(world))<=0)continue;
  const brightness=.40+.60*Math.max(0,normal.dot(light));color.multiplyScalar(brightness).convertLinearToSRGB();tris.push({vertices,depth,color:'#'+color.getHexString()});
 }
 tris.sort((a,b)=>b.depth-a.depth);const x=tile%3*450,y=40+Math.floor(tile/3)*350;g.save();g.translate(x,y);
 for(const t of tris){g.beginPath();g.moveTo(...t.vertices[0]);g.lineTo(...t.vertices[1]);g.lineTo(...t.vertices[2]);g.closePath();g.fillStyle=t.color;g.fill();}
 g.fillStyle='#26383b';g.font='bold 20px sans-serif';g.fillText('V95 / '+kind,18,332);g.restore();geo.dispose();
}
fs.writeFileSync(path.join(root,'docs/v95-landmark-models.png'),canvas.toBuffer('image/png'));
