'use strict';
// Independent diagnostic protocol. No ROM code, constants or game-state writes.
class InputEventTrace {
 constructor(limit=12000) {
  if(!Number.isSafeInteger(limit)||limit<1)throw new RangeError('limit');
  this.limit=limit;this.events=[];this.frames=[];this.held=new Set();
  this.cursor=0;this.lastAt=0;this.overflow=false;
 }
 record(at,code,down) {
  if(!Number.isFinite(at)||at<this.lastAt)throw new RangeError('event time');
  if(typeof code!=='string'||!code||typeof down!=='boolean')throw new TypeError('event');
  if(this.overflow)return false;
  if(this.held.has(code)===down)return true; // Ignore key auto-repeat.
  if(this.events.length+this.frames.length>=this.limit){this.overflow=true;return false;}
  this.lastAt=at;
  this.events.push({at,code,down});
  if(down)this.held.add(code);else this.held.delete(code);
  return true;
 }
 sample(at) {
  if(!Number.isFinite(at)||at<this.lastAt)throw new RangeError('sample time');
  if(this.overflow)return null;
  if(this.events.length+this.frames.length>=this.limit){this.overflow=true;return null;}
  const edges=this.events.slice(this.cursor).map(e=>({...e}));
  const frame={at,eventCount:this.events.length,held:[...this.held].sort(),edges};
  this.cursor=this.events.length;this.lastAt=at;this.frames.push(frame);
  return JSON.parse(JSON.stringify(frame));
 }
 export() {
  return JSON.parse(JSON.stringify({version:1,complete:!this.overflow,
   events:this.events,frames:this.frames}));
 }
}
function replayInputTrace(trace) {
 if(!trace||trace.version!==1||trace.complete!==true||!Array.isArray(trace.events)||!Array.isArray(trace.frames))
  throw new TypeError('complete version-1 trace required');
 const out=new InputEventTrace(Math.max(1,trace.events.length+trace.frames.length));
 let i=0;
 for(const frame of trace.frames){
  if(!Number.isSafeInteger(frame.eventCount)||frame.eventCount<i||frame.eventCount>trace.events.length)
   throw new RangeError('frame event count');
  while(i<frame.eventCount){
   const e=trace.events[i++];out.record(e.at,e.code,e.down);
  }
  out.sample(frame.at);
 }
 // Keep events captured after the final simulation sample as well.
 while(i<trace.events.length){const e=trace.events[i++];out.record(e.at,e.code,e.down);}
 return out.export();
}
module.exports={InputEventTrace,replayInputTrace};
