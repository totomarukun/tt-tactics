# tt-tactics ユーザーインサイト調査 01

作成: 2026-09-14 / 対象: 中級〜上級シェークハンド両ハンドドライブ型（趣味〜市・県大会レベル）
目的: tt-tactics を「薄いノート」から「上達する人が手放せないツール」へ。本質価値の言語化と機能示唆。

---

## 1. 中級者が伸び悩む本当の理由 ―「練習の中身」が試合とズレている

**発見。** 伸び悩みの正体は才能でも練習量でもなく、練習の設計ミス。コーチや上級者の一次情報が繰り返し同じ構造を指す。卓トレ／choretaku の現場コーチは、勝てない原因を5つに集約する ―(1)試合を想定しない「打ちやすい球だけのラリー」、(2)判断の遅れ（事前の判断基準が固まっていない）、(3)サーブ・レシーブの質、(4)得点パターンの未確立、(5)崩れた状態から立て直す練習の欠如。特に「5球目以降のラリーは半分未満で、序盤4球で勝負が決まる」という指摘は、練習配分の常識とのズレを突く。

海外側も同じ。r/tabletennis 界隈の総括は「多くの人は卓球を"やって"きただけで"学んで"こなかった（played, not learned）」。試合を打ち続けても伸びず、意図的・構造的な練習と振り返りが要るという結論に着地する。

