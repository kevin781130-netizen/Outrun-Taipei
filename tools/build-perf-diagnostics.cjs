'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/diagnostics/FrameProbe.cjs'),'utf8').trimEnd();
const expected=[
 '/* V64 performance diagnostic module, generated from src/diagnostics/FrameProbe.cjs. */',
 '(function(root){',"'use strict';",'const module={exports:{}};',source,
 'root.TaipeiPerf64=Object.freeze(module.exports);','})(window);',''
].join('\n');
const file=path.join(root,'assets/perf-diagnostics.js');
if(process.argv.includes('--check')){
 if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==expected){
  console.error('V64 diagnostics bundle stale. Run node tools/build-perf-diagnostics.cjs');
  process.exitCode=1;
 }else console.log('V64 diagnostics browser bundle matches source');
}else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,expected);console.log('Built V64 performance diagnostic bundle');}
