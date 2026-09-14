# 構造化リフレクション設計 — 「書く」から「選ぶ・更新する」へ

作成日: 2026-09-14
対象: tt-tactics（週1・中級、個人向け卓球上達PWA。戦術ツリー・実戦結果・崩れ方タグを持つ）
狙い: 完全フリーテキストの振り返りメモを、カテゴリ×短い箇条書き＋タグ＋穴埋めの軽い入力に置き換える。技術キューと戦術キューを別リストで持ち、パターン別に「効いた／効かない」を蓄積する。

関連: `04-postmatch-reflection.md`（試合後の振り返り）、`05-habit-motivation.md`（継続）、`DESIGN.md`（ショットツリー／ゾーン設計）。本書はこの2つの中間、「日々の練習で回るリフレクションの器」を設計する。

---

## 発見1: 振り返りは3〜4枠に固定すると回る

**根拠**
- スポーツ心理の現場テンプレは3問固定が定番。「うまくいった／学んだこと／次の改善点」を練習後10〜15分で書く（IMG Academy, iSport360）。
- コーチング領域の WWW/EBI（What Went Well / Even Better If）は、まず強みを挙げてから改善に移る2枠。ジュニア指導でも「うまくいったこと→さらに良くするには」の順が推奨される（England Football, iSport360）。
- KPT（Keep / Problem / Try）は「続けること・問題・次に試すこと」の3列。Alistair Cockburn 発、日本のチームで定着（Nulab, Parabol）。Try に必ずアクションを1つ残すのが肝。
- Start / Stop / Continue は「始める・やめる・続ける」の3枠。個人の習慣改善用途で広く使われ、SMART 化して1つに絞ると実行に移りやすい（BetterUp, Niagara Institute）。
- 米軍発の After Action Review（AAR）は4問固定: 「①想定 ②実際 ③差の理由 ④維持／改善」。FEMA・WHO・ビジネススクールに波及した“事実→差分→次アクション”の型（Wikipedia, Wharton）。

**共通項**: どの手法も枠数は3〜4に収まり、必ず「次の1アクション」で閉じる。フリーテキストが重いのは枠がないからで、枠を与えるだけで入力は選択に近づく。

**tt-tacticsへの具体設計**
- 練習/試合後カードは4枠固定。AAR の「差分」思考を卓球語彙に翻訳する:
  1. **効いた**（Keep / WWW）— 何がうまくいったか
  2. **崩れた**（Problem / EBI）— 既存の「崩れ方タグ」をそのまま流用
  3. **なぜ**（差の理由）— 選択式の一言（後述の定型文）
  4. **次に試す**（Try / Start）— キューリストへ1件昇格させるボタン付き
- ④は自由入力させず、「キューに追加」で技術/戦術キューへ流し込む。振り返りとキュー更新を1画面で連結する。

---

## 発見2: 「今意識すること」は数を絞った短いキューで持つ

**根拠**
- 「一度に1キュー。10個渡せば0個に集中する」。同時に1〜2個を超えると overthinking を招き学習が遅れる（Performance Course, Science for Sport）。
- 認知負荷理論: ワーキングメモリは有限で、情報過多で遂行が落ちる。小さな指示は一度に1つの実行可能な焦点に絞る（The Coaching Mindset）。
- 過剰にキューを出す癖があるなら「1セット2個まで」「3回に1回だけ声かけ」が実務指針（Barbell Rehab, Science for Sport）。
- 卓球の一次情報でも、ミスの原因を「打点が遅れた」など“一言”で特定し、次の1本はその1点だけに集中する運用が勧められる（ラリーズ／apricot.tips 系）。
- 注意の向け先は外的フォーカス（動作の結果・対象）が内的フォーカスより学習に有利な傾向。ただしタスク難度・習熟度で最適は変わり、内外を切り替える方が効く場面もある（J. Motor Learning & Dev. 2017, PLOS One 2023）。

**tt-tacticsへの具体設計**
- 「意識キュー」は**アクティブ枠を最大3件**に制限する（技術2・戦術1など）。4件目を足すには1件を「卒業」または「保留」へ動かす強制。数を絞ることそのものをUIで担保する。
- キューは**1動作1言**。表現ガイドを入力欄プレースホルダに常設:
  - 内的（体）: 「バックは前で振る」
  - 外的（結果・的）: 「相手のバック深くに刺す」— 迷ったら外的を推奨（学習有利）。
- 各キューに「向き」タグ（内的/外的）を持たせ、切り替え練習の記録にも使う。

---

