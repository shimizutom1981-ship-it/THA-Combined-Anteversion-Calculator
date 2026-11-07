/* Dedicated landmark schema; no silent reuse of legacy pubic points. */
'use strict';
const pstiPhotoState={points:{},target:null,zoom:1,panX:0,panY:0,gesture:null};
const pstiPhotoPointers=new Set();
const pstiPhotoShared=['tdLeft','tdRight','ischiumLeft','ischiumRight','pubicSuperior','s1','s2'];
const pstiPhotoLabels={tdLeft:'TD-L 画像左涙痕',tdRight:'TD-R 画像右涙痕',ischiumLeft:'IT-L 画像左坐骨先端',ischiumRight:'IT-R 画像右坐骨先端',pubicSuperior:'PS-S 恥骨結合上縁',s1:'S1 校正端点',s2:'S2 校正端点'};
const pstiPhotoEl=id=>document.getElementById(id);
function pstiPhotoKey(key){return key;}
function pstiPhotoVisibleKeys(){return pstiPhotoShared;}
function pstiPhotoShort(key){return key;}
function pstiPhotoCancelGesture(clearPointers=true){
  if(pstiPhotoState.gesture){clearTimeout(pstiPhotoState.gesture.timer);pstiPhotoState.gesture=null;}
  if(clearPointers)pstiPhotoPointers.clear();
}
function resetPstiPhotoMeasurements(){
  pstiPhotoCancelGesture();pstiPhotoState.points={};pstiPhotoState.target=null;pstiPhotoState.zoom=1;pstiPhotoState.panX=pstiPhotoState.panY=0;
  pstiPhotoEl('pstiPhotoResearchId').value='';pstiPhotoEl('pstiPhotoDate').value='';pstiPhotoEl('pstiPhotoPosture').value='unknown';
  pstiPhotoEl('pstiPhotoKnownLength').value='';pstiPhotoEl('pstiPhotoScaleConfirmed').checked=false;
  pstiPhotoEl('pstiPhotoCalibrationSource').value='manual';
}
function pstiPhotoScale(){
  if(pstiPhotoEl('pstiPhotoCalibrationSource').value==='cup')return cupCalibrationResult();
  const raw=pstiPhotoEl('pstiPhotoKnownLength').value.trim();
  return {...OffsetGeometry.calibration([pstiPhotoState.points.s1,pstiPhotoState.points.s2],raw===''?NaN:Number(raw),pstiPhotoEl('pstiPhotoScaleConfirmed').checked),source:'pstiPhoto_manual_s1_s2',knownMm:raw===''?null:Number(raw)};
}
function pstiPhotoResult(){return PstiPhotoGeometry.measure(pstiPhotoState.points,pstiPhotoScale().mmPerPx);}
function pstiPhotoMarkChanged(key){if(['s1','s2'].includes(key))pstiPhotoEl('pstiPhotoScaleConfirmed').checked=false;}
function pstiPhotoToImage(e){
  const c=pstiPhotoEl('pstiPhotoCanvas'),r=c.getBoundingClientRect();
  return {x:((e.clientX-r.left)*c.width/r.width-pstiPhotoState.panX)/pstiPhotoState.zoom,y:((e.clientY-r.top)*c.height/r.height-pstiPhotoState.panY)/pstiPhotoState.zoom};
}
function pstiPhotoClamp(p){return {x:Math.max(0,Math.min(canvas.width,p.x)),y:Math.max(0,Math.min(canvas.height,p.y))};}
function pstiPhotoEnd(e){
  pstiPhotoPointers.delete(e.pointerId);
  const g=pstiPhotoState.gesture;if(!g||g.id!==e.pointerId)return;
  clearTimeout(g.timer);
  // Placement on pointer-up avoids phantom points from a pan, cancellation or second finger.
  if(e.type==='pointerup'&&g.kind==='place'&&!g.moved&&imageLoaded){pstiPhotoState.points[g.key]=pstiPhotoClamp(pstiPhotoToImage(e));pstiPhotoMarkChanged(g.key);pstiPhotoState.target=null;}
  pstiPhotoState.gesture=null;renderPstiPhotoMeasurements();
}
function fitPstiPhotoCanvas(){
  const c=pstiPhotoEl('pstiPhotoCanvas');
  if(!c.parentElement||!c.parentElement.clientWidth||typeof window==='undefined')return;
  const displayScale=Math.min((c.parentElement.clientWidth-28)/c.width,window.innerHeight*.58/c.height);
  if(displayScale>0){c.style.width=c.width*displayScale+'px';c.style.height=c.height*displayScale+'px';c.style.margin='0 auto';}
}
function renderPstiPhotoMeasurements(){
  const c=pstiPhotoEl('pstiPhotoCanvas');if(!c)return;
  if(c.width!==canvas.width||c.height!==canvas.height){c.width=canvas.width;c.height=canvas.height;}
  fitPstiPhotoCanvas();
  const context=c.getContext('2d'),p=pstiPhotoState.points,r=pstiPhotoResult(),cal=pstiPhotoScale();
  context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,c.width,c.height);context.fillStyle='#020617';context.fillRect(0,0,c.width,c.height);
  const buttons=pstiPhotoEl('pstiPhotoPointButtons');
  if(!buttons.children.length){
    for(const key of pstiPhotoShared){
      const button=document.createElement('button');button.type='button';button.dataset.key=key;
      button.addEventListener('click',()=>{pstiPhotoCancelGesture();pstiPhotoState.target=pstiPhotoKey(key);renderPstiPhotoMeasurements();});buttons.appendChild(button);
    }
  }
  for(const button of buttons.children){const key=pstiPhotoKey(button.dataset.key);button.textContent=(p[key]?'✓ ':'')+pstiPhotoLabels[button.dataset.key];button.setAttribute('aria-pressed',String(key===pstiPhotoState.target));button.style.outline=key===pstiPhotoState.target?'2px solid #38bdf8':'';button.disabled=!imageLoaded;}
  pstiPhotoEl('pstiPhotoGuide').textContent=!imageLoaded?'上の「透視写真を撮影 / 選択」から画像を読み込んでください。':pstiPhotoState.target?pstiPhotoLabels[pstiPhotoShort(pstiPhotoState.target)]+'：画像をタップして配置／置換します。':'点のボタンを選んで打点してください。涙痕間線と坐骨間線を確認し、必要なら既存点を長押しで修正します。';
  pstiPhotoEl('pstiPhotoCalibrationStatus').textContent='使用する校正：'+(cal.source==='cup_outer_diameter_ab'?'カップ外径 A–B':'PSTI専用 S1–S2')+' ｜ '+cal.status+(cal.mmPerPx===null?'（px表示のみ）':'：'+cal.mmPerPx.toFixed(5)+' mm/px');
  pstiPhotoEl('pstiPhotoResults').textContent='PSTI: '+(r.pstiPx===null?'--':r.pstiMm===null?r.pstiPx.toFixed(1)+' px':r.pstiMm.toFixed(1)+' mm ('+r.pstiPx.toFixed(1)+' px)');
  pstiPhotoEl('pstiPhotoWarnings').textContent=[...r.errors,...r.warnings,...(cal.source==='cup_outer_diameter_ab'?[cal.uncertainty,'カップと骨盤の深さの差による倍率誤差に注意してください。']:[])].join(' ');
  for(const id of ['pstiPhotoExportJson','pstiPhotoExportCsv'])pstiPhotoEl(id).disabled=!imageLoaded;
  if(!imageLoaded)return;
  context.save();context.translate(pstiPhotoState.panX,pstiPhotoState.panY);context.scale(pstiPhotoState.zoom,pstiPhotoState.zoom);context.drawImage(img,0,0,c.width,c.height);
  const line=(a,b,color,dash=[])=>{if(!a||!b)return;context.strokeStyle=color;context.lineWidth=2/pstiPhotoState.zoom;context.setLineDash(dash.map(v=>v/pstiPhotoState.zoom));context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke();context.setLineDash([]);};
  line(p.tdLeft,p.tdRight,'#10b981');line(p.s1,p.s2,'#c084fc');
  line(p.ischiumLeft,p.ischiumRight,'#fbbf24');
  if(r.valid)line(p.pubicSuperior,r.foot,'#fb7185');
  const mark=(pt,label,color)=>{context.fillStyle=color;context.beginPath();context.arc(pt.x,pt.y,4/pstiPhotoState.zoom,0,2*Math.PI);context.fill();context.font=(12/pstiPhotoState.zoom)+'px sans-serif';context.lineWidth=3/pstiPhotoState.zoom;context.strokeStyle='#000';context.strokeText(label,pt.x+7/pstiPhotoState.zoom,pt.y-7/pstiPhotoState.zoom);context.fillText(label,pt.x+7/pstiPhotoState.zoom,pt.y-7/pstiPhotoState.zoom);};
  for(const key of pstiPhotoVisibleKeys())if(p[key])mark(p[key],pstiPhotoShort(key),'#fff');
  context.restore();
}
(function setupPstiPhotoControls(){
  const c=pstiPhotoEl('pstiPhotoCanvas');
  c.addEventListener('pointerdown',e=>{
    if(!imageLoaded||(e.button!==undefined&&e.button!==0))return;e.preventDefault();
    c.setPointerCapture(e.pointerId);
    pstiPhotoPointers.add(e.pointerId);
    if(pstiPhotoPointers.size>1){pstiPhotoCancelGesture(false);return;}
    const p=pstiPhotoToImage(e),start={x:e.clientX,y:e.clientY},g={id:e.pointerId,start,moved:false,timer:null};
    if(pstiPhotoState.target&&!e.shiftKey){g.kind='place';g.key=pstiPhotoState.target;}
    else {
      const rect=c.getBoundingClientRect(),radius=18*c.width/rect.width/pstiPhotoState.zoom;
      const hits=pstiPhotoVisibleKeys().filter(k=>pstiPhotoState.points[k]).map(k=>({key:k,d:Math.hypot(p.x-pstiPhotoState.points[k].x,p.y-pstiPhotoState.points[k].y)})).filter(x=>x.d<radius).sort((a,b)=>a.d-b.d);
      if(hits.length){g.key=hits[0].key;g.kind=e.shiftKey?'drag':'hold';g.delta={x:pstiPhotoState.points[g.key].x-p.x,y:pstiPhotoState.points[g.key].y-p.y};if(g.kind==='hold')g.timer=setTimeout(()=>{if(pstiPhotoState.gesture===g&&!g.moved)g.kind='drag';},450);}
      else {if(e.shiftKey)return;g.kind='pan';g.pan={x:pstiPhotoState.panX,y:pstiPhotoState.panY};}
    }
    pstiPhotoState.gesture=g;
  });
  c.addEventListener('pointermove',e=>{
    const g=pstiPhotoState.gesture;if(!g||g.id!==e.pointerId)return;e.preventDefault();
    const dx=e.clientX-g.start.x,dy=e.clientY-g.start.y;
    if(Math.hypot(dx,dy)>8){g.moved=true;if(g.kind==='hold'){clearTimeout(g.timer);g.kind='cancelled';}}
    if(g.kind==='drag'){const p=pstiPhotoToImage(e);pstiPhotoState.points[g.key]=pstiPhotoClamp({x:p.x+g.delta.x,y:p.y+g.delta.y});pstiPhotoMarkChanged(g.key);}
    if(g.kind==='pan'){const rect=c.getBoundingClientRect();pstiPhotoState.panX=g.pan.x+dx*c.width/rect.width;pstiPhotoState.panY=g.pan.y+dy*c.height/rect.height;}
    renderPstiPhotoMeasurements();
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(name,pstiPhotoEnd);
  pstiPhotoEl('pstiPhotoCalibrationSource').addEventListener('change',renderPstiPhotoMeasurements);
  pstiPhotoEl('pstiPhotoKnownLength').addEventListener('input',()=>{pstiPhotoEl('pstiPhotoScaleConfirmed').checked=false;renderPstiPhotoMeasurements();});
  pstiPhotoEl('pstiPhotoScaleConfirmed').addEventListener('change',renderPstiPhotoMeasurements);
  pstiPhotoEl('pstiPhotoClearAll').addEventListener('click',()=>{resetPstiPhotoMeasurements();renderPstiPhotoMeasurements();});
  pstiPhotoEl('pstiPhotoCancelPlacement').addEventListener('click',()=>{pstiPhotoCancelGesture();pstiPhotoState.target=null;renderPstiPhotoMeasurements();});
  const zoom=f=>{pstiPhotoCancelGesture();const old=pstiPhotoState.zoom,next=Math.max(1,Math.min(6,old*f));pstiPhotoState.panX=c.width/2-(c.width/2-pstiPhotoState.panX)*next/old;pstiPhotoState.panY=c.height/2-(c.height/2-pstiPhotoState.panY)*next/old;pstiPhotoState.zoom=next;renderPstiPhotoMeasurements();};
  pstiPhotoEl('pstiPhotoZoomIn').addEventListener('click',()=>zoom(1.5));pstiPhotoEl('pstiPhotoZoomOut').addEventListener('click',()=>zoom(1/1.5));
  pstiPhotoEl('pstiPhotoZoomReset').addEventListener('click',()=>{pstiPhotoCancelGesture();pstiPhotoState.zoom=1;pstiPhotoState.panX=pstiPhotoState.panY=0;renderPstiPhotoMeasurements();});
  pstiPhotoEl('pstiPhotoPanel').addEventListener('toggle',()=>{if(pstiPhotoEl('pstiPhotoPanel').open)renderPstiPhotoMeasurements();else pstiPhotoCancelGesture();});
  if(typeof window!=='undefined')window.addEventListener('resize',renderPstiPhotoMeasurements);
  function save(text,type,extension){if(!imageLoaded)return;const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download='THA_PSTI_photo_'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function record(){return {schema:'tha-ap-psti-photo-v1',researchOnly:true,researchId:pstiPhotoEl('pstiPhotoResearchId').value,imageDate:pstiPhotoEl('pstiPhotoDate').value,posture:pstiPhotoEl('pstiPhotoPosture').value,savedAt:new Date().toISOString(),coordinateSystem:'resized_image_pixels',imageSize:{width:canvas.width,height:canvas.height},definitions:PstiPhotoGeometry.definitions,points:pstiPhotoState.points,calibration:pstiPhotoScale(),results:pstiPhotoResult(),angleEstimate:null};}
  pstiPhotoEl('pstiPhotoExportJson').addEventListener('click',()=>save(JSON.stringify(record(),null,2),'application/json','json'));
  pstiPhotoEl('pstiPhotoExportCsv').addEventListener('click',()=>{const r=record(),cols={schema:r.schema,researchId:r.researchId,imageDate:r.imageDate,posture:r.posture,savedAt:r.savedAt,pstiPx:r.results.pstiPx,pstiMm:r.results.pstiMm,definition:r.definitions.psti,ischialDefinition:r.definitions.ischia,pubicDefinition:r.definitions.pubicSuperior,calibrationSource:r.calibration.source,mmPerPx:r.calibration.mmPerPx,errors:r.results.errors.join(' / '),warnings:r.results.warnings.join(' / ')};for(const [k,v] of Object.entries(r.points)){cols[k+'_x']=v.x;cols[k+'_y']=v.y;}const quote=v=> '"'+String(typeof v==='string'&&/^[=+\-@\t\r]/.test(v)?"'"+v:v??'').replace(/"/g,'""')+'"';save('\ufeff'+[Object.keys(cols),Object.values(cols)].map(row=>row.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8','csv');});
})();
