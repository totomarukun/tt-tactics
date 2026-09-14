# 03. 競合・事例リサーチ（tt-tactics のポジショニング）

調査日: 2026-09-14 / 対象: 卓球の戦術可視化 × 実戦フィードバック × 個人特化 × AI を掲げる PWA「tt-tactics」

---

## 1. 卓球専用アプリ・ツール

### 記録系ノートアプリ（卓球ノート／T2-Note／卓球スコアボード など、日本発）
- **できること**: セット別スコア、得点経過、戦型、ムードをタップ数十秒で記録。戦型別勝率グラフや月次サマリー、スコアボードとの連携。T2-Note は得点/失点パターンの戦術メモを持つ。
- **弱み**: 記録の「入力と集計」が主役で、戦術そのものを図として設計する機能がない。得点パターンは自由記述のメモ止まりで、コースや配球の分岐を構造化できない。
- **ユーザーの不満**: 手書きノート側で顕著。「ノートを取り出してペンを出して机を探す」手間、完璧に仕上げようとして三日坊主、義務化すると続かない。継続には「1日5分・1〜3行・殴り書き」まで負荷を下げる必要がある（ラリーズ／choretaku）。
- **tt-tactics への示唆**: 入力の速さは既に競合が高い水準にある。差は「記録が翌日の練習指示書に変わる」導線。事実→理由→次の行動の3段を、tt-tactics の分岐図と練習課題に自動で橋渡しできれば、記録アプリの上位互換になる。

### 対戦相手スカウティング（TT Playbook Player, ドイツ発）
- **できること**: 相手ごとのプロファイル（戦型・用具・強み弱み・対戦成績）、試合前の戦術ブリーフ自動生成、ノートからのパターン抽出とドリル提案、用具DB(ラバー300/ラケット170)、TTRレート計算、CSV出力。無料は相手20人/試合100件、Proは€4.9/月。
- **弱み**: 相手起点の「対策メモ」が中心で、自分の戦術体系を樹形図で育てる思想は薄い。ドリル提案はテンプレ寄り。
- **示唆**: スカウティングの完成度は高い。tt-tactics は「相手対策」ではなく「自分の型（得意な3球目、逃げ道の配球）を分岐で持ち、それを相手別にチューニングする」方向で棲み分ける。

### AI映像解析（Stupa Analytics, ITTF系 / SportArc(旧PingPi) / TT Match Analyzer）
- **Stupa**: 14〜15台の高速カメラで着球点・軌道・速度を20秒以内に判定。プロリーグ(UTT)向けが本体で、個人が家の卓球台に導入するのは非現実的。
- **SportArc(旧PingPi)**: スマホ動画からラリー自動カット、3Dでフォーム比較、着球点・ショット統計、練習プラン生成。$14.99/月・$99.99/年。卓球/バド/テニス対応。iPad最適化。
- **TT Match Analyzer**: レートとゲーム別スコア、相手の戦型を入力すると戦術示唆・弱点パターン・ドリル・用具を返す無料ツール。15秒動画のベータあり。出力精度は「入力の細かさ次第」と自ら明記。
- **弱み共通**: 映像・カメラ依存はコスト/設置/撮影の壁が高い。テキスト入力型のAI示唆は手軽だが、根拠が薄く一般論に流れやすい。
- **示唆**: tt-tactics は映像解析には踏み込まず、「構造化された戦術データ（分岐図＋ログ）を文脈としてAIに渡す」ことで、TT Match Analyzer型の"入力が薄いと当たり障りない"問題を回避できる。ここが Gemini 連携の勝ち筋。

---

## 2. 他競技からの転用発想

- **SwingVision（テニス）**: iPhoneだけでショット速度・配置・ラリー長・自動採点・ラインコール（接戦球で人間の目より正確）、無駄時間を削った10分ハイライト。ロディック等が出資。示唆＝「撮る→自動で統計→短時間で振り返る」ループの完成度が個人スポーツの理想形。tt-tactics は映像なしでこの"振り返りの短さ"を配球ログで再現したい。
- **Hudl / Dartfish / Coach's Eye**: Hudlはチーム映像交換、Dartfishは関節角度など生体力学の精密分析（五輪・競泳/野球）、Coach's Eyeは終了済み。いずれもチームか高額プロ向けで、個人アマの戦術設計は空白。
- **戦術ボード（TacticalPad, Badminton Tactic Board 等）**: 図は描けるが「静止画1枚」。分岐・条件（相手がこう来たら）や実戦結果との接続がない。tt-tactics の「台の図×分岐×ログ連動」はこの静止ボード群の明確な進化形。
- **日本のAIフォーム系（AIスマートコーチ/AIスポーツトレーナー）**: 骨格解析でお手本と比較、23〜50競技対応。技術（フォーム）に寄っており、戦術・配球は扱わない。tt-tactics と競合しない。

---

## 3. 選手が実際に使う代替手段

紙ノート、スマホのメモ、スプレッドシート、動画、LINEグループ、コーチとの口頭。
- **不満**: 紙は物理的手間と継続困難。メモ/スプレッドシートは検索・集計はできても図で戦術を組めない。動画は撮っても見返さない・整理が重い。口頭指導は記録に残らず再現性がない。
- **乗り換え障壁**: 「無料で今あるもので足りている」感、入力の面倒さ、既存記録の移行コスト。
- **示唆**: 敵は他アプリより「メモ帳と現状維持」。初期入力ゼロでも価値が出る（テンプレ分岐図が最初から入っている、1タップで得失点を樹に足せる）設計が乗り換えの鍵。

---

## 4. AI/LLM×スポーツの実態

