(function(){
'use strict';
const host=document.createElement('section');host.className='research-record-panel';host.innerHTML=`
<h3>研究記録・スクリーンショット用一覧</h3>
<p>研究IDのみ。氏名・診療録番号・生年月日など患者を直接特定する情報は入力しないでください。下の自由記載にも含めないでください。</p>
<p>この欄は<strong>目標角・幾何シミュレーター専用</strong>です。他の写真計測やPSTIパネルの値・画像は自動で取り込みません。保存はJSONの端末へのダウンロードのみ。自動保存・クラウド送信・端末間同期はありません。再開は保存ファイルを明示的に読み込んでください。</p>
<div class="record-grid">
<label>研究ID<input id="rr-researchId" placeholder="例 FCO-001" maxlength="40" autocomplete="off"></label>
<label>記録日<input id="rr-date" type="date"></label>
<label>データの時点<select id="rr-stage"><option value="preop">術前予測</option><option value="intraop">術中更新</option><option value="postop">術後評価入力</option></select></label>
<label>ΔPT入力の根拠<select id="rr-source"><option value="">選択</option><option value="psti">PSTI</option><option value="ctvisual">3D CT目分量</option><option value="combined">PSTI＋3D CT目分量</option><option value="other">その他</option></select></label>
<label>SA推定/測定方法<input id="rr-saMethod" maxlength="300" placeholder="術前CTから推定、術中実測など"></label>
<label>PSTI臥位 元値 mm<input id="rr-pstiSupine" placeholder="1値または3値をカンマ区切り"></label>
<label>PSTI立位 元値 mm<input id="rr-pstiStanding" placeholder="1値または3値をカンマ区切り"></label>
<label>3D CT臥位 目分量 °<input id="rr-ctSupine" type="number" step="any"></label>
<label>3D CT立位 目分量 °<input id="rr-ctStanding" type="number" step="any"></label>
<label>基準・符号・撮影条件<input id="rr-conditions" maxlength="300" placeholder="CTの基準面、立位値の推定条件等"></label>
</div><p>ΔPT＝立位−臥位、後傾正。CT目分量は測定値とは区別します。元値からΔPTへの自動変換・シミュレーターへの自動転記はしません。上の入力値を自分で確認してください。</p>
<button type="button" id="rr-show">記録一覧を表示</button> <button type="button" id="rr-save">JSON保存</button> <label>JSON再読込<input type="file" id="rr-load" accept=".json,application/json"></label> <button type="button" id="rr-new">新しい症例（記録と計画入力を消去）</button>
<p id="rr-status" role="status"></p><article id="rr-card" hidden></article>`;
document.getElementById('tab-simulate').appendChild(host);
const keys=['researchId','date','stage','source','saMethod','pstiSupine','pstiStanding','ctSupine','ctStanding','conditions'];const el=k=>document.getElementById('rr-'+k);const status=t=>el('status').textContent=t;let activeId='';
const names={preop:'術前予測',intraop:'術中更新',postop:'術後評価入力',psti:'PSTI',ctvisual:'3D CT目分量',combined:'PSTI＋3D CT目分量',other:'その他'};
function gather(){const r={};keys.forEach(k=>r[k]=el(k).value);return {...r,side:currentSide,stem:stemInput.value,delta:ptInput.value,inclination:incInput.value};}
function snapshot(){return FunctionalCupRecords.create(gather(),calculateMidpointCup);}
function invalidate(){el('card').hidden=true;status('入力変更後は一覧を再表示してください。未保存です。');}
function reset(){keys.forEach(k=>el(k).value='');el('stage').value='preop';stemInput.value=ptInput.value=incInput.value='';activeId='';updateSim();invalidate();}
function line(parent,label,value){const p=document.createElement('p');p.textContent=label+'：'+value;parent.appendChild(p);}
function show(r){const c=el('card');c.replaceChildren();const h=document.createElement('h3');h.textContent='Functional Cup 研究記録';c.appendChild(h);line(c,'研究ID / 左右',r.inputs.researchId+' / '+(r.inputs.side==='right'?'右':'左'));line(c,'記録日 / 入力時点',r.inputs.date+' / '+names[r.inputs.stage]);line(c,'入力SA / ΔPT / 中間位RI',r.inputs.stem+'° / '+r.inputs.delta+'° / '+r.inputs.inclination+'°');line(c,'SAの方法',r.inputs.saMethod);line(c,'ΔPT根拠',names[r.inputs.source]+'（後傾正・立位−臥位）');line(c,'PSTI臥位 / 立位 mm',(r.inputs.pstiSupine||'未記録')+' / '+(r.inputs.pstiStanding||'未記録'));line(c,'CT目分量 臥位 / 立位 °',(r.inputs.ctSupine||'未記録')+' / '+(r.inputs.ctStanding||'未記録'));line(c,'基準・条件',r.inputs.conditions);line(c,'計画 臥位RA / RI',r.planned.supineRA.toFixed(2)+'° / '+r.planned.supineRI.toFixed(2)+'°');line(c,'計画 中間位RA / RI',r.planned.midpointRA.toFixed(2)+'° / '+r.planned.midpointRI.toFixed(2)+'°');line(c,'計画 立位RA / RI',r.planned.standingRA.toFixed(2)+'° / '+r.planned.standingRI.toFixed(2)+'°');line(c,'計画楕円比 / 長軸傾斜',r.planned.ellipseRatio.toFixed(3)+' / '+r.planned.supineRI.toFixed(2)+'°');const svg=document.getElementById('fluoroSvg').cloneNode(true);svg.removeAttribute('id');svg.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));svg.style.width='100%';svg.style.maxHeight='180px';c.appendChild(svg);line(c,'版',r.geometryVersion+' / functional-cup-record/v1');line(c,'一覧生成',r.savedAt);line(c,'注意',r.notice+' 画像は概念図。CT目分量は推定。');c.hidden=false;status('一覧をスクリーンショットで送れます。JSONも保存して再開に備えてください。');}
keys.forEach(k=>el(k).addEventListener('input',invalidate));['stemAnte','deltaPT','cupInc','btnRight','btnLeft'].forEach(id=>document.getElementById(id).addEventListener(id.startsWith('btn')?'click':'input',invalidate));
el('researchId').addEventListener('change',()=>{const next=el('researchId').value;if(activeId&&next!==activeId){if(!confirm('研究IDを変更すると、この記録欄と計画入力を消去します。他の計測パネルは別記録です。続けますか？')){el('researchId').value=activeId;return;}reset();el('researchId').value=next;}activeId=next;});
el('new').onclick=()=>{if(confirm('未保存の研究記録と計画入力を消去します。写真計測など別パネルは消去しません。続けますか？'))reset();};
el('show').onclick=()=>{try{show(snapshot());}catch(e){el('card').hidden=true;status(e.message);}};
el('save').onclick=()=>{try{const r=snapshot();show(r);const url=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='functional-cup-'+r.inputs.researchId+'-'+r.savedAt.replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('JSONのダウンロードを開始しました。端末の保存先でファイルを確認してください。');}catch(e){status(e.message);}};
el('load').onchange=async()=>{try{const file=el('load').files[0];if(!file)return;if(file.size>30000)throw Error('ファイルが大きすぎます。');const r=FunctionalCupRecords.read(await file.text(),calculateMidpointCup);if(!confirm('研究ID '+r.inputs.researchId+' の記録で現在の研究欄と計画入力を置換しますか？'))return;keys.forEach(k=>el(k).value=r.inputs[k]);stemInput.value=r.inputs.stem;ptInput.value=r.inputs.delta;incInput.value=r.inputs.inclination;setSide(r.inputs.side);updateSim();activeId=r.inputs.researchId;show(r);status('JSONを読み込み、入力値から計画を再計算しました。他の計測パネルは変更していません。');}catch(e){status('読込失敗（入力は変更していません）：'+e.message);}finally{el('load').value='';}};
})();
