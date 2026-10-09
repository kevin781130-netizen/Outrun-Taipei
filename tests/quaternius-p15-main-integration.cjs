'use strict';
// P15 source-MAIN integration guard. No browser screenshot/production acceptance claim.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const lab=path.join(root,'playtests/quaternius-race');
const text=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=rel=>fs.statSync(path.join(root,rel)).isFile();
function gitBlobSha(file){
 const content=fs.readFileSync(path.join(root,file));
 return crypto.createHash('sha1').update('blob '+content.length+'\0').update(content).digest('hex');
}
(async()=>{
 assert.equal(gitBlobSha('index.html'),'683a4bc1a03081f43c15d0ddc9572d7569fb3584',
  'Original V56 game entry MUST remain byte-identical.');
 assert.equal(gitBlobSha('assets/hybrid-renderer.js'),'1eeaf1eb046ebd7d0426ed3cb6819d640b0a9e1b',
  'Original Three.js renderer MUST remain byte-identical.');
 const needed=[
  'index.html','assets/hybrid-renderer.js','assets/vendor/three-r149.min.js',
  'assets/vendor/three-r149-esm-shim.js',
  'assets/vendor/three-r149/jsm/loaders/GLTFLoader.js',
  'assets/vendor/three-r149/jsm/utils/BufferGeometryUtils.js',
  'quaternius-race-lab.js','quaternius-roadside-plan.mjs','qa-check.cjs','README.md',
  ...['Brick_Plain_1','Brick_RedWhite_DoubleWindow','Metal_Window','DoorFrame_Trim'].flatMap(name=>[
   'assets/third_party/quaternius-downtown/'+name+'.gltf',
   'assets/third_party/quaternius-downtown/'+name+'.bin'
  ]),
  'assets/third_party/quaternius-downtown/T_RedBrick_BaseColor.png',
  'assets/third_party/quaternius-downtown/T_MetalConcrete_BaseColor.png',
  'previews/quaternius-downtown/streetblock.html',
  'previews/quaternius-downtown/streetblock.js',
  'previews/quaternius-downtown/sign-atlas-layout.mjs',
  'previews/quaternius-downtown/streetblock-signs.mjs'
 ];
 for(const part of needed)
  assert(exists('playtests/quaternius-race/'+part),'Missing static-file dependency: '+part);
 const html=text('playtests/quaternius-race/index.html');
 const addon=text('playtests/quaternius-race/quaternius-race-lab.js');
 const road=text('playtests/quaternius-race/quaternius-roadside-plan.mjs');
 const renderer=text('playtests/quaternius-race/assets/hybrid-renderer.js');
 assert(html.includes('id="quaternius-art-toggle" aria-pressed="false"'));
 assert(html.includes('window.__quaterniusRaceBridge=Object.freeze({'));
 assert(html.includes('href="../../index.html"'),'Fallback must lead to source root Legacy Stable');
 assert(html.includes('quaternius-race-lab.js'));
 assert(addon.includes('loader.loadAsync(ROOT+name+'));
 assert(addon.includes('deriveVisualRoadside('));
 assert(addon.includes('get active(){return active&&!disposed;}'));
 assert(addon.includes('createStreetblockSigns('));
 assert(addon.includes('addon.setEnabled(false)'));
 assert(renderer.includes('function installQuaterniusAddon(addon)'));
 assert(renderer.includes('quaterniusAddon.update(frame,points,point,HALF_WIDTH,quality)'));
 const lib=await import(pathToFileURL(path.join(lab,'quaternius-roadside-plan.mjs')).href);
 assert.equal(lib.MAX_QUATERNIUS_BUILDINGS,6);
 assert.equal(lib.MAX_NEAR_BUILDINGS,2);
 assert.equal(lib.RACE_ART_SLOTS.length,6);
 assert.equal(lib.RACE_ART_SLOTS.filter(s=>lib.visualLod(s,'STANDARD')==='near').length,2);
 assert(lib.RACE_ART_SLOTS.every(s=>lib.visualLod(s,'LOW')==='hidden'));
 for(const lanes of [[{center:0,half:1}],[{center:-.75,half:.4},{center:.75,half:.4}]])
  for(const side of [-1,1])
   assert(lib.deriveVisualRoadside(lanes,side,8).clearanceMeters>=8);
 console.log(JSON.stringify({status:'P15 MAIN STATIC PASS',sandbox:'playtests/quaternius-race/',
  originalEntrySHA:gitBlobSha('index.html'),
  originalRendererSHA:gitBlobSha('assets/hybrid-renderer.js'),
  requiredFilesChecked:needed.length,quaterniusSlots:6,lowModeProtected:true,
  actualBrowserRendered:false,publicPagesProvenance:'unverified'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
