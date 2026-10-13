const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const ROOT=path.resolve(__dirname,'..');
const SKIP=new Set(['.git','node_modules','test-results']);
const FORBIDDEN_EXT=new Set([
  '.bin','.rom','.smd','.gen','.iso','.cue','.chd','.gdi','.cdi','.zip','.7z','.rar',
  '.z01','.z02','.z03','.z04','.z05','.vgm','.vgz','.pcm','.raw','.chr','.tile','.pal'
]);
const failures=[];
// Only these pre-existing, documented CC0 glTF buffers can use the .bin suffix.
// Exact hashes prevent this exception from admitting arbitrary binary payloads.
const GEOMETRY_HASHES={
 'Brick_Plain_1':'99b927a3175d6a9612803298f61d9e9ce9f463430cad9b0ae1c4af1ee3404729',
 'Brick_RedWhite_DoubleWindow':'3494ee7f685037f1cc6a78e6e7dafecba5b1068ac83ecb3c2556012765f67b58',
 'DoorFrame_Trim':'6226b14e10451f341840e03e890c71074c655a69b73fafcc776c71f4a3d8d6c5',
 'Metal_Window':'a3214c95ecccbb9604e2eb0ed417148753965c0e4eb4ad1cf93d51326c61158f'
};
function approvedGeometry(root,r){
 const match=r.match(/^(?:playtests\/quaternius-race\/)?assets\/third_party\/quaternius-downtown\/(Brick_Plain_1|Brick_RedWhite_DoubleWindow|DoorFrame_Trim|Metal_Window)\.bin$/);
 if(!match)return false;
 try{
  const dir=path.dirname(path.join(root,r)),buf=fs.readFileSync(path.join(root,r));
  const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
  if(hash(buf)!==GEOMETRY_HASHES[match[1]])return false;
  if(hash(fs.readFileSync(path.join(dir,'QUATERNIUS_LICENSE.txt')))!=='40e0a81bfbb91f1305fd1c052ce590956a9dbac07572612d8552ef75bd970435')return false;
  const gltf=JSON.parse(fs.readFileSync(path.join(dir,match[1]+'.gltf'),'utf8'));
  return gltf.asset?.version==='2.0'&&gltf.meshes?.length>0&&gltf.buffers?.some(b=>b.uri===match[1]+'.bin'&&b.byteLength===buf.length);
 }catch{return false;}
}
module.exports={approvedGeometry};

function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(SKIP.has(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else inspect(full);
  }
}
function rel(full){return path.relative(ROOT,full).replaceAll(path.sep,'/');}
function inspect(full){
  const r=rel(full),ext=path.extname(full).toLowerCase();
  if((FORBIDDEN_EXT.has(ext)||/\.z\d\d$/i.test(ext))&&!approvedGeometry(ROOT,r)) failures.push(`forbidden packaged binary/archive extension: ${r}`);
  const buf=fs.readFileSync(full);
  if(ext==='.md' && buf.includes(0)) failures.push(`binary payload disguised as markdown: ${r}`);
  if(buf.length>0x110 && buf.subarray(0x100,0x110).toString('ascii').toUpperCase().includes('SEGA')){
    failures.push(`console-ROM signature detected in packaged file: ${r}`);
  }
}

if(require.main===module){
walk(ROOT);

const runtimePath=path.join(ROOT,'index.html');
const runtime=fs.readFileSync(runtimePath,'utf8');
const forbiddenRuntimeMarks=[
  /OutRun/i,
  /\bSEGA\b/i,
  /\bNEXON\b/i,
  /KartRider/i,
  /Ferrari/i,
  /Testarossa/i,
  /Porsche/i,
  /Corvette/i,
  /Cygnus/i,
  /Veryca/i
];
for(const rx of forbiddenRuntimeMarks) if(rx.test(runtime)) failures.push(`external brand/reference leaked into shipping runtime: ${rx}`);

const forbiddenPresentation=[
  /ROUTE PYRAMID/i,
  /EASY ROUTE/i,
  /drawSegaBillboard/i,
  /\bM68K\b/i,
  /\b68000\s+opcode\b/i,
  /\bZ80\s+opcode\b/i,
  /\bdisassembly\b/i,
  /\brom(?:Data|Bytes|Image)\b/i,
  /Heart\s+Attack/i,
  /\b5-4-5\b/i,
  /\b6-5-6\b/i,
  /licensed\s+Ferrari/i,
  /Last\s+Wave/i
];
for(const rx of forbiddenPresentation) if(rx.test(runtime)) failures.push(`forbidden direct-translation or distinctive-presentation marker in runtime: ${rx}`);

if(!/id="build-version"/.test(runtime)||!/CURRENT TEST BUILD/.test(runtime)||!/<strong>V56\.0<\/strong>/.test(runtime)){
  failures.push('visible V56.0 build label missing from shipping runtime');
}
for(const retiredCall of [
  'drawV47ForegroundMass(projected);',
  'drawV48ForegroundSetpieces(projected);',
  'drawV49NearOcclusion(projected);'
]){
  if(runtime.includes(retiredCall)) failures.push('retired unsafe foreground layer re-enabled: '+retiredCall);
}
const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
if(/outrun/i.test(String(pkg.name||''))) failures.push('external-title package identifier leaked into package name');

if(failures.length){
  console.error('Clean-room compliance FAILED');
  for(const f of failures) console.error(' - '+f);
  process.exit(1);
}
console.log({cleanRoomCompliance:'passed',filesScanned:true,romBinaryAssets:0,runtimeExternalMarks:0});

}
