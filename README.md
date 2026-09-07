# tt-tactics

卓球の戦術を「台の図」と「分岐図」で整理する個人用 PWA。設計は [docs/DESIGN.md](docs/DESIGN.md)。

## 開発

```bash
npm install        # .npmrc で legacy-peer-deps を有効化済み
npm run dev        # http://localhost:5173
npm test           # domain 層の単体テスト
npm run build      # dist/ に PWA 一式を出力
```

## GitHub Pages に配信する

```bash
BASE_PATH=/tt-tactics/ npm run build
```

`dist/` を `gh-pages` ブランチ、または Pages の「GitHub Actions」ソースで公開する。
スマホの Safari / Chrome で開き「ホーム画面に追加」するとフルスクリーンで起動し、オフラインでも動く。

## データ

IndexedDB（Dexie）にのみ保存される。設定画面の「JSON をエクスポート」で定期的にバックアップすること。
