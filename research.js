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
function calculatePsti(raw) {
  if (!Array.isArray(raw) || raw.length !== 6) return {valid:false};
  const parsed = raw.map(parsePsti);
  const mean = values => values.every(v => !v.error) ? values.reduce((sum,v) => sum+v.value/3,0) : null;
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
    const result = calculatePsti(fields.map(field => field.value));
    fields.forEach((field,i) => field.setAttribute('aria-invalid', result.parsed[i].error === 'invalid' ? 'true' : 'false'));
    el('supine-mean').textContent = formatPsti(result.supine);
    el('standing-mean').textContent = formatPsti(result.standing);
    el('difference').textContent = result.valid ? formatPsti(result.difference,true) : '—';
    el('estimate').textContent = result.valid ? formatPsti(result.estimate,true) : '—';
    el('status').textContent = result.valid ? '6個の測定値から算出しました。' : result.parsed.some(v=>v.error === 'invalid') ? '入力エラー：半角の0以上の有限な数値を入力してください。単位・指数表記・カンマ・負値は入力できません。' : '各姿勢3回、計6個の測定値を入力してください（欠測のため推定未算出）。';
    el('direction').textContent = result.valid ? (result.estimate > 0 ? '正値：後傾方向への変化' : result.estimate < 0 ? '負値：前傾方向への変化' : '推定変化量 0°')+'（仰臥位 → 立位）。絶対角ではありません。' : '正値＝後傾方向、負値＝前傾方向';
    el('warning').hidden = !result.valid || !result.extrapolated;
    el('warning').textContent = result.valid && result.extrapolated ? '外挿：ΔPSTIが原著の観測範囲（−8.5〜27.9 mm）外です。この条件での推定精度は確認されていません。' : '';
  }
  fields.forEach(field => field.addEventListener('input',render));
  document.getElementById('researchTabButton').addEventListener('click',()=>switchTab('research'));
  el('reset').addEventListener('click',()=>{fields.forEach(field=>field.value=''); render(); fields[0].focus();});
  render();
})();
