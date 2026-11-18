# GitHub Merge Commit Email Enforcer

GitHub の PR マージ確認ダイアログで、owner (または owner/repo) ごとに commit email を強制する Tampermonkey 用ユーザースクリプト。

**[[クリックしてインストール]](https://github.com/LumaKernel/github-commit-email-config/raw/main/dist/github-commit-email-config.user.js)** (Tampermonkey が必要)

## 動作

- マージ確認ダイアログの「Commit email」をマッピングの email に自動で切り替える
- 手動で別の email を選んでも戻す
- 強制先の email がアカウントの候補にない／別の email のままの場合、「Confirm … merge」のクリックをブロックする
- マッピングは `owner/repo` 指定が `owner` 指定より優先 (大文字小文字は区別しない)

## 設定

- マージダイアログ内の「Email mapping 設定」ボタン (「追加」で現在の owner と選択中 email が入る)
- Tampermonkey メニューの「Commit email mapping を編集」

設定は `GM_setValue("settings", …)` に保存される。

## 開発

```sh
npm install
npm run build   # dist/github-commit-email-config.user.js を生成 (コミット対象)
npm run dev     # vite-plugin-monkey の開発サーバー
npm run check   # typecheck + eslint + prettier + vitest coverage + dist が最新か
```

配布物の更新手順: `package.json` の `version` を上げる → `npm run build` → `dist/` ごとコミットして `main` に push。Tampermonkey は `@version` が上がったときだけ `@updateURL` から自動更新する。

GitHub の DOM に依存する箇所は `src/dom/merge-dialog.ts` に集約している。GitHub 側の変更で壊れたら、同ファイルと `src/test/merge-dialog-fixture.ts` を実際の DOM に合わせて更新する。
