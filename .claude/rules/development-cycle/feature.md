# 機能（ユーザーストーリー）追加サイクル

新しい機能を縦串で追加するときの作業順序を定める。本ルールは「**何をどこに置くか**」（[`../directory-structure.md`](../directory-structure.md)）「**どう名付けるか**」（[`../naming.md`](../naming.md)）「**どう書くか**」（[`../styling.md`](../styling.md)）「**Server / Client 境界**」（[`../server-client-boundary.md`](../server-client-boundary.md)）「**データフェッチ**」（[`../data-fetching.md`](../data-fetching.md)）「**キャッシュ**」（[`../caching-and-rendering.md`](../caching-and-rendering.md)）「**非同期 UI**」（[`../async-ui.md`](../async-ui.md)）「**エラー**」（[`../error-handling.md`](../error-handling.md)）といった既存の静的規約と、`/frontend-design` `/web-design-guidelines` `/react-doctor` などのスキルを、**どの順序で適用するか**を示す動的な作業フローを定義する。

本サイクルは [`./component.md`](./component.md)（コンポーネント 1 個）と [`./domain-logic.md`](./domain-logic.md)（ドメインロジック 1 単位）の **上位サイクル**であり、両者を呼び出すメタサイクルとして機能する。

**射程**: ユーザーストーリー単位（例: ユーザー削除機能、コメント投稿機能、検索機能）。1 つの「ユーザーが達成したいこと」を最小単位とする。UI（Container / Presentational）+ ドメインモデル（`models/`）+ fetcher（`api/`）+ 必要に応じて hook を縦串で扱う。書き処理（mutation）の fetcher を Client Component から起動する必要がある場合に限り、`actions/` の Server Action ラッパーも対象に含める。

**ページ全体の新規追加は対象外**。`page.tsx` を新たに切る場合は別途「ページ追加サイクル」を将来整備する前提で、本サイクルは既存 `page.tsx` に機能を載せる、または対象 `page.tsx` が既に存在することを前提とする。

## 1. 思想

- 縦串の機能を 1 つのまとまりとして組み立てる。「fetcher だけ作って後で UI を繋ぐ」「UI だけ作って後でデータ処理を繋ぐ」という分割実装は取らない。
- 本サイクルは [`./component.md`](./component.md) と [`./domain-logic.md`](./domain-logic.md) を **呼び出すメタサイクル**。各層の詳細は呼び出し先に委譲し、本ルールは「いつ・どの順序で・どこを統合するか」のみを定める。
- データ操作の主軸は **`api/`**（読み / 書き両方の fetch ラッパー）。`actions/` の Server Action は **`api/` の書き fetcher を Client Component から呼ぶときだけ** 追加する薄いラッパーであり、独立した層ではない。読み取りや、Server Components / Container から呼ぶ書き処理は `api/` を直接使う。
- 組み立て方針は **「外側で全体像を描く → 内側で型を固める → 外側から実装を埋める」** のハイブリッドで進める。
  - Container 1st Design は維持する（[`../server-client-boundary.md`](../server-client-boundary.md) §6）。
  - ただしドメイン型・fetcher のシグネチャを先に切らないと Container の仮実装が型推論に乗らないため、**型は内側を先に**確定させる。
- 機能の縦串が **実際に通っている** ことを Playwright e2e で毎サイクル証明する。Vitest と Storybook は層内の正しさを担保するが、層をまたいだ繋がりまでは保証しない。

## 2. サイクルの全体像

機能 1 個の追加は、次の 8 ステップで進める。

1. **明名と機能境界の決定** — §3
2. **ユーザーストーリーと受け入れ基準** — §4
3. **縦串設計（構成要素 / データフロー / キャッシュ / 境界）** — §5
4. **内側から型を固める（ドメイン型 / fetcher / Server Action ラッパーのシグネチャ）** — §6
5. **外側から UI を組む（Container 1st、`component.md` を回す）** — §7
6. **統合（ページ配線・Suspense / Error Boundary 境界）** — §8
7. **e2e テスト（Playwright）でゴールデンパス検証** — §9
8. **横断レビュー** — §10

各ステップを完了せずに次へ進まない。手戻りが生じた場合は該当ステップに戻ってから再度進む。

## 3. Step 1: 明名と機能境界の決定

実装を 1 行も書く前に、機能名と features ドメインを確定させる。

