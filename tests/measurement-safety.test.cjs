const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const h=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const extract=(start,end)=>h.slice(h.indexOf(start),h.indexOf(end,h.indexOf(start)));
const ctx=vm.createContext({points:[],measuredIncDisp:{},measuredAnteDisp:{},measurementInfo:{}});
vm.runInContext(extract('function getCupGeometry()','function handlePointerDown(')+extract('function calculateMeasuredAngles()','let currentSide ='),ctx);
const calc=pts=>{ctx.points=pts.map(([x,y])=>({x,y}));ctx.calculateMeasuredAngles();return [ctx.measuredIncDisp.textContent,ctx.measuredAnteDisp.textContent,ctx.measurementInfo.textContent];};
assert.deepEqual(calc([[0,0],[100,0],[0,0],[100,0],[50,25]]).slice(0,2),['0.0','30.0']);
for(const pts of [ [[0,0],[100,0],[0,0],[100,0],[50,100]], [[0,0],[0,0],[0,0],[100,100],[25,75]], [[0,0],[100,0],[0,0],[0,0],[25,75]], [[0,0],[100,0],[0,0],[100,0],[NaN,25]] ]) {
 const r=calc(pts);assert.deepEqual(r.slice(0,2),['--','--']);assert.match(r[2],/計測エラー/);
}
assert.equal(calc([[0,0],[100,0],[0,0],[100,0],[50,50]])[1],'90.0');
assert.match(calc([[0,0],[100,0],[0,0],[100,0],[80,20]])[2],/Cが短軸線からずれ/);
assert.ok(!/maximum-scale|user-scalable=no/.test(h));
// Real reset and load callbacks with image/DOM doubles: no patient images or network.
const images=[],revoked=[];let change;
Object.assign(ctx,{measurementPointLimit:9,lastLoupeIndex:8,draggingIdx:8,activePointers:new Map([[1,{}]]),updateGuide(){},redraw(){},resetZoom(){},initializeCanvas(){},setupCanvasFromImage(){},imageLoaded:true,img:{},imageLoadGeneration:0,currentObjectURL:null,
 fileInput:{value:'old',addEventListener(name,fn){change=fn;}},URL:{createObjectURL:()=>`blob:${images.length}`,revokeObjectURL:u=>revoked.push(u)},Image:function(){images.push(this);}});
vm.runInContext(extract('function resetPoints()','document\n  .getElementById("resetPointsButton")'),ctx);
vm.runInContext(extract('fileInput.addEventListener("change"','/* =========================================================\n   Canvas画像サイズ'),ctx);
change({target:{files:[{}]}});assert.equal(ctx.imageLoaded,false);assert.equal(ctx.points.length,0);assert.equal(ctx.measuredAnteDisp.textContent,'--');assert.equal(ctx.activePointers.size,0);assert.equal(ctx.measurementPointLimit,5);assert.equal(ctx.lastLoupeIndex,-1);
images[0].onerror();assert.equal(ctx.img,null);assert.match(ctx.measurementInfo.textContent,/画像を読み込めません/);assert.equal(ctx.currentObjectURL,null);assert.equal(ctx.fileInput.value,'');
change({target:{files:[{}]}});change({target:{files:[{}]}});images[1].onload();assert.equal(ctx.imageLoaded,false);images[2].onload();assert.equal(ctx.imageLoaded,true);assert.equal(ctx.img,images[2]);images[1].onerror();assert.equal(ctx.img,images[2]);
assert.ok(revoked.length>=3);
// Preserve one uniform display scale for portrait, landscape, square and rotated viewports.
Object.assign(ctx,{window:{innerHeight:800},canvas:{parentElement:{clientWidth:360},width:1800,height:900,style:{}}});
vm.runInContext(extract('function fitPhotoCanvas()','function setupCanvasFromImage()'),ctx);
for(const [w,ht,vw,vh] of [[1800,900,360,800],[900,1800,360,800],[900,900,360,800],[900,1800,800,360]]){
 Object.assign(ctx.canvas,{width:w,height:ht});ctx.canvas.parentElement.clientWidth=vw;ctx.window.innerHeight=vh;ctx.fitPhotoCanvas();assert.ok(Math.abs(parseFloat(ctx.canvas.style.width)/parseFloat(ctx.canvas.style.height)-w/ht)<1e-12);
}
console.log('PASS measurement safety: valid/invalid geometry, C warning, zoom accessibility, image failure/reset/stale callbacks, four aspect-ratio cases');
