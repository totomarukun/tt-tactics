# 10. 分岐ツリーの俯瞰ビュー（ホワイトボード式）

本人FB（2026-09-19）: ステップ再生のイメトレは分かりづらい。スクロール／ホワイトボード的に**全体を俯瞰**できる方がよい。→ 一手ずつ辿るのをやめ、分岐ツリー全体を一望し、pan/zoom で見渡す表現へ転換する。

## 推奨パターン（調査: UIデザイン側）

1. **横方向（左→右）の tidy tree**。サーブ/レシーブを最左、相手の返球→自分の対応と右へ。深さ＝時系列。縦画面スマホで縦積みにすると1画面1〜2手で俯瞰にならない。横なら深さ＝横スクロール、兄弟分岐＝縦並びで両立。将棋・チェスの読み筋ツリーもこの向き。レイアウトは Reingold–Tilford（tidy tree, Buchheim で線形時間）で兄弟の重なりを排除。

2. **メインライン（勝ち筋）の強調＋サイドラインの減衰**。主線＝太実線・濃色・大ノード、代替手＝細線・淡色・小ノード。チェス解析ツリー（lichess: 主線青／変化紫）の定番規約。全ノード等価に描くと俯瞰＝混沌になる。「if X then Y」を掴ませる最大のレバーは視覚階層。

3. **セマンティックズーム**（ズーム段階で表示情報を切替）。遠＝色付きドット＋主線のみ／ラベルなし、中＝アイコン＋短ラベル、近＝ミニコート図＋コース矢印。ホワイトボード俯瞰の本質。「サイズだけ拡大」ではなく「表現の種類を変える」。低ズーム時に詳細を抽象化すると認知負荷が下がる（Pad/セマンティックズーム研究）。

4. **Fit-to-screen（全体表示）ボタン＋現在地ハイライト**。1タップで全ツリーを画面に収め、ノードタップで滑らかにズーム。overview↔detail の往復コストを下げる（focus+context）。「迷子にならない」保証が pan/zoom UI の安心感。ミニマップは〜数十ノードでは過剰、まず fit ボタン、規模拡大時に追加。

5. **枝の折りたたみ（サブツリー collapse）**。バッジ（⊕3）でタップ開閉。分岐爆発への最有効手。畳んだ枝は「数」だけ見せ存在は消さない。

## 具体アプローチ（描画）

- レイアウト: `d3-hierarchy` の `d3.tree()` を **layout計算専用**で導入（描画は自前SVG）。Reingold–Tilford の自前実装は兄弟重なり回避がバグりやすい。tree だけなら軽量。`nodeSize([縦間隔, 横間隔])`。横化は x/y を入替（`y=depth*xGap`, `x=兄弟オフセット`）。dagre/ELK/React Flow フルは単一ルートの静的ツリーに過剰。
- ノード: 遠=ドット（自分=塗り／相手=白抜き）、中=角丸チップ（幅〜72px, アイコン＋2〜3語, 左端カラーバー）、近=60×34pxミニコート矢印。
- エッジ: **ベジェ曲線**（`C`パス）。経路追跡（読み筋を辿る）は直交折れ線より曲線が追いやすい。主線太・サイド細淡。
- 状態（現在地/主線/サイド/畳み済み）は色と太さで区別。1ノード1情報、詳細はタップで別パネルに逃がす。

## 避ける落とし穴

- 縦レイアウトをスマホで採用（俯瞰にならない）。必ず横展開。
- 全ノード等ウェイト描画（分岐が増えた瞬間に「見るほど分からない」。PoE 1000ノードが反面教師）。
- 文字だけ拡大するズーム（セマンティックズーム必須）。
- `touch-action: none` 未指定 → ブラウザのスクロール/ズームと競合しピンチが暴れる。
- ピンチ中心を画面中央固定（酔う）。ピンチ中点/カーソル中心にする。
- ノード内にラベル詰め込み。迷子対策（fit＋現在地）の欠如。

## 参照

- tldraw camera/viewport: https://tldraw.dev/features/composable-primitives/camera-and-viewport
- React Flow layouting（d3-hierarchy vs dagre vs elk）: https://reactflow.dev/learn/layouting/layouting
- d3 tidy tree: https://d3js.org/d3-hierarchy/tree , https://observablehq.com/@d3/tree/2
- チェス変化ツリーUI: https://www.chess.com/blog/wozzed/visualise-your-chess-studies-with-chesstree , https://github.com/lichess-org/lila/pull/21251
- セマンティックズーム/focus+context: https://www.emergentmind.com/topics/semantic-zoom
- 分岐ナラティブ（choiceをノード化しない）: https://www.blog.radiator.debacle.us/2014/10/on-branching-dialog-editors-and.html
- スキルツリーUI: https://www.numberanalytics.com/blog/ultimate-guide-to-skill-trees-in-game-design
- SVGパン/ズーム: https://github.com/anvaka/panzoom , https://github.com/chrvadala/react-svg-pan-zoom
- エッジ曲線 vs 直交: https://www.researchgate.net/publication/254256593_A_User_Study_on_Curved_Edges_in_Graph_Visualization

## 実装アプローチ（調査: 実装側）

- **レイアウト**: 本来は `d3-hierarchy`（`d3.tree`, layout専用, gzip約3〜4KB, 型あり）が定番。ただし本アプリは依存最小・ツリーは小〜中規模のため、**依存ゼロの自前レイアウト**を採用: DFSで葉に連番row → 親は子のyの平均 → x=depth。葉が別rowに載るので兄弟サブツリーは重ならない（最大圧縮ではないが十分読める）。将来ノードが増えたら d3-hierarchy へ差し替え可。
- **pan/zoom**: 自前（Pointer Events + `viewBox`書き換え）。依存ゼロ。
  - `touch-action: none` を SVG に必ず指定（無いとブラウザのスクロール/ズームに奪われる=最重要）。
  - `wheel` は `useEffect` で `addEventListener(..., {passive:false})` 手動登録（JSXの`onWheel`はpassiveで`preventDefault`不可）。
  - `setPointerCapture` で指が外に出ても追従、`pointercancel` で必ずMap削除（iOS割り込み対策）。
  - パン: `Δuser = Δpx * viewBox.w/clientWidth`。ピンチ: 2指距離比で incremental zoom、中心＝2指中点（client→user変換してアンカー固定）。
  - `viewBox`はrefで持ち `setAttribute` 直更新（毎フレームReact再描画しない）。セマンティックレベルが変わった時だけ setState。
- **fit-to-screen**: 全ノードrectのbboxにpad → svgのアスペクト比に合わせてviewBox算出 → rAFで補間（`prefers-reduced-motion`で無効化）。
- **視覚**: エッジは横ベジェ `M x1,y1 C mx,y1 mx,y2 x2,y2`。主線（defaultPath=決め球優先の勝ち筋）を太・濃、脇線は細・淡。`vector-effect="non-scaling-stroke"`で拡大時も線幅一定。セマンティックズーム: 遠=ドット（自分=塗り/相手=白抜き）、近=チップ（カラーバー＋ストローク名＋着地ゾーン、決め球★）。ノードタップで root→そのノードの経路をハイライト＋センタリング。
- **A11y**: ルート`role="application"`+aria、矢印キーでパン・+/-でズーム（`touch-action:none`で失う操作の補完）。

実装: `src/components/BranchBoard.tsx`（全画面シート）。戦術詳細の「分岐ビュー」ボタンの遷移先をステップ再生からこの俯瞰ビューに変更。
