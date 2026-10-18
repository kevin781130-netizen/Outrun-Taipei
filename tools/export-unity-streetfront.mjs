// Export existing engine-independent art data; never edit the legacy runtime.
import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {buildTaipeiStreetfrontPlan} from '../previews/quaternius-downtown/taipei-streetfront.mjs';
const target=fileURLToPath(new URL('../unity/TaipeiDrive/Assets/Generated/Source/',import.meta.url));
await mkdir(target,{recursive:true});
const styles=['mixed','metal','brick'];
await writeFile(target+'streetfront.json',JSON.stringify({styles:styles.map(style=>{
  const p=buildTaipeiStreetfrontPlan(style);
  return {style,palette:Object.entries(p.palette).filter(([,v])=>v.startsWith('#')).map(([name,color])=>({name,color})),
    nearBoxes:p.nearBoxes,farBoxes:p.farBoxes,signs:p.signs};
})},null,2)+'\n');
console.log('Exported 3 Taipei facade styles.');
