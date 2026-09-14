# tt-tactics UX/インタラクション設計インサイト

対象: 卓球の戦術を台の図と分岐図で整理し、練習課題・練習ログ・試合結果・AIコーチを持つ個人向け PWA（片手、練習中／試合直後、端末内、React + SVG）。
狙い: 「機能ごとのタブの寄せ集め」から、開くたびに次の一手が決まり、記録が続き、上達が見える体験へ。
調査日: 2026-09-14。一次情報は末尾の出典を参照。丸写しはせず要約・再構成した。

---

## 1. ホーム＝「次の一手」と「今日の一つの数字」

**パターン**：Oura と Whoop は朝いちばんに 0〜100 の一つのスコア（Readiness / Recovery）を出し、「今日は追い込むか、引くか」を一目で決めさせる。Oura のホームは readiness / sleep / activity の3スコアだけを前面に置き、残りは奥へ隠す。

**なぜ効くか**：複数の生体指標を一つの数字に畳んで、朝の判断コストをゼロにしている。指標を並べるのではなく「今日どうするか」に翻訳する設計。fitness アプリ全般で「どの可視化も次の一歩を示せ（例：休息日を足す、シューズを替える）」が原則とされる（stormotion, Oura Blog, athletedata.health）。

**tt-tactics への適用**：
- ホーム最上部に「今日のカード」を1枚。中身は状況で切り替える：直近の試合結果があれば「前回××に負けた展開 → 対策の戦術Aを5分」、なければ「未消化の課題」、それも無ければ「昨日の続き」。
- カードのボタンは1個（例「この課題を始める」）。タップで戦術図か練習タイマーへ直行。判断させない。
- 数字は「今週の練習回数」「直近の勝率」など1〜2個に絞り、ホームでは詳細を出さない。

## 2. 低摩擦の記録：数タップ・その場・片手

**パターン**：Hevy / Strong はセット記録を前回値プリフィル＋数タップで完了させ、休憩中に片手で入力できる。「タップを減らし、持ち上げる時間を増やす」設計思想。国内の筋トレ記録アプリ評でも「入力が極限に簡単でトレの流れを邪魔しない」が継続の条件とされる（setgraph, smartlog）。

**なぜ効くか**：記録が「作業」になった瞬間に人はやめる。前回値の再利用と自動集計で、入力を「確認して確定するだけ」に落とす。

**tt-tactics への適用**：
- 試合結果は「勝／負」＋スコアの2〜3タップで確定。相手・戦術は既存チップから選ぶだけ（新規入力は任意で後回し）。
- 練習ログは、その課題を「やった」ボタン1つ＋主観手応え（👍／😐／👎の3択）で完了。回数や分数は前回値をプリフィル。
- 試合直後の入力を想定し、記録ボタンは常に親指の届く画面下部・大きなタップ領域に固定。
- 音声メモ（Web Speech API）で「バック側が甘かった」を一言残せる欄。テキスト化は後でよい。

## 3. 継続の仕掛け：ストリーク・損失回避・やさしさ

**パターン**：Duolingo のストリークは「積み上げたものを失う痛み（損失回避）」を継続の原動力にし、ストリーク・ウェイジャーで14日リテンションが14%上昇したと報告。同時に Streak Freeze / Weekend Amulet で「1日抜けたら終わり」の燃え尽きを防ぐ。Gentler Streak は「休むこと自体を肯定する」やさしい継続設計で支持される。

**なぜ効くか**：損失回避は強い一方、罰ゲーム化すると離脱を招く。強い動機づけと逃げ道をセットにするのが要点。

**tt-tactics への適用**：
- 「週◯回」のゆるい目標＋達成の記録を持たせる（毎日ではない。卓球は毎日打てない前提）。
- 連続週の可視化を置きつつ、「今週はお休み」を能動的に選べる（罪悪感を出さない）。
- 通知は Duolingo 式のエスカレーションを弱めに：軽いリマインド中心、責める文面は使わない。個人利用なので煽りは逆効果。

## 4. 上達の可視化：ヒートマップ・トレンド・レーダー・before/after

**パターン**：GitHub 風のコントリビューション・ヒートマップは時系列の濃淡で「やった／やらない」を一目にする定番。QS 研究では「可視化を読めて初めて自己認識と行動変容が起きる」とされ、trend／goal-progress ダッシュボードが有能感と統制感を高めた（Fitbit/Jawbone 研究）。「日次＝短期行動、週次＝パターン、月次＝価値の正当化」を行き来できる設計が効く（Rapp QS 論文, gotopia, uxmatters）。

**なぜ効くか**：生データの表ではなく、パターンが浮かぶ形（濃淡・傾き・面積）にして初めて人は気づき、動く。

