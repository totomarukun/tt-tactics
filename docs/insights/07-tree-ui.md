# 07 分岐ツリーの階層/グルーピング表示リサーチ

作成日: 2026-09-14
対象: tt-tactics（卓球戦術ノート PWA / React + SVG / スマホ・片手）
きっかけ: 1つの戦術（例「バック前・順横・ナックルサーブ起点」）の分岐が増えると、現状の縦インデントツリー（`ShotTree.tsx` の `flatten(root)` を `paddingLeft = depth*18` で並べる方式）が縦に伸び、画面外へ流れて全体像を掴めない。

現状データは `ShotNode { player, zone, stroke, note?, isFinisher?, children[] }` の木で、ノードをタップすると根→葉の1経路が `TableDiagram` に描かれる双方向連動が既にある。この資産を壊さずに、増える分岐を畳んで見せる方針を、5系統のパターンから集めた。

---

## パターン1. アコーディオン/セクション化とツリービューの使い分け

**なぜ効くか（出典/実例）**
Carbon Design System と UX Patterns for Developers は「1段だけの区切りはアコーディオン、多段の階層はツリービュー」と明確に線を引く。ツリーは親をタップして子を開閉する点でアコーディオンの入れ子と本質は同じで、Mobbin の Tree glossary も「親ノードを展開/折りたたんで子を出す」挙動を基本形とする。ただし NN/G 系の指摘として、入れ子アコーディオンを深くすると「たまに使うユーザーは情報の整理構造を理解できず迷子になる」。対策は各階層にタイポグラフィと視覚的コントラストの差を付けること。

**tt-tactics への具体設計**
木を全階層フラットに出すのをやめ、**深さ0〜1（起点＋相手の1手目）だけを常時展開**、深さ2以降は折りたたむ。起点ノードを「セクション見出し」に格上げし、その直下の「相手の返球分岐」を横並びのチップにする。見た目の階層差は、起点＝カード見出し（太字・背景色）、相手手＝チップ、以降＝インデント行、と3段でコントラストを付ける。現状 CSS の `.shot-row.me / .opp` の色分けはそのまま流用できる。

---

## パターン2. 主経路（メインライン）＋分岐は畳んで数だけ

**なぜ効くか（出典/実例）**
将棋 ShogiGUI は分岐点の指し手に「＋」を付け、ツリーダイアグラムで分岐を可視化して直接ジャンプさせる。やねうら王の定跡ビューア（yaneuraouBookView）は数手先まで枝を辿れ、評価値で枝の良し悪しを色分けする。チェスでは ChessMap が盤とパン/ズーム可能なムーブツリーを並べ、任意局面から合法手の続きを展開する。Chessable/Chess.com のフォーラムでは、変化手順の管理機能を「盤を小さくせずに」載せる難しさが繰り返し語られ、実装解として「本線を1本強調し、脇の変化はまとめて畳む」「同一局面はカード1枚に集約（transposition collapse）」が挙がる。要は全部見せず、本線＋『分岐 n件』の要約を出し、タップで初めて展開する。

**tt-tactics への具体設計**
`ShotNode` に「本命の子」を1つ持たせる（`primaryChildId`、無ければ `children[0]`）。表示は本線を縦に太線で1本描き、各ノードの本線から外れる子は `＋2` のような**分岐バッジ**に畳む。バッジをタップすると相手手のチップ列だけを開く。決め球（`isFinisher`）は本線でも脇線でも★で常時可視化し、「この分岐は決めまで到達済み/未」を色で示す。将棋の評価値色分けにならい、`confidence` を枝の濃淡に写像する案も置ける。

---

## パターン3. フォーカス/ズーム・パンくず・ミニマップ

**なぜ効くか（出典/実例）**
プログレッシブ・ディスクロージャー（Nielsen, 1995）は「今のステップに必要な情報だけを出し、残りは要求時に」。NN/G と Digia の記事は、限られた画面ではボトムシート・アコーディオン・展開セクションでこれを実現するのがモバイルでは実務上の必然だとする。同時に「ユーザーが頻繁に要る機能まで隠すと操作コストが増える」過剰適用の失敗も警告する。React Flow のマインドマップ実装は、pan/zoom・collapse branches・ミニマップ（モバイルでは自動的に隠す）を標準装備し、大きな木を1画面で扱う定石を示す。

