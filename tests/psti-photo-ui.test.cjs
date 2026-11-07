'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const h=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const elements=new Map(),downloads=[],blobs=[];let timer=null;
const drawing=new Proxy({}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function element(id){const e={id,value:'',checked:false,disabled:false,textContent:'',style:{},dataset:{},children:[],events:{},width:800,height:600,open:true,
 addEventListener(n,fn){(this.events[n]??=[]).push(fn);},emit(n,e={}){for(const f of this.events[n]||[])f({target:this,...e});},appendChild(c){this.children.push(c);},setAttribute(n,v){this[n]=v;},getBoundingClientRect(){return {left:0,top:0,width:800,height:600};},getContext(){return drawing;},setPointerCapture(){},click(){if(this.download)downloads.push({download:this.download,blob:blobs[Number(this.href.slice(5))]});this.emit('click');}};return e;}
for(const m of h.matchAll(/id="([^"]+)"/g))elements.set(m[1],element(m[1]));
const c=vm.createContext({console,Blob,Date,OffsetGeometry:require('../offset-geometry.js'),PstiPhotoGeometry:require('../psti-photo-geometry.js'),renderOffsetMeasurements(){},document:{getElementById:id=>{assert.ok(elements.has(id),'unknown ID '+id);return elements.get(id);},createElement:tag=>element(tag)},canvas:{width:800,height:600},img:{},points:[],updateLengthMeasurements(){},imageLoaded:true,setTimeout(fn){timer=fn;return 1;},clearTimeout(){timer=null;},URL:{createObjectURL:b=>(blobs.push(b),'blob:'+(blobs.length-1)),revokeObjectURL(){}}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../cup-calibration.js'),'utf8'),c);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../psti-photo-ui.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c),el=id=>elements.get(id),state=()=>run('JSON.parse(JSON.stringify(pstiPhotoState))');
const event=(id,x,y,extra={})=>({pointerId:id,clientX:x,clientY:y,button:0,preventDefault(){},...extra});
const click=(id)=>el(id).click();
run('renderPstiPhotoMeasurements()');
function target(key){const b=el('pstiPhotoPointButtons').children.find(b=>b.dataset.key===key);assert.ok(b);b.click();}
function place(key,x,y){target(key);el('pstiPhotoCanvas').emit('pointerdown',event(1,x,y));el('pstiPhotoCanvas').emit('pointerup',event(1,x,y,{type:'pointerup'}));}
const coords={tdLeft:[200,200],tdRight:[600,200],ischiumLeft:[200,450],ischiumRight:[600,450],pubicSuperior:[400,350],s1:[300,520],s2:[500,520]};
for(const [k,v] of Object.entries(coords))place(k,...v);
assert.equal(run('pstiPhotoResult().pstiPx'),100);assert.equal(run('pstiPhotoResult().pstiMm'),null);
el('pstiPhotoKnownLength').value='50';el('pstiPhotoKnownLength').emit('input');el('pstiPhotoScaleConfirmed').checked=true;el('pstiPhotoScaleConfirmed').emit('change');assert.equal(run('pstiPhotoResult().pstiMm'),25);
el('pstiPhotoKnownLength').value='60';el('pstiPhotoKnownLength').emit('input');assert.equal(el('pstiPhotoScaleConfirmed').checked,false);assert.equal(run('pstiPhotoResult().pstiMm'),null);
place('tdRight',200,200);assert.equal(run('pstiPhotoResult().pstiPx'),null);place('tdRight',600,200);assert.equal(run('pstiPhotoResult().pstiPx'),100);
const before=JSON.stringify(state().points);
for(const kind of ['cancel','move','multi']){target('pubicSuperior');el('pstiPhotoCanvas').emit('pointerdown',event(1,50,50));if(kind==='move')el('pstiPhotoCanvas').emit('pointermove',event(1,80,80));if(kind==='multi'){el('pstiPhotoCanvas').emit('pointerdown',event(2,70,70));el('pstiPhotoCanvas').emit('pointerup',event(2,70,70,{type:'pointerup'}));}el('pstiPhotoCanvas').emit(kind==='cancel'?'pointercancel':'pointerup',event(1,50,50,{type:kind==='cancel'?'pointercancel':'pointerup'}));assert.equal(JSON.stringify(state().points),before);}
click('pstiPhotoCancelPlacement');click('pstiPhotoZoomIn');click('pstiPhotoZoomOut');click('pstiPhotoZoomReset');assert.equal(JSON.stringify(state().points),before);
el('pstiPhotoCanvas').emit('pointerdown',event(1,400,350,{shiftKey:true}));el('pstiPhotoCanvas').emit('pointermove',event(1,400,360));el('pstiPhotoCanvas').emit('pointerup',event(1,400,360,{type:'pointerup'}));assert.equal(run('pstiPhotoResult().pstiPx'),90);
// Genuine long press follows same drag path.
el('pstiPhotoCanvas').emit('pointerdown',event(1,400,360));timer();el('pstiPhotoCanvas').emit('pointermove',event(1,400,350));el('pstiPhotoCanvas').emit('pointerup',event(1,400,350,{type:'pointerup'}));assert.equal(run('pstiPhotoResult().pstiPx'),100);
// Cup calibration is explicit, and changing A/B revokes it.
run('points[2]={x:300,y:250};points[3]={x:500,y:250};');el('cupOuterDiameter').value='50';el('cupCalibrationConfirmed').checked=true;el('cupCalibrationConfirmed').emit('change');el('pstiPhotoCalibrationSource').value='cup';el('pstiPhotoCalibrationSource').emit('change');assert.equal(run('pstiPhotoResult().pstiMm'),25);run('points[3].x=510');run('renderPstiPhotoMeasurements()');assert.equal(run('pstiPhotoResult().pstiMm'),null);
(async()=>{el('pstiPhotoResearchId').value='=not_a_formula';el('pstiPhotoDate').value='2026-11-08';el('pstiPhotoPosture').value='supine';click('pstiPhotoExportJson');click('pstiPhotoExportCsv');assert.equal(downloads.length,2);const rec=JSON.parse(await downloads[0].blob.text());assert.equal(rec.schema,'tha-ap-psti-photo-v1');assert.equal(rec.angleEstimate,null);assert.equal(rec.researchId,'=not_a_formula');assert.equal(rec.posture,'supine');assert.match(await downloads[1].blob.text(),/'=not_a_formula/);assert.ok(rec.points.pubicSuperior);assert.ok(!JSON.stringify(rec).includes('data:image'));assert.match(await downloads[1].blob.text(),/pubicSuperior_x/);
run('resetPstiPhotoMeasurements();renderPstiPhotoMeasurements()');assert.equal(Object.keys(state().points).length,0);assert.equal(el('pstiPhotoResearchId').value,'');assert.equal(el('pstiPhotoDate').value,'');assert.equal(el('pstiPhotoPosture').value,'unknown');assert.equal(el('pstiPhotoKnownLength').value,'');assert.equal(el('pstiPhotoScaleConfirmed').checked,false);c.imageLoaded=false;run('renderPstiPhotoMeasurements()');assert.equal(el('pstiPhotoExportJson').disabled,true);assert.ok(el('pstiPhotoPointButtons').children.every(b=>b.disabled));
console.log('PASS PSTI UI doubles: placement, missing/invalid/recovery, scale revocation, cup coupling, zoom, cancel/move/multitouch, Shift and hold drag, JSON/CSV, no image payload, reset');})();