**tt-tactics への適用**：
- 練習ヒートマップ（曜日×週のカレンダー濃淡）。空白が続くと自然に埋めたくなる。
- 戦術ごとの「使用回数と勝率」を横棒で。勝率が低い戦術＝要改善が浮く。
- 得点／失点パターンをレーダーやゾーン別ヒートマップで（3列×3深の既存ゾーンを流用）。「バック深めで失点が多い」が図で分かる。
- 各戦術の勝率トレンド（折れ線）で before/after を見せ、「対策を入れてから勝てるようになった」を実感させる。

## 5. AIコーチ：チャットではなく「インサイトカード」と「次アクション」

**パターン**：Budy はコーチの提案を「スキップ／組み替え／代替提示」などの可視アクションカードとして出す。AIコーチの差別化は「対話量」ではなく actionability（提案を具体的な次の一歩に変換できるか）だと整理されている。会話型はユーザーが話しかけないと動かない受動型で、プロアクティブなカード配信が優位（Budy, cloverleaf, saner.ai）。

**なぜ効くか**：チャット欄は「何を聞けばいいか」の負担を残す。カードは分析結果を先回りで置き、1タップで行動につながる。

**tt-tactics への適用**：
- AIは常時チャットで待たせず、ホームや試合記録後に「インサイトカード」を差し込む：「直近5試合、フォア前の短いサーブで先手を取れていない → 対策の戦術を作りますか？」。
- カードの末尾は必ず1アクション（「戦術ツリーに追加」「練習課題にする」）。tt-tactics のツリーモデルにそのまま書き込めると強い。
- 試合結果の確定直後を、AIが最も価値を出す瞬間として扱う（記憶が新しく、次への意欲が高い）。
- 既存のハーネス（runner/verify）で verdict が reject の助言は出さない＝「当たり障りない助言」の排除に一致。

## 6. 戦術可視化とインタラクション

**パターン**：卓球/テニスの tactic board 系（CourtDraw, Tennis Tactic Board）は矢印・点線・弧・テキストの最小ツールで plays を描き、静止図と再生アニメ／動画書き出しを両立。学術系 Tac-Simur は「ナビ→探索→説明」の3層で戦術を分析させる。

**なぜ効くか**：ラリーは動きの連鎖。静止図で構造を、アニメで時間軸を見せると理解が跳ねる。

**tt-tactics への適用**：
- 分岐ツリーの root→leaf を、台の図の上で球が順に飛ぶ短いアニメ再生（SVG の path アニメで実装容易）。「この展開」を動きで確認できる。
- 分岐ノードはボトムシートで編集し、確定するとツリーとして即書き込み（既存の設計方針を維持）。
- 台図の上で球の着点をドラッグ配置＋ハプティクス（`navigator.vibrate([30])`）で「置いた」感触を返す。

## 7. モバイルの作法：ジェスチャー・ボトムシート・オフライン

**パターン**：2026 のモバイル潮流は「複合ジェスチャー＋触覚フィードバック」「二次情報はボトムシート」。send/save/confirm など要所で `navigator.vibrate` を使い、目で確認する前に指で分かる状態を作る。PWA はエラー画面の代わりにキャッシュを出し、Starbucks はオフラインで注文をキューし復帰後に同期する（Muzli, Lollypop, wearetenet）。

**tt-tactics への適用**：
- 端末内データ＋オフラインファーストを明示。試合会場で電波が無くても記録でき、あとで同期不要（元々ローカル）。この「その場で必ず動く」は競合の記録アプリに対する強み。
- 主要操作（記録確定・課題完了）に軽いハプティクスを付与。
- 詳細編集はボトムシート、閲覧はホーム。破壊的操作（削除）はスワイプ＋確認で誤操作を防ぐ。

---

## 採用すべきデザイン原則 Top5

1. **開けば次の一手が決まっている**：ホームは機能一覧ではなく「今日の1カード＋1アクション」。判断コストをアプリが肩代わりする。
2. **記録は確認するだけ**：前回値プリフィルと3択で、入力を作業から確認へ。試合直後を最重要の記録機会として設計する。
3. **可視化は次の行動に翻訳する**：ヒートマップ・勝率・トレンドを「だから次はこれ」まで落とす。数字の羅列で止めない。
4. **AIはカードで先回りする**：チャット欄で待たせず、記録後に具体提案を差し込み、末尾は必ずツリー/課題への1タップ。
5. **強い動機づけとやさしい逃げ道をセットに**：ゆるい週目標＋休む選択肢。個人利用ゆえ煽らない。

## 情報設計の再構成案（4タブ寄せ集め → 上達ループ）

現状（戦術／課題／練習／設定）は「機能で」割れている。「上達ループ（記録→気づき→次の練習→試す）」で割り直す。

