# 引き継ぎメモ（2026-10-01 時点）

> 新しいスレッドで作業を再開するときは、まずこの文書と `CLAUDE.md`、`docs/PORTAL_DEPLOY.md` を読む。
> ユーザーとのやりとりは日本語。

## 1. いまの状態

- **Label Drop**（practice IA シリーズ）：IA のグルーピングとラベリングを練習する 3D ゲーム。
- **P0〜P3 完了。P4（AI 作問）は 2026-10-03 に取りやめ**（決定事項 #25）。お題は Claude が作ってアプリに内蔵する。アプリは静的に動く。Worker/D1 は将来の教室モード（`docs/CLASSROOM_SPEC.md`）用に残し、Cron は停止。
- 最新のアプリの変更は label-drop の `main`。どの公開先も静的な版（AI 機能は既定で無効。`VITE_AI=on` のときだけ有効）。
- ポータルにも反映済み: knowledge-sorrounding-AI `main` の `db9d94b`（label-drop `59e3d6d` 時点、静的な版・43問）。GitHub Pages と Cloudflare Pages の両方。
- ポータル側の Codex 向け引き継ぎ: `knowledge-sorrounding-AI/CODEX_HANDOFF_LABEL_DROP.md`（Git 管理外。2026-10-03 作成）。
  公開: https://goonruntongue.github.io/knowledge-sorrounding-AI/about-ia/app/dist/
- **ポータルは Cloudflare Pages でも公開**（2026-10-02〜、プロジェクト `knowledge-surrounding-ai`）: https://knowledge-surrounding-ai.pages.dev/ 。「ポータルに反映して」では GitHub の `main` と Cloudflare の両方を同じコミットにそろえる（`docs/PORTAL_DEPLOY.md` 3-5、ポータル側は `PORTAL_PUBLISH_RULES.md`）。

## 2. 守ること（ユーザーとの取り決め）

- **改変はすべて IA-DX（ここ）で行う。** ここが唯一の正。
- 「ポータルに反映して」と言われたら `docs/PORTAL_DEPLOY.md` の手順で反映する。
  - **反映先のブランチは毎回ユーザーに確認する**（これまでは毎回「main に直接」）。
  - 反映前に、ポータルの `origin/main` に Label Drop への直接の変更（Codex など）が入っていないか確認し、入っていれば先に IA-DX に取り込む。
  - やり方：ポータルの `origin/main` から一時 worktree を作り、`about-ia/app/dist` だけを差し替えてコミット・push。ユーザーが開いているブランチ（`git-github-lottie-illustrations`）には触らない。あわせて `about-ia/app/` の参照用ソースを IA-DX と同じにする（Git 管理外）。
- ポータル側の AI 向けルール: `knowledge-sorrounding-AI/LABEL_DROP_EDITING_RULES.md`（Git 管理外）。
- ポータル LP（`about-ia/index.html` など）は触らない。

## 3. この日に入れたもの（主なもの）

- 演出3段階：クリア（★1以上）＜レベルアップ（3Dクラッカー）＜全クリア（Lv10 で★5、three.js の演出＋タイプライターのメッセージ）
- 称号（魔法使い系 Lv1 IA見習い魔法使い〜Lv10 IA大賢者、全クリアで「伝説のIA大賢者」）、👑クリアの証
- 3D キャラ 11体（`app/public/characters/lv01〜11.glb`）：レベルアップ時の登場、📖 図鑑（未解放はシルエット）、盤面右上のキャラ（ドラッグでパン／チルト、タップで跳ねる、答え合わせに反応、状況別のセリフと約40秒ごとの応援）、ヘッダーの顔アイコン
- ひとことコメント（★別・レベル別。どのテーマでも違和感のない言い回しに統一）
- 修正 1〜9：ラベルの言い換え候補とラベルボーナス／どちらの箱でも正解の語／セーブは盤面だけ／スマホ長押しの誤動作防止／進捗リセット＋2回確認／全クリア演出／アニメーションのチュートリアル／アプリだけオフライン対応（SW は `label-drop-*` キャッシュのみ）／スプラッシュ画面
- ラベルは **Lv1 から必須**。Lv3 は「伝わる名前」に変更。
- ヘッダーのタイトル：IA 紹介ページから開いたら「← 前に戻る」、それ以外は「Label Drop」の表示だけ（Codex の変更を取り込んだもの）。
- 決定事項は `docs/SPEC.md` の「13. 決定事項」#11〜#18 とレベル表に記録済み。

## 4. 残っていること（候補）

