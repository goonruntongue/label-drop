# CLAUDE.md

## このリポジトリ

- **Label Drop**（practice IA シリーズ）：情報アーキテクチャのグルーピングとラベリングを練習する 3D ゲーム。
- アプリ本体は `app/`（Vite + React + React Three Fiber）。仕様は `docs/SPEC.md`。
- `main` に push すると、GitHub Actions で GitHub Pages（https://goonruntongue.github.io/label-drop/app/ ）に自動デプロイされる。

## 開発場所と最終デプロイ先（必読）

- **アプリの改変は、すべてここ（`C:\Users\owner\Desktop\Apps\IA-DX`）で行う。ここがソースの唯一の正。**
- 完成したら、`C:\Users\owner\Desktop\knowledge-sorrounding-AI\about-ia` の適切な場所に上書きし、`goonruntongue/knowledge-sorrounding-AI` の `about-ia/app/dist` にアップする。
- ポータル側の LP（`about-ia/index.html` など）はポータル専用に改変済みなので、上書きしない。
- 手順と、上書きしてよい場所／いけない場所は `docs/PORTAL_DEPLOY.md` を参照。ポータル側へのコミット・push は、ブランチを毎回ユーザーに確認してから行う。

## よく使うコマンド

```bash
npm --prefix app run dev        # 開発サーバー（LAN にも公開。ヘッダーの「共有」で QR）
npm --prefix app run typecheck
npm --prefix app run build
npm --prefix app run icons      # app/icons/icon.svg から PWA アイコンを再生成
```