- **ホーム（今日）**：今日の1カード、今週の数字1〜2個、AIインサイト、直近ログのミニ表示。すべての入口。
- **戦術**：台の図＋分岐ツリー（既存の中核。ここは維持）。アニメ再生を追加。
- **記録**：練習ログ＋試合結果を1タブに統合（別々にしない）。ヒートマップ／勝率／トレンドの可視化もここ。
- **（設定は下位へ）**：タブから外し、ホーム右上かプロフィールへ格納。常用しない機能はタブを占有させない。

課題は独立タブをやめ、「ホームの今日カード」と「戦術に紐づくやるべき練習」として溶かす。タブは3つに減らし、片手の親指動線を短くする。

## すぐ効く UI 改善（実装しやすい順）

1. **設定タブを外す**（低コスト・即効）：4タブ→3タブ。ホーム右上のアイコンへ。タブ動線がすっきりする。
2. **記録ボタンを画面下部固定＋大きく**（低コスト）：試合直後に片手で押せる位置へ。
3. **試合結果を勝/負＋スコアの数タップに**（低〜中）：チップ選択＋前回値プリフィル。新規入力は任意。
4. **ホームの「今日の1カード」**（中）：状況分岐は単純ルールから（未消化課題→直近試合→続き）。AIは後から差し込めばよい。
5. **練習ヒートマップ**（中）：カレンダー濃淡。SVG で実装でき視覚効果が高い。
6. **要所のハプティクス＋3択手応え入力**（中）：`navigator.vibrate` と 👍😐👎。
7. **AIインサイトカード**（中〜高）：既存ハーネスの出力をホーム/記録後に1枚のカード＋1アクションで提示。
8. **戦術ツリーの台上アニメ再生**（高）：SVG path アニメ。理解体験の目玉になる。

上1〜3はほぼ工数なしで「寄せ集め感」を減らせる。4以降が「続く・手放せない」体験の核。

---

## 出典URL一覧

- Fitness App UI Design (stormotion): https://stormotion.io/blog/fitness-app-ux/
- Designing a Fitness Platform (UXmatters): https://www.uxmatters.com/mt/archives/2025/07/designing-a-fitness-platform-ux-design-challenges-and-solutions.php
- Oura Readiness Score: https://ouraring.com/blog/readiness-score/
- WHOOP vs Oura vs Garmin (athletedata.health): https://www.athletedata.health/guides/whoop-vs-oura-vs-garmin
- WHOOP UX Evaluation (Everyday Industries): https://everydayindustries.com/whoop-wearable-health-fitness-user-experience-evaluation/
- Duolingo Streak System Breakdown (Medium): https://medium.com/@salamprem49/duolingo-streak-system-detailed-breakdown-design-flow-886f591c953f
- Duolingo Habit-Forming Reminders (Digia): https://www.digia.tech/post/duolingo-habit-forming-reminders-retention-architecture/
- Hevy vs Strong (Setgraph): https://setgraph.app/ai-blog/hevy-vs-strong
- 筋トレ記録アプリおすすめ (smartlog): https://smartlog.jp/208952
- Visualization of Human Behavior Data: The Quantified Self (Rapp): https://quantifiedself.com/wp-content/uploads/2014/06/QS_Camera_Ready-Rapp-final.pdf
- Quantified Self: From Data to Actionable Dashboards (gotopia): https://gotopia.tech/articles/226/quantified-self-from-data-to-actionable-dashboards
- Heatmap Analysis (think.design): https://think.design/services/data-visualization-data-design/heatmap/
- Best AI Coach App (Budy): https://budy.fit/best-ai-coach-app
- Top AI Fitness Apps 2026 (RapidNative): https://www.rapidnative.com/blogs/ai-fitness-apps
- CourtDraw Tactics Board: https://courtdraw.app/
- Tennis Tactic Board (App Store): https://apps.apple.com/us/app/tennis-tactic-board/id1583912655
- Tac-Simur (table tennis tactic visual analytics): https://ssxiexiao.github.io/papers/tacsimur.pdf
- Mobile App Design Trends 2026 (Muzli): https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026/
- PWA UX Tips 2025 (Lollypop): https://lollypop.design/blog/2025/september/progressive-web-app-ux-tips-2025/
- PWA Design Strategies (We Are Tenet): https://www.wearetenet.com/blog/progressive-web-app-design-strategies
- Mobile App Onboarding Best Practices 2026 (Eleken): https://www.eleken.co/blog-posts/mobile-app-onboarding-best-practices
- First Time User Experience Guide (Chameleon): https://www.chameleon.io/blog/first-time-user-experience
- Mobile Navigation UX Best Practices 2026 (DesignStudio): https://www.designstudiouiux.com/blog/mobile-navigation-ux/
- Tab Bar Navigation Guidelines (Nitrous): https://www.nitrousdesign.com/blogs/guideliness-for-designing-effective-tab-bar-navigation-on-mobile