- 実機確認（長押し・キャラのスワイプ・iPhone のオフライン起動・ホーム画面のアプリ）は、2026-10-02 にすべて OK。
- スマホ（幅900px以下）で盤面を下にスクロールすると、キャラが「答え合わせ」ボタンの右上へ移り、その先では画面右上に残る（同じ大きさ）。2026-10-02 に追加。
- 仕様書 5.5 の P2 完成条件との突き合わせは 2026-10-02 に実施。足りなかったもの（タッチ44px、ダイアログのフォーカス、設定パネル＝文字サイズ・モーション・色覚サポート、シェーダの事前コンパイル、キーボードの案内、ヘッダーの折り返し）を入れ、仕様書（5.5、5.6、4.1、決定事項 #19・#20）を実態に合わせた。**P2 完了。**
- 経過時間は**記録も表示もしない**ことに決定（2026-10-02、決定事項 #7 を更新）。
- **P3（進行中）**: `worker/` に API の Worker（Hono＋D1、`AUTH_MODE` none/access、`/api/me`・`/api/status`、テスト8件）と、AI ENERGY メーター（`app/src/api.ts`、`ui/AiEnergy.tsx`）を作った。
  - 2026-10-02 に Cloudflare へ作成・デプロイ済み（ユーザー承認）: D1 `label-drop`（APAC、id `ee4485e7-…`、マイグレーション適用済み）、Worker `label-drop-api` → https://label-drop-api.goonruntongue.workers.dev 。secret: `ADMIN_EMAILS`、`ANON_SALT`。
  - Worker の更新は `npm --prefix worker run deploy`（テストを通してから）。D1 のスキーマを変えたら `npx wrangler d1 migrations apply DB --remote`。
- テンプレ30問を D1 に入れ、`POST /api/problem` を公開した（答えは返さない。テスト12件）。テンプレを変えたら `npm --prefix worker run seed:remote`。
- **P3 完了（2026-10-02）**。ゲームはまだ内蔵テンプレで遊ぶ（API からの出題への切り替えは P4〜P5）。
- **P4（進行中）**: `worker/src/ai/`（生成・検証・品質チェック・予算）、`src/cron.ts`（作り置き）、`POST /api/generate`。テスト30件（偽の AI）。本番に Workers AI binding つきでデプロイ済み。
  - 本物で3問試した（1問 約33 Neurons、約20秒）。「車のトランク」は合格、SaaS とゲームの2問は品質チェックで不合格（status=rejected）。
  - ユーザーが品質を確認し、**Cron（作り置き）を有効化**（30分ごと）。
  - **案A（決定事項 #21）**: AI の問題を答えごと送り、ゲームで遊べるようにした（`app/src/aiProblems.ts`、`POST /api/problem/ai`）。レベルアップモードで1問先読みし、次の盤面で使う。「AI 作問」と表示。セーブスロットにも対応。
  - 在庫を手で足すとき: `npm --prefix worker run generate:remote -- 5 mix`（本番の D1 と Workers AI に手元から接続。予算の計上は Cron と同じ。無料枠を超えたらエラーで止まる）。
  - 2026-10-02 時点で合格在庫 11問（日常5・サービス4・Web2）。Cron は朝 08:30 JST の回で3問生成しており、無料プランで動作確認済み。
  - **監修制（#24、2026-10-03）**: AI の問題は下書きとして保存し、Claude が手直ししたものだけを公開する。ユーザーに「AIのお題を手直しして」と言われたら: `npm --prefix worker run review:export` → `review/drafts.json` を読んで1問ずつ判定 → `review/curated/<日付>.json`（publish は修正版の問題全体、reject は理由）→ `review:apply -- <ファイル> --dry-run` → 本番に適用 → コミット。判定の基準は、軸が1つに揃っているか、境目があいまいな語がないか、同じ物の重複がないか、何でも入る受け皿のグループがないか。2026-10-03 の初回で18問中13問を手直しして公開、5問を不合格。
  - **撤退条件（#22）**: 質が下がったら AI 作問をやめ、Claude/Codex で量産したテンプレをハードコーディングする方式に切り替える。**Cloudflare は従量課金が自動で発生しないこと**（Workers Free のまま、超過はエラーになるものだけ。SPEC 8.1 の決定）。

## 5. 開発のコツ

- `npm --prefix app run dev`（5173）、`npm --prefix app run typecheck`、`npm --prefix app run build`。
- 本番ビルドの確認は `.claude/launch.json` の `app-build-preview`（4173）。
- ブラウザから store を触るときは、HMR で読み込み直された版を使う：
  `performance.getEntriesByType('resource').map(e => e.name).filter(n => /state\/store\.ts/.test(n)).pop()` を `import()`。
- `?debug` を URL に付けるとデバッグパネル（レベル・★の変更、レベルアップ演出のプレビュー、全クリア演出の再生、図鑑、👑の消去）。
- コミットの末尾には `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。

## 6. 2026-10-03 の方針転換
- Workers AI の問題はあいまいだったため、監修制（#24）を経て、**AI を使わない**ことに決定（#25）。新しいお題は、ユーザーに頼まれたら Claude が作り、`app/src/data/topics-curated.ts` に足す（groups に altLabels を付ける。検査の基準は SPEC 7.2 と `worker/src/ai/validate.ts` と同じ：5グループ×6語、軸は1つ、重複なし、受け皿グループなし）。
- 将来は教室モード（ログイン、講師の管理画面、チーム戦、リアルタイム同期とチャット、結果発表）。構想と仕様の下書きは `docs/CLASSROOM_SPEC.md`。
