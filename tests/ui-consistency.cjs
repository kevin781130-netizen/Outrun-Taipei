// Static guard: player-visible rule numbers and version text must not drift away from the game constants.
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(process.env.UI_INDEX||path.join(__dirname,'../index.html'),'utf8');
const body=html.slice(0,html.indexOf('<script'));
const failures=[];
// 1. No stale hard-coded rule numbers in markup.
for(const rx of [/280\s*\/\s*300/,/4\.00\s*(s|秒)/,/極速\s*280/,/氮氣極速\s*300/,/CAP[^<]{0,10}280/])if(rx.test(body))failures.push(`stale hard-coded rule number in markup: ${rx}`);
// 2. data-rule keys must exist in ruleValues().
const keys=new Set([...body.matchAll(/data-rule="([A-Za-z]+)"/g)].map(m=>m[1]));
const defined=new Set((html.match(/function ruleValues\(\)\{[\s\S]*?\n\}/)||[''])[0].match(/\b([A-Za-z]+):/g)?.map(x=>x.slice(0,-1))||[]);
for(const k of keys)if(!defined.has(k))failures.push(`data-rule="${k}" has no matching ruleValues() entry`);
for(const k of ['topSpeed','boostSpeed','nitroDuration','lowSpeed'])if(!keys.has(k))failures.push(`menu no longer shows rule ${k}`);
// 3. No user-facing V51 version text (code identifiers and comments may keep historical names).
const visible=[];
for(const m of html.matchAll(/(?:aria-label|title)="([^"]*)"|>([^<>{}\n]*[^\s<>{}][^<>{}\n]*)</g))visible.push(m[1]||m[2]);
for(const m of html.matchAll(/(?:eyebrow|title|textContent|innerHTML)\s*[:=]\s*(['"`])((?:(?!\1).)*)\1/g))visible.push(m[2]);
for(const text of visible)if(/\bV51(?!\.\d*\s*起)\b/.test(text)&&!/V51 起/.test(text))failures.push(`stale V51 text visible to players: ${text.slice(0,80)}`);
if(!/<title>[^<]*V52/.test(html))failures.push('page title is not V52');
// 4. No checkpoint camera shake.
const cp=(html.match(/function awardCheckpoint\(\)\{[\s\S]*?\n\}/)||[''])[0];
if(/screenShake/.test(cp))failures.push('awardCheckpoint must not touch screenShake');
// 5. Near-miss must stay shake free.
const nm=(html.match(/function nearMiss\([\s\S]*?\n\}/)||[''])[0];
if(/screenShake/.test(nm))failures.push('nearMiss must not touch screenShake');
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(JSON.stringify({uiConsistency:'passed',ruleKeys:[...keys]}));
