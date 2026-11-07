'use strict';
const assert=require('node:assert/strict');
const G=require('../offset-geometry.js');
const pair=[{x:20,y:30},{x:220,y:30}];
let r=G.cupCalibration(pair,50,true);
assert.equal(r.mmPerPx,.25);assert.equal(r.diameterPx,200);assert.equal(r.source,'cup_outer_diameter_ab');
for(const angle of [-1,-.5,0,.5,1]){
  const rotated=pair.map(p=>({x:300+p.x*Math.cos(angle)-p.y*Math.sin(angle),y:400+p.x*Math.sin(angle)+p.y*Math.cos(angle)}));
  assert.ok(Math.abs(G.cupCalibration(rotated,50,true).mmPerPx-.25)<1e-10);
}
assert.equal(G.cupCalibration(pair,50,false).mmPerPx,null);
for(const diameter of [0,-50,NaN,Infinity,-Infinity,1001])assert.equal(G.cupCalibration(pair,diameter,true).mmPerPx,null);
for(const invalid of [[],[pair[0]], [pair[0],pair[0]], [{x:NaN,y:0},pair[1]], [{x:Infinity,y:0},pair[1]], [{x:-1e308,y:0},{x:1e308,y:0}]])assert.equal(G.cupCalibration(invalid,50,true).mmPerPx,null);
assert.equal(G.cupCalibration([{x:0,y:0},{x:400,y:0}],50,true).mmPerPx,.125);
assert.equal(G.cupCalibration(pair,60,true).mmPerPx,.3);
console.log('PASS cup calibration: confirmed D/AB, rotation invariance without cosine correction, scaled coordinates, changed diameter, invalid/duplicate/missing/nonfinite points, no default or unconfirmed scale');
