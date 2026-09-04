# THA Combined Anteversion Calculator
（骨盤動態補正対応 人工股関節全置換術 カップ目標前捻角計算ツール）

人工股関節全置換術（THA）における術前計画および術中判断をサポートするためのWebベース計算ツールです。  
大腿骨ステム前捻角（$V_{stem}$）と骨盤傾斜変化（$\Delta PT$）をもとに、立位・機能的肢位でのインピンジメントや脱臼リスクを低減するための目標カップ前捻角（$V_{cup}$）を即座に算出します。

---

## 主な機能
- **Widmerの理論式に基づくCombined Anteversion（CA）算出**
- **骨盤動態（Spinopelvic mobility）を考慮した動的補正（$\Delta PT / 2$ ルール）**
- **ブラウザ完結型**：PC・スマートフォンのブラウザ上で瞬時に動作（外部サーバーへのデータ送信なし）

---

## 計算ロジック・アルゴリズム

### 1. Widmer's Safe Zone 理論
Widmerらが提唱したカップ傾斜角・前捻角およびステム前捻角の連動関係に基づき、目標となる基準前捻角を定義しています。

$$\text{目標 CA} = V_{cup} + 0.7 \times V_{stem} \approx 37.3^\circ$$

### 2. 骨盤動態補正（$\Delta PT / 2$）
臥位から立位への姿勢変化に伴い骨盤が後傾すると、カップの見かけの前捻角（機能的前捻角）が増大し、前方開大による前方脱臼やエッジローディングのリスクが高まります。  
骨盤後傾角変化量（$\Delta PT$）の約半分がカップ機能的前捻角に影響するという知見に基づき、以下の補正を行っています。

$$V_{cup\text{ (target)}} = 37.3^\circ - (0.7 \times V_{stem}) - \frac{\Delta PT}{2}$$

*※ 設定する目標Combined Anteversionの基準値や補正係数は、術前アライメントや骨盤可動性分類（Stiff spine / Hypermobile等）に応じて臨床的に適宜微調整してください。*

---

## 入力パラメータの定義

| パラメータ | 説明 | 備考 |
| :--- | :--- | :--- |
| **$V_{stem}$** | ステム前捻角（度） | 3D-CT術前計画値、または術中大腿骨計測値 |
| **$\Delta PT$** | 骨盤後傾変化量（度） | 臥位から立位での骨盤傾斜角（PT）の変化量（後傾方向をプラス） |

---

## 参考文献
1. Widmer KH, Zurfluh B. *Compliant positioning of implants in total hip arthroplasty to maintain impingement-free range of motion.* J Orthop Res. 2004;22(4):815-821.
2. Phan D, Bedair HS, Schwarzkopf R. *The Influence of Sagittal Spinal Deformity on Anteversion of the Acetabular Component in Total Hip Arthroplasty.* Bone Joint J. 2015;97-B(8):1017-1023.
3. Vigdorchik JM, et al. *The spinopelvic relationship in total hip arthroplasty.* Bone Joint J. 2020;102-B(6_Supple_A):4-11.

---

## 免責事項（Medical Disclaimer）
- 本ツールは、人工股関節全置換術におけるインプラント設置計画の**補助・検討を目的としたものであり、医療機器ではありません**。
- 計算結果は理論値に基づくシミュレーションであり、個々の骨形態、脊椎アライメント、軟部組織の緊張度、インプラントデザイン（ヘッド径やネック形状など）により至適角度は異なります。
- 最終的なインプラント設置角度の決定および手術方針は、**必ず執刀医の臨床的判断と責任において行ってください**。
- 本ツールの利用により生じたいかなる損害・合併症についても、開発者は一切の責任を負いかねます。# THA-Combined-Anteversion-Calculator
