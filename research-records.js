/* Explicit file-only research records. No storage or network side effects. */
(function(root){
'use strict';
const fields=['researchId','date','side','stage','source','saMethod','pstiSupine','pstiStanding','ctSupine','ctStanding','conditions','stem','delta','inclination'];
function validate(raw){
 const r={}; for(const k of fields){if(typeof raw[k]!=='string'||raw[k].length>300)throw Error('記録形式が不正です：'+k);r[k]=raw[k];}
 if(!/^[A-Za-z][A-Za-z0-9_-]{1,39}$/.test(r.researchId))throw Error('研究IDは英字から始まる2〜40文字の英数字・_・-で入力してください（氏名・診療録番号は禁止）。');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||(!Number.isFinite(Date.parse(r.date))||new Date(r.date).toISOString().slice(0,10)!==r.date))throw Error('記録日を入力してください。');
 if(!['right','left'].includes(r.side)||!['preop','intraop','postop'].includes(r.stage)||!['psti','ctvisual','combined','other'].includes(r.source))throw Error('左右・時点・入力根拠を選択してください。');
 for(const k of ['stem','delta','inclination'])if(!r[k].trim()||!Number.isFinite(Number(r[k])))throw Error('SA・ΔPT・中間位RIを入力してください。');
 for(const k of ['ctSupine','ctStanding'])if(r[k].trim()&&!Number.isFinite(Number(r[k])))throw Error('CT目分量は数値（度）で入力してください。');
 for(const k of ['pstiSupine','pstiStanding'])if(r[k].trim()){const a=r[k].split(',');if(![1,3].includes(a.length)||a.some(x=>!x.trim()||!Number.isFinite(Number(x))))throw Error('PSTIはmmで1値、または3値をカンマ区切りで入力してください。');}
 if(!r.saMethod.trim()||!r.conditions.trim())throw Error('SAの推定/測定方法と、後傾の基準・撮影条件を入力してください。');
 if(['psti','combined'].includes(r.source)&&(!r.pstiSupine.trim()||!r.pstiStanding.trim()))throw Error('PSTIの臥位・立位の元値を記録してください。');
 if(['ctvisual','combined'].includes(r.source)&&!r.ctSupine.trim()&&!r.ctStanding.trim())throw Error('CT目分量の元値を少なくとも1つ記録してください。');
 return r;
}
function create(raw,calculate){const inputs=validate(raw),x=calculate(+inputs.stem,+inputs.delta,+inputs.inclination);return {schema:'functional-cup-record/v1',savedAt:new Date().toISOString(),geometryVersion:'midpoint-geometry 2.0',inputs,planned:{supineRA:x.supine.ra,supineRI:x.supine.ri,midpointRA:x.midpointRA,midpointRI:x.midpointRI,standingRA:x.standing.ra,standingRI:x.standing.ri,ellipseRatio:Math.abs(Math.sin(x.supine.ra*Math.PI/180))},notice:'計画値。実配置・測定精度・可動域の検証結果ではない。'};}
function read(text,calculate){if(text.length>30000)throw Error('ファイルが大きすぎます。');const r=JSON.parse(text);if(r.schema!=='functional-cup-record/v1')throw Error('この研究記録のJSONではありません。');return create(r.inputs,calculate);}
const api={validate,create,read};if(typeof module!=='undefined')module.exports=api;root.FunctionalCupRecords=api;
})(typeof window==='undefined'?globalThis:window);
