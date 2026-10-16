const PSTI_VERSION = 'psti-research-local-1.1.0';
const PSTI_FORMULA = 'delta_PT_deg = 0.74 * (standing_mean_mm - supine_mean_mm) - 1.2';
function parseVisual(raw) {
  const value=String(raw).trim();
  if (!value) return {value:null};
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return {error:'invalid'};
  const number=Number(value);
  if (!Number.isFinite(number) || Math.abs(number)>Number.MAX_SAFE_INTEGER || (number===0 && /[1-9]/.test(value))) return {error:'invalid'};
  return {value:number};
}
function createPstiRecord(raw, visualRaw, inputAt, savedAt=new Date().toISOString()) {
  const r=calculatePsti(raw), visual=parseVisual(visualRaw);
  if (!r.parsed || r.parsed.some(v=>v.error==='invalid') || visual.error) throw new Error('不正な入力を修正してから保存してください。');
  return {schemaVersion:PSTI_VERSION,formula:PSTI_FORMULA,doi:'10.1302/2633-1462.710.BJO-2026-0113.R1',
    signConvention:'posterior_positive',postureTransition:'preoperative_supine_to_standing',units:{distance:'mm',angle:'degree'},
    inputAt,savedAt,raw:{psti:raw.slice(),visual:visualRaw},
    supineMeasurementsMm:r.parsed.slice(0,3).map(v=>v.error?null:v.value),standingMeasurementsMm:r.parsed.slice(3).map(v=>v.error?null:v.value),
    supineMeanMm:r.supine,standingMeanMm:r.standing,deltaPstiMm:r.valid?r.difference:null,estimatedDeltaPtDeg:r.valid?r.estimate:null,
    visualEstimateDeg:visual.value,estimatedMinusVisualDeg:r.valid&&visual.value!==null?r.estimate-visual.value:null,
    extrapolated:r.valid?r.extrapolated:null};
}
function readPstiRecord(text) {
  const r=JSON.parse(text);
  if (!r || r.schemaVersion!==PSTI_VERSION || r.formula!==PSTI_FORMULA || r.signConvention!=='posterior_positive' || r.postureTransition!=='preoperative_supine_to_standing' || r.units?.distance!=='mm' || r.units?.angle!=='degree' || !Array.isArray(r.raw?.psti) || r.raw.psti.length!==6 || r.raw.psti.some(v=>typeof v!=='string') || typeof r.raw.visual!=='string' || !(r.inputAt===null || (typeof r.inputAt==='string' && Number.isFinite(Date.parse(r.inputAt))))) throw new Error('対応する研究用JSON形式ではありません。');
  // Recompute all derived results from raw measurements, never trust imported estimates.
  return createPstiRecord(r.raw.psti,r.raw.visual,r.inputAt,r.savedAt);
}
function pstiCsv(record) {
  const flat={schema_version:record.schemaVersion,formula:record.formula,doi:record.doi,sign_convention:record.signConvention,posture_transition:record.postureTransition,distance_unit:'mm',angle_unit:'degree',input_at:record.inputAt,saved_at:record.savedAt};
  ['supine','standing'].forEach((p,j)=>[0,1,2].forEach(i=>flat[`${p}_${i+1}_mm`]=record[j?'standingMeasurementsMm':'supineMeasurementsMm'][i]));
  Object.assign(flat,{supine_mean_mm:record.supineMeanMm,standing_mean_mm:record.standingMeanMm,delta_psti_mm:record.deltaPstiMm,estimated_delta_pt_deg:record.estimatedDeltaPtDeg,visual_estimate_deg:record.visualEstimateDeg,estimated_minus_visual_deg:record.estimatedMinusVisualDeg,extrapolated:record.extrapolated});
  const quote=v=>'"'+(v===null?'':String(v)).replace(/"/g,'""')+'"';
  return '\uFEFF'+Object.keys(flat).map(quote).join(',')+'\r\n'+Object.values(flat).map(quote).join(',')+'\r\n';
}
(function initializePstiRecords(){
  const el=id=>document.getElementById('psti-'+id);
  const fields=['supine','standing'].flatMap(p=>[1,2,3].map(i=>el(`${p}-${i}`)));
  let inputAt=null;
  function renderComparison(){
    const r=calculatePsti(fields.map(f=>f.value)), visual=parseVisual(el('visual').value);
    el('visual').setAttribute('aria-invalid',visual.error?'true':'false');
    el('comparison').textContent=visual.error?'入力エラー':r.valid&&visual.value!==null?formatPsti(r.estimate-visual.value,true):'—';
    el('input-time').textContent=inputAt||'未入力';
  }
  function edited(){inputAt=new Date().toISOString();el('save-status').textContent='未保存の変更があります。';renderComparison()}
  [...fields,el('visual')].forEach(f=>f.addEventListener('input',edited));
  el('reset').addEventListener('click',()=>{el('visual').value='';inputAt=null;el('save-status').textContent='研究用入力をクリアしました。';renderComparison()});
  function save(format){
    try {
      const record=createPstiRecord(fields.map(f=>f.value),el('visual').value,inputAt);
      const text=format==='json'?JSON.stringify(record,null,2):pstiCsv(record);
      const url=URL.createObjectURL(new Blob([text],{type:format==='json'?'application/json':'text/csv;charset=utf-8'}));
      const anchor=document.createElement('a');anchor.href=url;anchor.download='psti-research-'+record.savedAt.replace(/[:.]/g,'-')+'.'+format;
      anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      el('save-status').textContent=format.toUpperCase()+'のダウンロードを開始しました。JSONは再読込用、CSVは解析用です。';
    } catch(error){el('save-status').textContent=error.message}
  }
  el('save-json').addEventListener('click',()=>save('json'));
  el('save-csv').addEventListener('click',()=>save('csv'));
  el('load-json').addEventListener('change',async()=>{
    try{
      const file=el('load-json').files[0];if(!file)return;
      if(file.size>100000)throw new Error('JSONファイルが大きすぎます。');
      const record=readPstiRecord(await file.text());
      fields.forEach((f,i)=>f.value=record.raw.psti[i]);el('visual').value=record.raw.visual;
      fields[0].dispatchEvent(new Event('input'));inputAt=record.inputAt;renderComparison();
      el('save-status').textContent='JSONを再読込しました。入力日時を保持し、生値から再計算しました。';
    }catch(error){el('save-status').textContent='読込失敗：'+error.message}
    finally{el('load-json').value=''}
  });
  renderComparison();
})();
