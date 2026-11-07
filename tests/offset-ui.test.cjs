'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const h=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const elements=new Map(),downloads=[],blobs=[];let timer=null;
const drawing=new Proxy({}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function element(id){const e={id,value:'',checked:false,disabled:false,textContent:'',style:{},dataset:{},children:[],events:{},width:800,height:600,open:true,
 addEventListener(n,fn){(this.events[n]??=[]).push(fn);},emit(n,e={}){for(const f of this.events[n]||[])f({target:this,...e});},appendChild(c){this.children.push(c);},setAttribute(n,v){this[n]=v;},getBoundingClientRect(){return {left:0,top:0,width:800,height:600};},getContext(){return drawing;},setPointerCapture(){},click(){if(this.download)downloads.push({download:this.download,blob:blobs[Number(this.href.slice(5))]});this.emit('click');}};return e;}
for(const m of h.matchAll(/id="([^"]+)"/g))elements.set(m[1],element(m[1]));
const c=vm.createContext({console,Blob,Date,OffsetGeometry:require('../offset-geometry.js'),document:{getElementById:id=>{assert.ok(elements.has(id),'unknown ID '+id);return elements.get(id);},createElement:tag=>element(tag)},canvas:{width:800,height:600},img:{},points:[],updateLengthMeasurements(){},imageLoaded:true,setTimeout(fn){timer=fn;return 1;},clearTimeout(){timer=null;},URL:{createObjectURL:b=>(blobs.push(b),'blob:'+(blobs.length-1)),revokeObjectURL(){}}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../cup-calibration.js'),'utf8'),c);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../offset-ui.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c),el=id=>elements.get(id),state=()=>run('JSON.parse(JSON.stringify(offsetState))');
const event=(id,x,y,extra={})=>({pointerId:id,clientX:x,clientY:y,button:0,preventDefault(){},...extra});
const click=(id)=>el(id).click();
run('renderOffsetMeasurements()');
function target(key){const b=el('offsetPointButtons').children.find(b=>b.dataset.key===key);assert.ok(b);b.click();}
function place(key,x,y){target(key);el('offsetCanvas').emit('pointerdown',event(1,x,y));el('offsetCanvas').emit('pointerup',event(1,x,y,{type:'pointerup'}));}
const coords={tdLeft:[240,260],tdRight:[560,260],s1:[300,520],s2:[500,520],h1:[160,200],h2:[120,240],h3:[80,200],f1a:[160,300],f1b:[200,300],f2a:[160,500],f2b:[200,500]};
for(const [k,p] of Object.entries(coords))place(k,...p);
assert.equal(run("offsetResult('imageLeft').globalPx"),180);assert.equal(run("offsetResult('imageLeft').globalMm"),null);
el('offsetKnownLength').value='50';el('offsetKnownLength').emit('input');el('offsetScaleConfirmed').checked=true;el('offsetScaleConfirmed').emit('change');assert.equal(run("offsetResult('imageLeft').globalMm"),45);
el('offsetKnownLength').value='40';el('offsetKnownLength').emit('input');assert.equal(el('offsetScaleConfirmed').checked,false);assert.equal(run("offsetResult('imageLeft').globalMm"),null);
el('offsetKnownLength').value='50';el('offsetKnownLength').emit('input');el('offsetScaleConfirmed').checked=true;
const before=JSON.stringify(state().points);click('offsetZoomIn');click('offsetZoomOut');assert.equal(JSON.stringify(state().points),before);click('offsetZoomReset');
el('offsetSide').value='imageRight';el('offsetSide').emit('change');for(const [k,p] of Object.entries(coords).filter(([k])=>!['tdLeft','tdRight','s1','s2'].includes(k)))place(k,800-p[0],p[1]);assert.equal(run("offsetResult('imageRight').globalMm"),45);assert.equal(run("offsetResult('imageLeft').globalMm"),45);
click('offsetClearSide');assert.equal(run("offsetResult('imageRight').globalPx"),null);assert.equal(run("offsetResult('imageLeft').globalPx"),180);assert.equal(el('offsetScaleConfirmed').checked,true);
el('offsetSide').value='imageLeft';el('offsetSide').emit('change');
// Pending placement: no mutation from pointercancel, movement, or 2/3 fingers.
for(const kind of ['cancel','move','multi']){target('h1');el('offsetCanvas').emit('pointerdown',event(1,50,50));if(kind==='move')el('offsetCanvas').emit('pointermove',event(1,80,80));if(kind==='multi'){el('offsetCanvas').emit('pointerdown',event(2,70,70));el('offsetCanvas').emit('pointerdown',event(3,80,80));el('offsetCanvas').emit('pointerup',event(3,80,80,{type:'pointerup'}));el('offsetCanvas').emit('pointerup',event(2,70,70,{type:'pointerup'}));}el('offsetCanvas').emit(kind==='cancel'?'pointercancel':'pointerup',event(1,50,50,{type:kind==='cancel'?'pointercancel':'pointerup'}));assert.equal(JSON.stringify(state().points),before);}
click('offsetCancelPlacement');assert.equal(state().target,null);
// Plain tap locked; hold then drag; Shift drag; hold slop cancelled.
el('offsetCanvas').emit('pointerdown',event(1,160,200));el('offsetCanvas').emit('pointerup',event(1,160,200,{type:'pointerup'}));assert.equal(JSON.stringify(state().points),before);
el('offsetCanvas').emit('pointerdown',event(1,160,200));timer();el('offsetCanvas').emit('pointermove',event(1,164,204));el('offsetCanvas').emit('pointerup',event(1,164,204,{type:'pointerup'}));assert.equal(state().points.imageLeft_h1.x,164);
el('offsetCanvas').emit('pointerdown',event(1,164,204,{shiftKey:true}));el('offsetCanvas').emit('pointermove',event(1,160,200));el('offsetCanvas').emit('pointerup',event(1,160,200,{type:'pointerup'}));assert.equal(JSON.stringify(state().points),before);
el('offsetCanvas').emit('pointerdown',event(1,160,200));el('offsetCanvas').emit('pointermove',event(1,200,240));assert.equal(timer,null);el('offsetCanvas').emit('pointerup',event(1,200,240,{type:'pointerup'}));assert.equal(JSON.stringify(state().points),before);
// Calibration drag invalidates scale; shared landmarks retained when clearing opposite side.
el('offsetCanvas').emit('pointerdown',event(1,300,520,{shiftKey:true}));el('offsetCanvas').emit('pointermove',event(1,310,520));el('offsetCanvas').emit('pointerup',event(1,310,520,{type:'pointerup'}));assert.equal(el('offsetScaleConfirmed').checked,false);assert.equal(run("offsetResult('imageLeft').globalMm"),null);
// Cup scale is opt-in, no default diameter; manual marker inputs persist across source switches.
assert.equal(el('cupOuterDiameter').value,'');
c.points=[{x:0,y:0},{x:200,y:0},{x:0,y:0},{x:200,y:0},{x:100,y:40},{x:20,y:100},{x:180,y:120},{x:0,y:200},{x:100,y:200}];
el('cupOuterDiameter').value='50';el('cupOuterDiameter').emit('input');
el('offsetCalibrationSource').value='cup';el('offsetCalibrationSource').emit('change');
assert.equal(run("offsetResult('imageLeft').globalMm"),null);
el('cupCalibrationConfirmed').checked=true;el('cupCalibrationConfirmed').emit('change');
assert.equal(run("offsetResult('imageLeft').globalMm"),45);assert.equal(run('offsetScale().source'),'cup_outer_diameter_ab');
assert.equal(run('offsetScale().points.B.x'),200);
const manualState=JSON.stringify({s1:state().points.s1,s2:state().points.s2,known:el('offsetKnownLength').value});
el('offsetCalibrationSource').value='manual';el('offsetCalibrationSource').emit('change');assert.equal(run("offsetResult('imageLeft').globalMm"),null); // its confirmation was revoked above
el('offsetCalibrationSource').value='cup';el('offsetCalibrationSource').emit('change');assert.equal(run("offsetResult('imageLeft').globalMm"),45);
assert.equal(JSON.stringify({s1:state().points.s1,s2:state().points.s2,known:el('offsetKnownLength').value}),manualState);
// A/B geometry snapshot detects changes through any route, not only dragging hooks.
c.points[4].x=110;run('renderOffsetMeasurements()');assert.equal(el('cupCalibrationConfirmed').checked,true);
c.points[3].x=250;run('renderOffsetMeasurements()');assert.equal(el('cupCalibrationConfirmed').checked,false);assert.equal(run("offsetResult('imageLeft').globalMm"),null);
el('cupCalibrationConfirmed').checked=true;el('cupCalibrationConfirmed').emit('change');assert.equal(run("offsetResult('imageLeft').globalMm"),36);
el('cupOuterDiameter').value='60';el('cupOuterDiameter').emit('input');assert.equal(run("offsetResult('imageLeft').globalMm"),null);
el('cupCalibrationConfirmed').checked=true;el('cupCalibrationConfirmed').emit('change');assert.equal(run("offsetResult('imageLeft').globalMm"),43.199999999999996);
// Leg-length selector uses same cup scale; does not silently fall back to valid manual 100 px / 30 mm.
vm.runInContext(h.slice(h.indexOf('function lengthGeometry('),h.indexOf('function drawLengthOverlay(')),c);
el('knownLength').value='30';el('lengthCalibrationSource').value='manual';run('updateLengthMeasurements()');assert.equal(el('legLengthResult').textContent,'6.0 mm');
el('lengthCalibrationSource').value='cup';run('updateLengthMeasurements()');assert.equal(el('legLengthResult').textContent,'4.8 mm');
c.points[2].x=250;run('updateLengthMeasurements()');assert.equal(el('legLengthResult').textContent,'20.0 px');assert.equal(el('cupCalibrationConfirmed').checked,false);
c.points[2].x=0;el('cupCalibrationConfirmed').checked=true;el('cupCalibrationConfirmed').emit('change');
click('offsetExportJson');click('offsetExportCsv');assert.equal(downloads.length,2);
(async()=>{const json=JSON.parse(await downloads[0].blob.text());assert.equal(json.schema,'tha-ap-offset-v1');assert.equal(json.researchOnly,true);assert.equal(json.imageSize.width,800);assert.equal(json.calibration.source,'cup_outer_diameter_ab');assert.equal(json.cupCalibration.knownMm,60);assert.equal(json.cupCalibration.points.B.x,250);assert.ok(!JSON.stringify(json).includes('data:image'));const csv=await downloads[1].blob.text();assert.ok(csv.includes('imageLeft'));assert.ok(csv.includes('femoralMm'));assert.ok(csv.includes('cup_outer_diameter_ab'));assert.ok(csv.includes('calibrationWarning'));
run('resetOffsetMeasurements();resetCupCalibration();renderOffsetMeasurements()');assert.equal(el('cupOuterDiameter').value,'');assert.equal(el('cupCalibrationConfirmed').checked,false);assert.equal(el('lengthCalibrationSource').value,'manual');assert.equal(Object.keys(state().points).length,0);assert.equal(el('offsetKnownLength').value,'');assert.equal(el('offsetScaleConfirmed').checked,false);assert.equal(state().target,null);
c.imageLoaded=false;run('renderOffsetMeasurements()');assert.equal(el('offsetExportJson').disabled,true);assert.ok(el('offsetPointButtons').children.every(b=>b.disabled));
assert.match(h,/function resetPoints\(\) \{\s*if \(typeof resetOffsetMeasurements/);assert.match(h,/function redraw\(\) \{\s*if \(typeof renderOffsetMeasurements/);
console.log('PASS offset UI DOM doubles: bilateral placement/isolation, manual/cup selectors, no fallback, A/B snapshot revocation, diameter edits, length coupling, provenance, unit gating, calibration edits, zoom invariance, cancel/move/3-pointer no-add, tap/hold/Shift/slop, JSON+CSV and reset/image-unloaded guards');})();
