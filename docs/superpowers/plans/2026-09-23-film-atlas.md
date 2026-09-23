# 作品の背景地図 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 同じ作業ツリーの書き込み担当は1人とする。

**Goal:** 最初の1作品を出典付きで読める状態にし、人物・地図・年表と一貫したネタバレ制御を検証した後、追加作品への探索を確認する。

**Architecture:** MarkdownとJSONを読み、内容検証を通った公開対象だけからAstroで静的ページを生成する。安全な初期表示と、許可後に取得するネタバレデータを分離する。画面は共通の表示モデルを使い、外部API・認証・データベースを導入しない。

**Tech Stack:** Node.js 22.22.3、npm 10.9.8、Astro 7.3.4、TypeScript 5.9.3、Zod 4.6.5、Vitest 5.0.1、Playwright 1.63.0、通常のCSS。

**Spec:** [承認済み詳細設計](../specs/2026-09-23-film-atlas-design.md)。2026-09-23のユーザー「OKです」は設計承認と実装計画作成への合意であり、本計画の実行承認とは区別する。

状態：実装計画のレビュー待ち。以下のコードとコマンドは実装時の指示であり、作成・実行済みのアプリではない。

## Global Constraints

- 「最初の1作品で概要・背景解説・出典・人物・地図・年表・ネタバレ制御を検証し、追加作品で作品間の探索を確認する。」
- 「作品名と最終的な掲載本数は未確定。」
- 「MDXや任意HTMLの埋め込みは初期版で許可しない。」
- 「テスト専用データは実在の出典を装わない。」
- 「AIによる下書きだけでは `reviewed` に移さない。」
- 「初期HTML、ページタイトル、description、OG情報、構造化データには安全な文言のみを出力する。」
- 「初期DOMにネタバレ本文を入れてCSSだけで隠す方式は採用しない。」
- 「幅320px・390px・1280pxで本文の横はみ出しを確認する。」
- 「200%拡大時も本文と操作に到達できることを確認する。」
- 「初期実装では外部への計測送信を無効にする。」
- 「今回の設計承認はサービス公開、投稿、支払い、ドメイン取得の承認を含まない。」
- 仕様と本計画のCEOレビュー後に実装する。外部へのメッセージ送信はこの計画の実行に含めない。

## Review Focus

1. 同じIDの別種レコード、同じslugの同種レコード：型付き参照で前者を識別し、後者を拒否する（Task 1・2）。
2. Markdown内の危険なURL、直接貼られた画像、条件を迂回するリンク：許可されたレンダラーと構造化参照だけで表示する（Task 3）。
3. 解除後に到着する通信、壊れた保存値、履歴キャッシュ：閉じた本文・出典・ピンを再表示しない（Task 5）。
4. 同一座標、日付変更線、紀元前と不明年代：場所や年を欠落・誤変換させず、一覧から確認できる（Task 6）。
5. 取り下げ後の古い成果物とテストデータ：毎回出力先を作り直し、前回のHTML・JSON・素材を残さない（Task 3・7）。

## 実行環境と依存関係

2026-09-23に `node --version`、`npm --version`、`npm view` で確認した。AstroのNode条件は `>=22.12.0`、Vitestは `^22.12.0 || ^24.0.0 || >=26.0.0`、Playwrightは `>=20`。現在のNode.js 22.22.3はこれらの宣言条件を満たす。実際の組み合わせはTask 1のインストールと検証で確認する。

TypeScriptの最新取得値は7.0.2だったが、`@astrojs/check@0.9.10` のpeer条件は `^5.0.0 || ^6.0.0` だった。計画では取得可能な5.9.3を指定し、実装時に警告を無視して別バージョンへ上げない。

補助依存は `gray-matter@4.0.3`、`markdown-it@15.0.2`、`tsx@4.23.15`、`@astrojs/check@0.9.10`、`@types/node@22.20.4`、`@types/markdown-it@14.2.0`。直接依存は完全指定、推移依存は `package-lock.json` で固定する。インストールに失敗した場合は原因を調査して互換性のある組み合わせを記録し、`--force` や `--legacy-peer-deps` で回避しない。

