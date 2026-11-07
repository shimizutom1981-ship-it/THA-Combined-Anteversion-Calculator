'use strict';
const assert=require('node:assert/strict'),G=require('../psti-photo-geometry.js');
const p={tdLeft:{x:200,y:200},tdRight:{x:600,y:200},ischiumLeft:{x:200,y:450},ischiumRight:{x:600,y:450},pubicSuperior:{x:400,y:350}};
assert.equal(G.measure(p).pstiPx,100);assert.equal(G.measure(p).pstiMm,null);assert.equal(G.measure(p,.25).pstiMm,25);
for(const angle of [-.3,0,.3])for(const scale of [.5,1,2]){const c=Math.cos(angle),s=Math.sin(angle),q=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,{x:scale*(v.x*c-v.y*s)+100,y:scale*(v.x*s+v.y*c)+100}]));assert.ok(Math.abs(G.measure(q,.25/scale).pstiMm-25)<1e-10);}
assert.equal(G.measure({...p,pubicSuperior:{x:400,y:450}}).pstiPx,0);
assert.equal(G.measure({...p,pubicSuperior:{x:400,y:500}}).pstiPx,-50);
for(const k of Object.keys(p)){let q={...p};delete q[k];assert.equal(G.measure(q).pstiPx,null);q={...p,[k]:{x:NaN,y:2}};assert.equal(G.measure(q).pstiPx,null);}
for(const q of [{...p,tdRight:p.tdLeft},{...p,ischiumRight:p.ischiumLeft},{...p,ischiumLeft:{x:200,y:100}},{...p,tdLeft:p.tdRight,tdRight:p.tdLeft}])assert.equal(G.measure(q).pstiPx,null);
assert.equal(G.measure({...p,pubicSuperior:undefined,pubic:p.pubicSuperior}).valid,false,'legacy unspecified pubic point is not reinterpreted');
assert.equal(G.measure(p,0).pstiMm,null);assert.equal(G.measure(p,NaN).pstiMm,null);
console.log('PASS PSTI photo geometry: reference, calibration, 9 transforms, signed/zero distance, missing/nonfinite/reversed/short baselines, legacy isolation');
