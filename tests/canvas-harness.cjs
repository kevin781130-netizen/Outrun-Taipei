const fs=require('node:fs'),vm=require('node:vm');
// Real Skia Canvas; the minimal DOM below is for simulation and raster checks.
// Browser input/layout/audio are covered separately by browser-smoke.cjs.
const {createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
class Element {
 constructor(id=''){this.id=id;this.style={};this.dataset={};this.value='';this.listeners={};this.textContent='';this._html='';this.children=[];this.checked=false;this.classList={set:new Set(),add(...s){s.forEach(x=>this.set.add(x))},remove(...s){s.forEach(x=>this.set.delete(x))},contains(s){return this.set.has(s)},toggle(s,on){if(on??!this.set.has(s))this.set.add(s);else this.set.delete(s)}};}
 addEventListener(t,fn){(this.listeners[t]??=[]).push(fn)}
 querySelector(s){return this.children.find(x=>x.id===s)||new Element(s)}
 querySelectorAll(){return []} appendChild(e){this.children.push(e)} insertBefore(e){this.children.push(e)}
 setAttribute(k,v){this[k]=v} getAttribute(k){return this[k]} matches(){return false} setPointerCapture(){} releasePointerCapture(){}
 get innerHTML(){return this._html} set innerHTML(s){this._html=s}
}
function load(file){
 const html=fs.readFileSync(file,'utf8'),elements=new Map();
 const doc=new Element();doc.hidden=false;
 doc.getElementById=id=>{if(!elements.has(id)){const el=id==='gameCanvas'?createCanvas(960,540):id==='tacho-gauge'?createCanvas(172,104):id==='route-map'?createCanvas(436,216):id==='garage-preview'?createCanvas(640,150):new Element(id);el.style??={};el.addEventListener??=()=>{};elements.set(id,el)}return elements.get(id)};
 doc.createElement=tag=>tag==='canvas'?createCanvas(300,150):new Element();
 doc.querySelectorAll=()=>[];doc.querySelector=()=>new Element();
 for(const m of html.matchAll(/<[^>]+id="([^"]+)"[^>]*>/g)){const el=doc.getElementById(m[1]);const value=m[0].match(/value="([^"]+)"/);if(value)el.value=value[1];const style=m[0].match(/style="([^"]+)"/);if(style)for(const p of style[1].split(';')){const [k,v]=p.split(':');if(k&&v)el.style[k.trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v.trim();}}
 doc.getElementById('car-select').value='testarossa';
 const win=new Element(),storage=new Map();
 const context={window:win,document:doc,navigator:{},console,performance:{now:()=>1000},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:()=>0,setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,clearTimeout:()=>{},Math,Date};
 win.innerWidth=1280;win.innerHeight=800;win.devicePixelRatio=1;
 vm.createContext(context);
 let scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
 scripts=scripts.replace('resetGame(); updateHUD(); drawRouteMap(); render(0);','window.__audit=code=>eval(code);resetGame(); updateHUD(); drawRouteMap(); render(0);');
 vm.runInContext(scripts,context,{filename:file});
 return {run:code=>win.__audit(code),canvas:doc.getElementById('gameCanvas'),elements,window:win,document:doc};
}
module.exports={load};