**tt-tactics への具体設計**
「フォーカスモード」を持つ。任意ノードを**長押し→そのノードを一時的な根**にして部分木だけ表示。画面上部にパンくず（`根 › 相手ツッツキ › 自分バック深く`）を置き、タップで祖先へ戻す。分岐が10件を超える戦術では、画面隅に折りたたみ式のミニマップ（木の縮小SVG＋現在地ハイライト）を出す。ただし過剰適用の警告どおり、初期状態はフォーカスOFF・本線展開の全体像を既定にし、深い木でのみ段階的に道具を出す。

---

## パターン4. 配球ツリーを「起点→相手返球→決め」のセクション表示に再構成

**なぜ効くか（出典/実例）**
卓球の3球目攻撃の解説（JP卓球.com、タクティブ、choretaku）は、得点パターンを「フォア前・下回転サーブ→ツッツキ→フォアドライブ」のように**サーブの型ごとに数パターンへ束ねて**教える。実戦のコツも「自分のサーブで相手のレシーブを2〜3択に絞り、確率の高いコースに準備する」。つまり人間の頭の中では既に『起点＝1セクション、その中に到達パターンが2〜3本』という構造で戦術を覚えている。UIをこの心的モデルに合わせれば、木を意識せず把握できる。

**tt-tactics への具体設計**
1戦術＝1スクロール画面を「見出し＋パターン一覧」で構成する。

```
■ 起点：バック前・順横・ナックルサーブ            [台の縮図]
   相手の返球で分岐（3件）
   ─ ①相手ツッツキ → バックドライブ → …★決め         [信頼度●●●]
   ─ ②相手ストップ → フリック → …★決め              [●●○]
   ─ ③相手フリック → バックカウンター → …（未完）      [●○○]
```

起点カードに台の縮図サムネイルを付け、その下に「到達パターン」を1行1本で並べる。各行は本線を圧縮した1文（相手手→自分の要点→決め球）で、末尾に信頼度メーターと決め球到達フラグ。1画面に起点1つ＋パターン5〜6本までを目安に、超えたら折りたたむ。行タップで従来の詳細ツリー（フォーカスモード）へ入る二段構えにする。

---

## パターン5. 片手・小画面での編集を階層のまま軽くする

**なぜ効くか（出典/実例）**
Mobbin と Material Design のボトムシート解説は、メッセージ長押し→「返信/転送/削除」のようなアクションはボトムシートが context menu の置き換えとしてモバイルで自然だとする。ドラッグハンドル＋アイコン付きリスト行、スワイプで全画面化・下スワイプで閉じる、が定番。Drafft や Dialogue Tree Architect などノードエディタ群も、ノード単位の「本命化/並べ替え/削除/この枝だけ学習」を1メニューに集約している。

**tt-tactics への具体設計**
現状はノード選択時にインラインで `＋次の球/編集/削除` を出しているが、これを**ノード長押し→ボトムシート**に寄せる（`ShotSheet.tsx` 等の既存ボトムシート資産を流用）。シート項目は「次の球を追加／編集／本命にする（本線入替）／並べ替え／この枝を削除」。追加はシート内で相手手のゾーンチップを選ぶだけで木を意識させない。片手前提なので、シートは親指の届く下半分に主要ボタンを寄せる。破壊操作（削除）は確認一段を挟む。

---

## パターン6. 台の図と階層リストの連動を強める

**なぜ効くか（出典/実例）**
ChessMap は「盤＋ツリー」を横に並べ、局面選択と盤描画を連動させる。tt-tactics は既に `ShotTree`→`pathIds`→`TableDiagram` の一方向連動を持つ。連動を双方向・多経路対応にすると、リストで戦術全体を俯瞰しつつ、台で1本の軌道を確かめる往復が速くなる。

**tt-tactics への具体設計**
パターン一覧（パターン4）の行タップ＝その根→葉経路を `pathIds` に載せて台に即描画（既存機構をそのまま）。逆に台のゾーンをタップしたら、そのゾーンを通る分岐だけリストでハイライト＝木の絞り込み検索にする。フォーカスモード中は、台に本線を実線、脇の分岐候補を薄い破線で重ね描きし、「次にどこへ打つ選択肢があるか」を台の上で見せる。

---

## 推奨する階層表示の設計

