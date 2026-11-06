const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||require('node:path').join(__dirname,'../index.html'),'utf8');
function extract(name){const start=html.indexOf('function '+name+'(');assert.ok(start>=0);const brace=html.indexOf('{',start);let depth=1,i=brace+1;for(;depth;i++){if(html[i]==='{')depth++;if(html[i]==='}')depth--;}return html.slice(start,i);}
const c=vm.createContext({points:[],measuredIncDisp:{},measuredAnteDisp:{},measurementInfo:{}});
for(const name of ['getCupGeometry','calculateMeasuredAngles','lengthGeometry','parsePsti','calculatePsti'])vm.runInContext(extract(name),c);
const fixture=()=>[[80,100],[680,100],[200,350],[440,170],[365,320],[120,460],[600,490],[520,360],[680,360]].map(([x,y])=>({x,y}));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
c.points=fixture();c.calculateMeasuredAngles();assert.equal(c.measuredIncDisp.textContent,'36.9');assert.equal(c.measuredAnteDisp.textContent,'30.0');
let r=c.lengthGeometry(c.points,32);near(r.differencePx,30);near(r.differenceMm,6);near(r.mmPerPx,.2);
near(c.lengthGeometry(c.points,64).differenceMm,12);
assert.equal(c.lengthGeometry(c.points.slice(0,8),32).differenceMm,null);
c.points[1].y=220;c.calculateMeasuredAngles();assert.equal(c.measuredIncDisp.textContent,'48.2');assert.equal(c.measuredAnteDisp.textContent,'30.0');
r=c.lengthGeometry(c.points,32);near(r.obliquity,Math.atan(.2)*180/Math.PI);near(r.differenceMm,-13.2/Math.sqrt(1.04));
for(const separation of [0,.5,1.9]){c.points=fixture();c.points[1]={x:80+separation,y:100};c.calculateMeasuredAngles();assert.equal(c.measuredIncDisp.textContent,'--','undefined reference must not yield RI');assert.equal(c.measuredAnteDisp.textContent,'--');assert.match(c.measurementInfo.textContent,/基準線/);assert.equal(c.lengthGeometry(c.points,32).obliquity,null);}
c.points=fixture();c.calculateMeasuredAngles();assert.equal(c.measuredIncDisp.textContent,'36.9');assert.doesNotMatch(c.measurementInfo.textContent,/近すぎ/);
near(c.calculatePsti(['20','','','30','',''],'single').estimate,6.2);
near(c.calculatePsti(['20','22','24','30','32','34'],'triple').estimate,6.2);
assert.equal(c.calculatePsti(['20','','24','30','32','34'],'triple').valid,false);
assert.equal(c.calculatePsti(['-1','','','30','',''],'single').valid,false);
console.log('PASS: known RI/RA, lengths, calibration, obliquity, degenerate reference and recovery, PSTI regression');
