'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));await page.click('#measureTabButton');
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#334155"/><path d="M200 200H400 M300 300L460 420 M350 400L410 320" stroke="white"/><text x="20" y="40" fill="white">SYNTHETIC - no patient data</text></svg>');
 await page.setInputFiles('#cameraInput',{name:'synthetic.svg',mimeType:'image/svg+xml',buffer:svg});await page.waitForFunction(()=>imageLoaded);
 for(const width of [1100,390]){
 await page.setViewportSize({width,height:844});
 for(const zoom of [1,2,4])for(const length of [100,0,.5,1.999,2,2.001,100]){
 const r=await page.evaluate(({length,zoom})=>{
 scale=zoom;points=[[200,200],[200+length,200],[300,300],[460,420],[350,400],[100,400],[100,430],[0,0],[100,0]].map(([x,y])=>({x,y}));
 document.getElementById('knownLength').value='20';calculateMeasuredAngles();redraw();
 return [measuredIncDisp.textContent,measuredAnteDisp.textContent,document.getElementById('legLengthResult').textContent];
 },{length,zoom});
 assert.deepEqual(r,length<2?['--','--','--']:['36.9','30.0','6.0 mm']);
 }
 }
 assert.deepEqual(errors,[]);console.log('PASS synthetic-image browser: boundary, recovery, 2 viewports and 3 zoom levels');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
