"use strict";
// Isolated research calculation: never writes into simulator inputs or outputs.
function parsePsti(raw) {
  const value = String(raw).trim();
  if (!value) return {error:'missing'};
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return {error:'invalid'};
  const number = Number(value);
  if (!Number.isFinite(number) || number > Number.MAX_SAFE_INTEGER || (number === 0 && /[1-9]/.test(value))) return {error:'invalid'};
  return {value:number};
}
function calculatePsti(raw, mode='triple') {
  if (!Array.isArray(raw) || raw.length !== 6 || !['single','triple'].includes(mode)) return {valid:false};
  const parsed = raw.map((v,i) => mode==='single' && i%3!==0 ? {inactive:true} : parsePsti(v));
  const mean = values => { const active=values.filter(v=>!v.inactive); return active.every(v => !v.error) ? active.reduce((sum,v) => sum+v.value/active.length,0) : null; };
  const supine = mean(parsed.slice(0,3)), standing = mean(parsed.slice(3));
  if (supine === null || standing === null) return {valid:false, parsed, supine, standing};
  const difference = standing-supine;
  const estimate = 0.74*difference-1.2;
  return {valid:true, parsed, supine, standing, difference, estimate, extrapolated:difference < -8.5 || difference > 27.9};
}
function formatPsti(value, signed=false) {
  if (value === null || value === undefined) return '—';
  const magnitude = Math.abs(value);
  const formatted = magnitude !== 0 && magnitude < .005 ? magnitude.toExponential(2) : magnitude.toFixed(2);
  return (value < 0 ? '−' : signed && value > 0 ? '+' : '')+formatted;
}
(function initializePsti() {
  const ids = ['supine','standing'].flatMap(posture => [1,2,3].map(i => `psti-${posture}-${i}`));
  const fields = ids.map(id => document.getElementById(id));
  const el = id => document.getElementById('psti-'+id);
  function render() {
    const mode=el('mode').value;
    const result = calculatePsti(fields.map(field => field.value),mode);
    ['supine','standing'].forEach(posture=>{
      el(posture+'-summary-label').textContent=mode==='single'?'使用値（1回）':'使用値（3回平均）';
      [2,3].forEach(i=>{el(`${posture}-${i}-group`).hidden=mode==='single';el(`${posture}-${i}`).disabled=mode==='single';});
    });
    el('mode-note').textContent=mode==='single'?'1回入力は原著の3回平均と異なり、原著MAE 0.9°と同等の精度は未検証です。2・3回目の値は計算に使いません（切替前の入力は保持）。':'各姿勢3回すべての入力が必要です。原著と同じ3回平均ですが、自施設での精度は未検証です。';
    fields.forEach((field,i) => field.setAttribute('aria-invalid', result.parsed[i].error === 'invalid' ? 'true' : 'false'));
    el('supine-mean').textContent = formatPsti(result.supine);
    el('standing-mean').textContent = formatPsti(result.standing);
    el('difference').textContent = result.valid ? formatPsti(result.difference,true) : '—';
    el('estimate').textContent = result.valid ? formatPsti(result.estimate,true) : '—';
    const count=mode==='single'?1:3;
    el('status').textContent = result.valid ? `${count*2}個の測定値から算出しました。` : result.parsed.some(v=>v.error === 'invalid') ? '入力エラー：半角の0以上の有限な数値を入力してください。単位・指数表記・カンマ・負値は入力できません。' : `各姿勢${count}回、計${count*2}個の測定値を入力してください（欠測のため推定未算出）。`;
    el('direction').textContent = result.valid ? (result.estimate > 0 ? '正値：後傾方向への変化' : result.estimate < 0 ? '負値：前傾方向への変化' : '推定変化量 0°')+'（仰臥位 → 立位）。絶対角ではありません。' : '正値＝後傾方向、負値＝前傾方向';
    el('warning').hidden = !result.valid || !result.extrapolated;
    el('warning').textContent = result.valid && result.extrapolated ? '外挿：ΔPSTIが原著の観測範囲（−8.5〜27.9 mm）外です。この条件での推定精度は確認されていません。' : '';
  }
  fields.forEach(field => field.addEventListener('input',render));
  el('mode').addEventListener('change',render);
  document.getElementById('researchTabButton').addEventListener('click',()=>switchTab('research'));
  el('reset').addEventListener('click',()=>{fields.forEach(field=>field.value=''); el('mode').value='single'; render(); fields[0].focus();});
  render();
})();