- **レイアウト**：1戦術＝縦1スクロール。上から〈起点カード（台サムネイル＋サーブの型）〉→〈到達パターン一覧（1行=1本線を圧縮）〉→行展開で〈詳細ツリー/フォーカス〉。木を常時全展開しない。
- **折りたたみ規則**：既定は深さ0〜1（起点＋相手の1手目）を展開、深さ2以降は畳む。分岐は `＋n` バッジで件数だけ提示、タップで開く。1画面の同時展開は起点1つに限定。
- **主経路の扱い**：`primaryChildId` で本線を1本定義し、太線＋常時展開。脇の変化は畳んで数と決め球到達フラグだけ見せる。将棋/チェスの variation tree と同じ「本線強調・脇線集約」。
- **1画面の情報量**：起点1つ＋到達パターン5〜6本を上限の目安。超過は折りたたみ。1行の情報は「相手手→自分の要点→決め球＋信頼度」の3要素までに抑える。分岐10件超でミニマップ・パンくずを解禁する。

## 実装ステップ（現状の縦ツリーからの移行）

1. **データ拡張（非破壊）**：`ShotNode` に `primaryChildId?`、`Tactic` に集計用のパターン数キャッシュを足す。既存木はそのまま読める。
2. **サマリ層を追加**：`domain/tree.ts` に「根→各葉の経路を1本線に圧縮する `summarizePaths(root)`」を実装。テスト（既存 `tree.test.ts` に倣う）を先に書く。
3. **起点カード＋パターン一覧コンポーネント**：`ShotTree` の上位に `TacticOutline.tsx` を新設。まずは既存 `ShotTree` を「行展開時の詳細表示」に格下げして共存させ、いきなり置き換えない。
4. **折りたたみ制御**：`flatten` に深さ上限と展開ノード集合（`expandedIds`）を渡せるよう引数追加。既定は深さ1まで。
5. **編集をボトムシート化**：インラインの `＋次の球/編集/削除` を長押し→シートへ移設。既存ボトムシート実装を流用。
6. **本線・フォーカス**：`primaryChildId` の設定UI（シートの「本命にする」）と、長押しで部分木を根にするフォーカスモードを追加。
7. **台連動の強化**：既存 `pathIds`→`TableDiagram` を活かしつつ、台タップ→リスト絞り込みの逆方向と、脇分岐の破線プレビューを足す。
8. **ミニマップ/パンくず**：分岐が増えた戦術でのみ出す条件付き表示として最後に載せる。

各段は独立して出せる。1→5までで「セクション＋パターン一覧＋軽い編集」という要望の核が満たせ、6以降は深い木向けの上積み。

---

## 出典URL一覧

- Mobbin — Tree UI Design glossary: https://mobbin.com/glossary/tree
- Mobbin — Bottom Sheet glossary: https://mobbin.com/glossary/bottom-sheet
- Carbon Design System — Tree view usage: https://carbondesignsystem.com/components/tree-view/usage/
- UX Patterns for Developers — Accordion / Tree View: https://uxpatterns.dev/patterns/content-management/accordion , https://uxpatterns.dev/patterns/data-display/tree-view
- Smashing Magazine — Navigation Design for Mobile: https://www.smashingmagazine.com/2022/11/navigation-design-mobile-ux/
- NN/G — Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- Digia — Progressive Disclosure in Mobile UX: https://www.digia.tech/post/progressive-disclosure-mobile-ux/
- React Flow — Mind Map tutorial / MiniMap: https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow , https://reactflow.dev/api-reference/components/minimap
- ChessMap（盤＋パン/ズーム式ムーブツリー）: https://github.com/NellowTCS/ChessMap
- ShogiGUI — 定跡ツリーダイアグラム: https://sites.google.com/site/shogigui/%E3%83%9E%E3%83%8B%E3%83%A5%E3%82%A2%E3%83%AB/%E5%AE%9A%E8%B7%A1
- やねうら王 — 定跡ビューア（評価値色分け）: https://yaneuraou.yaneu.com/2019/05/24/
- NN/G — Bottom Sheets guidelines: https://www.nngroup.com/articles/bottom-sheet/
- Material Design — Bottom sheets: https://m2.material.io/components/sheets-bottom
- Drafft — Branching Dialogue / Dialogue Tree Editor: https://drafft.dev/blog/branching-dialogue-tool
- JP卓球.com — 3球目攻撃 基本5パターン: https://jptakkyu.com/3kyume/
- タクティブ — 3球目攻撃のコツと練習法: https://www.tactive.co.jp/media/7154/
- choretaku — 3球目攻撃 パターン表: https://choretaku.com/magazine/table-tennis-how-to-master-3rd-ball-attack-practice-guide
