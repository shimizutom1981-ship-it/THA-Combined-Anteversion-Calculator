const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
let checks=0;
function test(name,fn){fn(); checks++; console.log('PASS '+name);}
function load(file){
 const html=fs.readFileSync(file,'utf8'), elements={};
 const context2d=new Proxy({}, {get:(target,key)=>target[key] || (()=>{}), set:(t,k,v)=>(t[k]=v,true)});
 for(const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){
  const tag=match[0], classes=new Set((tag.match(/class="([^"]*)"/)?.[1]||'').split(/\s+/));
  elements[match[1]]={value:tag.match(/value="([^"]*)"/)?.[1]||'',textContent:'',innerHTML:'',attrs:{},events:{},width:540,height:360,
   classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,b)=>b?classes.add(c):classes.delete(c)},
   addEventListener(name,fn){(this.events[name] ||= []).push(fn)},dispatchEvent(event){this.events[event.type]?.forEach(fn=>fn(event))},setAttribute(k,v){this.attrs[k]=String(v)},getContext:()=>context2d,focus(){},
   getBoundingClientRect:()=>({left:0,top:0,width:540,height:360})};
 }
 const downloads=[];
 const sandbox={document:{getElementById:id=>{assert.ok(elements[id],id);return elements[id]},createElement:()=>({click(){downloads.push(this.download)}})},Image:class{},window:{addEventListener(){}},URL:{createObjectURL(blob){sandbox.lastBlob=blob;return 'blob:mock'},revokeObjectURL(){}},Blob,Event,setTimeout:fn=>fn(),console};
 vm.createContext(sandbox);
 for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(script[1],sandbox);
 return {html,e:elements,sandbox,downloads,run:code=>vm.runInContext(code,sandbox),fire:(id,name)=>elements[id].events[name]?.map(fn=>fn({}))};
}
const before=load('baseline.html'), after=load('index.html');
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
const calculate=values=>after.run(`calculatePsti(${JSON.stringify(values)})`);
test('source: all original script except tab router remains identical',()=>{
 const strip=s=>s.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/function switchTab\(tabName\) \{[\s\S]*?\nmeasureTabButton.addEventListener/,'TAB_ROUTER');
 assert.equal(strip(before.html),strip(after.html));
});
test('10 mm gives +6.2 degrees',()=>close(calculate([50,50,50,60,60,60]).estimate,6.2));
test('0 mm gives -1.2 degrees',()=>close(calculate([50,50,50,50,50,50]).estimate,-1.2));
test('negative difference preserved',()=>close(calculate([60,60,60,50,50,50]).estimate,-8.6));
test('decimal means, no intermediate rounding',()=>{const r=calculate(['50.1','50.2','50.4','60.2','60.3','60.6']);close(r.supine,150.7/3);close(r.difference,30.4/3);close(r.estimate,.74*30.4/3-1.2)});
for(const bad of ['', ' ', 'abc','12mm','1,2','NaN','Infinity','-1','-0','1e2','0x10','１２','9'.repeat(310),'0.'+'0'.repeat(330)+'1'])test('reject '+JSON.stringify(bad).slice(0,45),()=>assert.equal(calculate([bad,50,50,60,60,60]).valid,false));
test('explicit zero accepted',()=>assert.equal(calculate([0,0,0,0,0,0]).valid,true));
test('leading/trailing whitespace and decimal formats',()=>{assert.equal(calculate([' 50.5 ','.5','50.',60,60,60]).valid,true)});
for(const [d,expected] of [[-8.5,false],[27.9,false],[-8.50001,true],[27.90001,true]])test('extrapolation boundary '+d,()=>assert.equal(calculate([10,10,10,10+d,10+d,10+d]).extrapolated,expected));
test('tiny negative values never displayed as zero',()=>assert.match(after.run('formatPsti(-0.00001,true)'),/^−1.00e-5$/));
const ids=['supine','standing'].flatMap(p=>[1,2,3].map(i=>`psti-${p}-${i}`));
function input(values){ids.forEach((id,i)=>after.e[id].value=String(values[i]));after.fire(ids[0],'input')}
test('initial incomplete input has no estimate',()=>assert.equal(after.e['psti-estimate'].textContent,'—'));
test('research input updates outputs and direction',()=>{input([50,50,50,60,60,60]);assert.equal(after.e['psti-estimate'].textContent,'+6.20');assert.match(after.e['psti-direction'].textContent,/後傾/)});
test('clearing one value removes stale estimate and warning',()=>{input([50,50,50,100,100,100]);assert.equal(after.e['psti-warning'].hidden,false);input(['',50,50,100,100,100]);assert.equal(after.e['psti-estimate'].textContent,'—');assert.equal(after.e['psti-warning'].hidden,true)});
test('invalid field identified',()=>{input(['abc',50,50,60,60,60]);assert.equal(after.e[ids[0]].attrs['aria-invalid'],'true');assert.match(after.e['psti-status'].textContent,/入力エラー/)});
test('research has no transfer to simulator',()=>{const old=['deltaPT','stemAnte','cupInc','targetCupAnte','apparentInc'].map(id=>[after.e[id].value,after.e[id].textContent]);input([0,0,0,99,99,99]);after.fire('psti-reset','click');assert.deepEqual(['deltaPT','stemAnte','cupInc','targetCupAnte','apparentInc'].map(id=>[after.e[id].value,after.e[id].textContent]),old);assert.ok(ids.every(id=>after.e[id].value===''))});
test('three tabs mutually exclusive through click handlers',()=>{for(const name of ['research','measure','simulate','research','simulate']){after.fire(name+'TabButton','click');for(const other of ['research','measure','simulate']){assert.equal(after.e['tab-'+other].classList.contains('active'),other===name);assert.equal(after.e[other+'TabButton'].classList.contains('active'),other===name)}}});
test('simulator baseline regression: 120 combinations including negative, zero, invalid, both sides',()=>{
 for(const stem of [0,15,40,''])for(const pt of [-20,0,10,60,'bad'])for(const inc of [0,40,90])for(const side of ['right','left']){
  for(const app of [before,after]){app.e.stemAnte.value=String(stem);app.e.deltaPT.value=String(pt);app.e.cupInc.value=String(inc);app.run(`setSide('${side}')`)}
  for(const id of ['targetCupAnte','apparentInc','ellipseParams','viewSideLabel'])assert.equal(after.e[id].textContent,before.e[id].textContent);
  for(const id of ['cupEllipse','cupDome','majorAxisLine'])assert.deepEqual(after.e[id].attrs,before.e[id].attrs);
 }
});
test('photo geometry baseline regression: five-point cases, reset, zoom',()=>{
 const cases=[[{x:0,y:0},{x:100,y:0},{x:10,y:10},{x:110,y:10},{x:70,y:35}], [{x:0,y:0},{x:100,y:20},{x:0,y:0},{x:100,y:100},{x:35,y:65}], [{x:0,y:0},{x:100,y:0},{x:20,y:20},{x:20,y:20},{x:30,y:30}]];
 for(const points of cases){for(const app of [before,after])app.run(`points=${JSON.stringify(points)};calculateMeasuredAngles();`);for(const id of ['measuredInc','measuredAnte','measurementInfo'])assert.equal(after.e[id].textContent,before.e[id].textContent)}
 for(const app of [before,after])app.run('resetPoints();adjustZoom(1.5);resetZoom();');
 for(const id of ['measuredInc','measuredAnte','guideText','zoomLevel'])assert.equal(after.e[id].textContent,before.e[id].textContent);
});
for(const [raw,value] of [['15',15],['15.25',15.25],['-2.5',-2.5],['0',0],['',null],['+5',5]])test('visual estimate '+JSON.stringify(raw),()=>assert.equal(after.run(`parseVisual(${JSON.stringify(raw)}).value`),value));
test('invalid visual estimate blocks saving',()=>{for(const v of ['NaN','10deg','Infinity','1e2'])assert.throws(()=>after.run(`createPstiRecord(['50','50','50','60','60','60'],${JSON.stringify(v)},null)`))});
test('record roundtrip preserves raw decimal/negative/zero/missing and dates',()=>{
 for(const visual of ['15','15.25','-2.5','0',''])for(const missing of [false,true]){
  const raw=[missing?'':'50.10','50.2','50.4','60.2','60.3','60.6'];
  const record=after.run(`createPstiRecord(${JSON.stringify(raw)},${JSON.stringify(visual)},'2026-10-16T10:04:00.000Z','2026-10-16T10:05:00.000Z')`);
  const restored=after.run(`readPstiRecord(${JSON.stringify(JSON.stringify(record))})`);
  assert.equal(JSON.stringify(restored),JSON.stringify(record));assert.equal(record.visualEstimateDeg,visual===''?null:Number(visual));
  assert.equal(record.estimatedMinusVisualDeg===null,missing||visual==='');
  if(!missing&&visual!=='')close(record.estimatedMinusVisualDeg,record.estimatedDeltaPtDeg-Number(visual));
  if(missing)assert.equal(record.supineMeasurementsMm[0],null);
 }
});
test('CSV has units, formula, timestamps, missing blank and signed comparison',()=>{
 const csv=after.run(`pstiCsv(createPstiRecord(['50','50','50','60','60','60'],'15','2026-10-16T10:04:00Z'))`);
 assert.match(csv,/estimated_minus_visual_deg/);assert.match(csv,/"-8.8"/);assert.match(csv,/distance_unit/);assert.match(csv,/2026-10-16T10:04:00Z/);assert.match(csv,/0.74/);
 const missing=after.run(`pstiCsv(createPstiRecord(['','','','','',''],'',null))`);assert.ok(missing.includes(',"","",""'));
});
test('record import rejects wrong schema or malformed values',()=>{for(const text of ['{}','null','{broken'])assert.throws(()=>after.run(`readPstiRecord(${JSON.stringify(text)})`))});
async function integration(){
 input(['50.1','50.2','50.3','60.1','60.2','60.3']);after.e['psti-visual'].value='15';after.fire('psti-visual','input');
 const timestamp=after.e['psti-input-time'].textContent;
 assert.equal(after.e['psti-comparison'].textContent,'−8.80');
 after.fire('psti-save-json','click');const saved=await after.sandbox.lastBlob.text();assert.equal(JSON.parse(saved).inputAt,timestamp);assert.match(after.downloads.at(-1),/\.json$/);
 after.fire('psti-save-csv','click');assert.match(await after.sandbox.lastBlob.text(),/visual_estimate_deg/);assert.match(after.downloads.at(-1),/\.csv$/);
 after.fire('psti-reset','click');after.e['psti-load-json'].files=[{size:saved.length,text:async()=>saved}];
 await Promise.all(after.fire('psti-load-json','change'));
 assert.equal(after.e['psti-visual'].value,'15');assert.equal(after.e[ids[0]].value,'50.1');assert.equal(after.e['psti-input-time'].textContent,timestamp);assert.equal(after.e['psti-comparison'].textContent,'−8.80');
 assert.match(after.e['psti-save-status'].textContent,/再読込しました/);
 checks++;console.log('PASS JSON/CSV download handlers and JSON import UI roundtrip (mock DOM/Blob)');
 console.log(`${checks} test groups passed; simulator 120 cases; photo 3 fixtures. Browser UI not covered by this DOM stub.`);
}
integration().catch(error=>{console.error(error);process.exitCode=1});