**根拠。** [卓トレ](https://taku-tore.com/article/35445) / [choretaku（練習しても勝てない）](https://choretaku.com/magazine/table-tennis-why-you-cant-win-despite-practice-causes-solutions) / [WRM ぐっちぃ](https://yamaguchi.diary.to/archives/51929163.html)（上級者は打てない球でも攻撃、中級者は「入れてしまう」つなぎ球の質差）/ [Eleven Table Tennis 掲示板](https://steamcommunity.com/app/488310/discussions/0/3183488224880192753)

**tt-tactics への示唆。** 戦術ツリーは「知識」を貯める箱に見えて、実は「練習配分の設計図」に化ける余地がある。ツリーのノードに《サーブ→3球目→4球目》の序盤4球を骨格として置き、各分岐に「この形を何回練習したか」「試合で何回使えたか」を紐づける。ノートではなく、練習と試合の因果を可視化する装置にする。

---

## 2.「知っている」と「できる」の断絶 ― 転移こそがコア価値

**発見。** 中級者は戦術知識を持っている。足りないのは、それを試合の一瞬で引き出す「判断基準」。choretaku は端的に「判断基準を紙に書き出しておくこと」で技術の高さが勝率に直結すると書く。スキル習得研究（Ericsson 系のメタ分析、Macnamara 2014）も、意図的練習の効果は「明確な目標・即時で行動可能なフィードバック・振り返り」の3点が揃って初めて出るとする。逆に、フィードバックと振り返りが欠けた反復は効かない。

note の実体験談が象徴的。監督から「サーブの質が低い」と一点を指摘され、下回転サーブを30分×3ヶ月続けたら、友人から「サーブが切れている、ナックルも取りにくい」と手応えが返り、先に攻める機会が増えて勝てるようになった。**一点の課題特定 → 集中反復 → 他者フィードバックで検証**、という転移のループが回った瞬間だ。

**根拠。** [choretaku（戦術と駆け引き）](https://choretaku.com/magazine/playful-mind-logic) / [note かズ](https://note.com/kmmyt0223/n/n95cbb343aa46) / [Effective practice framework (Tandf 2023)](https://www.tandfonline.com/doi/full/10.1080/02640414.2023.2240630) / [Deliberate practice meta-analysis](https://www.researchgate.net/publication/263713247_Deliberate_Practice_and_Performance_in_Music_Games_Sports_Education_and_Professions_A_Meta-Analysis)

**tt-tactics への示唆。** アプリの中核を「知識庫」から「知っている→できるの転移ループ」に定義し直す。戦術ツリーのノード＝仮説、課題＝その練習、練習ログ＝反復量、試合結果＝検証、AIコーチ＝振り返りの相手。この5機能はバラバラの記録欄ではなく、**1本の学習ループの各工程**。UI上でも「仮説→練習→試合→振り返り→仮説更新」の循環として繋いで見せる。

---

## 3. 試合本番の壁 ― 緊張とプレッシャーは「別枠のスキル」

**発見。** 中級者の失点の多くは技術ではなく本番の崩れ。10-8 の場面で脳の防衛本能が過剰な筋緊張を生み、スイングが鈍ってミスが連鎖する、という具体描写が複数ソースで一致。対策は精神論ではなく手順化 ―腹式呼吸・筋弛緩・動作への集中・スコアのリセット・間を切る、の5ステップ。加えて「普段の練習に試合の緊張感を持ち込む（ハンデ戦・プレッシャーゲーム）」ことが本番の自信を作る。

**根拠。** [choretaku（10-8で固まる）](https://choretaku.com/magazine/table-tennis-overcoming-the-fear-of-choking-at-10-8-score) / [卓球Lab（緊張対策11選）](https://tabletennis-lab.com/nervousnessplan/) / [タクティブ（緊張しない方法）](https://www.tactive.co.jp/media/10110/)

**tt-tactics への示唆。** 試合結果の記録に「競り合い（8点以降）で何が起きたか」の項目を1行だけ足す。勝敗より「終盤に固まったか／どのサーブに逃げたか」を残す方が、本人の弱点データになる。AIコーチには本番前に開く「リセット・ルーティン」（呼吸→この試合の1つの狙い）を持たせ、緊張を"別枠で鍛えるスキル"として扱う。

---

## 4. 続かないツールの共通因子 ―「おもちゃ」で終わる罠

**発見。** フィットネス系アプリは30日で最大8割が離脱し、約20週で利用がベースラインに戻る。原因は「90日目が1日目と同じ体験」＝新奇性の枯渇。習慣は Cue→Action→Reward で回るが、報酬が遠く抽象的だと切れる。Duolingo はここを「学習目標を"損失回避"行動に変換」して突破した（ストリーク＝失いたくない）。churn を 2020年47%→2023年28%へ、DAU を10倍超に。核は「1回3分・ほぼ努力ゼロの中核アクション」と「毎日のフィードバック・可視化トラッカー」。

一方で行きすぎた比較・強制は逆効果。Strava 研究は、社会的比較と自己監視が動機になる反面、不調時・故障時にはプレッシャーとストレスに転じ、「遅い記録は投稿しない」等の回避行動を生むと報告する。

**根拠。** [なぜ8割が30日で離脱するか](https://vocal.media/01/why-most-fitness-apps-lose-80-of-users-in-30-days) / [Duolingo ストリーク設計](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/) / [Strava 社会的比較の心理（PMC）](https://pmc.ncbi.nlm.nih.gov/articles/PMC12938745/)

**tt-tactics への示唆。** 端末内・個人向けで SNS的比較がない設計は、Strava の負の側面を避けられる強み。だが習慣化の起点は要る。日次の中核アクションを「練習後30秒の1行メモ＋今日の狙いを1つ選ぶ」まで削る。ストリークは"連続日数"ではなく「課題を検証した回数」に紐づけ、量ではなく学習の前進を数える。90日目に1日目と違う体験を出すため、AIコーチが過去ログから傾向を返す「時間が経つほど賢くなる」設計を核に据える。

---

## 5. 自分のデータが「気づき」に化ける条件 ― 示唆は加工して返す

**発見。** データは貯めるだけでは動機にならない。効くのは「翻訳」だ。Strava は生ログを個人向けの平易な示唆に変える Athlete Intelligence を投入した。日本卓球協会も、状況別の得点確率・サーブレシーブ傾向・特定相手への失点パターンを蓄積し、「相手の弱点と自分がすべきこと」を導くために使う。自己決定理論が示すように、人は「進歩の証拠が見えるとき」に有能感が育ち、内発的動機が続く。小さな一貫性の向上（狙いが通った回数）が競争心より効く。

**根拠。** [Strava Athlete Intelligence](https://www.prnewswire.com/news-releases/stravas-athlete-intelligence-translates-workout-data-into-simple-and-personalized-insights-302266680.html) / [Rallys（卓球界のデータ分析）](https://rallys.online/read/190701ishimaru-data/) / [成長マインドセットと競争動機（PMC）](https://pmc.ncbi.nlm.nih.gov/articles/PMC12151056/) / [Hudl（映像分析の価値）](https://www.hudl.com/blog/the-power-of-video-analysis-in-sport)

**tt-tactics への示唆。** 記録画面に生数字を並べない。AIコーチが月1で「この1ヶ月、あなたはバック側へのロングサーブで先に攻められた試合が7割。逆にフォア前の短いサーブに固まっている」のように、勝ちパターン／崩れパターンを1〜2文で返す。データの価値＝「次に何を練習すべきか」への翻訳、と定義する。

---

## tt-tactics が狙うべきコアインサイト Top5

1. **中核価値は「知っている→できる」の転移ループ。** ノート機能の集合ではなく、仮説（ツリー）→練習（課題・ログ）→試合（結果）→振り返り（AI）→仮説更新、を1本の循環として体験させる。ここが競合ノートアプリと分かれる一点。
2. **序盤4球が主戦場。** ラリーの美しさより「サーブ→3球目→4球目」の設計と再現を軸に据える。ツリーの骨格を序盤4球にすると、記録と練習が試合に直結する。
3. **勝敗より「崩れ方」を記録する価値。** 競り合いでどう固まり、どの球に逃げたか。本番の緊張は別枠のスキルであり、そこを可視化できるツールは他にない。
4. **習慣は"損失回避"より"前進の実感"で回す。** 個人・端末内という設計を武器に、比較のプレッシャーを排し、「検証した課題の数」で成長を数える。
5. **データは翻訳して初めて価値になる。** 生ログの表示ではなく、AIコーチが勝ち／崩れパターンを言語化し「次の1つの狙い」に落とす。時間が経つほど示唆が濃くなる＝手放せなくなる。

---

## 今すぐ効く機能アイデア（優先度付き / 既存機能ベース）

**優先度 高**

- **[試合結果] 敗因タグと「崩れ方」1行入力。** 勝敗＋「終盤に固まった／このサーブに逃げた／この球で先に打たれた」を選択式で。分析の原材料をここで作る。
- **[AIコーチ] 月次インサイト自動生成。** 試合結果と練習ログを横断し「勝ちパターン・崩れパターン・次に練習すべき1つ」を1〜2文で返す（Strava Athlete Intelligence 型）。tt-tactics の"手放せなさ"の中核。
- **[戦術ツリー↔課題] ノードに練習・使用回数を紐づけ。** 「この分岐を何回練習したか／試合で何回出せたか」を表示し、知識と実戦のギャップを可視化。

**優先度 中**

- **[練習ログ] 30秒・1行の日次アクション＋「今日の狙い」1つ選択。** 中核アクションを極小化して習慣の起点にする。連続記録は日数でなく「検証回数」で数える。
- **[試合前] リセット・ルーティン画面。** 呼吸ガイド＋「今日の1つの狙い」表示。緊張を手順で扱い、AIコーチが相手タイプ別の狙いを提案。
- **[戦術ツリー] 序盤4球テンプレート。** 新規ノードを《サーブ／レシーブ／3球目／4球目》の型から作れるようにし、設計を試合構造に合わせる。

**優先度 低（将来）**

- **[AIコーチ] 対戦相手カルテ。** 相手戦型ごとに過去の失点パターンを蓄積し、次戦前に「この相手にはこの形が刺さった／この球で崩れた」を提示。
- **練習の"意味付け"プロンプト。** 課題登録時にAIが「なぜこの練習か（狙う分岐）」を一言添え、目的なき反復を防ぐ。

---

## 出典 URL 一覧

- https://taku-tore.com/article/35445
- https://choretaku.com/magazine/table-tennis-why-you-cant-win-despite-practice-causes-solutions
- https://choretaku.com/magazine/playful-mind-logic
- https://choretaku.com/magazine/table-tennis-overcoming-the-fear-of-choking-at-10-8-score
- https://yamaguchi.diary.to/archives/51929163.html
- https://note.com/kmmyt0223/n/n95cbb343aa46
- https://tabletennis-lab.com/nervousnessplan/
- https://www.tactive.co.jp/media/10110/
- https://www.tandfonline.com/doi/full/10.1080/02640414.2023.2240630
- https://www.researchgate.net/publication/263713247_Deliberate_Practice_and_Performance_in_Music_Games_Sports_Education_and_Professions_A_Meta-Analysis
- https://vocal.media/01/why-most-fitness-apps-lose-80-of-users-in-30-days
- https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12938745/
- https://www.prnewswire.com/news-releases/stravas-athlete-intelligence-translates-workout-data-into-simple-and-personalized-insights-302266680.html
- https://rallys.online/read/190701ishimaru-data/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12151056/
- https://www.hudl.com/blog/the-power-of-video-analysis-in-sport
- https://steamcommunity.com/app/488310/discussions/0/3183488224880192753
