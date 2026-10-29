const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
const code = html.slice(html.indexOf('function cupAxisFromRadiographic'),html.indexOf('function updateSim()'));
const context = vm.createContext({});vm.runInContext(code,context);
const near = (a,b,tol=1e-10) => assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const example = context.calculateMidpointCup(20,10,40);
near(example.supine.ra,19.433957988696044);near(example.supine.ri,38.758108799838766);
near(example.legacyRA,18.3);
// Independent Rodrigues rotation: a physical posterior rotation about (-x).
function rodrigues(v,t){const c=Math.cos(t),s=Math.sin(t),k=[-1,0,0];const dot=-v[0];
 const cross=[0,v[2],-v[1]];return v.map((n,j)=>n*c+cross[j]*s+k[j]*dot*(1-c));}
let count=0;
for(const stem of [0,10,20,30,40,60]) for(const delta of [-30,-10,0,5,10,20,30]) for(const inc of [30,35,40,45,55]){
 const r=context.calculateMidpointCup(stem,delta,inc),a=r.supine.ra*Math.PI/180,i=r.supine.ri*Math.PI/180;
 const v=[Math.cos(a)*Math.sin(i),Math.sin(a),Math.cos(a)*Math.cos(i)];
 const m=rodrigues(v,delta/2*Math.PI/180);
 near(Math.asin(m[1])*180/Math.PI,37.3-.7*stem);near(Math.atan2(m[0],m[2])*180/Math.PI,inc);
 near(Math.hypot(...r.supineAxis),1);count++;
}
const zero=context.calculateMidpointCup(20,0,40);near(zero.supine.ra,23.3);near(zero.supine.ri,40);
assert.ok(context.calculateMidpointCup(20,-10,40).supine.ra>23.3);
assert.ok(context.calculateMidpointCup(60,0,40).supine.ra<0);
for(const args of [[NaN,10,40],[20,Infinity,40],[20,10,0],[20,10,90],[20,180,40]]) assert.throws(()=>context.calculateMidpointCup(...args));
// Execute the actual UI update with minimal element doubles, including blank handling and SVG.
function element(value=''){return {value,textContent:'',style:{},attrs:{},setAttribute(k,v){this.attrs[k]=v;}};}
const nodes=Object.fromEntries(['geometry-status','geometry-comparison','geometry-roundtrip','fluoroSvg'].map(k=>[k,element()]));
Object.assign(context,{document:{getElementById:k=>nodes[k]},stemInput:element('20'),ptInput:element('10'),incInput:element('40'),targetCupAnteDisp:element(),apparentIncDisp:element(),ellipseParamsDisp:element(),cupEllipse:element(),majorAxisLine:element(),cupDome:element(),currentSide:'right'});
vm.runInContext(html.slice(html.indexOf('function updateSim()'),html.indexOf('\nstemInput.addEventListener',html.indexOf('function updateSim()'))),context);
context.updateSim();assert.equal(context.targetCupAnteDisp.textContent,'19.43');assert.equal(context.apparentIncDisp.textContent,'38.76');
assert.equal(context.cupEllipse.attrs.transform,'rotate(38.758108799838766)');
context.currentSide='left';context.updateSim();assert.equal(context.cupEllipse.attrs.transform,'rotate(-38.758108799838766)');
context.stemInput.value='';context.updateSim();assert.equal(context.targetCupAnteDisp.textContent,'—');assert.equal(nodes.fluoroSvg.style.visibility,'hidden');
context.stemInput.value='60';context.ptInput.value='0';context.updateSim();assert.ok(context.cupEllipse.attrs.ry>0);assert.match(nodes['geometry-status'].textContent,/後捻/);
console.log(`PASS: syntax, ${count} independent 3D round-trips, identity, signed PT/RA, validation, UI and left/right projection`);
