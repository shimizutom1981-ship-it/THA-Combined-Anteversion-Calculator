const fs = require('node:fs');
let html = fs.readFileSync('baseline.html', 'utf8');
const fields = (posture, name) => `<fieldset><legend>${name} PSTI（mm）</legend><div class="psti-inputs">${[1,2,3].map(i => `<div id="psti-${posture}-${i}-group"${i>1?' hidden':''}><label for="psti-${posture}-${i}">${i}回目</label><div class="input-wrapper"><input id="psti-${posture}-${i}" type="text" inputmode="decimal" autocomplete="off" aria-describedby="psti-help psti-status"><span class="unit">mm</span></div></div>`).join('')}</div><p><span id="psti-${posture}-summary-label">使用値（1回）</span>：<output id="psti-${posture}-mean">—</output> mm</p></fieldset>`;
const panel = `
  <section id="tab-research" class="tab-content" aria-labelledby="researchTabButton">
    <h2>PSTIによる骨盤後傾変化量の推定</h2>
    <p class="psti-notice"><strong>研究用・自施設未検証</strong><br>術前の仰臥位 → 立位における変化量を推定します。絶対的な骨盤傾斜角ではありません。</p>
    <fieldset><legend>研究記録</legend>
      <label for="psti-research-id">研究ID（任意・患者氏名は入力しない）</label>
      <div class="input-wrapper"><input id="psti-research-id" type="text" maxlength="128" autocomplete="off" placeholder="例：TEST-001"></div>
      <p>空欄でも使用できます。試すときは架空のIDを使用してください。</p>
      <label for="psti-mode">測定回数</label>
      <select id="psti-mode"><option value="single" selected>各姿勢1回（簡易入力）</option><option value="triple">各姿勢3回の平均（原著の方法）</option></select>
      <p id="psti-mode-note" class="psti-notice"></p>
    </fieldset>
    <p id="psti-help">病院PACSビューワーで測定した距離（mm）を入力してください。PSTIは、左右坐骨下部を結ぶ transischial line から恥骨結合上縁までの垂直距離です。半角の0以上の数値を入力してください（小数可）。空欄は0として扱いません。</p>
    ${fields('supine','仰臥位')}${fields('standing','立位')}
    <div aria-live="polite" aria-atomic="true">
      <p id="psti-status">各姿勢1回、計2個の測定値を入力してください。</p>
      <div class="results-row">
        <div class="res-box"><div class="res-title">ΔPSTI＝立位使用値 − 仰臥位使用値</div><div class="res-val"><output id="psti-difference">—</output> <small>mm</small></div></div>
        <div class="res-box"><div class="res-title">推定後傾変化量 ΔPT</div><div class="res-val"><output id="psti-estimate">—</output> <small>°</small></div></div>
      </div>
      <p id="psti-direction">正値＝後傾方向、負値＝前傾方向</p>
      <p id="psti-warning" class="psti-notice" hidden></p>
    </div>
    <p>推定式（後傾正）：<strong>ΔPT＝0.74 × ΔPSTI − 1.2°</strong><br>1回モードは1回目の値、3回モードは3回平均を使用し、途中で丸めずに計算します。表示は小数第2位まで（微小な非ゼロ値は指数表記）。</p>
    <p class="psti-notice">既存のΔPT入力欄・目標AVへ自動転記しません。この研究用推定値のみで設置目標を決定しないでください。</p>
    <fieldset><legend>比較用の目視概算（任意）</legend>
      <label for="psti-visual">CTの3D像との目視比較による概算後傾変化量（°）</label>
      <div class="input-wrapper"><input id="psti-visual" type="text" inputmode="text" autocomplete="off" aria-describedby="psti-visual-help"><span class="unit">°</span></div>
      <p id="psti-visual-help">10°刻みの3D画像を参考に、仰臥位・立位AP像の見え方と照合した比較用概算です（中間値も可）。15°・小数・負値・0を入力でき、空欄は欠測です。後傾正で入力してください。参照正解ではなく、入力桁数は測定精度を意味しません。</p>
      <p>推定値 − 概算値：<output id="psti-comparison">—</output> °</p>
    </fieldset>
    <p>入力日時（最終編集）：<output id="psti-input-time">未入力</output></p>
    <p>患者氏名などの識別情報は入力しないでください。保存ファイルは端末内にダウンロードします。欠測はJSONではnull、CSVでは空欄として保存します。研究ID・測定モード・回数・計算方法も保存します。未保存の入力はページを閉じると失われます。</p>
    <p>JSONはID・入力をそのまま保持します。CSVは引用符・カンマをエスケープし、式として解釈され得る文字列の先頭にアポストロフィを付けます。非使用の2・3回目もraw_input列に保存し、included列で計算対象を区別します。</p>
    <div class="file-input-wrapper">
      <button id="psti-save-json" type="button" class="btn-action">JSON保存</button>
      <button id="psti-save-csv" type="button" class="btn-action">CSV保存</button>
    </div>
    <p><label for="psti-load-json">保存したJSONを再読込（現在の研究用入力を置換）</label><input id="psti-load-json" type="file" accept=".json,application/json"></p>
    <p id="psti-save-status" role="status"></p>
    <button id="psti-reset" type="button" class="btn-action btn-reset">研究用入力をクリア</button>
    <details><summary>原著・測定条件・適用の限界</summary>
      <p>Kobayashi et al. Bone Jt Open 2026;7:1280–1287.<br><a href="https://doi.org/10.1302/2633-1462.710.BJO-2026-0113.R1" target="_blank" rel="noopener noreferrer">DOI: 10.1302/2633-1462.710.BJO-2026-0113.R1</a></p>
      <p>原著は前傾正の ΔAPPt＝−0.74 × ΔPSTI＋1.2°。本タブでは符号を反転し、後傾正の変化量を表示します。例：ΔPSTIが10 mmなら＋6.2°、0 mmなら−1.2°です。</p>
      <p>原著主式にはCT骨頭径による倍率補正はありません。PACSのmm値を使用し、画像打点計測・人工骨頭による校正は行いません。</p>
      <p>術前の仰臥位→立位を対象とした同一施設での検証です。他姿勢・術後・他撮影条件には一般化できません。原著撮影条件：focus–object distance 120 cm、中心線は恥骨結合上縁。</p>
      <p>原著で観測されたΔPSTIは−8.5〜27.9 mmです。この範囲は安全範囲ではなく、範囲内でも自施設での妥当性を保証しません。範囲外は外挿として警告します。</p>
    </details>
  </section>
`;
html = html.replace('  </style>', `
    #tab-research {font-size:.88rem; line-height:1.65;}
    #tab-research h2 {font-size:1.1rem; color:var(--accent);}
    #tab-research fieldset {border:1px solid var(--border); border-radius:8px; margin:14px 0; min-width:0;}
    .psti-inputs {display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px;}
    .psti-inputs:has(> [hidden]) {grid-template-columns:1fr;}
    .psti-notice {padding:10px; background:#17263b; border-left:3px solid #fbbf24;}
    #tab-research a {color:var(--accent); overflow-wrap:anywhere;}
    #tab-research input:focus {outline:2px solid var(--accent); border-radius:4px;}
    #tab-research input[aria-invalid="true"] {outline:2px solid #fb7185;}
    #tab-research small {font-size:.9rem;}
    #tab-research select {display:block; width:100%; padding:10px; background:var(--bg); color:var(--text); border:1px solid var(--border); border-radius:6px;}
    #tab-research details {margin-top:18px;}
    #tab-research summary {cursor:pointer; color:var(--accent);}
  </style>`);
html = html.replace('  </div>\n\n  <!-- =====================================================\n       TAB 1', '    <button id="researchTabButton" class="tab-btn" type="button">研究用<br>PSTI → ΔPT</button>\n  </div>\n\n  <!-- =====================================================\n       TAB 1');
html = html.replace('\n</div>\n\n<script>', panel+'\n</div>\n\n<script>');
html = html.replace('function switchTab(tabName) {','function switchTab(tabName) {\n\n  document.getElementById("researchTabButton").classList.remove("active");\n  document.getElementById("tab-research").classList.remove("active");');
html = html.replace('  if (tabName === "measure") {','  if (tabName === "research") {\n    document.getElementById("researchTabButton").classList.add("active");\n    document.getElementById("tab-research").classList.add("active");\n  } else if (tabName === "measure") {');
html = html.replace('</body>', '<script>\n'+fs.readFileSync('research.js','utf8')+'\n'+fs.readFileSync('records.js','utf8')+'\n</script>\n</body>');
fs.writeFileSync('index.html',html);
