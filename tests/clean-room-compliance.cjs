const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const SKIP=new Set(['.git','node_modules','test-results']);
const FORBIDDEN_EXT=new Set([
  '.bin','.rom','.smd','.gen','.iso','.cue','.chd','.gdi','.cdi','.zip','.7z','.rar',
  '.z01','.z02','.z03','.z04','.z05','.vgm','.vgz','.pcm','.raw','.chr','.tile','.pal'
]);
const failures=[];

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
  if(FORBIDDEN_EXT.has(ext)||/\.z\d\d$/i.test(ext)) failures.push(`forbidden packaged binary/archive extension: ${r}`);
  const buf=fs.readFileSync(full);
  if(ext==='.md' && buf.includes(0)) failures.push(`binary payload disguised as markdown: ${r}`);
  if(buf.length>0x110 && buf.subarray(0x100,0x110).toString('ascii').toUpperCase().includes('SEGA')){
    failures.push(`console-ROM signature detected in packaged file: ${r}`);
  }
}

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

if(!/id="build-version"/.test(runtime)||!/CURRENT TEST BUILD/.test(runtime)||!/V51\.0/.test(runtime)){
  failures.push('visible V51 build label missing from shipping runtime');
}
const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
if(/outrun/i.test(String(pkg.name||''))) failures.push('external-title package identifier leaked into package name');

if(failures.length){
  console.error('Clean-room compliance FAILED');
  for(const f of failures) console.error(' - '+f);
  process.exit(1);
}
console.log({cleanRoomCompliance:'passed',filesScanned:true,romBinaryAssets:0,runtimeExternalMarks:0});
