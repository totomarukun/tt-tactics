# 成長の実感を生む設計 — tt-tactics 向けリサーチ

対象: 卓球の個人向け上達PWA（週1・中級・端末内・比較なし）。
狙い: 「今週◯日練習」「課題◯件」のような数字ではなく、過去の自分を振り返って「この辺うまくいってるな」と感じさせること。

以下、5つの論点ごとに「発見 → 根拠 → tt-tacticsへの具体設計（画面/データ/AI活用）」で並べる。末尾に推奨仕掛けTop5、虚栄指標の対応表、振り返りカード設計案を置いた。

---

## 1. 成長を「実感」させる設計 — before/after と then vs now

### 発見
進捗の可視化は、ソーシャル機能より圧倒的に効く。ある調査では、ワークアウト記録の採用率が82%に対し、進捗の可視化はリピート利用を3倍に伸ばした。数字そのものより「効果が目に見えること」が鍵になる。セッション後に「+12%改善」のような小さな手応えを返すと、その微小な成功が次の行動を後押しする。

Year in Review系（Strava / Duolingo）が示すのは、**絶対値・比較・節目の三点セット**だ。累積の総量はそれ単体で意味を持ち、そこに変化の物語（narrative of growth and persistence）が乗ると強い。Stravaの年次まとめは「1回1回のワークアウトを縦糸にした、成長と粘りの物語」として設計されている。

