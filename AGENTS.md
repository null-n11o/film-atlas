# film-atlas

映画を入口に歴史・文化・制作・人物の背景を知るWebサービス。作品選定に依存しない機能を実装中。実コンテンツの制作は未着手。

## 読む順序

- プロダクト目的と合意：[企画の正本](/Users/nakanokentaro/01_kcp/workspace/product/ideas/2026-09-23-作品の背景地図/00-brief.md)。
- 準備の対象と完了条件：[上位PLAN](docs/2026/09/PLAN-20260923-300-film-atlas.md)。会社側の正本を参照するためのコピーであり、独立して編集しない。
- 未決事項：[会社側の未決事項](/Users/nakanokentaro/01_kcp/workspace/product/ideas/2026-09-23-作品の背景地図/05-open-questions.md)。
- 初期版の要求：[要求案](docs/2026/09/requirements.md)。詳細設計・実装計画とは区別する。
- 継続作業：[Notion Task](https://app.notion.com/p/3e4208bc20a38161b0eed4673bd5de2e)。

## 開発ハーネス

2026-09-23にユーザーがSuperpowersを選択。brainstormingで設計を整理し、設計確認後にwriting-plansで実装計画を作成する。Codexではスキル単体を使用する。
仕様は `docs/superpowers/specs/`、実装計画は `docs/superpowers/plans/` に置く。複数のハーネスを同時に既定にせず、会社リポジトリの設定は変更しない。

## Commands

Node.js 22.22.3。実行確認したコマンド：

- `npm run dev`：原稿を検証してローカル起動。
- `npm run check`：Astro・TypeScriptの型検査。
- `npm test`：単体・隔離ビルド検証。
- `npm run validate:content`：内容の参照・公開条件の検証。
- `npm run build`：通常成果物をdistへ生成。
- `npm run build:e2e`：架空資料を.runtime/e2e-distへ生成。
- `npm run test:e2e`：Chromium・WebKitでブラウザー検証。

文書変更はリンク、合意と提案の区分、`git diff --check` を確認する。アプリのテストを実行したとは記録しない。

## Architecture

[詳細設計](docs/superpowers/specs/2026-09-23-film-atlas-design.md)は2026-09-23に承認済み。[実装計画](docs/superpowers/plans/2026-09-23-film-atlas.md)は同日に承認済み。NativeでTask 1〜7を順次実装し、最後に独立レビューを行う。開発要件・設計・実装計画の正本はこのリポジトリに置く。会社の企画・判断・市場調査は01_kcpを参照し、本文を重複管理しない。

## Working rules

- 同じ作業ツリーの書き込み担当は1人。無関係な変更を巻き込まない。
- 対象作品・本数・技術構成は上位PLANの提案であり、確定済みと扱わない。
- 歴史の説明、作中の描写、本人の発言、編集者の解釈を区別する。根拠未確認の関係や引用を公開可能なデータとして扱わない。
- ネタバレ設定は本文だけでなく、地図・年表・関連リンクにも適用する設計を検討する。
- 画像・地図・引用の利用条件を記録する。確認前の素材は完成データに混ぜない。
- 秘密値はGitへ入れない。今回の準備ではAPI認証や課金を導入しない。
- 仕様・実装計画のCEOレビュー後に実装を始める。公開・投稿・支払い・マージは対応する明示依頼の範囲で実施する。
- 計測した利用と開発中の操作を区別する。noteへのクリックを読了・KCP認知・問い合わせとして報告しない。
- 日本語文書は01_kcpの文体規約とjapanese-tech-writingを適用する。

## Skill routing

- 開発の開始・切り替え：dev-harness。
- 設計・実装・検証：選択したハーネスの入口から進める。
- 通常の実装ではProduct Designを自動適用せず、画面のデザイン探索が必要な依頼で使用する。
- 外部APIの認証実装が必要になった場合：api-credentials。

## 開発フロー

上位PLAN → ローカルリポジトリと規約 → ハーネス選択 → 仕様・実装計画 → CEOレビュー → 実装・検証。実装後の変更は意味のある単位でコミットし、既存の接続先があればpush・PRまで進める。originは `https://github.com/null-n11o/film-atlas.git`。