- NWSLのL.ハーヴィー監督がChatGPTを戦術の壁打ち相手に使い、順位改善と相関（高レベルの示唆は有効、細部は人間が判断）。
- 研究では、LLMは単純な練習計画には有用だが複雑な期分けは人の監修が要る。コーチの65%は「微修正で使える」としたが選手側は27.8%のみ、47.2%が大幅修正要求。ハルシネーションで無関係な助言も出る。
- **示唆**: AIは「壁打ち・言語化・叩き台」で強く、「断定的な指導」では弱い。tt-tactics は AI を"戦術の言語化パートナー"に留め、根拠＝自分の分岐図とログを必ず引かせる設計にすれば、他ツールのAIより当たりが鋭くなる。

---

## 5. 空白地帯（誰も上手くやれていない領域）

1. **戦術の「構造化データ」を持つ個人向けツールが無い**: 記録アプリはスコア/メモ、ボードアプリは静止画、映像系はプロ向け。「台の図＋条件分岐で戦術を樹として育てる」個人プロダクトは空白。
2. **戦術図と実戦結果のループが切れている**: 分岐（この配球を選ぶ）→ログ（実際どうなったか）→勝率で枝を更新、という閉ループを回すツールが存在しない。
3. **AIの入力文脈が薄い**: 既存AIツールは自由記述やレート止まり。構造化された自分の戦術データをAIに渡す仕組みが空白＝ここが tt-tactics の堀。

---

## 競合マップ（埋まっている／空白）

| 軸 | 埋まっている | 空白 |
|---|---|---|
| スコア/記録 | 卓球ノート, T2-Note, TT Scorer | — |
| 相手スカウティング | TT Playbook Player | 個人の「自分の型」起点の設計 |
| 映像/フォーム解析 | Stupa, SportArc, AIスマートコーチ, SwingVision | 映像なしの配球ログ振り返り |
| 戦術ボード | TacticalPad, Badminton Tactic Board | 分岐・条件・結果連動の動的な図 |
| AIコーチ | TT Match Analyzer, ChatGPT代用 | 構造化データを文脈に渡すAI |
| **戦術可視化×実戦ループ×個人×AI** | **該当なし** | **← tt-tactics の主戦場** |

---

## tt-tactics が取るべきポジショニングと差別化 Top3

1. **「戦術を樹として育て、実戦結果で枝を更新する」唯一のツール**。分岐図×ログ×勝率の閉ループを核に据える。記録アプリ・戦術ボードのどちらにも無い。
2. **AIを"断定コーチ"ではなく"戦術の言語化パートナー"に**。自分の分岐図とログを必ず根拠に引かせ、TT Match Analyzer型の一般論を超える。壁打ち・仮説出し・練習課題への変換に用途を絞る。
3. **初期入力ゼロで価値、継続負荷は「1タップ・数行」まで下げる**。テンプレ分岐図を最初から同梱し、得失点を1タップで樹に足せる。敵は競合アプリでなく「メモ帳と現状維持」。

---

## やめるべき／深入りしない領域

- **映像・骨格・着球点のAI解析**: Stupa/SportArc/AIスマートコーチが先行、カメラ設置とCVの投資が重い。深入りせず、必要なら外部アプリ連携に留める。
- **フォーム添削**: 戦術ではなく技術の領域。日本のAIフォーム系が充実、競合しても勝てない。
- **チーム/部活の映像交換・管理**: Hudlの土俵。個人特化という強みを薄める。
- **用具データベースの網羅**: TT Playbook が300ラバー/170ラケットで先行。自前で追わない。
- **試合前スカウティングの作り込み**: 相手起点はTT Playbookが強い。自分の型のチューニングとして最小限に。

---

## 出典URL

- 卓球ノート(記録): https://apps.apple.com/jp/app/id6763719308 , https://play.google.com/store/apps/details?id=app.sacho.tabletennis.journal
- T2-Note: https://apps.apple.com/jp/app/id1513859108
- TT Playbook Player: https://tt-playbook.de/en/player/ , https://play.google.com/store/apps/details?id=com.tt_playbook.app
- TT Match Analyzer: https://ttmatchanalyzer.com/
- Stupa Analytics: https://apps.apple.com/us/app/stupa-analytics/id1480094754 , https://www.sportscapemagazine.com/blog/from-table-tennis-to-rugby-stupa-sports-rolls-out-ai-review-tech-across-utt-and-rpl
- SportArc(旧PingPi): https://apps.apple.com/us/app/pingpi-ai-table-tennis-coach/id6768219425
- Table Tennis Stats and Tracker / TT Scorer: https://play.google.com/store/apps/details?id=com.abrebo.tabletennishub , https://apps.apple.com/us/app/tt-scorer/id6752398902
- SwingVision: https://swing.vision/ , https://www.tennis.com/news/articles/swingvision-delivers-pro-level-insights-for-recreational-players
- Hudl/Dartfish/Coach's Eye比較: https://simplifaster.com/articles/buyers-guide-sport-video-analysis/ , https://blog.callplaybook.com/blog/coach-video-review-software-hudl-dartfish-alternatives
- 戦術ボード: https://www.tacticalpad.com/en-us/new/index.php , https://apps.apple.com/us/app/badminton-tactic-board/id1583913405
- 日本AIフォーム系: https://smartcoach.mb.softbank.jp/lp/ , https://apps.apple.com/jp/app/id6742685461
- ノート継続の不満/書き方: https://rallys.online/forplayers/howto/jikuashi11/ , https://choretaku.com/magazine/table-tennis-notebook , https://mettc.net/howtothinkoftttactics.html
- AI×スポーツの実態: https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1627685/full , https://wsc-sports.com/blog/industry-insights/the-2-5b-secret-how-ai-coaching-is-transforming-elite-sports-performance/ , https://pmc.ncbi.nlm.nih.gov/articles/PMC12884889/
