'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const input=path.join(root,'src/traffic/LaneIntent.cjs');
const output=path.join(root,'assets/traffic-lane-intent.js');
const banner='/* V60 Taipei original traffic preview, generated from src/traffic/LaneIntent.cjs. */';
const source=fs.readFileSync(input,'utf8').trimEnd();
const generated=[banner,'(function(root){',"'use strict';",'const module={exports:{}};',source,'root.TaipeiTrafficAI=Object.freeze(module.exports);','})(window);',''].join('\n');
if(process.argv.includes('--check')){
 if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==generated){console.error('V60 traffic bundle is stale; run node tools/build-traffic-ai.cjs');process.exit(1);}
 console.log('V60 traffic bundle matches CommonJS source');
}else{
 fs.writeFileSync(output,generated);console.log('Built V60 standalone browser traffic module');
}
