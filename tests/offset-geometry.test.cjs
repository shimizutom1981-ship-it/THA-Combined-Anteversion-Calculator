'use strict';
const assert=require('node:assert/strict');
const G=require('../offset-geometry.js');
const p=(x,y)=>({x,y}),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const fixture=()=>({head:[p(15,80),p(10,85),p(5,80)],shaft:[p(20,110),p(30,110),p(20,150),p(30,150)],teardrops:[p(40,100),p(160,100)],side:'imageLeft',scale:.25});
let f=fixture(),r=G.measure(f);near(r.center.x,10);near(r.center.y,80);near(r.radius,5);
for(const [key,value] of Object.entries({femoralPx:15,acetabularPx:30,globalPx:45,femoralMm:3.75,acetabularMm:7.5,globalMm:11.25}))near(r[key],value);
const transform=(f,fn)=>({...f,head:f.head.map(fn),shaft:f.shaft.map(fn),teardrops:f.teardrops.map(fn)});
const mirrored=transform(f,q=>p(200-q.x,q.y));mirrored.teardrops.reverse();mirrored.side='imageRight';near(G.measure(mirrored).globalPx,45);
for(const angle of [-.5,-.3,0,.3,.5])for(const zoom of [.5,1,2,5]){
  const trans=q=>p(1000+zoom*(q.x*Math.cos(angle)-q.y*Math.sin(angle)),400+zoom*(q.x*Math.sin(angle)+q.y*Math.cos(angle)));
  const transformed=transform(f,trans);transformed.scale=.25/zoom;r=G.measure(transformed);near(r.globalPx,45*zoom);near(r.globalMm,11.25);
}
f=fixture();f.shaft=[...f.shaft.slice(2),...f.shaft.slice(0,2)];near(G.measure(f).femoralPx,15);
f=fixture();f.head=f.head.map(q=>p(q.x+40,q.y));r=G.measure(f);assert.equal(r.acetabularPx,null);assert.equal(r.globalPx,null);near(r.femoralPx,25);
f=fixture();f.teardrops.reverse();r=G.measure(f);assert.equal(r.acetabularPx,null);near(r.femoralPx,15);
f=fixture();f.teardrops=[];r=G.measure(f);near(r.femoralPx,15);assert.equal(r.globalPx,null);
f=fixture();f.shaft=[];r=G.measure(f);near(r.acetabularPx,30);assert.equal(r.globalPx,null);
for(const head of [[],[p(1,1),p(1,1),p(2,2)],[p(1,1),p(2,2),p(3,3)],[p(0,0),p(100,0),p(50,.001)],[p(NaN,0),p(10,0),p(0,10)],[p(Infinity,0),p(10,0),p(0,10)]]){
  f=fixture();f.head=head;r=G.measure(f);assert.equal(r.femoralPx,null);assert.equal(r.globalPx,null);
}
for(const shaft of [[p(0,0),p(0,0),p(10,0),p(20,0)],[p(0,0),p(10,0),p(0,0),p(10,0)],[p(NaN,0),p(10,0),p(0,10),p(10,10)],[p(-1e308,0),p(1e308,0),p(0,1e308),p(1,1e308)]]){
  f=fixture();f.shaft=shaft;r=G.measure(f);assert.equal(r.femoralPx,null);assert.equal(r.globalPx,null);
}
for(const mm of [NaN,Infinity,0,-1,1001])assert.equal(G.calibration([p(0,0),p(100,0)],mm,true).mmPerPx,null);
assert.equal(G.calibration([p(0,0),p(100,0)],25,false).mmPerPx,null);
assert.equal(G.calibration([p(0,0),p(0,0)],25,true).mmPerPx,null);
near(G.calibration([p(0,0),p(100,0)],25,true).mmPerPx,.25);
f=fixture();f.scale=null;r=G.measure(f);near(r.globalPx,45);assert.equal(r.globalMm,null);
f=fixture();f.head=[p(45,80),p(40,85),p(35,80)];r=G.measure(f);near(r.acetabularPx,0);near(r.globalPx,15);
console.log('PASS offsets: reference/mirror, 20 rotation/scale transforms, independent FO/AO availability, invalid/missing geometry, calibration, degenerate arcs, shaft level order and zero AO');
