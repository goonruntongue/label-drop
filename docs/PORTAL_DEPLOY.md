# Label Drop の開発場所と、ポータルへの反映手順

> 決めた日: 2026-10-01
> この文書は「どこで作り、最後にどこへ出すか」の取り決めです。作業を始める前に必ず確認してください。

## 1. 方針

| 項目 | 内容 |
|---|---|
| **開発する場所（正）** | `C:\Users\owner\Desktop\Apps\IA-DX`（GitHub: `goonruntongue/label-drop`） |
| **最終的に出す場所** | `C:\Users\owner\Desktop\knowledge-sorrounding-AI\about-ia`（GitHub: `goonruntongue/knowledge-sorrounding-AI` の `about-ia/app/dist`） |
| 進め方 | 改変はすべてここ（IA-DX）で行い、アプリを完成まで持っていく。完成したら、ポータル側の適切な場所に**上書き**し、`about-ia/app/dist` にアップする |
| やらないこと | ポータル側（`knowledge-sorrounding-AI/about-ia`）でアプリを直接改変しない。直すと、こちらとの差が生まれて、どちらが最新か分からなくなる |

- ここでの更新は、これまでどおり `label-drop` リポジトリへ push すれば GitHub Pages（https://goonruntongue.github.io/label-drop/app/ ）に自動で反映される。こちらは開発・確認用の公開先として使う。
- ポータル側は「完成版を届ける先」。上書きは節目ごと（完成時、または大きな更新時）に行う。

### これまでの経緯（2026-10-01）

- Codex が `about-ia` のソースを直接書き換え、`about-ia/app/dist` にデプロイした（コミット `73ab39b`、セーブスロットと Service Worker の変更）。
- その変更はここに取り込み済み。取り込み後のビルドが、ポータルにデプロイされた版とまったく同じになる（`index-Av4jBO93.js` / `index-D7RMomti.css`）ことを確認した。
- **以後は、ここが唯一の正（ソースの原本）**。
- 同日夜、Codex がポータル側で直接入れた変更（`69791cf` タイトルのリンク先、`8a9a49f`〜`65ebd83` ヘッダーの出し分け：IA紹介ページから開いたときは「← 前に戻る」、ホーム画面のアプリなどでは「Label Drop」の表示だけ）を、ここ（IA-DX）に取り込んだ。ポータル側で直接直した場合は、次の上書きで消えないよう、必ずここへ取り込んでから反映する。

## 2. ポータル側の構成（どこを上書きし、どこは触らないか）

`knowledge-sorrounding-AI/about-ia/` の中身:

| パス | 中身 | 扱い |
|---|---|---|
| `app/dist/` | **Label Drop の公開用ビルド** | ✅ **上書きする**（ここが目的地） |
| `app/src/`、`app/public/`、`app/package.json` など | アプリのソース（Git には未記録・手元だけ） | ✅ 上書きして揃えておく（参照用。Git には入れない） |
| `index.html` | IA ワンシートの LP（**ポータル専用に改変済み**：「ポータルへ戻る」、`../copyright.css`、前後ページ移動、PWA登録） | ❌ **上書きしない**。LP を変えたいときは、その差分だけを手で反映する |
| `manifest.webmanifest`、`sw.js` | LP 用の PWA 設定（ポータル専用） | ❌ 上書きしない |
| `assets/ia-app-icon.png`、`ia-pwa-192.png`、`ia-pwa-512.png` | LP 用アイコン（ポータル専用） | ❌ 上書きしない（消さない） |
| `assets/`（そのほかの画像）、`practice.*` | LP の画像と 2D 試作 | 変更したときだけ上書き |

## 3. 反映手順

### 3-1. ここで仕上げる

```bash
cd C:/Users/owner/Desktop/Apps/IA-DX/app
npm run typecheck
npm run build
```

`label-drop` に push し、公開版（GitHub Pages）で動作を確認しておく。

### 3-2. ポータル側の Git の状態を確認する

```bash
cd C:/Users/owner/Desktop/knowledge-sorrounding-AI
git status
git fetch origin
git branch -vv
```

- 公開元は `origin/main`。2026-10-01 時点で、手元は別のブランチ（`git-github-lottie-illustrations`）で作業中で、手元の `main` は `origin/main` より遅れていた。
- **どのブランチにコミットして、どこへ push するかを、毎回ユーザーに確認してから進める**（他の作業中の変更を巻き込まないため）。

### 3-3. 上書きする

1. `about-ia/app/dist/` を、ここでビルドした `app/dist/` で**丸ごと置き換える**。
   古いハッシュ付きファイル（`assets/index-*.js` など）が残らないように、中身を削除してからコピーする。
2. 参照用のソースも揃えておく：`app/src`、`app/public`、`app/icons`、`app/scripts`、`app/index.html`、`app/package.json`、`app/package-lock.json`、`app/tsconfig.json`、`app/vite.config.ts`
   （`node_modules` と `dist` 以外。Git には入れない）
3. LP 系（`index.html`、`manifest.webmanifest`、`sw.js`、ポータル用アイコン）は**触らない**。

### 3-4. 確認してアップする

```bash
cd C:/Users/owner/Desktop/knowledge-sorrounding-AI
git status        # 変わったのが about-ia/app/dist/ だけであることを確認する
git add about-ia/app/dist
git commit -m "Update Label Drop (about-ia/app/dist) to <label-drop のコミットID>"
git push origin <確認したブランチ>
```

- コミットメッセージに、元にした `label-drop` のコミットID を書いておくと、どの版を出したか追える。
- push 後、ポータル上の `about-ia/app/` を開き、新しい版が表示されることを確認する（アプリの Service Worker は、オンラインなら常にネットから最新版を読み、オフラインのときだけ保存済みの版で動く。開き直せば反映される）。

## 4. 注意

- アプリの Service Worker（`app/public/sw.js`）は `label-drop-*` という名前のキャッシュだけを扱う。ポータル LP の `about-ia/sw.js`（network-first）や、ほかのページのキャッシュには触れない。オフライン用に保存するファイルの一覧（`precache.json`）はビルド時に自動で作られる。

- `app/vite.config.ts` は `base: './'`（相対パス）なので、どのサブパス（`/label-drop/app/`、`/about-ia/app/` など）に置いても動く。共有ボタンのURLも、開いている場所から自動で求めるので、書き換えは不要。
- `.github/workflows/pages.yml`（自動デプロイ）は `label-drop` 専用。ポータル側では使われない。
