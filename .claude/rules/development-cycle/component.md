# コンポーネント追加サイクル

新しいコンポーネントを追加するときの作業順序を定める。本ルールは「**何をどこに置くか**」（[`../directory-structure.md`](../directory-structure.md)）「**どう名付けるか**」（[`../naming.md`](../naming.md)）「**どう書くか**」（[`../styling.md`](../styling.md)）「**Server / Client 境界**」（[`../server-client-boundary.md`](../server-client-boundary.md)）「**データフェッチ**」（[`../data-fetching.md`](../data-fetching.md)）「**非同期 UI**」（[`../async-ui.md`](../async-ui.md)）「**エラー**」（[`../error-handling.md`](../error-handling.md)）といった既存の静的規約と、`/frontend-design` `/web-design-guidelines` `/react-doctor` などのスキルを、**どの順序で適用するか**を示す動的な作業フローを定義する。

**射程**: コンポーネント **1 個**の追加に限定する。Base / Case / Domain いずれの層でも、Container / Presentational / UI 主体いずれの種別でも本サイクルの対象になる。ページ・セクション全体を新規に組み立てる大きな仕事は、本サイクルを複数回回す形で進めることを想定し、ページ追加サイクル等は別ルールで扱う。

## 1. 思想

- 何を作るかを **2 軸**で分類してから手を動かす。BCD 層（Base / Case / Domain）と種別（Container / Presentational / UI 主体）。
- 実装は **Container 1st Design**（トップダウン）で進める。先に小さな部品を積み上げない。判断軸は [`../server-client-boundary.md`](../server-client-boundary.md) §6。
- ビジュアルは [skill: `/frontend-design`] で先に固める。実装後にビジュアルを直し続ける運用は取らない。
- スタイリングは **Panda CSS**（`@pandacss/dev`）を使う。詳細規約は [`../styling.md`](../styling.md)。生 CSS / Tailwind / styled-components / 文字列クラス直書きは持ち込まない。
- スタイリングは [`../styling.md`](../styling.md) の規約を必ず守る。サイクル上の確認ポイントは §6.4〜§6.7：
  1. UI スタイルとレイアウトの責務分離（§6.4）
  2. 子コンポーネントへの `className` 渡し禁止（型レベルで強制、§6.5）
  3. 親→子のスタイル制御は CSS Custom Property を API として公開（§6.6）
  4. レスポンシブは container query 優先（§6.7）
- テストは 2 トラックで分ける。**Container は Vitest**、**UI 主体は Storybook**。
- レビューは [skill: `/web-design-guidelines`] と [skill: `/react-doctor`] を**必須**で当てる。

## 2. サイクルの全体像

コンポーネント 1 個の追加は、次の 6 ステップで進める。

1. **明名と分類** — §3
2. **配置決定** — §4
3. **ビジュアル設計（`/frontend-design`）** — §5
4. **Container 1st で実装（Panda CSS でスタイリング）** — §6
5. **テスト（Container=Vitest, UI 主体=Storybook）** — §7
6. **レビュー（`/web-design-guidelines` + `/react-doctor`）** — §8

各ステップを完了せずに次へ進まない。手戻りが生じた場合は該当ステップに戻ってから再度進む。

## 3. Step 1: 明名と分類

実装を 1 行も書く前に、コンポーネント名と種別を確定させる。

- [`../naming.md`](../naming.md) の**明名フロー**を必ず先に通す。「日本語で丁寧に説明する → 概念に分解する → 語順を保って英訳する → 英語名と日本語名を並べて読み返す」の手順を飛ばさない。
- 名前から **BCD 層**（Base / Case / Domain）を判定する。判定軸は [`../naming.md`](../naming.md) §4.1。
- 同時に**種別**（Container / Presentational / UI 主体）を判定する。
  - **データフェッチを伴う**なら Container / Presentational に**必ず分割**する（[`../directory-structure.md`](../directory-structure.md) の規定）。
  - **データフェッチを伴わない** UI 主体は単一ファイルでよい。
- ファイル名規約（`*-container.tsx` / `*.tsx`）はこの時点で確定する。

## 4. Step 2: 配置決定

[`../directory-structure.md`](../directory-structure.md) の規約に従って配置先ディレクトリを決める。再掲はしないが、要点だけ示す。

- **Base** → `src/components/<base>/`。Case が兄弟に存在しないなら Base 本体は `<base>/<base>.tsx` のように直置きする（例: `src/components/divider/divider.tsx`）。Case が兄弟に存在するときに限り Base 本体を `_base/` に隔離する（例: `src/components/button/_base/button.tsx`）。variant は Base 本体と同じ階層に `_variant/<variant>/` として置く（[`../directory-structure.md`](../directory-structure.md) の `_base/` / `_variant/` 規定を参照）
- **Case** → `src/components/<base>/<case-base>`（例: `src/components/button/add-button/`）
- **Domain** → `src/features/<domain>/<…>/components/<name>/`
- 各コンポーネントディレクトリ直下に `index.ts` を置き、当該コンポーネントを export する。Container / Presentational に分割した場合は両方を export する。
- 既存ディレクトリに後付けする場合は、既存ファイルの粒度・命名と揃えてから新ファイルを置く。