## 発見3: 入力は「書く」から「選ぶ・更新する」へ

**根拠**
- プログレッシブ・ディスクロージャ: 最初は必須項目だけ出し、進むにつれ項目を展開すると認知負荷が下がり、完了が速く正確になる（LogRocket, NN/g）。
- 構造化された穴埋め型ワークフローは、自由記述より編集量が激減する。ある実験では、質問応答式のドラフトが自由口述比で語単位の修正 77%減、対話型AI比で 40%減（StepWrite, arXiv 2508.04011）。
- フォームは並び順の設計だけで初回成功率が 42%→78% に変わる（Static Forms）。
- 卓球ノートの継続コツは「一行二行でいい、簡単に、細く長く」。重い様式は挫折を招く（choretaku, pips-player）。

**tt-tacticsへの具体設計**
- **穴埋め定型文（テンプレ）** を主入力にする。「◯◯のとき△△する」を選択式スロットで組む:
  - 局面スロット（下回転サーブ時／相手のツッツキに／ラリー4本目以降 …）
  - 動作/戦術スロット（前で振る／回り込む／コースを散らす …）
  - 結果スロット（効いた／浮いた／詰まった …＝崩れ方タグ）
- 3タップで1文が完成。フリーテキストは「補足メモ」として畳んだ状態（プログレッシブ・ディスクロージャ）で残し、任意入力に格下げする。
- タグはすべて既存語彙から選択。新語は「その他→登録」でのみ増やし、選択肢が育つ設計にする。

---

## 発見4: パターン別「効いた／効かない＋一言」を蓄積して次に効かせる

**根拠**
- 卓球ノートの王道: 「このサーブをここに出したら効いた」を残し、得意な展開を一覧化。効いた戦術に印、効かなかったものは原因を一言、で勝ち／負けパターンが浮かぶ（EurekaMoments, world-tt「勝ちノート」, choretaku）。
- KPT/AAR とも「維持（効いた）／改善（効かない）」の二分と、それに紐づく短い理由が学習の核。

**tt-tacticsへの具体設計**
- 「パターン」= `DESIGN.md` のショットツリーの**1経路（根→葉）**。振り返りは新規テキストではなく、既存パターンへの**投票＋一言**にする。
  - パターンカードに「効いた／効かない」ボタン＋一言スロット（崩れ方タグ）＋日付。
  - カードは集計を表示: 直近成功率、試行数、直近コメント3件。数字が「次に何を練習するか」を指す。
- 見せ方: パターン一覧を「効いている順／伸び悩み順」で並べ替え。伸び悩み（成功率低×試行多）を練習課題へ昇格させる導線を置く。

---

## 発見5: 練習前に確認し、練習後に更新するループ

**根拠**
- どの手法も「事前の振り返り準備→実施→アクション化→追跡」の循環を前提にする（Start/Stop/Continue の運用手順, AAR）。
- キューは「3回に1回声かけ」のように反復で定着させ、定着したら次へ。固定ではなく回転させる前提（Performance Course）。
- ノートは「試して効果を確認し、印と原因を更新し続ける」ことで陳腐化を防ぐ（choretaku, EurekaMoments）。

**tt-tacticsへの具体設計**
- **練習前**: ホームに「今日の意識キュー（最大3件）」を大きく表示。ワンタップで開始。
- **練習後**: 同じキューに「効いた／微妙／変えたい」の3択。「変えたい」を押すと編集or卒業へ。振り返り4枠の④からもキューへ昇格。
- **陳腐化対策**: 各キューに「最終更新日」を持たせ、14日触れられていないキューを「見直し？」バッジで浮上させる。卒業したキューは履歴に残し、成長ログにする。

---

## まとめ1: 振り返り入力の推奨構造

| カテゴリ | 項目（スロット） | 選択肢の例 | 定型文候補 |
|---|---|---|---|
| 技術 | 局面 / 動作 / 結果 | バック前・回り込み・打点／前で振る・押さえる／効いた・浮いた | 「◯◯のとき、△△を意識したら【効いた/浮いた】」 |
| 戦術 | 配球パターン / 効果 | サーブ→3球目・ミドル攻め／効いた・読まれた | 「◯◯の展開は【効いた/効かない】。理由: △△」 |
| メンタル | 場面 / 切替 | リード時・競り合い／深呼吸・一言セルフトーク | 「◯◯の場面で△△したら落ち着けた」 |
| 次アクション | 昇格先 | 技術キュー / 戦術キュー | 「次は△△を試す」→キューへ1件昇格 |

