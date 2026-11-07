'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1100,height:1000},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));await page.click('#measureTabButton');
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#334155"/><circle cx="120" cy="200" r="40" fill="none" stroke="white"/><circle cx="680" cy="200" r="40" fill="none" stroke="white"/><path d="M160 300V500 M200 300V500 M600 300V500 M640 300V500" stroke="white"/><text x="250" y="60" fill="white" font-size="22">SYNTHETIC QA - no patient data</text></svg>');
 async function load(){await page.setInputFiles('#cameraInput',{name:'synthetic.svg',mimeType:'image/svg+xml',buffer:svg});await page.waitForFunction(()=>imageLoaded);}
 await load();await page.locator('#offsetPanel summary').first().click();
 const coords={tdLeft:[240,260],tdRight:[560,260],s1:[300,520],s2:[500,520],h1:[160,200],h2:[120,240],h3:[80,200],f1a:[160,300],f1b:[200,300],f2a:[160,500],f2b:[200,500]};
 async function place(key,xy){await page.locator(`#offsetPointButtons button[data-key="${key}"]`).click();await page.locator('#offsetCanvas').scrollIntoViewIfNeeded();const r=await page.locator('#offsetCanvas').boundingBox();await page.mouse.click(r.x+xy[0]*r.width/800,r.y+xy[1]*r.height/600);}
 for(const [k,v] of Object.entries(coords))await place(k,v);
 let result=await page.evaluate(()=>offsetResult('imageLeft'));assert.ok(Math.abs(result.femoralPx-60)<1e-6);assert.ok(Math.abs(result.acetabularPx-120)<1e-6);assert.ok(Math.abs(result.globalPx-180)<1e-6);assert.equal(result.globalMm,null);
 await page.fill('#offsetKnownLength','50');await page.check('#offsetScaleConfirmed');result=await page.evaluate(()=>offsetResult('imageLeft'));assert.ok(Math.abs(result.globalMm-45)<1e-6);
 await page.fill('#offsetKnownLength','40');assert.equal(await page.isChecked('#offsetScaleConfirmed'),false);assert.equal((await page.evaluate(()=>offsetResult('imageLeft'))).globalMm,null);
 await page.fill('#offsetKnownLength','50');await page.check('#offsetScaleConfirmed');
 const pre=await page.evaluate(()=>JSON.stringify(offsetState.points));await page.click('#offsetZoomIn');await page.click('#offsetZoomOut');assert.equal(await page.evaluate(()=>JSON.stringify(offsetState.points)),pre);
 await page.selectOption('#offsetSide','imageRight');assert.equal((await page.evaluate(()=>offsetResult('imageRight'))).globalPx,null);
 for(const [k,v] of Object.entries(coords).filter(([k])=>!['tdLeft','tdRight','s1','s2'].includes(k)))await place(k,[800-v[0],v[1]]);
 result=await page.evaluate(()=>offsetResult('imageRight'));assert.ok(Math.abs(result.globalMm-45)<1e-6);assert.ok(Math.abs((await page.evaluate(()=>offsetResult('imageLeft'))).globalMm-45)<1e-6);
 // Separate offset controls do not write existing cup points or scale.
 assert.equal(await page.evaluate(()=>points.length),0);assert.equal(await page.inputValue('#knownLength'),'');
 await page.click('#offsetClearSide');assert.equal((await page.evaluate(()=>offsetResult('imageRight'))).globalPx,null);assert.ok((await page.evaluate(()=>offsetResult('imageLeft'))).globalPx>179);
 await page.selectOption('#offsetSide','imageLeft');
 // Real pointer movement cancels a pending placement; pointercancel and multitouch are covered by DOM tests.
 await page.locator('#offsetPointButtons button[data-key="h1"]').click();
 await page.locator('#offsetCanvas').scrollIntoViewIfNeeded();const cancelBox=await page.locator('#offsetCanvas').boundingBox();await page.mouse.move(cancelBox.x+20,cancelBox.y+20);await page.mouse.down();await page.mouse.move(cancelBox.x+50,cancelBox.y+50);await page.mouse.up();
 assert.equal(await page.evaluate(()=>JSON.stringify(offsetState.points)),pre);
 await page.click('#offsetCancelPlacement');
 // Real drag tests on a point: quick tap does not move; Shift drag changes head circle.
 await page.locator('#offsetCanvas').scrollIntoViewIfNeeded();let box=await page.locator('#offsetCanvas').boundingBox();let hx=box.x+160*box.width/800,hy=box.y+200*box.height/600;
 await page.mouse.click(hx,hy);assert.equal(await page.evaluate(()=>JSON.stringify(offsetState.points)),pre);
 await page.keyboard.down('Shift');await page.mouse.move(hx,hy);await page.mouse.down();await page.mouse.move(hx+10,hy+5);await page.mouse.up();await page.keyboard.up('Shift');assert.notEqual(await page.evaluate(()=>JSON.stringify(offsetState.points)),pre);
 // Export JSON and CSV with independent methods/units, no embedded image.
 const jsonPromise=page.waitForEvent('download');await page.click('#offsetExportJson');const jsonDl=await jsonPromise;const json=JSON.parse(fs.readFileSync(await jsonDl.path(),'utf8'));assert.equal(json.schema,'tha-ap-offset-v1');assert.equal(json.coordinateSystem,'resized_image_pixels');assert.ok(!JSON.stringify(json).includes('data:image'));assert.equal(json.imageSize.width,800);
 const csvPromise=page.waitForEvent('download');await page.click('#offsetExportCsv');const csv=fs.readFileSync(await(await csvPromise).path(),'utf8');assert.ok(csv.includes('femoralMm'));assert.ok(csv.includes('imageRight'));
 await page.screenshot({path:path.resolve(__dirname,'../qa-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.locator('#offsetPanel').scrollIntoViewIfNeeded();await page.screenshot({path:path.resolve(__dirname,'../qa-mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 // Image replacement clears landmarks, scale, pending point and outputs; original reset also clears.
 await load();assert.deepEqual(await page.evaluate(()=>Object.keys(offsetState.points)),[]);assert.equal(await page.inputValue('#offsetKnownLength'),'');assert.equal(await page.isChecked('#offsetScaleConfirmed'),false);assert.equal((await page.evaluate(()=>offsetResult('imageLeft'))).globalMm,null);
 await page.evaluate(()=>{offsetState.points.tdLeft={x:1,y:1};offsetState.target='s1';});await page.click('#resetPointsButton');assert.deepEqual(await page.evaluate(()=>Object.keys(offsetState.points)),[]);assert.equal(await page.evaluate(()=>offsetState.target),null);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS browser: real point placement, bilateral isolation, px/mm gating, scale confirmation invalidation, zoom invariance, clear-side, cancellation, Shift drag, JSON/CSV downloads, 390px layout and image/reset stale-data guards');
})().catch(e=>{console.error(e);process.exit(1);});
