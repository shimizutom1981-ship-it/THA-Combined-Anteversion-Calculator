'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const h=fs.readFileSync(process.argv[2]||require('node:path').join(__dirname,'../index.html'),'utf8');
const extract=(a,b)=>h.slice(h.indexOf(a),h.indexOf(b,h.indexOf(a)));
const c=vm.createContext({points:[],measuredIncDisp:{},measuredAnteDisp:{},measurementInfo:{}});
if(h.includes('function hasUsableReference('))vm.runInContext(extract('function hasUsableReference(','function calculateMeasuredAngles('),c);
vm.runInContext(extract('function getCupGeometry()','function handlePointerDown(')+extract('function calculateMeasuredAngles()','let currentSide =')+extract('function lengthGeometry(','function updateLengthMeasurements('),c);
for(const length of [0,1e-9,.5,1,1.999999,2,2.000001,100]){
 for(const angle of [0,.3,Math.PI/2,Math.PI]){
 c.points=[[200,200],[200+length*Math.cos(angle),200+length*Math.sin(angle)],[300,300],[460,420],[350,400],[100,400],[100,430],[0,0],[100,0]].map(([x,y])=>({x,y}));
 // Compare actual represented distance to avoid floating-point boundary rounding.
 const valid=Math.hypot(c.points[1].x-200,c.points[1].y-200)>=2;
 c.calculateMeasuredAngles();const r=c.lengthGeometry(c.points,20);
 assert.equal(c.measuredIncDisp.textContent==='--',!valid,`length=${length}`);
 assert.equal(c.measuredAnteDisp.textContent==='--',!valid);
 assert.equal(r.obliquity===null,!valid);assert.equal(r.differencePx===null,!valid);
 if(!valid)assert.match(c.measurementInfo.textContent,/近すぎ|重複|重なって/);
 }
}
c.points[1]={x:400,y:200};c.calculateMeasuredAngles();assert.equal(c.measuredIncDisp.textContent,'36.9');assert.equal(c.measuredAnteDisp.textContent,'30.0');assert.equal(c.lengthGeometry(c.points,20).differenceMm,6);
for(const x of [NaN,Infinity,-Infinity]){c.points[1]={x,y:200};c.calculateMeasuredAngles();assert.equal(c.measuredIncDisp.textContent,'--');assert.equal(c.lengthGeometry(c.points,20).obliquity,null);}
console.log('PASS short reference: 32 boundary/orientation cases, invalidation/recovery, known synthetic RI/RA/length, nonfinite reference');