原則: 4枠固定・各枠は選択優先・自由記述は畳んだ補足のみ・末尾は必ず1アクション。

## まとめ2: 技術キュー・戦術キューの管理UI案

- **2リスト分離**: 「技術で今意識」「戦術で今意識」をタブで並置。各アクティブ最大3件。
- **カード項目**: 一言（1動作1言）／向きタグ（内的・外的）／状態（試行中・定着・卒業・保留）／最終更新日／効いた率（練習後3択の集計）。
- **操作**: 上部に「今日はこれ」ピン留め。長押しで「卒業／保留」。4件目追加時は1件退避を要求（数の強制）。
- **推奨表示**: 外的フォーカスのキューを既定で上位提示。14日未更新は見直しバッジ。
- **連結**: 振り返り④「次に試す」・パターンカード「伸び悩み」からワンタップでキュー新規作成。

## まとめ3: フリーテキストからの移行案

1. **共存フェーズ**: 既存フリーメモは読み取り専用で保持。新規は構造化カードを既定にし、フリーは「補足」へ格下げ。
2. **タグ抽出**: 過去メモから頻出語（コース・崩れ方・技術名）を集計し、選択肢の初期セットに流用。ゼロから選択肢を作らせない。
3. **1タップ昇格**: フリーメモ画面に「この一文をキュー化／パターンに紐づけ」ボタンを置き、既存資産を構造へ吸い上げる。
4. **段階移行**: まず「意識キュー3件」だけ導入（最小・毎日開く）→次に練習後3択→最後にパターン別投票。重い機能を一度に出さない（プログレッシブ・ディスクロージャ）。
5. **撤退可能に**: どの構造化項目も「補足メモ」へフォールバックできる逃げ道を常設し、書きたい日は書ける状態を保つ（継続の担保）。

---

## 出典

- IMG Academy — Journaling for student-athletes: https://www.imgacademy.com/resources/articles/how-journaling-helps-student-athletes-improve-performance
- iSport360 — 7 Journaling Ideas: https://isport360.com/7-powerful-journaling-ideas-for-youth-sports-athletes/
- England Football — Reflective journal for coaching: https://community.thefa.com/coaching/b/youth-club-football-blogs/posts/using-a-reflective-journal-to-improve-your-coaching
- Nulab — Keep, Problem, Try: https://nulab.com/learn/project-management/run-keep-problem-try-retrospective/
- Parabol — KPT: https://www.parabol.co/templates/sprint-retrospectives/keep-problem-try/
- BetterUp — Start, Stop, Continue: https://www.betterup.com/blog/start-stop-continue
- Niagara Institute — Start-Stop-Continue: https://www.niagarainstitute.com/blog/start-stop-continue
- Wikipedia — After-action review: https://en.wikipedia.org/wiki/After-action_review
- Wharton — After-Action Reviews: https://executiveeducation.wharton.upenn.edu/thought-leadership/wharton-at-work/2021/07/after-action-reviews-simple-tool/
- Performance Course — One Cue at a Time: https://medium.com/performance-course/one-cue-at-a-time-d9da712e331f
- Science for Sport — Coaching Cues: https://www.scienceforsport.com/coaching-cues/
- The Coaching Mindset — Micro-Cues: https://www.thecoachingmindset.org/post/decision-making-in-sport-small-technical-instructions
- Barbell Rehab — External Cues and Motor Performance: https://barbellrehab.com/external-cues-motor-performance/
- Journal of Motor Learning and Development (2017) — Verbal Cues and Attentional Focus: https://journals.humankinetics.com/view/journals/jmld/5/1/article-p148.xml
- PLOS One (2023) — Verbal coaching cues and analogies: https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0280201
- LogRocket — Progressive disclosure: https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases/
- NN/g — Reduce cognitive load in forms: https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/
- StepWrite (arXiv 2508.04011) — Adaptive Planning for Speech-Driven Text: https://arxiv.org/pdf/2508.04011
- Static Forms — Form UX best practices: https://www.staticforms.dev/blog/form-ux-best-practices
- choretaku — 卓球ノートの書き方: https://choretaku.com/magazine/table-tennis-notebook
- EurekaMoments — 卓球戦術ノート: https://www.eureka-moments-blog.com/entry/2019/10/05/125031
- world-tt — 卓球 勝ちノート: https://world-tt.com/ps_pr/001/
- pips-player — 卓球ノートで実力アップ: https://pips-player.com/success-note/
- ラリーズ — 卓球ノートの重要性: https://rallys.online/forplayers/howto/jikuashi11/