- 日本語で「誰が・何を・どうして」のユーザーストーリー文を書く（例: 「ログイン中のユーザーが、自分の投稿に付いたコメントを 1 件削除できる」）。
- ストーリー文を [`../naming.md`](../naming.md) の**明名フロー**に通し、機能名を導出する（例: `comment-delete` / `comment-delete-flow`）。Container 名・fetcher 名・Server Action 名はここでは確定させなくてよい（§5 で詳細化する）。
- 機能が属する features ドメインを決める。複数ドメインにまたがる場合は **主たるドメイン**に置く（例: 「コメント削除」は `comment` ドメイン側に置き、`user` ドメインには置かない）。判断軸は [`../directory-structure.md`](../directory-structure.md) と [`../naming.md`](../naming.md) §6（後方一致 / 前方一致）。

## 4. Step 2: ユーザーストーリーと受け入れ基準

ユーザーストーリーから **受け入れ基準（Acceptance Criteria）** を 3〜7 項目で切る。

- 正常系のゴールデンパス（最低 1 項目）。
- 主要なバリデーション失敗（例: 入力長制限、権限不足）。
- 主要なシステムエラー（例: ネットワーク断、対象が既に存在しない）。
- データ反映後の UI の状態（例: 削除後に一覧から消える、トーストが出る）。

受け入れ基準は §9 の Playwright シナリオと **1 対 1 に近い形**で対応させる。基準が 7 項目を超えるなら、機能を 2 つ以上に分解する候補（本サイクルの射程が広すぎる）。

## 5. Step 3: 縦串設計

機能 1 個に必要な構成要素を **一覧化**する。実装はまだしない。

| 層                                 | 確認事項                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ドメインモデル                     | どの ValueObject / Entity が新規・既存か。状態遷移を伴うか                                                                                                                                                                                                                                                                                             |
| fetcher（`api/` 読み + 書き両方）  | どの fetcher を新規追加 / 既存利用するか。読み取りは Request Memoization の前提として URL・オプションを共有できるか（[`../data-fetching.md`](../data-fetching.md) §3）。書き取り（mutation）は入出力の Result 型・`revalidateTag` / `updateTag` の対象 tag・`redirect()` の有無（[`../caching-and-rendering.md`](../caching-and-rendering.md) §6・§7） |
| Server Action ラッパー（条件付き） | 上記の **書き fetcher のうち、Client Component から起動する必要のあるもの**に限り `actions/` にラッパーを追加する。Server Components / Container から呼ぶだけで済むなら追加しない。`'use server'` は **関数単位**で付ける（[`../server-client-boundary.md`](../server-client-boundary.md) §9）                                                         |
| Container / Presentational         | UI ツリーをどこで分割するか。新規 Container と既存 Container の境界。データフェッチを伴うなら必ず Container / Presentational 分割（[`../directory-structure.md`](../directory-structure.md)）                                                                                                                                                          |
| Suspense / Error Boundary          | 機能内のロード単位とエラー巻き込み範囲。検索バーまで巻き込まないか等（[`../error-handling.md`](../error-handling.md) §5）                                                                                                                                                                                                                              |
| Server / Client 境界               | `"use client"` をどこに引くか。Composition で Server を流し込む必要があるか（[`../server-client-boundary.md`](../server-client-boundary.md) §3・§5）                                                                                                                                                                                                   |
| キャッシュ                         | `"use cache"` の配置と `cacheLife` / `cacheTag` の設計。書き側が無効化する tag と読み側が貼る tag の対応関係（[`../caching-and-rendering.md`](../caching-and-rendering.md) §4〜§7）                                                                                                                                                                    |

このステップで「Composition の必要性」「Server Action ラッパーの要否」「キャッシュ tag の命名」を **確定させる**。後から差し込むと手戻りが大きい（[`../server-client-boundary.md`](../server-client-boundary.md) §5 末尾、[`./component.md`](./component.md) Step 3 の同種注意）。

## 6. Step 4: 内側から型を固める

§5 で列挙した構成要素のうち、まず **型だけ**を内側から外側に向かって確定させる。実装はしない。

