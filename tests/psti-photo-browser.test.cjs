'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1100,height:1000},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.resolve(__dirname,'../index.html'));await page.click('#measureTabButton');
const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#334155"/><path d="M200 200H600 M200 450H600 M400 350V450" stroke="white"/><text x="100" y="80" fill="white">SYNTHETIC QA - no patient data</text></svg>');
async function load(){await page.setInputFiles('#cameraInput',{name:'psti.svg',mimeType:'image/svg+xml',buffer:svg});await page.waitForFunction(()=>imageLoaded);}
await load();await page.locator('#pstiPhotoPanel summary').click();
async function place(key,xy){await page.locator(`#pstiPhotoPointButtons button[data-key="${key}"]`).click();await page.locator('#pstiPhotoCanvas').scrollIntoViewIfNeeded();const b=await page.locator('#pstiPhotoCanvas').boundingBox();await page.mouse.click(b.x+xy[0]*b.width/800,b.y+xy[1]*b.height/600);}
for(const [k,v] of Object.entries({tdLeft:[200,200],tdRight:[600,200],ischiumLeft:[200,450],ischiumRight:[600,450],pubicSuperior:[400,350],s1:[300,520],s2:[500,520]}))await place(k,v);
const result=()=>page.evaluate(()=>pstiPhotoResult());assert.ok(Math.abs((await result()).pstiPx-100)<1e-6);assert.equal((await result()).pstiMm,null);
await page.fill('#pstiPhotoKnownLength','50');await page.check('#pstiPhotoScaleConfirmed');assert.ok(Math.abs((await result()).pstiMm-25)<1e-6);
await page.fill('#pstiPhotoKnownLength','60');assert.equal((await result()).pstiMm,null);assert.equal(await page.isChecked('#pstiPhotoScaleConfirmed'),false);
await page.fill('#pstiPhotoKnownLength','50');await page.check('#pstiPhotoScaleConfirmed');
// Degenerate baseline cancels result; valid replacement recovers.
await place('tdRight',[200,200]);assert.equal((await result()).pstiPx,null);await place('tdRight',[600,200]);assert.ok((await result()).valid);
const prior=await page.evaluate(()=>JSON.stringify(pstiPhotoState.points));await page.click('#pstiPhotoZoomIn');await page.click('#pstiPhotoZoomOut');assert.equal(await page.evaluate(()=>JSON.stringify(pstiPhotoState.points)),prior);await page.click('#pstiPhotoZoomReset');
// Real Shift drag of upper-border point.
await page.locator('#pstiPhotoCanvas').scrollIntoViewIfNeeded();const b=await page.locator('#pstiPhotoCanvas').boundingBox();await page.keyboard.down('Shift');await page.mouse.move(b.x+b.width*.5,b.y+b.height*350/600);await page.mouse.down();await page.mouse.move(b.x+b.width*.5,b.y+b.height*360/600);await page.mouse.up();await page.keyboard.up('Shift');assert.ok(Math.abs((await result()).pstiPx-90)<1e-6);
// Export records distance only, never silently updates the angle-estimation inputs.
assert.equal(await page.inputValue('#psti-supine-1'),'');const dl=page.waitForEvent('download');await page.click('#pstiPhotoExportJson');const rec=JSON.parse(fs.readFileSync(await(await dl).path(),'utf8'));assert.equal(rec.schema,'tha-ap-psti-photo-v1');assert.equal(rec.angleEstimate,null);assert.ok(rec.points.pubicSuperior);assert.ok(!JSON.stringify(rec).includes('data:image'));
const dl2=page.waitForEvent('download');await page.click('#pstiPhotoExportCsv');assert.ok(fs.readFileSync(await(await dl2).path(),'utf8').includes('pubicSuperior_x'));
await page.setViewportSize({width:390,height:844});await page.locator('#pstiPhotoPanel').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.resolve(__dirname,'../psti-mobile-qa.png'),fullPage:true});
await load();assert.deepEqual(await page.evaluate(()=>Object.keys(pstiPhotoState.points)),[]);assert.equal((await result()).pstiPx,null);assert.equal(await page.inputValue('#pstiPhotoKnownLength'),'');assert.equal(await page.isChecked('#pstiPhotoScaleConfirmed'),false);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS PSTI real Chromium: manual placement, scale invalidation, invalid/recovery, zoom, Shift drag, export, old-input isolation, 390px layout, image reset');
})().catch(e=>{console.error(e);process.exit(1)});
