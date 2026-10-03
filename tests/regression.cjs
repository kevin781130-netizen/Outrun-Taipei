const path=require('node:path');
const {load}=require('./canvas-harness.cjs');
const {scenarios}=require('./scenarios.cjs');
(async()=>{
 const game=load(path.join(__dirname,'../index.html'));
 console.log(await scenarios(code=>game.run(code)));
})().catch(e=>{console.error(e);process.exitCode=1});