1. **新規ドメインモデルの型**を `models/` に切る。valibot brand 型の `*Schema` と `type` だけ書く（[`./domain-logic.md`](./domain-logic.md) Step 2 のみ実施し、Step 3 の TDD は本ステップの最後で回す）。
2. **新規 fetcher のシグネチャ**を `api/` に切る（読み・書き両方とも `api/`）。`import "server-only"` と関数シグネチャのみで、書き fetcher は引数 / 戻り値の Result 型を確定させる（[`../error-handling.md`](../error-handling.md) §3）。中身は `throw new Error('not implemented')` で良い。
3. §5 で「Server Action ラッパーが必要」と判定した書き fetcher に限り、**`actions/` にラッパーのシグネチャ**を切る。`'use server'` は **関数単位**で付け、内部は対応する `api/` の書き fetcher を呼ぶだけの薄い実装にする（[`../server-client-boundary.md`](../server-client-boundary.md) §9）。Result 型を pass-through する。Server Components / Container から呼ぶだけで済む書き fetcher にはこのステップを **適用しない**。
4. ここで **`vp check`（型検査）が通る**ことを確認する。型が通らない設計のまま UI に進まない。
5. 次に各層の中身を埋める：
   - ドメインモデル → [`./domain-logic.md`](./domain-logic.md) の Step 3〜5 を回す。
   - fetcher（`api/`） → ドメインモデルの上に組み立てる。`@praha/byethrow` の Result 型を返し、throw しない。書き fetcher は `revalidateTag` / `updateTag` をここで呼ぶ。
   - Server Action ラッパー（あれば） → 対応する `api/` の書き fetcher を呼んで Result を pass-through する。

`api/` / `actions/` は `models/` ではないため [`./domain-logic.md`](./domain-logic.md) の射程外。本ステップ内で実装する。例外を `throw` しない・`as` を使わない・`Result` を返すといった原則は流用する。

## 7. Step 5: 外側から UI を組む

[`./component.md`](./component.md) のサイクルを **必要な Container / Presentational の数だけ繰り返し回す**。

- §5 で列挙した Container / Presentational のそれぞれについて [`./component.md`](./component.md) の 6 ステップを完走する。
- ただし [`./component.md`](./component.md) Step 3（ビジュアル設計）は機能全体で **一括**に行ったほうが整合する。複数 Container がレイアウト上関係する場合は [skill: `/frontend-design`] を機能単位で起動し、各 Container の見た目を同時に決める。
- データフェッチを伴う Container の中身は §6 で実装した `api/` の読み fetcher を呼ぶだけの薄い層に保つ。
- 書き処理（mutation）の起動方法は配置で決まる。
  - **Server Components / Container から起動** → `api/` の書き fetcher を直接 `await` する。`actions/` は経由しない。
  - **Client Component（フォーム・ボタン）から起動** → §6 で追加した `actions/` の Server Action ラッパーを呼ぶ。[`../async-ui.md`](../async-ui.md) §3 と [`../error-handling.md`](../error-handling.md) §3 に従う：
    - フォームは `<form action={action}>` または `useActionState`。
    - ボタン経由なら `onClick={() => startTransition(() => action(...))}`。
    - 戻り値の Result を `match` してエラー UI を表示する。

## 8. Step 6: 統合

機能を構成する Container 群をページに配線する。

- 既存の `page.tsx` に Container を差し込む。新規 `page.tsx` は本サイクルの射程外。
- Suspense 境界・Error Boundary 境界を §5 の設計通りに張る。「ロード時間が違う単位 / エラーで消えても困らない単位」で切る（[`../async-ui.md`](../async-ui.md) §2、[`../error-handling.md`](../error-handling.md) §5）。
- Streaming SSR と CLS のトレードオフを再確認する（[`../caching-and-rendering.md`](../caching-and-rendering.md) §8）。
- `vp dev` で機能の golden path を **手動で 1 回触る**。型と Storybook が green でも、繋ぎ込みのミスはここで初めて見える。

## 9. Step 7: e2e テスト（Playwright）でゴールデンパス検証

§4 の受け入れ基準を Playwright のシナリオに落とす。

- `vp run test:e2e` で実行。配置・書き方は [skill: `/playwright-test`] / [skill: `/playwright-cli`] に従う。
- 受け入れ基準と **1 対 1**でテストを書く。最低でも正常系のゴールデンパス 1 本は必須。
- バリデーション失敗・システムエラーのうち、ユーザーが目にする UI 差分があるものは Playwright で再現する。差分が薄いものは Vitest / Storybook 側でカバーするか判断する。
- e2e のフレーキー対策として固定 wait を使わない（[skill: `/playwright-test`] 参照）。ネットワーク待ちは MSW で安定化させる。

## 10. Step 8: 横断レビュー

機能全体に対して、層単独レビューでは拾えない観点を当てる。

