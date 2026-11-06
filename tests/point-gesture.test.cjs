const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
function extract(name){const start=html.indexOf('function '+name+'(');assert.ok(start>=0, name+' missing');let i=html.indexOf('{',start)+1,depth=1;for(;depth;i++){if(html[i]==='{')depth++;if(html[i]==='}')depth--;}return html.slice(start,i);}
let timer=null;
const c=vm.createContext({points:[{x:100,y:100}],draggingIdx:-1,lastLoupeIndex:-1,pendingPointDrag:null,pointDragTimer:null,pointDragOffset:{x:0,y:0},POINT_HOLD_MS:450,activePointers:new Map(),imageLoaded:true,measurementPointLimit:5,scale:1,panX:0,panY:0,canvas:{width:800,height:600,getBoundingClientRect:()=>({width:400,height:300}),setPointerCapture(){},hasPointerCapture:()=>false},redraw(){},calculateMeasuredAngles(){},updateGuide(){},screenToImageCoords:(x,y)=>({x,y}),clientToCanvasCoords:(x,y)=>({x,y}),setTimeout(fn,ms){assert.equal(ms,450);timer=fn;return 1;},clearTimeout(){timer=null;},getPointerDistance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),getPointerMidpoint:(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2}),pinchStartDistance:0});
for(const n of ['cancelPendingPointDrag','startPointDrag','armPointDrag','checkPendingPointDrag','handlePointerDown','handlePointerMove','handlePointerEnd'])vm.runInContext(extract(n),c);
const e=(x,y,extra={})=>({pointerId:1,clientX:x,clientY:y,button:0,preventDefault(){},...extra});
function reset(){c.cancelPendingPointDrag();c.activePointers.clear();c.points=[{x:100,y:100}];c.draggingIdx=-1;}
c.handlePointerDown(e(108,100));c.handlePointerMove(e(110,100));assert.equal(c.points[0].x,100);c.handlePointerEnd(e(110,100));assert.equal(timer,null);
reset();c.handlePointerDown(e(108,100));timer();assert.equal(c.draggingIdx,0);assert.equal(c.points[0].x,100);c.handlePointerMove(e(128,120));assert.equal(c.points[0].x,120);assert.equal(c.points[0].y,120);c.handlePointerEnd(e(128,120));
reset();c.handlePointerDown(e(108,100,{shiftKey:true}));assert.equal(timer,null);c.handlePointerMove(e(128,120,{shiftKey:true}));assert.equal(c.points[0].x,120);c.handlePointerEnd(e(128,120));
reset();c.handlePointerDown(e(100,100));c.handlePointerMove(e(120,100));assert.equal(timer,null);assert.equal(c.draggingIdx,-1);assert.equal(c.points[0].x,100);c.handlePointerEnd(e(120,100));
reset();c.handlePointerDown(e(100,100));c.handlePointerDown(e(300,300,{pointerId:2}));assert.equal(timer,null);assert.equal(c.draggingIdx,-1);c.handlePointerEnd(e(100,100));c.handlePointerEnd(e(300,300,{pointerId:2}));
reset();c.handlePointerDown(e(400,400,{shiftKey:true}));assert.equal(c.points.length,1);c.handlePointerEnd(e(400,400));c.handlePointerDown(e(400,400));assert.equal(c.points.length,2);c.handlePointerEnd(e(400,400));
reset();c.handlePointerDown(e(100,100));c.handlePointerEnd(e(100,100,{type:'pointercancel'}));assert.equal(timer,null);
console.log('PASS: tap lock, hold activation, Shift drag, grab offset, hold slop, pinch cancellation, Shift-empty no add, normal add, cancellation');