## 5. Step 3: ビジュアル設計

[skill: `/frontend-design`] でビジュアルを固める。同時に次の 3 点も**この段階で**決め切る。

- **Server / Client 境界**: `"use client"` をどこに引くか。Client 化の根拠は [`../server-client-boundary.md`](../server-client-boundary.md) §3 の 3 ケースに限る。
- **Suspense 境界**: ロード時間が異なる単位で切る。[`../async-ui.md`](../async-ui.md) §2 を参照。
- **Composition の必要性**: 上位がどうしても Client になる場合、`children` 経由で Server を流し込む設計を**この段階で**決める。

「**後から Composition 化**」は手戻りが大きい（[`../server-client-boundary.md`](../server-client-boundary.md) §5 末尾）ため、Step 3 で必ず判断する。Step 6 以降に Composition 化が必要だと気付いたら、Step 3 まで戻る。

## 6. Step 4: Container 1st で実装

### 6.1 骨組みを先に作る

[`../server-client-boundary.md`](../server-client-boundary.md) §6 の手順に従う。

- `*-container.tsx` を**仮実装**する：シグネチャと Presentational への受け渡しのみ。
- Presentational 側は型と JSX 構造のスケルトンのみ。
- この段階で「中身」を書かない。Container の中身を一気に肉付けすると、Composition / 境界の判断ミスが詳細実装に埋もれる。

### 6.2 詳細実装

骨組みが正しく繋がっていることを確認してから、各層の中身を書く。

- **Container 内**: fetch の呼び出し（[`../data-fetching.md`](../data-fetching.md) §3 の fetcher 経由）。並行フェッチが必要なら `Promise.all`（[`../data-fetching.md`](../data-fetching.md) §4）。
- **Presentational 内**: 受け取った props を表示する。fetch を書かない。
- Server Action を呼ぶなら [`../error-handling.md`](../error-handling.md) §3 に従い **Result 型で受ける**（throw しない）。

### 6.3 スタイリングは Panda CSS

- `@pandacss/dev` で生成される `css()` / `cva()` を使う。
- **文字列クラスの直書き、Tailwind ユーティリティ、生 CSS / styled-components は使わない**。
- token / pattern / recipe は `panda.config.*` の設計に従う。
- CSS-in-JS の動的計算は最小化する（パフォーマンス観点。詳細は [skill: `/react-best-practices`]）。

### 6.4 UI スタイルとレイアウトの責務を分離する

詳細は [`../styling.md`](../styling.md) §4.1〜§4.3。サイクル上の判断軸：

- コンポーネントルートと Layout エレメントを**別 DOM 要素**にする
- 要素間余白は**空のグリッドセル** / `gap` を優先する（`margin` は最小化）
- 用語は [`../styling.md`](../styling.md) §3 の規定リストから選び、`Wrapper` / `Block` / `Module` / `Widget` を使わない

### 6.5 子コンポーネントに `className` を渡さない

詳細は [`../styling.md`](../styling.md) §4.4〜§4.5。サイクル上の判断軸：

- Props 定義に `src/types.ts` の `ComponentPropsWithoutClassName<T>` を**必ず**使う
- 配置に関わるスタイル（`grid-area` 等）は子に `className` を渡さず**親側のセレクタ**で当てる
- import パスは**相対パス**で書く（path alias は使用禁止）

### 6.6 親→子のスタイル制御は CSS Custom Property を API として公開する

詳細は [`../styling.md`](../styling.md) §4.7。サイクル上の判断軸：

- API 用 `--<name>--<key>` と内部用 `--_u-<key>` を**必ず分離**する
- 子側で `var(--<name>--<key>, <default>)` の形でデフォルト値を持たせる

### 6.7 レスポンシブは container query を優先する

詳細は [`../styling.md`](../styling.md) §4.6。サイクル上の判断軸：

- コンポーネント内部のレスポンシブはすべて `@container` で書く
- メディアクエリ（`@media`）は**ページ単位のレスポンシブに限定**する（ヘッダーのモバイル / デスクトップ切替など）

## 7. Step 5: テスト

種別ごとに 2 トラックで分ける。

### 7.1 Container は Vitest

- `*-container.test.tsx` を**同ディレクトリに置く**（[`../directory-structure.md`](../directory-structure.md) の規定）。
- Container を関数として直接呼ぶ：`await PostContainer({ postId: '1' })` 形式。
- データソースは **MSW**（`msw` 導入済み）でモックする。
- AAA / 命名規約は [skill: `/javascript-testing-expert`] に従う。

### 7.2 UI 主体（Presentational / Base / Case）は Storybook

