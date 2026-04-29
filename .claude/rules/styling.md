# スタイリング規約

CSS / Panda CSS の書き方、用語、レイアウト、タイポグラフィ、レスポンシブの全規約をここに集約する。本ファイルは「**どう書くか**」、配置・命名は次の対になるルールに従う：

- **どこに置くか**: [`./directory-structure.md`](./directory-structure.md)
- **どう名付けるか**: [`./naming.md`](./naming.md)
- **適用順序（いつ守るか）**: [`./development-cycle/component.md`](./development-cycle/component.md)

## 1. 思想

- スタイルとレイアウトの責務を**別 DOM 要素**に分離する
- 子コンポーネントの見た目を親が `className` で操作しない（型レベルで禁止）
- 親→子のスタイル制御は **CSS Custom Property を API として公開**する
- 値ベースのデザイントークンより、**関係性**（間隔・対比・流体スケール）を優先する
- 用語は本ファイル §3 の規定リストから選ぶ。`Wrapper` / `Block` / `Module` / `Widget` を使わない
- レスポンシブは **container query を基本**とし、メディアクエリは**ページ単位のレスポンシブに限定**する
- 単位は「文字依存 / 非依存」で切り分ける。「全部 rem」「全部 px」のような一律切り分けはしない

## 2. CSS 前提

### 2.1 採用技術

- **Panda CSS**（`@pandacss/dev` 1.10.0）— `css()` / `cva()` / `recipe`
- **kiso.css** 1.2.4 — リセット CSS。`@layer kiso-reset` に取り込む
- 文字列クラスの直書き / Tailwind ユーティリティ / 生 CSS / styled-components は**使わない**
- Panda CSS の出力先は `styled-system/`（`panda.config.ts` の `outdir`）。コード例の import は `'../../../../../styled-system/css'` のように**相対パス**で書く（path alias は使用禁止。深さはファイル位置に応じて調整する）

### 2.2 @layer cascade order

`src/app/layer-order.css` に定義済みの順序を正典とする：

```css
@layer reset, kiso-reset, base, tokens, recipes, utilities;
```

- `reset`: ブラウザ既定の打ち消し
- `kiso-reset`: kiso.css 由来のリセット
- `base`: グローバルなタイポ / カラー / 流体トークン
- `tokens`: Panda が生成するトークン
- `recipes`: cva / sva 由来のレシピ
- `utilities`: 単発ユーティリティ

新しい `@layer` を独自に追加しない。

### 2.3 単位の使い分け（文字依存 / 非依存で切る）

基準は「**その寸法は文字サイズを基準にしているか**」である。文字基準なら相対値、独立なら絶対値を選ぶ。

| 用途                                                                                | 単位              | 理由                                                                                               |
| ----------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| `font-size`                                                                         | **rem**           | Chrome 文字拡大機能（および `<meta name="text-scale">`）に追従させる。ただし採用条件は §2.4        |
| 文字に**依存する**寸法（段落間隔・行間以外の文字周辺余白・ボタンの内側 padding 等） | **em** / rem      | font-size 拡大に**連動して**拡大する必要がある寸法。連動しないと文字拡大時にレイアウトが崩れる     |
| 文字に**依存しない**寸法（コンポーネント間の余白・`border-radius` 等）              | **px**            | 文字基準ではない絶対寸法。文字拡大に巻き込まれてはならない。rem で書くのは**セマンティックでない** |
| コンテナ幅（`width` / `max-width` / `inline-size`）                                 | **cqi** または px | container query を起点にする設計では `cqi` で内側からの相対計算に揃える。rem は使わない            |
| 装飾寸法（`border-width` 等）                                                       | **px**            | hairline 表現・DPR 依存                                                                            |
| `letter-spacing`                                                                    | **em**            | font-size に比例                                                                                   |
| `line-height`                                                                       | **単位なし**      | font-size に比例。`1.6` のように倍率で書く                                                         |
| 「N 文字分の幅」（数字リスト幅など）                                                | **ch**            | 文字幅を基準にしたい場合。意味的に正しい単位を選ぶ                                                 |

font-size を数値リテラル経由で rem に換算する場合は `--to-rem` を掛ける。`--to-rem` は `src/app/globals.css` の `:where(:root)` 内に `--to-rem: calc(1 / 16 * 1rem)` として定義済み（root font-size = 16px 固定の前提）。文字拡大機能を本格サポートする場合は `calc(tan(atan2(1px, var(--root-font-size))) * 1rem)` 形式（root 変動に追従）への置換を検討する。

```css
.heading {
  font-size: calc(24 * var(--to-rem));
}
```