参照：[Astro導入条件](https://docs.astro.build/en/install-and-setup/)、[Vitest公式ガイド](https://vitest.dev/guide/)、[Playwright導入ガイド](https://playwright.dev/docs/intro)。取得値の再確認は `npm view astro@7.3.4 engines --json`、`npm view vitest@5.0.1 engines --json`、`npm view @playwright/test@1.63.0 engines --json`、`npm view @astrojs/check@0.9.10 peerDependencies --json` で行える。

## 成果物と依存順序

Task 1 → 2 → 3 → 4 → 5 → 6 → 7で作品に依存しない機能を完成させる。Task 8は対象作品・確認担当の決定後、Task 9は最初の1作品の受入後に行う。Task 7完了をサービスの完成と報告しない。

| 配置 | 責務 |
|---|---|
| `content/entities/*.json`、`content/statements/*.md`、`content/assets/` | 公開前を含む内容の原稿。配信先に直接コピーしない |
| `src/lib/content/types.ts`、`schema.ts`、`load.ts` | 型、形式検証、JSON/frontmatterの読込 |
| `src/lib/content/validate.ts`、`publish.ts`、`markdown.ts` | 根拠・参照・公開条件、配信用データの生成、安全な本文変換 |
| `src/lib/spoilers/policy.ts`、`store.ts`、`controller.ts` | 表示条件、保存状態、取得と再描画の制御 |
| `src/lib/view/project.ts`、`types.ts`、`render.ts` | グラフから画面表示モデルへの変換と共有HTML生成 |
| `src/lib/map/project.ts`、`src/lib/timeline/order.ts` | 概略図の座標変換、年代のグループ分けと順序 |
| `src/pages/`、`src/layouts/Base.astro`、`src/components/` | ルート、メタ情報、画面部品 |
| `scripts/build.ts`、`validate-content.ts`、`audit-dist.ts` | 検証付き生成と成果物検査 |
| `tests/unit/`、`tests/e2e/`、`tests/fixtures/` | 自動検証とテスト専用データ |
| `docs/content-workflow.md`、`docs/verification/` | 人による内容確認手順と実際の検証結果 |

`dist/` は通常生成専用、`.runtime/e2e-dist/` はテスト専用とし、後者を公開先として案内しない。両方ともGit対象外。生成途中のファイルは `.runtime/build/` に置き、全検証が成功した場合だけ所定の出力先と置き換える。

## 共通データ契約

Task 1で以下を `types.ts` とZodスキーマに定義する。後続タスクは同じ名前を使う。`Entity.payload` はkindごとの判別共用体にする。

```ts
export type Kind = 'work' | 'background' | 'person' | 'place' |
  'event' | 'relation' | 'source' | 'evidence' | 'asset';
export type Ref = { kind: Kind; id: string };
export type Status = 'draft' | 'reviewed' | 'published' | 'withdrawn';
export type Review = { by: string; date: string; revision: number };
export type Base = {
  id: string; revision: number; status: Status; review: Review | null;
  spoilerWorkIds: string[];
};
export type GuardedText = { text: string; spoilerWorkIds: string[] };
export type Statement = Base & {
  owner: Ref;
  kind: 'history' | 'depiction' | 'statement' | 'interpretation';
  section: 'summary' | 'background' | 'connection' | 'production' | 'acting' | 'interpretation';
  workIds: string[]; evidenceRefs: string[]; markdown: string;
  quote: null | { speaker: string; locator: string; original: string;
    translated: boolean; assetId: string };
};
export type Entity = Base & {
  kind: Kind; slug: string | null; safeTitle: string; safeSummary: string;
  title: GuardedText; payload: Payload;
};
export type Dataset = { entities: Entity[]; statements: Statement[] };
export type Issue = { code: string; ref: string; message: string };
export type PublishedGraph = { entities: PublicEntity[]; statements: PublicStatement[] };
export type PublicEntity = Omit<Entity, 'review' | 'revision' | 'status' | 'payload'> & { payload: PublicPayload };
export type PublicStatement = Omit<Statement, 'review' | 'revision' | 'status' | 'markdown'> & { html: string };
export type PageRef = { kind: 'work' | 'background' | 'person'; id: string };
export type PayloadGroup = { token: string; requires: string[]; graph: PublishedGraph };
export type Publication = { base: PublishedGraph; groups: PayloadGroup[] };
```

`Payload`のkind別項目は次のとおり。Entityのkindとpayloadのtypeは一致を必須とする。

| type | 項目 |
|---|---|
| work | `jaTitle: string, originalTitle: string, releaseYear: number` |
| background | `category: 'history' \| 'culture' \| 'production' \| 'acting' \| 'interpretation'` |
| person | `name: string, disambiguation: string` |
| place | `space: 'earth' \| 'fiction', worldId: string \| null, coordinates: {lat:number,lon:number} \| null, period: string, precision: 'exact' \| 'approximate' \| 'unknown', evidenceRefs: string[]` |
| event | `domain: 'history' \| 'story' \| 'release', worldId: string \| null, start: number \| null, end: number \| null, dateLabel: string, certainty: 'exact' \| 'approximate' \| 'range' \| 'unknown', evidenceRefs: string[]` |
| relation | `from: Ref, to: Ref, relationKind: 'inspiration' \| 'adaptation' \| 'shared-background' \| 'comparison' \| 'participation' \| 'context' \| 'location' \| 'chronology', reasonStatementIds: string[], evidenceRefs: string[]` |
| source | `author: string, url: string \| null, bibliography: string \| null, accessedOn: string` |
| evidence | `sourceId: string, target: Ref \| {kind:'content-statement',id:string}, locator: string, verificationNote: string, support: 'explicit-statement' \| 'correspondence' \| 'comparison' \| 'fact'` |
| asset | `path: string, creator: string, origin: string, terms: string, checkedOn: string, checkedBy: string, attribution: string, modified: boolean, alt: GuardedText` |

出典が支える対象は記述だけでなく座標・年代・関係も含む。根拠・出典にネタバレ条件がある場合は、それを使う記述にも条件を継承させる。公開モデルから `verificationNote` とローカル素材パスを除き、素材パスは検証済みの配信用URLへ置き換える。安全なsafeTitleはページの入口にだけ使い、隠れた人物・関係の存在を一覧に追加するためには使わない。

`PublicPayload` はPayloadの判別共用体を基に、evidenceからverificationNote、assetからpath・checkedByを取り除き、assetに `publicUrl: string` を追加した型とする。URLは `/assets/` 以下の生成先だけを認める。素材のattributionとtermsは残す。条件付きtitleを持つ安全なレコードはbaseに安全なtitleで入れ、許可後のグループに正式titleを持つ同IDのレコードを入れる。統合は型付きIDで行い、base→許可済みgroupsの順で置き換える。解除時は毎回baseから作り直し、上書きしたtitleを残さない。

日付は実在するISO日付、slugは小文字英数字とハイフン、IDは英数字・ハイフン・アンダースコアに限定する。本文から識別子への参照は構造化項目で管理し、Markdown内の内部リンク・画像は許可しない。出典URLはHTTPSまたはHTTPに限定する。

## Task 1：原稿形式と読込の検証

**Files:** Create `package.json`, `package-lock.json`, `.nvmrc`, `tsconfig.json`, `vitest.config.ts`, `src/lib/content/{types,schema,load}.ts`, `tests/unit/load.test.ts`, `tests/fixtures/make-dataset.ts`, `content/README.md`。

**Interfaces:** `loadDataset(root: string): Promise<Dataset>`、`parseEntity(value: unknown): Entity`、`parseStatement(frontmatter: unknown, markdown: string): Statement`。テスト用 `makeDataset(): Dataset` は呼出しごとに独立したデータを返す。

- [ ] 実装承認と作業ツリーの状態を確認し、実行時のworktree手順に従う。原稿やユーザー変更を移動・削除しない。
- [ ] 以下の依存とテスト実行設定を導入する。`.nvmrc` は `22.22.3`、packageは `private: true, type: 'module'`、TypeScriptはstrictを有効にする。

```sh
npm install --save-exact astro@7.3.4 zod@4.6.5 gray-matter@4.0.3 markdown-it@15.0.2
npm install --save-dev --save-exact typescript@5.9.3 vitest@5.0.1 @playwright/test@1.63.0 tsx@4.23.15 @astrojs/check@0.9.10 @types/node@22.20.4 @types/markdown-it@14.2.0
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/unit/**/*.test.ts'] } });
```

- [ ] 公開作品2件を含むfactoryを作る。IDはw1・w2、同じ邦題「テスト専用作品」、公開年2000・2001、slugはtest-work-a・test-work-b。確認者は「テスト専用の架空確認者」、日付は2026-09-23、revisionは1。実コンテンツの確認記録として流用しない。
- [ ] 次のテストを先に追加する。frontmatter欠落、型不正、同種IDの重複、別種で同じID、UTF-8の邦題もケースに含める。

```ts
import { expect, it } from 'vitest';
import { parseEntity } from '../../src/lib/content/schema';
import { makeDataset } from '../fixtures/make-dataset';
it('ネタバレ条件の未指定を拒否する', () => {
  const value = { ...makeDataset().entities[0] };
  delete (value as Partial<typeof value>).spoilerWorkIds;
  expect(() => parseEntity(value)).toThrow();
});
```

- [ ] `npx vitest run tests/unit/load.test.ts` で読込・スキーマ未実装による失敗を確認する。
- [ ] 共通契約をZodのstrictな判別共用体として実装し、JSONと各Markdownのfrontmatterを読んで配列にする。構文エラーにはファイル名を添え、読込順に依存させない。Markdownは1ファイル1記述。素材を除く未知拡張子は読込対象にしない。

```ts
// load.tsのMarkdown変換の中心。読み込んだ相対ファイル名をエラーに添える。
import matter from 'gray-matter';
import { parseStatement } from './schema';
export function readStatement(text: string) {
  const parsed = matter(text);
  return parseStatement(parsed.data, parsed.content);
}
```

- [ ] 同じテストを通し、`npx tsc --noEmit` で型を確認する。依存のpeer警告を確認する。
- [ ] 現仕様のrevision方式では、人がrevisionを更新し忘れた場合の内容差分までは機械的に保証しないことをcontent/README.mdに記載する。変更差分とrevisionを確認する手順をTask 8の内容制作手順へ引き継ぐ。
- [ ] Task 1の列挙ファイルだけをstageし、`feat: validate content file formats` でコミットする。

## Task 2：出典・関係・公開条件の検証

**Files:** Create `src/lib/content/validate.ts`, `tests/unit/validate.test.ts`; Modify `tests/fixtures/make-dataset.ts`。

**Interfaces:** `validateDataset(data: Dataset): Issue[]`。空配列だけを公開処理の成功条件とする。`refKey(ref: Ref): string` は `${ref.kind}:${ref.id}`。

- [ ] factoryにbackground b1、person p1、place l1、event e1、source s1、evidence v1を追加する。w1→b1をcontext、b1→l1をlocation、b1→e1をchronology、p1→w1をparticipationで結ぶ。記述はid st1、owner b1、history・background、本文「TEST_ONLY 背景説明」、根拠v1。v1のtargetはcontent-statement:st1、出典は「テスト専用資料」、書誌は「架空のテスト資料」。各関係の理由と根拠も同じ形式で別IDとして追加する。
- [ ] 公開参照先がdraftの場合に失敗するテストを追加する。

```ts
import { expect, it } from 'vitest';
import { validateDataset } from '../../src/lib/content/validate';
import { makeDataset } from '../fixtures/make-dataset';
it('公開作品の関係から下書き背景を参照できない', () => {
  const data = makeDataset();
  data.entities.find(x => x.kind === 'background' && x.id === 'b1')!.status = 'draft';
  expect(validateDataset(data).some(x => x.code === 'NON_PUBLIC_REFERENCE')).toBe(true);
});
```

- [ ] `npx vitest run tests/unit/validate.test.ts` で失敗を確認する。
- [ ] 種類とIDの索引を作り、次の検証を個別のIssueへ変換する。最初のエラーで残りを隠さない。

```ts
export const refKey = (ref: {kind: string; id: string}) => `${ref.kind}:${ref.id}`;
// 確認済み・公開済みは現revisionの人による確認を要求する。
const isReviewedRevision = (item: {revision: number; review: {revision: number} | null}) =>
  item.review !== null && item.review.revision === item.revision;
```

| 検証 | Issue code |
|---|---|
| 同種ID・slug重複 | DUPLICATE_ID / DUPLICATE_SLUG |
| 参照切れ・接続種類の不一致 | MISSING_REFERENCE / INVALID_RELATION |
| 公開依存先が非公開 | NON_PUBLIC_REFERENCE |
| 確認revisionの不一致 | STALE_REVIEW |
| 記述、座標、年代、関係の根拠欠落・対象不一致 | INVALID_EVIDENCE |
| inspirationにexplicit-statementの根拠なし | UNPROVEN_INSPIRATION |
| 素材・引用の確認なし、content/assets外のパス | UNREVIEWED_ASSET / INVALID_ASSET_PATH |
| 年代逆転、架空座標、緯度経度範囲外 | INVALID_DATE / INVALID_COORDINATES |
| spoilerWorkIdsにwork以外のID | INVALID_SPOILER_WORK |

contextはwork→background、locationはbackground→place、chronologyはbackground→event、participationはperson→work、inspiration/adaptationはwork→work/person/background、shared-background/comparisonはwork→workに限定する。背景→人物はcontextの追加許可として定義する。全種で理由と根拠を要求する。

- [ ] 各Issueについて入力を1箇所ずつ変更するテストを追加する。別種同IDは成功、slug重複は失敗、withdrawnは公開参照不可、年代nullは不明として成功、架空座標は失敗を確認する。
- [ ] `npx vitest run tests/unit/validate.test.ts` と全単体テストを通す。
- [ ] 対象ファイルを `feat: enforce evidence and publication rules` でコミットする。

## Task 3：公開データ分離と再生成

**Files:** Create `src/lib/content/{publish,markdown}.ts`, `src/lib/spoilers/policy.ts`, `scripts/{build,validate-content,audit-dist}.ts`, `tests/unit/{publish,markdown,artifacts}.test.ts`, `astro.config.mjs`; Modify `package.json`, `.gitignore`。

**Interfaces:** `publish(data: Dataset): Publication`、`canView(required: readonly string[], allowed: ReadonlySet<string>): boolean`、`renderMarkdown(text: string): string`。`buildSite(mode: 'production' | 'e2e'): Promise<void>` は前者でcontentのみ、後者でfactoryのみを使う。CLIの任意content-rootは受け付けない。

- [ ] 非公開とネタバレを区別するテストを追加する。

```ts
import { expect, it } from 'vitest';
import { publish } from '../../src/lib/content/publish';
import { makeDataset } from '../fixtures/make-dataset';
it('初期データへネタバレ本文を含めない', () => {
  const data = makeDataset();
  data.statements.find(x => x.id === 'st1')!.spoilerWorkIds = ['w1'];
  data.statements.find(x => x.id === 'st1')!.markdown = 'SPOILER_SENTINEL';
  const output = publish(data);
  expect(JSON.stringify(output.base)).not.toContain('SPOILER_SENTINEL');
  expect(JSON.stringify(output.groups)).toContain('SPOILER_SENTINEL');
});
```

- [ ] `npx vitest run tests/unit/publish.test.ts` で失敗を確認する。
- [ ] 次の共通判定を実装する。公開依存の条件を集合和で継承し、循環する参照は追加がなくなるまで計算する。対象は所有者、根拠→出典、関係の両端・理由、引用素材。外向きの全関係を所有者へ逆継承して、安全な概要まで隠さない。

```ts
export function canView(required: readonly string[], allowed: ReadonlySet<string>): boolean {
  return required.every(id => allowed.has(id));
}
```

- [ ] 形式・公開条件にIssueがあればpublishを失敗させる。公開対象だけを抽出し、通常公開データには安全なフィールドだけを列挙してコピーする。オブジェクトのspreadで編集メモを混ぜない。条件付きtitleは安全な文字列へ置換し、正式titleを条件グループへ分ける。グループは必要作品集合ごとに分け、tokenには集合のハッシュを使う。IDや題名をURLに含めない。
- [ ] Markdown変換ではHTMLを無効にし、画像・リンクのトークンを拒否する。外部出典・内部関係へのリンクは構造化データから描画する。装飾、段落、箇条書き、引用表記だけを許可する。

```ts
import MarkdownIt from 'markdown-it';
const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
// parse後に全childrenを巡回し、image/link_open/html_inline/html_blockを拒否。
// HTML風の入力はテキストにエスケープされ、ブラウザーで実行されない。
```

- [ ] `<script>`、`javascript:`、Markdown画像、内部リンクの入力が実行可能なHTMLやリンクにならないテストを追加する。確認メモ・draft・withdrawn・未確認素材が出力にないことを確認する。
- [ ] buildSiteは生成開始時に所定の出力先を空にし、専用の一時ディレクトリにmanifestとJSONを作る。production生成でTEST_ONLYを検出した場合は失敗させる。成功時だけAstro生成物を出力先へ置く。e2eは `.runtime/e2e-dist/` へ出し、全ページにテスト用表示とnoindexを付ける。

```json
{
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "test": "vitest run",
    "validate:content": "tsx scripts/validate-content.ts",
    "build": "tsx scripts/build.ts production",
    "build:e2e": "tsx scripts/build.ts e2e",
    "test:e2e": "playwright test"
  }
}
```

astro.configは `output: 'static'`。Astroが読むmanifestはbuildSiteが固定パスに生成し、Astro起動前のフックで存在・modeを検証する。`npm run dev` もcontent検証とproduction用manifest生成を経由するようにフックを接続する。直接 `astro build` が古いe2e manifestを使う場合は拒否する。配信用素材は公開assetの一覧からだけコピーし、`public/`に原稿・テスト素材を置かない。

- [ ] artifacts.testは一度公開した対象をwithdrawnにして再生成し、旧HTML・JSONが残らないことを一時ディレクトリで検証する。全単体テストを通す。ページを作るTask 4まではbuildSiteのデータ生成部分を対象にする。
- [ ] 対象ファイルを `feat: generate reviewed public content only` でコミットする。

## Task 4：安全な初期ページと出典の動線

**Files:** Create `src/lib/view/{types,project,render}.ts`, `src/layouts/Base.astro`, `src/components/{Content,References,WorkLinks}.astro`, `src/pages/index.astro`, `src/pages/works/[slug].astro`, `src/pages/backgrounds/[slug].astro`, `src/pages/people/[slug].astro`, `src/pages/about.astro`, `src/pages/404.astro`, `src/styles/global.css`, `src/site.ts`, `playwright.config.ts`, `tests/e2e/reading.spec.ts`, `tests/unit/view.test.ts`。

**Interfaces:** `projectPage(graph: PublishedGraph, page: PageRef, allowed: ReadonlySet<string>): PageView`。`PageView`は `title: string, summary: string, blocks: {id:string,kind:string,section:string,html:string,evidenceIds:string[]}[], references: {id:string,title:string,author:string,locator:string,url:string|null,bibliography:string|null}[], links: {label:string,href:string,kind:string,reason:string}[], places: PublicEntity[], events: PublicEntity[], readingMinutes: number`。`renderPageBody(view: PageView): string` はサーバー・クライアント共通。

- [ ] Playwrightにローカルのe2e成果物配信を設定する。`webServer`で `npm run build:e2e` 後にAstro previewを起動し、127.0.0.1にbind、reuseExistingServerはfalse。ChromiumとWebKitのprojectを定義し、実装時に対応ブラウザーを導入する。
- [ ] 同名作品を取り違えず、解説から出典へ移動できるテストを追加する。

```ts
import { test, expect } from '@playwright/test';
test('公開年で作品を選び、背景と出典へ進む', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'テスト専用作品（2000）', exact: true }).click();
  await expect(page).toHaveURL(/\/works\/test-work-a\/$/);
  await page.getByRole('link', { name: 'テスト専用背景', exact: true }).click();
  await expect(page.getByRole('heading', { name: '背景の説明' })).toBeVisible();
  await page.getByRole('link', { name: '出典1', exact: true }).click();
  await expect(page.locator('#evidence-v1')).toContainText('テスト専用資料');
});
```

- [ ] `npx playwright test tests/e2e/reading.spec.ts --project=chromium` で未実装による失敗を確認する。
- [ ] projectPageで許可集合を満たす要素だけを選び、表示した記述の出典だけを集める。作品の接点をworkIdsで分け、見出しを「背景の説明」「作品との接点」「本人の発言」「編集者の解釈」として区別する。背景・人物の逆リンクはrelationから作る。

```ts
const readingMinutes = Math.max(1, Math.ceil(Array.from(visiblePlainText).length / 500));
// visiblePlainTextは表示する本文のテキスト。HTMLタグ・非表示本文は含めない。
```

- [ ] 動的ルートはmanifestの公開レコードからだけgetStaticPathsを作る。初期HTMLは空の許可集合のPageViewを使用。renderPageBodyで通常文字列をエスケープし、Task 3が生成したhtmlだけを本文として挿入する。AstroのContent部品と後の再描画がこの関数を共有する。
- [ ] Baseにlang=ja、safeTitle/summaryからメタ情報、本文へのスキップリンク、noscript説明を置く。未設定のサイトURLではcanonical/OG URLとサイトマップを生成しない。公開時の設定があればHTMLルートのみのサイトマップを生成する。
- [ ] src/site.tsのnote・連絡先・公開名を `null` 初期値とし、表示値は `{value:string,verifiedOn:string}` のみ受け入れる。aboutに制作意図・出典・訂正方針を記載する。未設定の連絡先へ誘導しない。
- [ ] 404、関連作品なし、人物→作品へ戻る、書籍のみの出典、空の分類を表示しないケースを追加する。公開日・題名・URLを補完しない。CSSで本文幅、折返し、focus-visibleを設定する。
- [ ] `npm run check`、`npm test`、対象E2Eを通し、`feat: add readable film background pages` でコミットする。

## Task 5：作品別のネタバレ切替

**Files:** Create `src/lib/spoilers/{store,controller}.ts`, `src/components/SpoilerControls.astro`, `src/pages/_content/[token].json.ts`, `src/scripts/page.ts`, `tests/unit/{policy,store}.test.ts`, `tests/e2e/spoilers.spec.ts`; Modify `src/layouts/Base.astro`, `tests/fixtures/make-dataset.ts`。

**Interfaces:** `readAllowed(storage: Pick<Storage,'getItem'>): Set<string>`、`writeAllowed(storage: Pick<Storage,'setItem'>, allowed: ReadonlySet<string>): boolean`。`mountSpoilers(root: HTMLElement, page: PageRef, base: PublishedGraph, groups: {token:string,requires:string[]}[]): () => void` は破棄関数を返す。ページへ渡すmanifestにはグループの題名や本文を含めない。

- [ ] factoryへw1条件付きの本文・出典題名・場所と、w1+w2条件付きの関連理由を追加する。以下の判定テストと保存例外・壊れたJSONのテストを書く。

```ts
import { expect, it } from 'vitest';
import { canView } from '../../src/lib/spoilers/policy';
it('2作品の許可が必要な内容は片方だけでは開かない', () => {
  expect(canView(['w1', 'w2'], new Set(['w1']))).toBe(false);
  expect(canView(['w1', 'w2'], new Set(['w1', 'w2']))).toBe(true);
});
```

- [ ] `npx vitest run tests/unit/policy.test.ts tests/unit/store.test.ts` で未実装箇所の失敗を確認する。policy自体はTask 3で導入済みなので、この部分が既に通ることは許容する。
- [ ] storeはキー `film-atlas:spoilers:v1`、値 `{version:1,workIds:string[]}` とし、読込時に型検証する。例外・未知バージョンは空集合。書込失敗時はメモリーの現在ページ状態を維持する。
- [ ] controllerは状態更新ごとに世代番号を進める。許可を満たすグループだけをfetchし、レスポンスの型と必要許可を再検証する。解除時は即時にprojectPage→renderPageBodyで再描画し、失敗時には安全な本文と再試行を残す。

```ts
let generation = 0;
// 更新時の中心。allowedとrenderはcontroller内の現在状態と描画処理。
const requestGeneration = ++generation;
const response = await fetch(url);
if (!response.ok) throw new Error('CONTENT_FETCH_FAILED');
const value: unknown = await response.json();
if (requestGeneration !== generation) return;
// valueをスキーマで検証し、現在のallowedを使って表示可否を再確認してから描画。
```

- [ ] pagehideで条件付き表示を除去し、pageshowで保存状態を再読込する。解除ボタンは本文領域の外に置き、消える領域にフォーカスがあればボタンへ戻す。URL値から許可を追加しない。JavaScriptが動くまで切替はdisabledにする。
- [ ] E2Eで初期DOM・HTML・メタ情報にSPOILER_SENTINELがないこと、許可後に表示されること、解除後に出典や関連リンクにもないことを確認する。次の遅延レスポンス試験を追加する。

```ts
import { test, expect } from '@playwright/test';
test('取得中に閉じた本文を通信完了後も表示しない', async ({ page }) => {
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/_content/*.json', async route => {
    await barrier;
    await route.continue();
  });
  await page.goto('/works/test-work-a/');
  await page.getByRole('button', { name: 'この作品のネタバレを表示', exact: true }).click();
  await page.getByRole('button', { name: 'この作品のネタバレを隠す', exact: true }).click();
  release();
  await expect(page.getByText('SPOILER_SENTINEL', { exact: true })).toHaveCount(0);
});
```

- [ ] 取得失敗と再試行、直接URL、再読み込み、戻る、sessionStorage例外、未知バージョン、JS無効を追加し、Chromium・WebKitの両方で確認する。遅延試験はレスポンス到着を待ってから非表示を再確認し、到着前のassertだけで成功扱いにしない。
- [ ] `npm run check`、`npm test`、`npx playwright test tests/e2e/spoilers.spec.ts` を通し、`feat: synchronize spoiler visibility across pages` でコミットする。

## Task 6：概略図・場所一覧・年表

**Files:** Create `src/lib/map/project.ts`, `src/lib/timeline/order.ts`, `src/components/{PlaceMap,PlaceList,Timeline}.astro`, `tests/unit/{map,timeline}.test.ts`, `tests/e2e/exploration.spec.ts`; Modify `src/lib/view/{project,render}.ts`, `src/scripts/page.ts`。

**Interfaces:** `projectMap(points: {id:string,lat:number,lon:number}[]): {groups:{ids:string[],x:number,y:number}[], bounds:{west:number,east:number,south:number,north:number}}`、`orderEvents(events: PublicEntity[]): {key:string,items:PublicEntity[]}[]`。入力はprojectPageが現在作品から到達できるものに限定したplaces/events。

- [ ] 日付変更線で隣り合う地点と同じ場所の複数項目が欠落しないテストを書く。

```ts
import { expect, it } from 'vitest';
import { projectMap } from '../../src/lib/map/project';
it('日付変更線付近の2地点を近接して配置する', () => {
  const out = projectMap([{id:'a',lat:0,lon:179},{id:'b',lat:0,lon:-179}]);
  expect(out.bounds.east - out.bounds.west).toBeLessThan(20);
  expect(out.groups.flatMap(x => x.ids).sort()).toEqual(['a', 'b']);
});
```

- [ ] `npx vitest run tests/unit/map.test.ts tests/unit/timeline.test.ts` で失敗を確認する。
- [ ] 経度を0〜360へ正規化して整列し、最大の空白区間の直後をwestとして折り返す。緯度経度の幅には最低10度と10%の余白を設け、緯度は-90〜90に収める。同じ座標を1グループにする。0地点は図を出さず一覧を表示する。

```ts
const normalizeLongitude = (lon: number) => ((lon % 360) + 360) % 360;
// x=(unwrappedLon-west)/(east-west)、y=1-(lat-south)/(north-south)。
// SVG viewBoxは0 0 1000 500、余白は40。単地点でも分母を0にしない。
```

- [ ] SVGに緯線・経線と名称、概略図の注記を出し、選択したグループの一覧を表示する。グループ選択はキーボードでも可能にする。SVGから独立した場所一覧は常に表示する。架空はworldId単位、位置不明は別欄に置く。
- [ ] orderEventsはdomainとworldIdでグループ化し、startがnullの項目を別の「年代不明」欄へ移す。0をnull扱いしない。開始年、終了年、IDの順で安定整列し、元の表示用年代と確実性を残す。
- [ ] 単地点、同一座標、空配列、両極、紀元前1年=0、null、重なる範囲、複数worldIdのテストを追加する。E2Eで図と一覧が同じ解説に到達すること、解除後のピン・縮尺・年表からネタバレが消えること、JS無効でも一覧が使えることを確認する。
- [ ] 対象単体・E2Eと型検査を通し、`feat: add contextual map and timeline` でコミットする。

## Task 7：成果物検査と操作性の受入

**Files:** Create `tests/e2e/accessibility.spec.ts`, `tests/e2e/artifacts.spec.ts`, `docs/verification/implementation.md`; Modify `scripts/audit-dist.ts`, `README.md`, `AGENTS.md`, `src/styles/global.css`。

**Interfaces:** `auditDist(dir: string, mode: 'production' | 'e2e'): Promise<Issue[]>`。公開成果物に対する検査だけを担当し、原稿の事実確認を代替しない。

- [ ] 幅320px・390px・1280pxの本文はみ出しテストを追加する。

```ts
import { test, expect } from '@playwright/test';
for (const width of [320, 390, 1280]) {
  test(`本文が幅${width}pxに収まる`, async ({ page }) => {
    await page.setViewportSize({width, height:900});
    await page.goto('/works/test-work-a/');
    const fits = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(fits).toBe(true);
  });
}
```

- [ ] 未調整部分で失敗するケースを確認し、折返し・余白・フォーカス表示を修正する。読みにくさは横幅の数値だけで合格にせず、200%拡大、Tab移動、スキップリンク、地図選択、出典から戻る操作を手動確認する。
- [ ] 成果物を走査し、HTMLと初期データにネタバレの検査文字列がないこと、productionにTEST_ONLYと編集メモがないこと、生成HTMLの内部リンク先が存在することを検証する。外部URLへ自動アクセスしてリンクの存在だけを根拠確認済みとしない。
- [ ] 一度生成した公開ページをwithdrawnへ変更し、関係を修正して再生成するテストを実行する。旧ページ・追加JSON・素材の削除を確認する。ビルド失敗時に部分的な成果物を完成物として残さない。
- [ ] ブラウザーのrequestを監視し、閲覧とnote操作前のページ読込で外部計測・外部フォント・地図タイルへの通信がないことを確認する。
- [ ] `npm run check`、`npm test`、`npm run build`、`npm run test:e2e` を実行し、結果・ブラウザー・手動確認した画面をimplementation.mdへ記録する。productionに実コンテンツが未投入なら、空の一覧の検証と機能検証を分けて記録する。
- [ ] README・AGENTSに実行できたコマンドだけを追記し、`test: verify publication and reading experience` でコミットする。

## Task 8：最初の1作品の内容制作と受入

**Files:** Create `docs/content-workflow.md`, `docs/verification/first-work.md`; Add selected records under `content/entities/` and `content/statements/`、必要な確認済み素材のみ `content/assets/`。

**Interfaces:** Task 1の原稿形式、Task 2のIssue、Task 7の成果物検査。作品IDは選定後に発行し、候補名をコードの定数にしない。

- [ ] 対象作品と人の確認担当をユーザーに確認する。候補のDUNEを自動採用しない。回答前もTask 1〜7は進められるが、本タスクの実原稿作成は決定後に行う。
- [ ] 編集者が出典を調査し、資料名・著者・参照日・該当箇所と個々の主張の対応を記録する。最低限、作品1、背景1、人物1、場所1、出来事1を成立させる資料を確認する。
- [ ] content-workflow.mdに「draft作成→担当による資料内容・素材条件・ネタバレ確認→reviewed→公開対象選定→published→検証」の手順と、修正時のrevision更新を記載する。確認日や確認者をAIが代行記入しない。
- [ ] 初稿はdraftのまま保存し、`npm run validate:content` で形式と参照を確認する。人の確認結果を受領後にreviewを記録する。事実・描写・発言・解釈の混同を直してから公開対象状態へ移す。ここでのpublishedは静的生成対象を意味し、インターネット公開の操作ではない。
- [ ] `npm run validate:content`、`npm run build` と実コンテンツでの手動動線確認を行う。設計第2節の最低条件をfirst-work.mdで件ごとに確認する。実コンテンツにネタバレがなければ制御はテストデータで検証した旨を分ける。
- [ ] 資料が揃わない項目は不足と理由を記録し、候補変更または完成範囲変更をレビューする。テストデータを置き換えて完成扱いにしない。
- [ ] 確認済みの内容と記録を `content: complete first reviewed film` でコミットする。CEOが最初の1作品の受入を判断する。

## Task 9：追加作品と作品間探索

**Files:** Add selected records under `content/entities/` and `content/statements/`; Create `tests/e2e/related-works.spec.ts`, `docs/verification/related-works.md`。

**Interfaces:** relationKindがshared-background/comparison/inspiration/adaptationの作品間関係、Task 4のlinks、Task 5の許可集合。

- [ ] 最初の1作品を受け入れた後、追加作品と本数を確認する。資料確認済みの関係だけを登録する。
- [ ] テスト用w1→w2の理由を表示し、w2へ移動しても許可が自動追加されないE2Eを書く。

```ts
import { test, expect } from '@playwright/test';
test('関連作品へ進んでもその作品のネタバレを自動許可しない', async ({ page }) => {
  await page.goto('/works/test-work-a/');
  await page.getByRole('link', {name:'テスト専用作品（2001）',exact:true}).click();
  await expect(page).toHaveURL(/\/works\/test-work-b\/$/);
  await expect(page.getByRole('button', {name:'この作品のネタバレを表示',exact:true})).toBeVisible();
});
```

- [ ] 実行して挙動を確認する。既存実装で通る場合はテストを失敗させるための不要な変更をしない。欠陥がある場合はこのテストを維持して修正する。
- [ ] Task 8の確認手順で追加原稿と関係の理由・根拠を作る。資料で関係を確認できない場合は関連作品欄を空に保つ。異なる作品に同じ背景を接続するときは背景本文を複製しない。
- [ ] `npm run validate:content`、`npm run build`、関連E2Eを確認し、実データの関係の有無と判断をrelated-works.mdへ記録する。
- [ ] 対象を `content: add reviewed film connections` でコミットする。

## 要求とタスクの対応

| 要求 | 主な担当タスク |
|---|---|
| R01 作品識別 | 1・4 |
| R02 概要・読む目安 | 3・4 |
| R03 背景と接点 | 2・4・8 |
| R04 出典 | 2・4・8 |
| R05 関係の種類 | 2・4・9 |
| R06 ネタバレ | 3・5・6 |
| R07 地図と代替 | 6 |
| R08 年代の区別 | 1・6 |
| R09 関連作品 | 4・9 |
| R10 人物 | 2・4・8 |
| R11 確認済みnote | 4 |
| R12 空・不明 | 2・4・7 |
| R13 操作性 | 4・6・7 |

## 計画の受入と引き継ぎ

本計画のレビューと実行方法の選択後に着手する。実行方法は、同じ担当が順に実装するNative、またはタスクごとに実装とレビューを分担するSubagent-drivenから選ぶ。今回の各タスクは内容モデルと表示モデルへの依存が強いため、Nativeを推奨する。分担する場合も書き込みは1人ずつに限定する。

2026-09-23の確認ではGitのoriginは `https://github.com/null-n11o/film-atlas.git` に設定されている。実装後はAGENTS.mdに従って意味のある単位でコミットし、接続先の状態を確認してpush・PRまで進める。マージ・公開は個別の明示依頼を要する。

公開前には配信先、運用費上限、運営者情報、追加JSONのnoindexヘッダーと古い成果物の置換を確認する。計測導入は別途レビューする。今回の実装計画はホスティング契約や計測導入を含まない。

会社側の企画正本・未決事項の照合とNotion結果反映は引き続き未実施である。本計画完成を上位PLAN全体の完了として扱わない。
