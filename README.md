# THA カップ設置角・透視写真計測

[アプリを開く](https://shimizutom1981-ship-it.github.io/THA-Combined-Anteversion-Calculator/)

## 機能
- 写真計測：基準線H1–H2、カップ長軸A–B、短軸側の点Cによる5点計測。RI・RAを表示します。
- 目標角・幾何シミュレーション：ステム前捻角、ΔPT、外方傾斜角から計算し、左右の投影像を表示します。
- 研究用PSTI：仰臥位・立位のPACS距離（mm）を1回または3回平均で入力し、後傾変化量を推定します。JSON/CSV保存、JSON再読込に対応します。

## 実装されている式
- 目標カップ前捻角 = 37.3 − 0.7 × ステム前捻角 − ΔPT / 2
- PSTI推定ΔPT（後傾正）= 0.74 ×（立位PSTI − 仰臥位PSTI）− 1.2

PSTIは研究用・自施設未検証です。シミュレーターへ自動転記しません。計算結果のみで臨床判断を行わないでください。詳細な適用条件・限界はアプリ内に記載しています。

## データと起動
画像と入力値はブラウザ内で処理し、アプリからサーバーへの送信は行いません。保存操作で端末へダウンロードします。患者氏名などの識別情報を入力しないでください。

ビルド不要の静的アプリです。index.htmlとassets/を同じ階層に配置して配信してください。

## 更新記録
2026-10-29：THA Cup PSTI Research Previewの公開済みv3（ソースcommit 8126ebc1a4c204d3f72dcfd0129d3c1e63850c54）を移植。HTML・測定図を同一内容で反映し、計算ロジックは変更していません。GitHubを本公開版のソース正本とし、Sites版とは自動同期しません。

## 測定図の出典
assets/PSTI_measurement_original.png：Kobayashi et al., Bone Jt Open 2026;7:1280–1287, Fig.1右下パネルの切り出し（既存Sites版から継承）。
[原著](https://doi.org/10.1302/2633-1462.710.BJO-2026-0113.R1) / [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