参考: [`<meta name="text-scale">` chromestatus](https://chromestatus.com/feature/5112244702674944)

### 2.4 rem を採用するときの条件

font-size に rem を採用するなら、**Chrome 文字拡大機能を「極大」にした検証フロー**をプロジェクトの運用に組み込むことが必須。これを覚悟できない場合は `font-size` も含めて **px を採用してよい**。半端な rem 採用は最悪のパターン（拡大時にレイアウトが崩れ、ユーザーは可読性を失う）になる。

- ❌ font-size だけ rem にして、文字依存の余白を絶対値で書く（拡大時に文字が枠から溢れる）
- ❌ `:root` の `font-size` を絶対値で固定する（OS / ブラウザ設定が反映されない）
- ❌ `:root` の `font-size` を `62.5%` にする（外部 CSS / プラグインが rem ベースの場合に衝突する）
- ❌ rem を採用したまま文字拡大の検証を一度もしない

### 2.5 全てを rem にしないこと

全寸法を rem で書けば文字拡大時にレイアウト崩れは起きないが、**文字拡大機能ユーザーは「文字だけを大きくしたい」のであり、ズーム機能と同じ挙動を期待していない**。全ズームしたければユーザーはブラウザのズーム機能を使う。両者の住み分けを尊重する。

セマンティクスの観点でも、何の基準もない寸法を「`font-size` の N 倍」と表現するのは不自然。コンポーネント間の余白・`border-radius` のように文字を基準としていない寸法は素直に `px` で書く。

### 2.6 light-dark()

- カラートークンは `light-dark(<light>, <dark>)` で宣言し、テーマ切替を 1 行で済ませる
- ルートに `color-scheme: light dark` を置く前提
- カスタムプロパティ経由で公開するときは API 命名規約（§4.7）を守る

## 3. 用語規約

### 3.1 基本原則

- 1 つの概念に複数の名前を付けない（`Wrapper` `Container` `Box` を使い分けない）
- 役割を表す語を選ぶ（実装手段の名前 — `Flex` `Grid` 単体 — を構造名にしない）
- 不要に新語を作らず、本節の規定リストから選ぶ

### 3.2 構造系

| 用語      | 役割                                                            |
| --------- | --------------------------------------------------------------- |
| Section   | ページ内の意味的なまとまり                                      |
| Container | 内容を抱える外形（CSS の container query 起点になることがある） |
| Inner     | 内容幅を制御する内側要素（`max-width` 等）                      |
| Outer     | 外側余白・周辺配置を担う外側要素                                |

### 3.3 余白系

| 用語   | 役割                             |
| ------ | -------------------------------- |
| Gutter | 内縁を保護する余白（padding 系） |
| Gap    | 要素間の余白（gap / 空セル）     |

`margin` を要素間余白の主役にしない（§4.3 参照）。

### 3.4 列・並び系

| 用語         | 役割                                    |
| ------------ | --------------------------------------- |
| Columns      | Multi-column（CSS columns）による段組み |
| Flex Columns | flex による列並び                       |
| Grid         | grid による格子                         |
| Row          | 行方向の並び                            |
| List         | 並列要素の集合                          |

### 3.5 表現要素系

- **Paragraph**: 段落
- **Rich Text**: 装飾を含む本文
- **Link** / **Button**: 操作要素（区別: ナビゲートは Link、処理起動は Button）
- **Navigation** / **Menu**: ナビゲーション集合・選択肢集合

### 3.6 構成単位系

- **Template**: ページレベルの骨格
- **Pattern**: 繰り返し再利用される塊
- **Component**: 単一の責務を持つ最小単位
- **Dynamic Element**: 状態を持つ表現要素
- **Theme**: 配色 / タイポ / 余白の定義集合

### 3.7 非推奨語（使ってはいけない正式名称）

| 非推奨  | 代替                                             |
| ------- | ------------------------------------------------ |
| Wrapper | 役割に応じて `Inner` / `Outer` / `Container`     |
| Block   | 役割に応じて `Section` / `Pattern`               |
| Module  | `Pattern` / `Component`                          |
| Widget  | 役割に応じて `Component` / `Dynamic Element`     |
| Text    | 役割に応じて `Paragraph` / `Rich Text` / `Label` |

[`./naming.md`](./naming.md) §4.2 の末尾 UI 名規定リストと組み合わせて読む。

### 3.8 命名判定フロー

1. これは「ページ単位の骨格」か → `Template`
2. 繰り返し使われる塊か → `Pattern`
3. 単一責務の最小単位か → `Component`
4. 状態を持つか → `Dynamic Element` を組み合わせる
5. 上記のどれでもなく、外側余白制御か → `Outer`
6. 内容幅制御か → `Inner`

迷ったら `Wrapper` に逃げず、上から判定する。

## 4. レイアウト設計

### 4.1 スタイルとレイアウトの責務分離

コンポーネントルートと Layout エレメントは**別 DOM 要素**に分ける。

- **コンポーネントルート**（最外殻）が担うこと
  - タイポグラフィ・配色・テーマ
  - container query の起点（`container: <name> / inline-size`）
  - 外部からの API（カスタムプロパティ）の受け取り
- **Layout エレメント**（コンポーネントルート直下の子）が担うこと
  - `display: grid` / `grid-template` / `gap` などの内部レイアウト
  - 子要素間の余白

両責務を同一 DOM 要素に書くと、container query 起点と grid 起点が衝突したり、API として渡された custom property が grid 計算に巻き込まれたりする。

**例外: 単一要素 UI**。ボタン・ラベル・チップ等、内部に複数の表現要素を持たない最小単位の UI は、ルート要素 1 つで完結してよい（Layout エレメントの分離は不要）。Layout エレメントの分離が必須となるのは、ルート直下に複数の子要素を `grid` / `flex` 等で並べる必要があるときに限る。

### 4.2 空のグリッドセルによる余白設計

- 要素間余白は **空のグリッドセル** または `gap` を優先する
- `margin` で要素間余白を作らない（margin 折り畳み・親要素の余白伝播の事故が起きるため）
- `grid-template-rows: auto var(--gap-md) auto;` のように余白を行 / 列として組む技法を許可する
- 余白の単位は §2.3 の判定に従う：
  - **コンポーネント間余白**は文字非依存 → **px**
  - **段落間隔・ボタンの内側 padding** など文字基準の余白は **em / rem**
  - 「全部 rem」「全部 px」のような一律の切り方をしない

### 4.3 margin の制限

- `margin` は「コンポーネントの外殻が外側に対して持つ余白」のみに使う
- コンポーネント内部の要素間余白は §4.2 のとおり grid / gap で表現する
- `:first-child` / `:last-child` で margin を打ち消す技法は禁止（gap で済む）

### 4.4 子コンポーネントへの className 渡し禁止

親が子の見た目を `className` で操作する実装は**禁止**する。

- 配置に関わるスタイル（`grid-area` / `flex-basis` 等、親レイアウトに依存して成立するスタイル）は、子に `className` を渡すのではなく、**親側のセレクタ**（例: `& > :where(.ChildName)`）で当てる
- 親から制御したい振る舞い（余白・色・サイズ等）は §4.7 の **カスタムプロパティ API** で受け渡す

### 4.5 ComponentPropsWithoutClassName による型レベル禁止

§4.4 を**型レベルで強制**するため、コンポーネントの Props 定義は `src/types.ts` の `ComponentPropsWithoutClassName<T>` を使用する。

- `ComponentPropsWithoutClassName<T>` は `Omit<ComponentProps<T>, 'className'>` の型エイリアス
- `T` には HTML 要素キー（例: `'div'`, `'section'`, `'button'`）または React コンポーネント型を渡す

```tsx
// ❌ NG: ComponentProps をそのまま使うと className が入り込む
type Props = ComponentProps<'section'>;

// ✅ OK: ComponentPropsWithoutClassName を使う
import type { ComponentPropsWithoutClassName } from '../../../../../types';

type Props = ComponentPropsWithoutClassName<'section'> & {
  // 必要な props を追加
};

export function ContactSection(props: Props) {
  return <section className={contactSection} {...props} />;
}
```

子コンポーネント型を受け取りたいケース（例: `as` prop パターン）でも同様に：

```tsx
type Props<T> = ComponentPropsWithoutClassName<typeof SomeChild> & {
  // ...
};
```

import パスは**相対パス**で書く（`@/` エイリアスは使用禁止）。

### 4.6 レスポンシブは container query を優先する

レスポンシブ対応は、コンポーネントが置かれた**コンテキスト幅**（親コンテナの幅）に基づく **container query** を基本とする。

- container query の起点は §4.1 の「コンポーネントルート」が担う：`container: <name> / inline-size` を宣言する
- コンポーネント内部のレスポンシブはすべて `@container` で書く。同じコンポーネントが異なる幅のスロットに配置されても、配置先の幅に応じて自動的に最適化される
- 単位も §2.3 のとおり、コンテナ内の相対幅は **`cqi`**（containing block の inline-size に対する 1%）で揃える
- メディアクエリ（`@media`）の使用は **ページ単位のレスポンシブに限定**する：
  - ヘッダーのモバイル / デスクトップ切替（ナビゲーションの形が変わる）
  - ページ全体のグリッド構成（1 カラム → 2 カラム → 3 カラム）
  - サイドメニューの開閉モードの切替
- コンポーネント単位で `@media` を書かない。サイドメニュー開閉などでビューポート幅が同じでもコンポーネント幅が変わる場面に追従できないため

```css
.componentRoot {
  container: card / inline-size;
}

@container card (inline-size > 480px) {
  .layout {
    grid-template-columns: 1fr 1fr;
  }
}
```

レスポンシブ要件のないコンポーネントは `container: <name> / inline-size` を**宣言しなくてよい**。将来 container query を使う設計に切り替えるタイミングで宣言する。先回りで全コンポーネントに付ける必要はない（CSS containment による意図しない副作用を避けるため）。

### 4.7 親→子のスタイル制御は CSS Custom Property を API として公開する

子コンポーネント側でカスタムプロパティを **API として宣言** し、親はそれを設定して制御する。

- **命名規約**:
  - **API 用カスタムプロパティ**: `--<component-name>--<key>`（例: `--fluid-text--max-font-size`）。プレフィックスはコンポーネント名 + `--`。
  - **内部用カスタムプロパティ**: `--_u-<key>`（例: `--_u-fluid-slope`）。`_` 接頭辞 + `u-` で内部限定を明示。
  - 内部と API のバッティングを防ぐため**必ず分離**する。
- **デフォルト値**: 子側で `var(--<name>--<key>, <default>)` の形で受け取り、API が未指定でも動くようにする。
- 親側は `style={{ '--<name>--<key>': value }}` などで値を渡す。

```tsx
// 子: API として宣言（内部 _u- と API <name>-- を分離）
const fluidText = css({
  '--_u-min-font-size': 'var(--fluid-text--min-font-size, 14)',
  '--_u-max-font-size': 'var(--fluid-text--max-font-size, 16)',
  fontSize: '...', // _u-* を使った計算
});

// 親: API を利用
<FluidText style={{ '--fluid-text--max-font-size': '20' }} />;
```

## 5. タイポグラフィ

### 5.1 font-family

- 本文・UI は OS 既定の system font stack を使う
- ブランド固有の英文用フォントだけを `font-family` トークンで宣言する
- 日本語フォントを Web font として配信しない（パフォーマンス・字数）

### 5.2 text-wrap

- 見出し: `text-wrap: balance` を基本とする
- 本文: `text-wrap: pretty` を基本とする（孤立行を避ける）
- ボタン・ラベル: `text-wrap: nowrap` を選ぶこともある

### 5.3 line-height

- 本文: `1.6` 〜 `1.8`
- 見出し: `1.2` 〜 `1.4`
- 行高はトークン化し、`line-height: var(--lh-body)` のように参照する

### 5.4 流体タイポグラフィ

- `clamp(min, slope, max)` でビューポート幅に応じた連続スケールを作る
- slope は `calc((max - min) / (vw-max - vw-min) * 100vw + offset)` 形式で組み立てる
- §4.7 の API 規約に従い、min / max / vw 範囲を `--<name>--*` で公開する

実装例：

```ts
const fluidText = css({
  '--_u-min-font-size': 'var(--fluid-text--min-font-size, 14)',
  '--_u-max-font-size': 'var(--fluid-text--max-font-size, 24)',
  '--_u-min-vw': '320',
  '--_u-max-vw': '1280',
  '--_u-slope':
    'calc((var(--_u-max-font-size) - var(--_u-min-font-size)) / (var(--_u-max-vw) - var(--_u-min-vw)))',
  fontSize:
    'clamp(calc(var(--_u-min-font-size) * var(--to-rem)), calc(var(--_u-min-font-size) * var(--to-rem) + var(--_u-slope) * (100vw - calc(var(--_u-min-vw) * 1px))), calc(var(--_u-max-font-size) * var(--to-rem)))',
});
```

### 5.5 タイポグラフィの単位

詳細な使い分け表は §2.3 を正典とする。タイポ視点で重要な点だけ再掲：

- `font-size` は **rem**。`calc(<n> * var(--to-rem))` を経由する。文字拡大機能の採用条件は §2.4
- `letter-spacing` は **em**（font-size に比例）
- 行間（`line-height`）は**単位なし**の倍率（font-size に比例。例: `1.6`）
- 段落間隔・ボタン内側 padding など**文字に依存する余白**は **em / rem**
- 文字に依存しないコンポーネント間余白は **px**
- `border-width` は **px**

### 5.6 @layer base のグローバル設定

- ルート要素に `font-family` / `line-height` / `color-scheme` / 基本カラーを設定する
- `*, *::before, *::after { box-sizing: border-box }` は kiso.css 側で設定済みのため重複させない

### 5.7 @layer utilities でのレシピ

- `recipe` で「見出し H1〜H6」「本文 large/medium/small」「キャプション」などの段階を提供する
- 用途名（`h1Recipe`）ではなく**意味名**（`displayLarge` / `bodyMedium` / `caption`）で命名する

### 5.8 テキストカラー

- 本文・サブ・無効・反転の 4 段階を最低限用意する
- テーマ切替は `light-dark()` で吸収する（§2.6）

### 5.9 リンクの扱い

- 下線は色のコントラスト比だけに頼らない（アクセシビリティ）
- ホバー時のみ下線を出すアンチパターンを取らない

### 5.10 強調の階層

- 強調は `font-weight` を主、`color` を従にする
- italic は引用・外国語・タイトルのみ

### 5.11 数字

- 表組・データ表示では tabular-nums を有効にする（`font-variant-numeric: tabular-nums`）

### 5.12 改行

- 日本語本文では `word-break: auto-phrase` を基本とする（対応ブラウザで自然な改行）
- フォールバックは `word-break: keep-all` + `overflow-wrap: anywhere`

### 5.13 セマンティクス

- 視覚的な大小は `font-size` で表現する。`<h1>` 〜 `<h6>` の選択はアウトライン構造に従う
- 視覚と意味を分離する（`<h1>` を小さく見せたければ `font-size` を下げる）

### 5.14 アクセシビリティ

- 本文最小は `14px` 相当を下回らない
- コントラスト比 `4.5:1` を本文の下限とする
- ユーザーの拡大設定（200% まで）で破綻しないこと

## 6. アンチパターン

- ❌ コンポーネントルートに `grid-template` / `gap` を書く（§4.1）
- ❌ 要素間余白を `margin` で作る（§4.2）
- ❌ `:first-child` / `:last-child` で `margin` を打ち消す（§4.3）
- ❌ 子コンポーネントの props に `className?: string` を生やす（§4.4）
- ❌ Props を `ComponentProps<T>` でそのまま定義する（§4.5）
- ❌ API 用と内部用のカスタムプロパティを同じ命名で混在させる（§4.7）
- ❌ コンポーネント単位のレスポンシブを `@media` で書く（§4.6 — `@container` を使う）
- ❌ メディアクエリをページ単位以外で使う（§4.6）
- ❌ `Wrapper` / `Block` / `Module` / `Widget` / `Text` を正式名称として使う（§3.7）
- ❌ font-size に rem を採用しながら、文字依存の余白を絶対値で書く（§2.4）
- ❌ 文字に依存しないコンポーネント間余白を rem で書く（§2.3 / §4.2）
- ❌ コンテナ幅を rem で書く（§2.3 — `cqi` または `px` を使う）
- ❌ 全ての寸法を rem で書く（ズーム機能との住み分けを無視、§2.5）
- ❌ `:root` の `font-size` を絶対値で固定する（§2.4）
- ❌ `:root` の `font-size` を `62.5%` にする（§2.4）
- ❌ rem を採用しながら文字拡大機能の検証を一度もしない（§2.4）
- ❌ Tailwind / 生 CSS / styled-components を持ち込む（§2.1）
- ❌ 新しい `@layer` を独自に追加する（§2.2）
- ❌ 日本語 Web font を配信する（§5.1）
- ❌ ホバー時のみ下線を出す（§5.9）
- ❌ `font-size` を視覚的階層、`<h1>` 〜 `<h6>` をスタイル選択器として使う（§5.13）

## 関連ルール

- 配置: [`./directory-structure.md`](./directory-structure.md)
- 命名: [`./naming.md`](./naming.md)
- 適用順序（コンポーネント追加サイクル）: [`./development-cycle/component.md`](./development-cycle/component.md)

## 参照する既存ユーティリティ

- `src/types.ts` の `ComponentPropsWithoutClassName<T>`（§4.5）
- `src/app/layer-order.css` の cascade order（§2.2）
- `src/app/globals.css` の `--to-rem` トークンと `light-dark()` 利用例（§2.3 / §2.6）

## 関連スキル

- [skill: `/frontend-design`] — Visual 設計時に併用
- [skill: `/web-design-guidelines`] — レビュー時に併用
- [skill: `/react-best-practices`] — CSS-in-JS の動的計算最小化