- `*.stories.tsx` を**同ディレクトリに置く**。
- バリアント（`_variant/` 配下の各 variant）を Story として網羅する。
- `@storybook/addon-vitest` による Component テストも組み合わせる。
- `@storybook/addon-a11y` のチェックを通す。
- `experimentalRSC: true` のため Server Components の Story も書ける。

## 8. Step 6: レビュー

実装が落ち着いた段階で、**順番に**当てる。

1. [skill: `/react-doctor`] — React コード全般の問題検出（`package.json` で `reactDoctor` 設定済み）
2. [skill: `/web-design-guidelines`] — アクセシビリティ・UI ガイドライン
3. [skill: `/react-best-practices`] — パフォーマンス（React Compiler 前提のため不要な `useMemo` / `useCallback` を入れていないか）
4. [skill: `/composition-patterns`] — boolean prop の肥大化や reuse の機会があれば
5. [skill: `/next-bundle-analyzer`] — バンドルサイズ・重複モジュール・大型依存の検出（`vp run analyze:output` を起点）。**コンポーネント単位で毎回回さず、複数追加後やページ完成時にまとめて実行する**。Client Components を新規追加した場合・3rd party ライブラリを新規 import した場合は実行を強く推奨
6. **スタイリング規約（[`../styling.md`](../styling.md)）の自己点検**:
   - コンポーネントルートと Layout エレメントが分離されているか（§4.1）
   - Props が `ComponentPropsWithoutClassName<T>` で定義され、子に `className` を渡している箇所がないか（§4.4〜§4.5）
   - 親→子のスタイル制御が CSS Custom Property API で行われているか（§4.7）
   - コンポーネント内部のレスポンシブが `@container` で書かれているか（§4.6）
   - 単位の使い分け（文字依存 / 非依存）が §2.3 に従っているか

違反があれば該当 Step に戻ってサイクルを再開する。違反のない指摘（改善提案）は次回以降の判断材料として控える。

## 9. サイクルの停止条件

次のすべてが満たされた時点でサイクルを終える。

- Container 含めすべてのテスト（`vp test`）が green
- Storybook が build できる（`vp run build-storybook`）
- `vp check`（lint + format + 型）が通る
- `/react-doctor` の指摘が解消されている
- `/web-design-guidelines` の指摘が解消されている
- `/next-bundle-analyzer` を実行する条件（複数コンポーネント追加 / ページ完成 / Client Components 新規追加 / 3rd party ライブラリ新規 import）に該当する場合は実行済みで、検出された大型依存・重複モジュールの判断（許容 or 対処）を済ませている
- [`../styling.md`](../styling.md) 規約の自己点検にヒットなし

`vp` コマンドの詳細は `AGENTS.md` を参照する。

## 10. アンチパターン

- ❌ ボトムアップで小コンポーネントから積み上げる（Container 1st の逆）
- ❌ `"use client"` を上位に置いて子孫を巻き込む（[`../server-client-boundary.md`](../server-client-boundary.md) §2）
- ❌ Container にビジネスロジックを書く（薄い層に保つ）
- ❌ Container を骨組みなしで一気に肉付けする（先に `*-container.tsx` の仮実装）
- ❌ スタイリング規約（[`../styling.md`](../styling.md)）に違反する実装（§6 アンチパターン参照）
- ❌ データフェッチを伴うのに Container / Presentational に分割しない
- ❌ Storybook を「後で書く」（Step 5 として組み込む）
- ❌ レビューを「気が向いたとき」に行う（Step 6 として組み込む）
- ❌ "後から Composition 化"を当てにする（Step 3 で判断）
- ❌ React Compiler 前提なのに `useMemo` / `useCallback` を予防的に入れる（[`../async-ui.md`](../async-ui.md) §1）

## 関連ルール

- 配置: [`../directory-structure.md`](../directory-structure.md)
- 命名: [`../naming.md`](../naming.md)
- スタイリング: [`../styling.md`](../styling.md)
- Server / Client 境界: [`../server-client-boundary.md`](../server-client-boundary.md)
- データフェッチ: [`../data-fetching.md`](../data-fetching.md)
- 非同期 UI: [`../async-ui.md`](../async-ui.md)
- エラー: [`../error-handling.md`](../error-handling.md)

## 参照する既存ユーティリティ

- `src/types.ts` の `ComponentPropsWithoutClassName<T>` — Props 定義時の必須型エイリアス（§6.5）

## 関連スキル

- [skill: `/frontend-design`] — Step 3 のビジュアル設計
- [skill: `/web-design-guidelines`] — Step 6 のレビュー
- [skill: `/react-doctor`] — Step 6 のレビュー
- [skill: `/react-best-practices`] — Step 6 のパフォーマンスレビュー
- [skill: `/next-bundle-analyzer`] — Step 6 のバンドルサイズレビュー（複数コンポーネント追加 / ページ完成タイミング）
- [skill: `/composition-patterns`] — リファクタ時の参照
- [skill: `/javascript-testing-expert`] — Step 5.1 の Vitest 詳細