1. 各 Container / Presentational に対する [`./component.md`](./component.md) Step 6 のレビューが完了済みか確認。
2. 各ドメインモデルに対する [`./domain-logic.md`](./domain-logic.md) Step 5 のレビューが完了済みか確認。
3. **機能全体**に対して以下を自己点検：
   - §4 の受け入れ基準すべてが Playwright シナリオまたは Vitest テストで網羅されているか。
   - 書き fetcher（および Server Action ラッパー経由の呼び出し）の `revalidateTag` / `updateTag` が、読み側の `cacheTag` と対応しているか（無効化漏れの主因）。
   - エラー時に入力フォームの内容が失われていないか（書き fetcher / Server Action が throw していないか — [`../error-handling.md`](../error-handling.md) §3）。
   - `actions/` を **必要な mutation についてのみ**追加できているか。読み取り fetcher や、Server Components から呼ぶだけで済む書き fetcher を不要に Server Action 化していないか。
   - Suspense 境界が機能横断で重複・欠落していないか。
4. Client Components が新規追加されたなら [skill: `/next-bundle-analyzer`] を実行する。[`./component.md`](./component.md) Step 6 では「複数追加後にまとめて」とあるが、機能サイクルの末尾は **「複数追加後」のタイミングそのもの**なので必ず実行する。

## 11. サイクルの停止条件

次のすべてが満たされた時点でサイクルを終える。

- §4 の受け入れ基準すべてに対応するテストが green（Playwright e2e + Vitest + Storybook）。
- `vp test`（in-source / Container Vitest）が green。
- `vp run test:e2e` が green。
- `vp run build-storybook` が成功。
- `vp check`（lint + format + 型）が通る。
- `/react-doctor` / `/web-design-guidelines` の指摘が解消されている。
- `/next-bundle-analyzer`（Client Components 新規追加 / 3rd party 新規 import がある場合）の判断を済ませている。
- §10.3 の自己点検にヒットなし。

`vp` コマンドの詳細は `AGENTS.md` を参照する。

## 12. アンチパターン

- ❌ fetcher / Server Action だけ先に作って UI を後付けする（縦串が通っているか確認できない）
- ❌ UI だけ先に作ってモックで動かし、後でデータ処理を繋ぐ（モック前提の Container 設計が剥がれる）
- ❌ `actions/` を `api/` と並列の独立層として扱う（`actions/` は `api/` の書き fetcher を Client から呼ぶ場合のラッパーに限定）
- ❌ 読み取り fetcher を `actions/` に置く（`actions/` は mutation の Client 公開ラッパー専用）
- ❌ Server Components / Container から呼ぶだけの書き処理を Server Action 化する（`api/` を直接呼べばよい）
- ❌ [`./component.md`](./component.md) / [`./domain-logic.md`](./domain-logic.md) を経由せずに直接実装する（各層のレビューを飛ばす）
- ❌ Suspense / Composition / Server Action ラッパーの要否を Step 3 で確定させず Step 5 以降に判断する（手戻りが大きい）
- ❌ 書き fetcher / Server Action でバリデーションエラーを `throw` する（[`../error-handling.md`](../error-handling.md) §3）
- ❌ `revalidateTag` を貼り忘れて読み側の cache が古いまま残る
- ❌ Playwright シナリオを書かずに Vitest だけで完了とする（縦串の検証が抜ける）
- ❌ コンポーネント単位のレスポンシブを `@media` で書く（[`../styling.md`](../styling.md) §4.6）
- ❌ React Compiler 前提なのに `useMemo` / `useCallback` を予防的に入れる（[`../async-ui.md`](../async-ui.md) §1）

## 関連ルール

- 配置: [`../directory-structure.md`](../directory-structure.md)
- 命名: [`../naming.md`](../naming.md)
- スタイリング: [`../styling.md`](../styling.md)
- Server / Client 境界: [`../server-client-boundary.md`](../server-client-boundary.md)
- データフェッチ: [`../data-fetching.md`](../data-fetching.md)
- キャッシュ: [`../caching-and-rendering.md`](../caching-and-rendering.md)
- 非同期 UI: [`../async-ui.md`](../async-ui.md)
- エラー: [`../error-handling.md`](../error-handling.md)
- 呼び出し先サイクル: [`./component.md`](./component.md), [`./domain-logic.md`](./domain-logic.md)

## 関連スキル

- [skill: `/frontend-design`] — Step 5 の機能全体ビジュアル設計
- [skill: `/web-design-guidelines`] / [skill: `/react-doctor`] / [skill: `/react-best-practices`] — Step 8 の横断レビュー
- [skill: `/next-bundle-analyzer`] — Step 8 の Client Components 追加時のバンドルレビュー
- [skill: `/playwright-test`] / [skill: `/playwright-cli`] — Step 7 の e2e
- [skill: `/composition-patterns`] — Step 3 の Composition 判断補助
- [skill: `/functional-ts`] / [skill: `/byethrow`] / [skill: `/javascript-testing-expert`] — Step 4 の内部実装
