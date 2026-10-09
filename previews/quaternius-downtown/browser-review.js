// P12: browser-only independent Quaternius streetblock visual acceptance station.
// All work stays in same-origin preview canvases and in user-triggered downloads.
import {makeBrowserReviewPlan,sheetDimensions,QA_SHEET,inspectCapturedPixels} from './browser-review-matrix.mjs';

const $=id=>document.getElementById(id);
const frame=$('preview-frame');
const stage=$('preview-stage');
const sheet=$('contact-sheet');
const progress=$('progress');
const runButton=$('start-review');
const saveImage=$('save-image');
const saveReport=$('save-report');
const reviewPlan=makeBrowserReviewPlan();
let report=null,working=false;
const status=value=>{progress.textContent=String(value)};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function awaitFrame(){
 if(!frame.src||frame.src==='about:blank'){
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('預覽框架載入逾時')),25000);
   frame.onload=()=>{clearTimeout(timer);resolve();};
   frame.onerror=()=>{clearTimeout(timer);reject(new Error('無法載入街廓 iframe'))};
   frame.src='./streetblock.html';
  });
 }
 for(let n=0;n<300;n++){
  const win=frame.contentWindow;
  const bridge=win?.__quaterniusArtQA;
  if(bridge?.ready?.())return bridge;
  const failure=frame.contentDocument?.getElementById('street-status')?.textContent||'';
  if(failure.startsWith('預覽載入失敗'))throw new Error(failure);
  await pause(150);
 }
 throw new Error('Quaternius 3D 素材未完成載入，請檢查開發者主控台和 HTTP 伺服器');
}
function resizePreview(caseInfo){
 const width=caseInfo.width,height=caseInfo.height;
 // Independent viewport sizing: document inside iframe sees the requested dimensions.
 frame.style.width=width+'px';
 frame.style.height=height+'px';
 frame.width=width;
 frame.height=height;
 const scale=Math.min(348/width,246/height);
 frame.style.transform='scale('+scale+')';
 stage.dataset.viewport=caseInfo.viewport;
}
async function settle(win){
 // Fonts and layout are allowed to finish before the *synchronous* canvas readback.
 await win.document.fonts?.ready;
 await new Promise(resolve=>win.requestAnimationFrame(()=>win.requestAnimationFrame(resolve)));
}
async function pacing(win){
 const times=[];
 await new Promise(resolve=>{
  const advance=t=>{
   times.push(t);
   if(times.length===13)resolve();
   else win.requestAnimationFrame(advance);
  };
  win.requestAnimationFrame(advance);
 });
 const diffs=times.slice(1).map((t,i)=>t-times[i]).filter(x=>x>0&&x<1000);
 return diffs.length>0?
  {samples:diffs.length,meanRafMs:+(diffs.reduce((a,b)=>a+b,0)/diffs.length).toFixed(2)}:
  {samples:0,meanRafMs:null};
}
async function decodePNG(dataURL){
 const image=new Image();
 image.src=dataURL;
 await image.decode();
 return image;
}
function paintCell(ctx,image,i,c,pixels,metrics){
 const {columns,tileWidth,tileHeight,headerHeight,margin}=QA_SHEET;
 const left=(i%columns)*tileWidth,top=Math.floor(i/columns)*tileHeight;
 ctx.fillStyle='#152333';ctx.fillRect(left,top,tileWidth,tileHeight);
 ctx.fillStyle='#eff5fa';ctx.font='bold 15px system-ui';
 ctx.textBaseline='middle';
 ctx.fillText(c.count+' 棟 / '+c.viewport+' / '+c.lod+' / '+(c.night?'夜':'日'),
  left+margin,top+headerHeight/2,tileWidth-2*margin);
 const availableW=tileWidth-2*margin,availableH=tileHeight-headerHeight-2*margin;
 const factor=Math.min(availableW/image.width,availableH/image.height);
 const w=Math.floor(image.width*factor),h=Math.floor(image.height*factor);
 const x=left+Math.floor((tileWidth-w)/2),y=top+headerHeight+Math.floor((availableH-h)/2);
 ctx.drawImage(image,x,y,w,h);
 ctx.strokeStyle='#42627a';ctx.strokeRect(x+.5,y+.5,w-1,h-1);
 if(!pixels.nonBlankHeuristic){
  ctx.fillStyle='rgba(140,38,29,.87)';ctx.fillRect(x,y,w,32);
  ctx.fillStyle='#ffffff';ctx.font='bold 12px system-ui';
  ctx.fillText('⚠ 畫面可能空白',x+8,y+16,w-16);
 }
}
function downloadBlob(blob,name){
 const u=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=u;a.download=name;a.hidden=true;document.body.appendChild(a);
 a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),30000);
}
runButton.addEventListener('click',async()=>{
 if(working)return;
 working=true;runButton.disabled=true;saveImage.disabled=true;saveReport.disabled=true;
 status('初始化獨立 Quaternius 預覽…');
 const start=new Date();
 const dim=sheetDimensions();
 sheet.width=dim.width;sheet.height=dim.height;
 const ctx=sheet.getContext('2d',{alpha:false});
 ctx.fillStyle='#11202d';ctx.fillRect(0,0,sheet.width,sheet.height);
 const results=[],issues=[];
 try{
  const bridge=await awaitFrame();
  for(let i=0;i<reviewPlan.length;i++){
   const current=reviewPlan[i];
   status('實際瀏覽器擷取 '+(i+1)+' / '+reviewPlan.length+
    '：'+current.count+' 棟 / '+current.viewport+' / '+current.lod+' / '+current.light);
   resizePreview(current);
   await settle(frame.contentWindow);
   bridge.configure({count:current.count,lod:current.lod,night:current.night});
   await settle(frame.contentWindow);
   const pacingSample=await pacing(frame.contentWindow);
   const capture=bridge.capture();
   const image=await decodePNG(capture.png);
   const probe=document.createElement('canvas');
   probe.width=48;probe.height=32;
   probe.getContext('2d').drawImage(image,0,0,probe.width,probe.height);
   const pixels=inspectCapturedPixels(probe);
   if(!pixels.nonBlankHeuristic)issues.push(current.id+': pixels appear blank');
   if(capture.count!==current.count||capture.near+capture.far!==current.count||
      !capture.previewOnly)issues.push(current.id+': preview state mismatch');
   if(current.lod==='near'&&capture.near!==current.count)
    issues.push(current.id+': near LOD count mismatch');
   if(current.lod==='far'&&capture.far!==current.count)
    issues.push(current.id+': far LOD count mismatch');
   paintCell(ctx,image,i,current,pixels,capture);
   const {png,...info}=capture;
   results.push({id:current.id,scenario:current,pixels,pacing:pacingSample,
    stats:info,pngLength:png.length});
   await pause(0);
  }
  const provenance=$('commit-sha').value.trim();
  report={
   type:'Quaternius-P12-browser-only-art-preview',
   createdAt:start.toISOString(),finishedAt:new Date().toISOString(),
   sourceCommit:provenance||null,
   provenanceStatus:provenance?'user-entered SHA (NOT cryptographically verified)':'unknown: user did not enter Git commit',
   location:location.href,browser:navigator.userAgent,
   pixelsAreBrowserCaptured:true,readOnlyToGame:true,
   hardwareGPUAcceptance:false,deployedGameAcceptance:false,humanVisualApproval:false,
   screenshotCount:results.length,contactSheetDimensions:dim,
   automaticResult:issues.length?'CAPTURED WITH WARNINGS — HUMAN REVIEW REQUIRED':
    'CAPTURED — HUMAN VISUAL REVIEW REQUIRED',
   issues,results,
   caveat:'Pixels are actual same-origin preview canvas captures in this browser. RAF timing is approximate; user must visually inspect contact sheet. Browser GPU/performance is not the production game.'
  };
  saveImage.disabled=false;saveReport.disabled=false;
  status('已擷取 '+results.length+' 張預覽，'+issues.length+
   ' 個自動檢查警訊。請人工查看下方聯絡表，再儲存 PNG 和 JSON。');
 }catch(error){
  report={
   type:'Quaternius-P12-browser-only-art-preview',
   createdAt:start.toISOString(),finishedAt:new Date().toISOString(),
   sourceCommit:$('commit-sha').value.trim()||null,
   automaticResult:'INCOMPLETE — NO VISUAL APPROVAL',
   error:String(error?.stack||error),completed:results.length,
   expected:reviewPlan.length,issues,results,humanVisualApproval:false};
  saveReport.disabled=false;
  status('未完成：'+(error.message||error)+'。可儲存 JSON 錯誤報告。');
  console.error('P12 browser visual capture failed',error);
 }finally{runButton.disabled=false;working=false;}
});
saveImage.addEventListener('click',()=>{
 if(!report||report.screenshotCount!==reviewPlan.length)return;
 sheet.toBlob(blob=>{if(blob)downloadBlob(blob,'quaternius-p12-24-view-contact-sheet.png')},'image/png');
});
saveReport.addEventListener('click',()=>{
 if(!report)return;
 downloadBlob(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),
  'quaternius-p12-browser-evidence.json');
});
status('請先啟動本機 HTTP 伺服器，再點選開始擷取。');
