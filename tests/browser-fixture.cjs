// Development-only fixture: prepares a copy, never changes the production HTML.
// node tests/browser-fixture.cjs /absolute/output/directory [path/to/baseline.html]
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(process.argv[2]||'/tmp/tha-browser-fixture');fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(process.argv[3]||path.join(__dirname,'../index.html'),'utf8');
const preload=`<script>window.addEventListener('load',async()=>{const blob=await(await fetch('synthetic.png')).blob();const dt=new DataTransfer();dt.items.add(new File([blob],'synthetic.png',{type:'image/png'}));const input=document.getElementById('cameraInput');input.files=dt.files;input.dispatchEvent(new Event('change'));document.getElementById('measureTabButton').click();});</script>`;
fs.writeFileSync(path.join(out,'index.html'),html+preload);
fs.copyFileSync(path.join(__dirname,'evidence/synthetic.png'),path.join(out,'synthetic.png'));
fs.writeFileSync(path.join(out,'mobile.html'),'<!doctype html><meta charset="utf-8"><title>THA synthetic QA — 390px frame</title><style>body{margin:0;background:#888}iframe{width:390px;height:844px;border:0;display:block}</style><iframe title="Synthetic fixture 390px" src="index.html"></iframe>');
console.log('Serve this directory with the supported preview server: '+out);