### 根拠
- 進捗可視化がソーシャルの3倍のリピート／セッション後の「+12%」表示: [Stormotion – Fitness App Features](https://stormotion.io/blog/fitness-app-features/)
- 進捗可視化が最強のエンゲージメント要因: [Stormotion – Fitness App UX](https://stormotion.io/blog/fitness-app-ux/)
- 絶対値×比較×節目、成長の物語としての年次まとめ: [Trophy – How to Build a Wrapped Feature](https://trophy.so/blog/how-to-build-wrapped-feature)

### tt-tacticsへの設計
- **Then vs Now カード**: 同じ課題（例「バック側ツッツキからの回り込み」）について、3ヶ月前の自己評価/メモと今の状態を左右に並べる。データは既存のツリー（焦点・課題ノード）に `snapshot(date, self_rating, note)` を持たせ、最古と最新を突き合わせるだけで生成できる。
- **卒業した課題の棚**: 「以前つまづいていた that」を灰色で残し、克服したものに印を付ける。消さずに残すことが「乗り越えた証拠」になる。
- 数値を出すときは生の回数ではなく差分（「バック深さのミス、6月は毎試合→今月は1本」）で見せる。

---

## 2. スポーツの上達実感 — 勝てるようになった相手・決まる戦術・克服した敗因

### 発見
中級者と上級者では「振り返りの語彙」が違う。中級者は「ドライブが入らなかった」「ブロックミスが多い」と**技術**で反省しがちだが、上級者は「コース取りが甘かった」と**戦術**で語る。ここが「中級者の壁」。だから上達実感の核は、技術の巧拙より「自分の得点パターン＝型を言語化できているか」に置くべきだ。

一次情報の言い回しがそのまま設計のヒントになる。得意な展開を「下回転をバック側に呼び込み、フォアで回り込んで打つ」のように**一連の型として言語化**しておくと、試合中はその型に持ち込むことだけ考えればよくなる。崩れ方にも定型があり、「サーブレシーブでミスが出ると雪崩のように流れが崩れる」「メンタルが崩れると得点パターンも一気に崩壊する」。つまり成長とは、崩れ方が1つずつ減り、武器になった型が1つずつ増えることだ。

### 根拠
- 中級者は技術で、上級者は戦術で反省する（中級者の壁）: [world-tt.com – 技術のことばかり悩む中級者へ](https://world-tt.com/ps_info/ps_report_detail.php?bn=5&pg=HEAD&page=BACK&rpcdno=680)
- 得点パターンを1つの型として言語化する: [Choretaku – 得点率を上げる7戦術](https://choretaku.com/magazine/table-tennis-how-to-increase-scoring-rate-complete-guide)
- 崩れ方の連鎖・偵察を事実として記録し次セットに使う: [Choretaku – 1stセット偵察5項目](https://choretaku.com/magazine/table-tennis-first-set-scouting)
- ミスの原因を振り返り改善策を見つける反復: [Rallys – 練習方法](https://rallys.online/forplayers/howto/practice/)

### tt-tacticsへの設計
- **武器コレクション**: 「型」を第一級のデータにする。`weapon { name, trigger（呼び込み）, finish（決め）, status: 練習中/試合で試した/決まった }`。status が「決まった」に上がる瞬間が実感の山場。
- **克服した崩れ方ログ**: 敗因を「崩れ方」として登録し、対策を試すたびにスナップショット。再発しなくなったら「封じた」に。「前はこの崩れ方で必ず落としていた」という履歴が残る。
- **相手タイプ別の勝てた記録**: 端末内・比較なしの範囲で、対戦相手を実名でなくタイプ（カットマン/前陣速攻/ペン表 等）で記録。「カットマンに一度も勝てなかった→先月2回勝てた」を対タイプ勝率の変化として見せる。カットマンは少数派で苦手にされやすい、という一次情報とも噛み合う。

---

## 3. 心理学 — 有能感・進捗・goal-gradient・endowed progress

### 発見
自己決定理論（SDT）は、動機づけの中核を自律性・関係性・**有能感（competence）**とする。有能感は「自分の活動で効果を出している」という熟達の実感で、進捗の可視化はこれを直接支える。達成をどんなに小さくても認めて祝うことが、有能感を裏づける。

Amabile & Kramerの「進捗の法則（Progress Principle）」。26チーム238人の日誌1万2千件超の分析から、「最良の一日」を最も多く引き起こす出来事は仕事の前進、「最悪の一日」は後退だった。しかも重要なのは、**進捗を記録し振り返る行為そのもの**が有能感を高める点だ。

goal-gradientとendowed progress。ゴールが近く見えるほど行動は加速し、「すでに一部進んでいる」と感じさせると完遂率が上がる。スタンプ2個を先に押した12個カードは、0個の10個カードより速く・高い率で埋まった。ただし報酬直後に失速する「post-reward reset」という失敗モードもある。だから満タンでリセットする単発ゴールより、常に少し進んでいる状態を保つ設計が向く。

### 根拠
- 有能感＝熟達の実感、進捗バーと達成の承認が有能感を支える: [Learning Loop – Self-Determination Theory](https://learningloop.io/glossary/self-determination-theory-sdt) / [selfdeterminationtheory.org](https://selfdeterminationtheory.org/theory/)
- 前進が最良の日を作る／記録と振り返りが有能感を高める: [MindTools – Amabile and Kramer's Progress Theory](https://www.mindtools.com/arzm8fy/amabile-and-kramers-progress-theory/)
- endowed progress（2個押し済みカード）とpost-reward reset: [Learning Loop – Goal Gradient Effect](https://learningloop.io/plays/psychology/goal-gradient-effect) / [Kivetz, Urminsky & Zheng (2006) PDF](https://home.uchicago.edu/ourminsky/Goal-Gradient_Illusionary_Goal_Progress.pdf)

### tt-tacticsへの設計
- **有能感を主役に**: 週目標の達成率でなく「今の自分ができること」を主画面に。課題ノードに熟達度（試している/安定してきた/武器）を持たせ、上がった項目を強調。
- **endowed progressの応用**: 新しい焦点を始めるとき、既にできている前提スキルを「1/4達成済み」として見せてから積む。ゼロから始める感を消す。
- **リセットしない進捗**: 「今週の達成」で毎週0に戻さず、累積の武器数・封じた崩れ方数を積み上げ式で表示。post-reward resetを避ける。

---

## 4. 「振り返り」体験の設計 — 週次/月次カードとAIハイライト

### 発見
週次・月次・年次のレビューは、単独機能として最も高いエンゲージメントを叩き出す（Wrapped系が典型）。設計の定石は「1画面1事実、スワイプで進む縦型ストーリー」。数字の羅列ではなく、ハイライト・ローライト・気づきを抽出して見せる形が効く。

AIの使いどころは「言語化」だ。既存のAIジャーナルアプリ（Reflection等）は、書いた内容から**follow-up質問と気づき（insights）を生成**し、週次/月次レビューでハイライトと成長機会を文章で返す。tt-tacticsなら「この1ヶ月でバック側の安定が増した」を、蓄積データから自動で一文にできる。

### 根拠
- 1画面1事実の縦型ストーリー、ハイライト抽出: [Trophy – How to Build a Wrapped Feature](https://trophy.so/blog/how-to-build-wrapped-feature)
- Year in Reviewの高エンゲージメント・パーソナライズ: [Android Authority – Duolingo Year in Review 2025](https://www.androidauthority.com/duolingo-year-in-review-2025-3621782/) / [Strava – Your Year in Sport](https://support.strava.com/en-us/articles/15401959-your-year-in-sport)
- AIがハイライト/気づき/成長機会を言語化: [Reflection.app – AIジャーナル](https://www.reflection.app/ai)

### tt-tacticsへの設計
- **週次カード（軽量）**: 縦型1〜3画面。「今週試した型」「うまくいった1本」「次に持ち越す課題」を各1画面。AIは試合メモとスナップショット差分から一文の要約を生成（例「フォア前の処理が2週連続で安定」）。
- **月次カード（物語）**: 「この1ヶ月でXが安定した／Yを封じた／Zが武器になった」の3点構成。過去の焦点が"卒業"していく様子をタイムラインで見せる。
- AIの制約: データにある事実だけを言い換える（ハルシネーション防止）。数値の裏づけを1つ添える（「バック深さのミスが月◯本→◯本」）。端末内処理・比較なしの前提を崩さない。

---

## 5. 数字を出すなら何が意味を持つか — 虚栄指標を避ける

### 発見
虚栄指標（vanity metrics）は「増えても上達と直結しない数字」。練習日数・課題数・週目標達成率はここに落ちやすい。一方で、意味を持つのは「成長そのものを表す差分指標」だ。フィットネス領域でも、単なる合計より「完了率」「改善率（+12%）」のような**行動や成果に紐づく数字**が予測力を持つとされる。卓球の文脈に翻訳すると、意味があるのは「克服した崩れ方の数」「武器になった型の数」「勝てるようになった相手タイプ」。これらは全て、増えると本当に強くなっている。

### 根拠
- 完了率は虚栄指標でなく engagement/retention の予測子、「+12%」型の意味ある指標: [Stormotion – Fitness App Features](https://stormotion.io/blog/fitness-app-features/)
- 中級者の壁は技術偏重、戦術・型の言語化が伸びしろ: [world-tt.com](https://world-tt.com/ps_info/ps_report_detail.php?bn=5&pg=HEAD&page=BACK&rpcdno=680)

### tt-tacticsへの設計
下の対応表を主指標に採用し、練習日数・課題数はダッシュボードから外す（記録はするが前面に出さない）。

---

## 成長実感を生む推奨仕掛け Top5

1. **武器コレクション**: 得点の「型」をカード化し、練習中→試した→決まった、と昇格させる。「決まった」への昇格が最大の実感イベント。
2. **封じた崩れ方の棚**: 敗因を崩れ方として登録し、再発しなくなったら「封じた」に移す。消さず残して"乗り越えた証拠"にする。
3. **Then vs Now カード**: 同じ課題の3ヶ月前と今をスナップショット差分で左右比較。過去の自分が基準になる（他人と比較しない）。
4. **月次の成長ハイライト（AI言語化）**: 蓄積データから「この1ヶ月でXが安定／Yを封じた／Zが武器に」を数値の裏づけ付きで一文生成。
5. **リセットしない累積**: 週ごとに0へ戻さず、武器数・封じた崩れ方数・勝てたタイプを積み上げ表示（post-reward reset回避、endowed progressで着手障壁を下げる）。

---

## 置き換えるべき虚栄指標 → 意味のある指標 対応表

| 虚栄指標（外す/背面へ） | 意味のある指標（前面へ） | 実感が湧く理由 |
|---|---|---|
| 今週の練習日数 | 封じた崩れ方の数（累積） | 崩れが減る＝負けにくくなった実感 |
| 課題の登録件数 | 武器になった型の数（累積） | 決め手が増える＝勝ち筋の実感 |
| 週目標の達成率 | 卒業した焦点の数 | 課題が"上がっていく"手応え |
| 累計練習時間 | 対タイプ勝率の変化（例カットマン0→2勝） | 「前は勝てなかった相手に勝てた」 |
| 連続ログイン日数 | 同一課題のThen vs Now差分 | 過去の自分との距離＝純粋な成長 |
| こなした課題数 | 試合メモに現れた戦術語の増加 | 技術語→戦術語＝中級者の壁の突破 |

---

## 振り返りカードの設計案

### 週次カード（軽量・縦型スワイプ 3画面）
- **画面1「試した型」**: 今週アクティブにした武器/焦点を1つ。状態の変化を一言（「試した→少し入るように」）。
- **画面2「うまくいった1本」**: 自分で登録した"決まった場面"を1件ハイライト。なければAIがメモから拾って提示。
- **画面3「持ち越し」**: 来週に続く課題を1つだけ。数字は出さず、次の一手だけ。
- データ源: `snapshot` 差分＋今週の試合/練習メモ。AIは事実の言い換えに限定。

### 月次カード（物語・縦型 4〜5画面）
- **画面1 サマリー文（AI生成）**: 「この1ヶ月で、バック側の安定が増え、サーブレシーブからの崩れを1つ封じ、フォア回り込みが武器になりました」。各節に数値の裏づけを1つ。
- **画面2 卒業タイムライン**: 今月ステータスが上がった焦点/課題を時系列で。灰色の"卒業済み"が増えていくのを見せる。
- **画面3 武器コレクション更新**: 新たに「決まった」に昇格した型。
- **画面4 封じた崩れ方**: 今月「封じた」に移った敗因。
- **画面5（任意）対タイプの変化**: 「前は勝てなかった◯◯タイプに、今月◯勝」。
- 設計原則: 1画面1事実／絶対値＋差分＋節目の三点セット／他人比較は一切なし／全処理は端末内。

---

## 出典URL一覧
- https://stormotion.io/blog/fitness-app-features/
- https://stormotion.io/blog/fitness-app-ux/
- https://trophy.so/blog/how-to-build-wrapped-feature
- https://www.androidauthority.com/duolingo-year-in-review-2025-3621782/
- https://support.strava.com/en-us/articles/15401959-your-year-in-sport
- https://learningloop.io/glossary/self-determination-theory-sdt
- https://selfdeterminationtheory.org/theory/
- https://www.mindtools.com/arzm8fy/amabile-and-kramers-progress-theory/
- https://learningloop.io/plays/psychology/goal-gradient-effect
- https://home.uchicago.edu/ourminsky/Goal-Gradient_Illusionary_Goal_Progress.pdf
- https://www.reflection.app/ai
- https://world-tt.com/ps_info/ps_report_detail.php?bn=5&pg=HEAD&page=BACK&rpcdno=680
- https://choretaku.com/magazine/table-tennis-how-to-increase-scoring-rate-complete-guide
- https://choretaku.com/magazine/table-tennis-first-set-scouting
- https://rallys.online/forplayers/howto/practice/
