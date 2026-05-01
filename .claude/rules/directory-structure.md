# ディレクトリ構成ルール

`src/` 配下の構成と命名に関するルールである。

本ファイルは「どこに置くか」、[`./naming.md`](./naming.md) は「どう名付けるか」を扱う。両者は対であり、必ず合わせて読む。

## 命名と思想

命名の詳細ルール（明名フロー / BCD Design の概念軸 / 組み立て型 / 層判定 / 末尾 UI 名 / 対称性 等）は [`./naming.md`](./naming.md) を参照する。本節は配置に直結する命名要件のみを扱う。

- 命名は **BCD Design**（Domain / Case / Base）に従う。
- ファイル名は原則 kebab-case で表す。
- ドメイン名は**単数形**で表す。
- ドメインのネストは**後方一致 + 修飾子**のときのみ行う。
  - `user` と `premium-user` のように後方一致するなら、`premium-user` を `user/` の中に置く。
  - `user` と `user-detail` のように前方一致のみのものは、同じ粒度で並べる。
- `_base/` は次のときに**限って**設ける（機械的に付けない）。
  - **`src/components/<base>/`**: 兄弟に **Case** が存在するとき。Case が無ければ Base 本体は `<base>/<base>.tsx` のように直置きする。
  - **`src/features/<domain>/`**: 兄弟に**後方一致 variant**（修飾子が前方に付く variant、例: `premium-user/`）が存在するとき。後方一致 variant が無ければ `actions/` `api/` `components/` 等を `<domain>/` 直下に置く。
- `_variant/` は **Base 本体（`<base>.tsx`）と同じ階層**に置く。`_base/` の発生条件（Case の有無）とは独立に variant の有無で決まる（src/components/ の Base のみで使う概念。src/features/ では variant は兄弟ドメインとして直接並べる）。
  - Base 本体が直置きの場合: `<base>/<base>.tsx` の隣に `<base>/_variant/<variant>/`
  - Base 本体が `_base/` に隔離されている場合: `<base>/_base/<base>.tsx` の隣に `<base>/_base/_variant/<variant>/`
- variant は**単体で UI として完結する見た目の亜種**に限る（例: `ghost` / `normal`, `solid` / `dashed`）。`on` / `off` のように相互依存する対概念は variant ではなく state として扱い、コンポーネント内で props 切替する。
- 「隠れドメイン」（例: `site/`）の存在に注意する。明示的なエンティティ名でなくとも、概念として存在するドメインは features 配下に置く。

## 依存方向

依存は常に**具体 → 抽象の一方向**である。逆方向の依存は禁止する。

- features 配下のコンポーネント → `src/components/`
- バリアントドメイン（例: `premium-user/`）→ `_base/`
- 派生ドメイン（例: `user-detail/`）→ 元ドメイン（`user/`）

## src/app/

- `page.tsx` と `layout.tsx` のみを配置する。
- コンポーネントは定義しない。

## src/components/

ドメインに属さない汎用コンポーネントを置く。BCD Design における **Case** と **Base** のみを扱う。

- 各コンポーネントディレクトリ直下に `index.ts` を置き、当該コンポーネントを export する。
- `_variant/` は **Base 本体（`<base>.tsx`）と同じ階層**に置く。`_base/` の発生条件（Case の有無）とは独立に variant の有無で決まる。
  - Case が無く Base 本体が直置きの場合: `<base>/<base>.tsx` の隣に `<base>/_variant/<variant>/` を置く。
  - Case が有り Base 本体が `_base/` に隔離されている場合: `<base>/_base/<base>.tsx` の隣に `<base>/_base/_variant/<variant>/` を置く。

```
src/components/
  button/                         # Case と variant の両方が存在するパターン
    _base/                        #   Case があるため Base 本体を隔離
      _variant/                   #     Base 本体と同じ階層
        ghost/
          ghost-button.stories.tsx
          ghost-button.tsx
          index.ts
        normal/
      button.tsx
      index.ts
    add-button/                   # Case
    edit-button/                  # Case
  divider/                        # variant のみ存在するパターン
    _variant/                     #   _base/ は不要、Base 本体と同じ階層
      solid/
        solid-divider.tsx
        index.ts
      dashed/
    divider.tsx                   #   Base 本体は直置き
    index.ts
  card/                           # Case も variant も無い最小構成
    card.tsx
    index.ts
```

## src/features/

ドメイン固有のコードを置く。ドメインの切り方は BCD Design の Domain に従う。

各ドメインの `_base/`（後方一致 variant が無い場合はドメイン直下）に、以下のサブディレクトリを置く。**使用しないサブディレクトリは省略してよい**（空ディレクトリを残さない）。

| ディレクトリ  | 役割                               |
| ------------- | ---------------------------------- |
| `actions/`    | `api/` を使用する Server Actions   |
| `api/`        | fetch のラッパー                   |
| `components/` | このドメインに属するコンポーネント |
| `hooks/`      | このドメインに属する React hook    |
| `models/`     | ドメインモデル・ドメインロジック   |

`components/` 内は、**データフェッチを伴うコンポーネントに限り** **Container / Presentational** パターンで分ける。データフェッチを伴わない UI 主体のコンポーネント（ボタン等）は単一ファイルでよい。

- Container（例: `user-list-container.tsx`）はデータフェッチを担当する。
- Presentational（例: `user-list.tsx`）はデータフェッチ以外を担当する。ファイル名に `presentational` はつけない。
- `index.ts` から両方を export する。
- Server Components のテストは Storybook ではなく **Vitest** で行う（例: `user-list-container.test.tsx`）。

```
src/features/
  user/
    _base/
      actions/
        delete-user.ts
      api/
        delete-user.ts
        get-users.ts
      components/
        user-add-button/
          index.ts
          user-add-button.stories.tsx
          user-add-button.tsx
        user-list/
          index.ts
          user-list-container.test.tsx
          user-list-container.tsx
          user-list.stories.tsx
          user-list.tsx
      hooks/
        use-user-search.ts        # 直置き（in-source test）
      models/
        user-id.ts                # 直置き（in-source test）
    premium-user/                 # _base のバリアント
      components/
  user-detail/                    # 別ドメイン（user に依存可）
    components/
  site/                           # 隠れドメイン
    components/
      site-header/
        index.ts
        site-header.stories.tsx
        site-header.tsx
```

## src/lib/

- 特定ライブラリの初期化や provider を置く。

## src/hooks/

- ドメインに属さない汎用 React hook を置く（例: `useDebounce`、`useMediaQuery`）。
- ドメイン依存の hook は `features/<domain>/hooks/` に置く。
- React API を伴わない純粋なドメインロジックを hook にしてはならない。そのようなロジックは `features/<domain>/models/` に置く。
  以下の規則は `src/hooks/` および `features/<domain>/**/hooks/`・`features/<domain>/**/models/` のすべてに適用される。

- `hooks/` および `models/` 配下は**ファイル直置き**とする（例: `use-debounce.ts`, `user-id.ts`）。ディレクトリ化（`use-debounce/index.ts`）はしない。
- 直置きファイルのテストは **Vitest の in-source test** で行う（`if (import.meta.vitest)` ブロック）。`.test.ts` ファイルは作らない。
- 拡張子は JSX を含むなら `.tsx`、それ以外は `.ts`。

## src/utils/

- 他のどこにも属さない汎用処理を置く。
- 上記カテゴリのいずれにも収まらないときの最後の受け皿である。
