# tt-tactics — 開発ハーネス

卓球の戦術を「台の図」と「分岐図」で整理し、練習課題と AI コーチにつなげる個人用 PWA。
このファイルは、変更を加える人（人間・AI）が守るべき前提と手順をまとめた開発側のハーネス。設計の詳細は `docs/DESIGN.md`。

## アーキテクチャの原則

- **単一データモデル**: 戦術は「ショットのツリー」1本。分岐図はツリー全体、台の図は根→葉の1経路。別ストアを作らない。
- **ドメインは UI 非依存**: `src/domain/` は React に依存しない純ロジック。UI から呼ぶ。
- **保存は Dexie（IndexedDB）**: `src/store/db.ts`。スキーマ変更は必ず `db.version(n+1).stores({...})` を追記（既存 version は消さない）。

## ハーネス（品質を保つ仕組み）— `src/domain/harness/`

Agent = Model + Harness。AI とアプリ全体を Guides（導く）と Sensors（測る）で囲む。

- `runner.ts` … すべての AI 呼び出しの単一経路。リトライ＋Flash フォールバック＋JSON 救済＋トレース。新しい AI 機能は必ずここを通す（`geminiJson` を直接呼ばない）。
- `context.ts` … タスク別に知識章を選ぶ。全章を毎回送らない。
- `checks.ts` … LLM を使わない決定的チェック（回転整合・決め球・打者交互など）。AI 提案とユーザー戦術の両方に使う。
- `verify.ts` … 生成と評価を分ける審査役。提案とは別プロンプト。
- `trace.ts` / `events.ts` … 観測。AI 呼び出しと、アプリのエラー・データ修復・入出力を IndexedDB に記録。設定画面で確認。

境界検証は `src/domain/validate.ts`。IndexedDB 読み込みと JSON インポートで必ず sanitize を通す。外部データと古い保存データは信用しない。

復旧は `src/components/ErrorBoundary.tsx`。描画エラーで白画面にせず、データ救出→再読み込みを出す。

## 変更のルール

1. **ドメインの不変条件を壊さない**: 打者は根から交互、着点 side は打者の反対側、根はサーブ。`checks.ts` / `validate.ts` がこれを守る。ロジックを変えたら該当テストも更新。
2. **データを扱うコードは境界で検証**: 新しい永続データを増やすときは `validate.ts` に sanitize を足し、`load()` / `importData()` に通す。`orderBy(index)` は index 欠落レコードを取りこぼすので、読み込みは `toArray()` + JS ソートにする。
3. **失敗は主経路の一部**: 例外は握りつぶさずログ（`logEvent`）に残すか、ユーザーに見せる。AI 呼び出しの失敗は日本語の対処案内にする（`gemini.ts` の `friendlyError`）。
4. **退行を防ぐ（ラチェット）**: 挙動を変えたら `*.test.ts` を追加/更新。`harness/eval.test.ts` は提案の期待判定を固定する eval。

## 開発コマンド

```
npm run dev      # 開発サーバ（.claude/launch.json 経由でプレビュー）
npm test         # vitest（型は tsc、CI ゲート）
npm run build    # tsc -b && vite build（GitHub Actions で test 後に実行）
```

- 依存は `.npmrc` の legacy-peer-deps 前提。
- ホームパスに特殊文字（U+2F8F）が含まれ cmd 系ランチャが壊れる。プレビューは node から vite を相対パスで直接起動する。
- push すると GitHub Actions が test → build → GitHub Pages 配信（`totomarukun/tt-tactics`）。壊れたビルドは配信されない。

## やってはいけないこと

- 戦術ツリー以外に「台の図専用データ」を作る（二重管理になる）。
- `load()` / `importData()` を sanitize なしで書き換える。
- Dexie の既存 version の stores 定義を書き換える（マイグレーションが壊れる）。
- API キーをエクスポートに含める（`exportData` で除外している）。
