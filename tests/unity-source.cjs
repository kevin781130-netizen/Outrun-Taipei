'use strict';
// Source/data validation only. This does not compile Unity or stand in for EditMode/Web builds.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {load}=require('./canvas-harness.cjs');
const root=path.resolve(__dirname,'../unity');
const data=JSON.parse(fs.readFileSync(path.join(root,'Assets/Taipei/Resources/LegacyRoutes.json'),'utf8'));
const game=load(path.join(__dirname,'../index.html'));
const reference=JSON.parse(game.run(`JSON.stringify(STAGES.flat().map(n=>({id:n.id,name:n.name,eng:n.eng,theme:n.theme,archetype:n.archetype,landmark:n.landmark,seed:n.seed,hills:n.hills,curves:n.curves,traffic:n.traffic})))`));
assert.equal(data.routes.length,15);
for(const expected of reference){
 const actual=data.routes.find(r=>r.id===expected.id);assert(actual,expected.id);
 for(const [k,v] of Object.entries(expected))assert.deepEqual(actual[k],v,`${expected.id}.${k} remains the legacy reference`);
 assert(Number.isFinite(actual.lengthMeters)&&actual.lengthMeters>1000);
 assert(Number.isInteger(actual.timeBudget)&&actual.timeBudget>30);
}
const guids=new Map();let files=0;
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,ent.name);
 if(ent.name.endsWith('.meta')){
  const text=fs.readFileSync(file,'utf8'),guid=text.match(/^guid: ([a-f0-9]{32})$/m)?.[1];
  assert(guid,`valid GUID in ${file}`);assert(!guids.has(guid),`duplicate GUID ${file}`);guids.set(guid,file);
 }else{
  assert(fs.existsSync(file+'.meta'),`tracked asset has meta: ${file}`);files++;
  if(ent.isDirectory())walk(file);
  else if(file.endsWith('.asmdef'))JSON.parse(fs.readFileSync(file,'utf8'));
  else if(file.endsWith('.cs')&&file.includes('/Runtime/'))assert(!/using UnityEditor/.test(fs.readFileSync(file,'utf8')),'runtime excludes editor APIs');
 }
}}
walk(path.join(root,'Assets'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'Packages/manifest.json'),'utf8'));
assert(manifest.dependencies['com.unity.modules.inputlegacy']);
console.log({unitySource:'passed (not compiled)',routes:15,assetsWithMeta:files,uniqueGuids:guids.size});
