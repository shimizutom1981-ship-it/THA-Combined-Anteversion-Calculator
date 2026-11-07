/* Separate offset state: never reuses cup centers, H1/H2, LT points or a default scale. */
'use strict';
const offsetState={points:{},side:'imageLeft',target:null,zoom:1,panX:0,panY:0,gesture:null};
const offsetPointers=new Set();
const offsetShared=['tdLeft','tdRight','s1','s2'];
const offsetSideKeys=['h1','h2','h3','f1a','f1b','f2a','f2b'];
const offsetLabels={tdLeft:'TD-L 画像左涙滴',tdRight:'TD-R 画像右涙滴',s1:'S1 校正端点',s2:'S2 校正端点',h1:'H1 骨頭輪郭',h2:'H2 骨頭輪郭',h3:'H3 骨頭輪郭',f1a:'F1a 近位皮質',f1b:'F1b 反対側皮質',f2a:'F2a 遠位皮質',f2b:'F2b 反対側皮質'};
const offsetEl=id=>document.getElementById(id);
function offsetKey(key){return offsetShared.includes(key)?key:offsetState.side+'_'+key;}
function offsetVisibleKeys(){return [...offsetShared,...offsetSideKeys.map(offsetKey)];}
function offsetShort(key){return key.replace(/^image(?:Left|Right)_/,'');}
function offsetCancelGesture(clearPointers=true){
  if(offsetState.gesture){clearTimeout(offsetState.gesture.timer);offsetState.gesture=null;}
  if(clearPointers)offsetPointers.clear();
}
function resetOffsetMeasurements(){
  offsetCancelGesture();offsetState.points={};offsetState.target=null;offsetState.zoom=1;offsetState.panX=offsetState.panY=0;
  offsetEl('offsetKnownLength').value='';offsetEl('offsetScaleConfirmed').checked=false;
  offsetEl('offsetCalibrationSource').value='manual';
}
function offsetScale(){
  if(offsetEl('offsetCalibrationSource').value==='cup')return cupCalibrationResult();
  const raw=offsetEl('offsetKnownLength').value.trim();
  return {...OffsetGeometry.calibration([offsetState.points.s1,offsetState.points.s2],raw===''?NaN:Number(raw),offsetEl('offsetScaleConfirmed').checked),source:'offset_manual_s1_s2',knownMm:raw===''?null:Number(raw)};
}
function offsetResult(side){
  const p=offsetState.points;
  return OffsetGeometry.measure({head:['h1','h2','h3'].map(k=>p[side+'_'+k]),shaft:['f1a','f1b','f2a','f2b'].map(k=>p[side+'_'+k]),teardrops:[p.tdLeft,p.tdRight],side,scale:offsetScale().mmPerPx});
}
function offsetMarkChanged(key){if(['s1','s2'].includes(key))offsetEl('offsetScaleConfirmed').checked=false;}
function offsetToImage(e){
  const c=offsetEl('offsetCanvas'),r=c.getBoundingClientRect();
  return {x:((e.clientX-r.left)*c.width/r.width-offsetState.panX)/offsetState.zoom,y:((e.clientY-r.top)*c.height/r.height-offsetState.panY)/offsetState.zoom};
}
function offsetClamp(p){return {x:Math.max(0,Math.min(canvas.width,p.x)),y:Math.max(0,Math.min(canvas.height,p.y))};}
function offsetEnd(e){
  offsetPointers.delete(e.pointerId);
  const g=offsetState.gesture;if(!g||g.id!==e.pointerId)return;
  clearTimeout(g.timer);
  // Placement on pointer-up avoids phantom points from a pan, cancellation or second finger.
  if(e.type==='pointerup'&&g.kind==='place'&&!g.moved&&imageLoaded){offsetState.points[g.key]=offsetClamp(offsetToImage(e));offsetMarkChanged(g.key);offsetState.target=null;}
  offsetState.gesture=null;renderOffsetMeasurements();
}
function renderOffsetMeasurements(){
  const c=offsetEl('offsetCanvas');if(!c)return;
  if(c.width!==canvas.width||c.height!==canvas.height){c.width=canvas.width;c.height=canvas.height;}
  const context=c.getContext('2d'),p=offsetState.points,r=offsetResult(offsetState.side),cal=offsetScale();
  context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,c.width,c.height);context.fillStyle='#020617';context.fillRect(0,0,c.width,c.height);
  const buttons=offsetEl('offsetPointButtons');
  if(!buttons.children.length){
    for(const key of [...offsetShared,...offsetSideKeys]){
      const button=document.createElement('button');button.type='button';button.dataset.key=key;
      button.addEventListener('click',()=>{offsetCancelGesture();offsetState.target=offsetKey(key);renderOffsetMeasurements();});buttons.appendChild(button);
    }
  }
  for(const button of buttons.children){const key=offsetKey(button.dataset.key);button.textContent=(p[key]?'✓ ':'')+offsetLabels[button.dataset.key];button.setAttribute('aria-pressed',String(key===offsetState.target));button.style.outline=key===offsetState.target?'2px solid #38bdf8':'';button.disabled=!imageLoaded;}
  offsetEl('offsetGuide').textContent=!imageLoaded?'上の「透視写真を撮影 / 選択」から画像を読み込んでください。':offsetState.target?offsetLabels[offsetShort(offsetState.target)]+'：画像をタップして配置／置換します。':'点のボタンを選んで打点してください。円と軸を確認し、必要なら既存点を長押しで修正します。';
  offsetEl('offsetCalibrationStatus').textContent='使用する校正：'+(cal.source==='cup_outer_diameter_ab'?'カップ外径 A–B':'offset専用 S1–S2')+' ｜ '+cal.status+(cal.mmPerPx===null?'（px表示のみ）':'：'+cal.mmPerPx.toFixed(5)+' mm/px');
  const fmt=name=>r[name+'Px']===null?'--':r[name+'Mm']===null?r[name+'Px'].toFixed(1)+' px':r[name+'Mm'].toFixed(1)+' mm ('+r[name+'Px'].toFixed(1)+' px)';
  offsetEl('offsetResults').textContent=(offsetState.side==='imageLeft'?'画像左':'画像右')+'｜Femoral offset: '+fmt('femoral')+' ｜涙滴最下点基準 AO: '+fmt('acetabular')+' ｜Global offset (FO＋AO): '+fmt('global');
  offsetEl('offsetWarnings').textContent=[...r.errors,...r.warnings,...(cal.source==='cup_outer_diameter_ab'?[cal.uncertainty,'対側の骨頭・大腿骨への同じ倍率の適用も、同一深さとは限らない参考換算です。']:[])].join(' ');
  for(const id of ['offsetExportJson','offsetExportCsv'])offsetEl(id).disabled=!imageLoaded;
  if(!imageLoaded)return;
  context.save();context.translate(offsetState.panX,offsetState.panY);context.scale(offsetState.zoom,offsetState.zoom);context.drawImage(img,0,0,c.width,c.height);
  const line=(a,b,color,dash=[])=>{if(!a||!b)return;context.strokeStyle=color;context.lineWidth=2/offsetState.zoom;context.setLineDash(dash.map(v=>v/offsetState.zoom));context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke();context.setLineDash([]);};
  line(p.tdLeft,p.tdRight,'#10b981');line(p.s1,p.s2,'#c084fc');
  if(r.center){context.strokeStyle='#38bdf8';context.lineWidth=2/offsetState.zoom;context.beginPath();context.arc(r.center.x,r.center.y,r.radius,0,2*Math.PI);context.stroke();}
  if(r.axis){const [a,b]=r.axis,d={x:b.x-a.x,y:b.y-a.y},factor=Math.hypot(c.width,c.height)/Math.hypot(d.x,d.y);line({x:a.x-factor*d.x,y:a.y-factor*d.y},{x:a.x+factor*d.x,y:a.y+factor*d.y},'#fbbf24',[6,4]);line(r.center,r.foot,'#fb7185');}
  line(r.center,r.pelvicFoot,'#4ade80');
  const mark=(pt,label,color)=>{context.fillStyle=color;context.beginPath();context.arc(pt.x,pt.y,4/offsetState.zoom,0,2*Math.PI);context.fill();context.font=(12/offsetState.zoom)+'px sans-serif';context.lineWidth=3/offsetState.zoom;context.strokeStyle='#000';context.strokeText(label,pt.x+7/offsetState.zoom,pt.y-7/offsetState.zoom);context.fillText(label,pt.x+7/offsetState.zoom,pt.y-7/offsetState.zoom);};
  for(const key of offsetVisibleKeys())if(p[key])mark(p[key],offsetShort(key),'#fff');
  if(r.center)mark(r.center,'骨頭中心','#38bdf8');
  context.restore();
}
(function setupOffsetControls(){
  const c=offsetEl('offsetCanvas');
  c.addEventListener('pointerdown',e=>{
    if(!imageLoaded||(e.button!==undefined&&e.button!==0))return;e.preventDefault();
    c.setPointerCapture(e.pointerId);
    offsetPointers.add(e.pointerId);
    if(offsetPointers.size>1){offsetCancelGesture(false);return;}
    const p=offsetToImage(e),start={x:e.clientX,y:e.clientY},g={id:e.pointerId,start,moved:false,timer:null};
    if(offsetState.target&&!e.shiftKey){g.kind='place';g.key=offsetState.target;}
    else {
      const rect=c.getBoundingClientRect(),radius=18*c.width/rect.width/offsetState.zoom;
      const hits=offsetVisibleKeys().filter(k=>offsetState.points[k]).map(k=>({key:k,d:Math.hypot(p.x-offsetState.points[k].x,p.y-offsetState.points[k].y)})).filter(x=>x.d<radius).sort((a,b)=>a.d-b.d);
      if(hits.length){g.key=hits[0].key;g.kind=e.shiftKey?'drag':'hold';g.delta={x:offsetState.points[g.key].x-p.x,y:offsetState.points[g.key].y-p.y};if(g.kind==='hold')g.timer=setTimeout(()=>{if(offsetState.gesture===g&&!g.moved)g.kind='drag';},450);}
      else {if(e.shiftKey)return;g.kind='pan';g.pan={x:offsetState.panX,y:offsetState.panY};}
    }
    offsetState.gesture=g;
  });
  c.addEventListener('pointermove',e=>{
    const g=offsetState.gesture;if(!g||g.id!==e.pointerId)return;e.preventDefault();
    const dx=e.clientX-g.start.x,dy=e.clientY-g.start.y;
    if(Math.hypot(dx,dy)>8){g.moved=true;if(g.kind==='hold'){clearTimeout(g.timer);g.kind='cancelled';}}
    if(g.kind==='drag'){const p=offsetToImage(e);offsetState.points[g.key]=offsetClamp({x:p.x+g.delta.x,y:p.y+g.delta.y});offsetMarkChanged(g.key);}
    if(g.kind==='pan'){const rect=c.getBoundingClientRect();offsetState.panX=g.pan.x+dx*c.width/rect.width;offsetState.panY=g.pan.y+dy*c.height/rect.height;}
    renderOffsetMeasurements();
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(name,offsetEnd);
  offsetEl('offsetSide').addEventListener('change',e=>{offsetCancelGesture();offsetState.side=e.target.value;offsetState.target=null;renderOffsetMeasurements();});
  offsetEl('offsetCalibrationSource').addEventListener('change',renderOffsetMeasurements);
  offsetEl('offsetKnownLength').addEventListener('input',()=>{offsetEl('offsetScaleConfirmed').checked=false;renderOffsetMeasurements();});
  offsetEl('offsetScaleConfirmed').addEventListener('change',renderOffsetMeasurements);
  offsetEl('offsetClearSide').addEventListener('click',()=>{offsetCancelGesture();for(const key of offsetSideKeys)delete offsetState.points[offsetKey(key)];offsetState.target=null;renderOffsetMeasurements();});
  offsetEl('offsetClearAll').addEventListener('click',()=>{resetOffsetMeasurements();renderOffsetMeasurements();});
  offsetEl('offsetCancelPlacement').addEventListener('click',()=>{offsetCancelGesture();offsetState.target=null;renderOffsetMeasurements();});
  const zoom=f=>{offsetCancelGesture();const old=offsetState.zoom,next=Math.max(1,Math.min(6,old*f));offsetState.panX=c.width/2-(c.width/2-offsetState.panX)*next/old;offsetState.panY=c.height/2-(c.height/2-offsetState.panY)*next/old;offsetState.zoom=next;renderOffsetMeasurements();};
  offsetEl('offsetZoomIn').addEventListener('click',()=>zoom(1.5));offsetEl('offsetZoomOut').addEventListener('click',()=>zoom(1/1.5));
  offsetEl('offsetZoomReset').addEventListener('click',()=>{offsetCancelGesture();offsetState.zoom=1;offsetState.panX=offsetState.panY=0;renderOffsetMeasurements();});
  offsetEl('offsetPanel').addEventListener('toggle',()=>{if(offsetEl('offsetPanel').open)renderOffsetMeasurements();else offsetCancelGesture();});
  function save(text,type,extension){if(!imageLoaded)return;const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download='THA_2D_offset_'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  offsetEl('offsetExportJson').addEventListener('click',()=>save(JSON.stringify({schema:'tha-ap-offset-v1',researchOnly:true,coordinateSystem:'resized_image_pixels',imageSize:{width:canvas.width,height:canvas.height},method:'FO: perpendicular to shaft; AO: inferior bony teardrop point, interteardrop baseline; GO: FO+AO',points:offsetState.points,manualCalibration:{knownMm:offsetEl('offsetKnownLength').value,confirmed:offsetEl('offsetScaleConfirmed').checked},calibration:offsetScale(),cupCalibration:cupCalibrationResult(),results:{imageLeft:offsetResult('imageLeft'),imageRight:offsetResult('imageRight')}},null,2),'application/json','json'));
  offsetEl('offsetExportCsv').addEventListener('click',()=>{const keys=['femoralPx','acetabularPx','globalPx','femoralMm','acetabularMm','globalMm'];const rows=[['schema','researchOnly','reference','globalDefinition','coordinateSystem','imageSide',...keys,'calibrationSource','knownMm','mmPerPx','calibrationWarning','errors','warnings'],...['imageLeft','imageRight'].map(side=>{const r=offsetResult(side);return ['tha-ap-offset-v1',true,'inferior bony teardrop point / interteardrop baseline','FO + teardrop-based AO','resized_image_pixels',side,...keys.map(k=>r[k]),offsetScale().source,offsetScale().knownMm,offsetScale().mmPerPx,offsetScale().uncertainty||'',r.errors.join(' / '),r.warnings.join(' / ')];})];save('\ufeff'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n'),'text/csv;charset=utf-8','csv');});
})();
