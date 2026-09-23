# 作品の背景地図（仮称：film-atlas）

映画を入口に歴史・文化と制作・人物の背景を知るWebサービス。開発実績、実利用、個人noteを通じたKCP認知を目指す。

Task 1〜7は実装済み。詳細設計と実装計画は承認済み。最初の対象は『オデュッセイア』（2026年）、当面は1作品、内容確認担当は中野さんに決定した。初稿はdraftで保存し、通常画面にはまだ掲載していない。[受入記録](docs/verification/first-work.md)を参照する。正式名称は未確定。

## 読む順序

1. [企画の正本](/Users/nakanokentaro/01_kcp/workspace/product/ideas/2026-09-23-作品の背景地図/00-brief.md)
2. [企画PLANの正本](/Users/nakanokentaro/01_kcp/workspace/management/plans/2026/09/PLAN-20260923-300-film-atlas.md)
3. [上位PLANの参照コピー](docs/2026/09/PLAN-20260923-300-film-atlas.md)
4. [初期版の要求案](docs/2026/09/requirements.md)
5. [作業規約](AGENTS.md)
6. [初期版の詳細設計](docs/superpowers/specs/2026-09-23-film-atlas-design.md)
7. [実装計画](docs/superpowers/plans/2026-09-23-film-atlas.md)

継続作業は[Notion Task](https://app.notion.com/p/3e4208bc20a38161b0eed4673bd5de2e)を参照する。資料中の個人ディレクトリへのリンクはローカル環境向け。

## 開発と検証

Node.jsは.nvmrc、依存関係はpackage-lock.jsonで固定する。初回はnpm ciとnpx playwright install chromium webkitを実行する。

```sh
npm run dev              # 原稿を検証してローカル起動
npm run check            # AstroとTypeScriptの型検査
npm test                 # 単体・隔離ビルド検証
npm run validate:content # 原稿の参照・公開条件
npm run build            # contentだけからdistへ生成
npm run test:e2e          # テスト専用ビルドをChromium・WebKitで検証
```

画面検証用の架空資料はtests/fixturesに置く。npm run build:e2eの出力.runtime/e2e-distはテスト専用であり、公開対象にしない。通常ビルドは実原稿が内容確認前のため空の作品一覧になる。直接astro buildを呼ぶと検証前の生成を拒否する。

[画面方針](DESIGN.md)と[実装検証記録](docs/verification/implementation.md)を参照する。開発ハーネスはSuperpowers、実行方法はNative。最初の1作品を人が確認して受け入れてから追加する。

Gitのoriginはhttps://github.com/null-n11o/film-atlas.git。公開先・ドメイン・note URLは未確定。公開時は追加JSONへのX-Robots-Tag: noindexと古い成果物の置換を確認する。マージや公開は明示依頼後に行う。
