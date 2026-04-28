# Server / Client 境界とコンポジション

`"use client"` / `"use server"` の意味、Server / Client / Shared の組み合わせ方、Container 1st Design、Container/Presentational の責務分離を扱う。配置・命名は [`./directory-structure.md`](./directory-structure.md) と [`./naming.md`](./naming.md) を正典とする。本ファイルは「**何をどこに置くべきか**」ではなく「**どう組み合わせるべきか**」だけを述べる。

## 1. ディレクティブはバンドル境界の宣言である

`"use client"` / `"use server"` は**実行環境を示すものではない**。これらはバンドラに対する境界宣言であり、それ以上でも以下でもない。

| ディレクティブ | 意味                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------ |
| `"use client"` | **Client Boundary**（サーバー → クライアント）。サーバーへ Client Components を公開する    |
| `"use server"` | **Server Boundary**（クライアント → サーバー）。クライアントへ Server Functions を公開する |

よくある誤解と回答:

- **Q: Server Components に `"use server"` を付ける？** → 付けない。Next.js の App Router ではデフォルトが Server Components である。
- **Q: 全 Client Components に `"use client"` が必要？** → 不要。Client Boundary になる箇所だけに付ける。境界でない Client Components は、`"use client"` を付けたファイルから import されることで自動的に Client Bundle に入る。
- **Q: Client Components から Server Components を import できる？** → できない。ただし `children` などの props として渡すことは可能（[Composition パターン](#5-composition-パターン)）。

## 2. Bundle Boundary の伝播

`"use client"` を付けたモジュールから import される子孫は、**暗黙的にすべて Client Bundle に入る**。Client Boundary を上位に置くと、配下の Server Components を活かせなくなる。

```
page.tsx (Server)
└── header.tsx ← ここに "use client" を付けると…
    ├── search-bar.tsx       (Client Bundle)
    ├── nav-links.tsx        (Client Bundle に巻き込まれる)
    └── site-logo.tsx        (Client Bundle に巻き込まれる)
```

Client Boundary は **コンポーネントツリーの末端に近い位置に**配置する。

## 3. Client Components を使う基準

Client Components 化は次の 3 ケースに限る。それ以外は Server Components のままにする。

1. **クライアント処理が必須**（`useState`、`useEffect`、`onClick` 等のイベント、ブラウザ API、`localStorage` など）
2. **3rd party の Client Components を組み込む必要がある**（既に `"use client"` が付いているライブラリを利用する）
3. **RSC Payload を意図的に削減したい**（巨大な静的ツリーを RSC Payload から除外し、JS バンドル経由で送る方が軽い場合）

「念のため」「将来 onClick が増えるかも」は Client 化の根拠にならない。実際にクライアント機能を使う箇所まで Boundary を引き下げる。

## 4. Shared Components

`"use client"` が付いていないコンポーネントは Server / Client 両方のバンドルで動作する。これを **Shared Components** と呼ぶ。

- `_base/components/` 配下の純粋な UI コンポーネント（`Button`、`Card` 等）の多くは Shared である。
- Shared から Server 専用 API（DB アクセス、`server-only` モジュール）を import すると Client Bundle 側でビルドが壊れる。逆も同様。
- バンドルを保護したい場合は明示的に `import "server-only"` または `import "client-only"` を付ける。

## 5. Composition パターン

上位がどうしても Client Components になる場合（モーダル・タブ・サイドメニューなど状態を持つコンテナが上位に立つ場合）、**`children` などの props として Server Components を流し込む**。

```tsx
// side-menu.tsx
'use client';

import { useState } from 'react';

export function SideMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {children}
      <button onClick={() => setOpen((v) => !v)}>toggle</button>
    </>
  );
}
```

```tsx
// page.tsx (Server Components)
import { SideMenu } from './side-menu'; // Client
import { UserInfo } from './user-info'; // Server

export default function Page() {
  return (
    <SideMenu>
      <UserInfo />
    </SideMenu>
  );
}
```

`SideMenu` は Client Components だが、`children` として渡された `<UserInfo />` は Server Components のままレンダリングされる。

**「後から Composition 化」は手戻りが大きい**。Client Boundary を上位に引いた後で Composition に切り替えると、Client 側の状態管理や props 設計を全面的にやり直すことになる。最初の設計時から Composition を想定する。

## 6. Container 1st Design

ページ・レイアウトは「先に小さなコンポーネントを作って積み上げる」のではなく、「**先に UI をツリーに分解し、Container を仮置きしてから詳細を埋める**」順序で実装する。

### 実装手順

1. **UI をツリーに分解する**: 画面要素と必要なデータの関係を図にする。「ブログ記事情報」「著者情報」「コメント一覧」のように分ける。
2. **コンポーネントツリーを仮実装する**: データフェッチを行う位置を Container として `*-container.tsx` 名で仮実装する（[`./directory-structure.md`](./directory-structure.md) の命名に従う）。**この時点では Container の中身は実装しない**。`async function PostContainer(props: { postId: string }) { return <Post {...props} />; }` のように、シグネチャと Presentational への受け渡しだけ用意する。Presentational 側も型と JSX 構造（要素の入れ子）だけのスケルトンに留める。
3. **詳細を実装する**: 各 Container 内のフェッチと、Presentational 側の表示を実装する。

```tsx
// /posts/[postId]/page.tsx
export default async function Page(props: { params: Promise<{ postId: string }> }) {
  const { postId } = await props.params;
  return (
    <div>
      <PostContainer postId={postId}>
        <UserProfileContainer postId={postId} />
      </PostContainer>
      <CommentsContainer postId={postId} />
    </div>
  );
}
```

ボトムアップ実装を禁止する理由は、Container の位置・Composition の有無を後から差し込むと、それまで作った Client Components の props 設計を全部やり直す羽目になるためである。

## 7. Container / Presentational の責務分離

[`./directory-structure.md`](./directory-structure.md) の規定により、**データフェッチを伴うコンポーネントは Container / Presentational に分割**する。本ファイルでは責務だけを述べる。

| 役割           | 担当                                                                            |
| -------------- | ------------------------------------------------------------------------------- |
| Container      | データフェッチ等のサーバー処理。Presentational に props として渡す              |
| Presentational | データを受け取って表示する。`"use client"` を付けるかは UI 要件に応じて判断する |

- Container は `await getXxx(...)` を呼ぶだけの薄い層に保つ。複数フェッチを並べたい場合は `Promise.all` を使う（[`./data-fetching.md`](./data-fetching.md)）。
- Presentational は **Container から呼ばれる前提のプライベート定義**として扱う。同じディレクトリ外から直接 import しない。
- Container を関数として `await PostContainer({ postId: '1' })` 形式で実行できるよう、Vitest からのテストを意識した薄い実装にする。

## 8. `server-only` / `client-only` の使いどころ

| パッケージ    | 用途                                                                     |
| ------------- | ------------------------------------------------------------------------ |
| `server-only` | DB クライアント、API キーを使うフェッチ層、暗号鍵を扱う関数など          |
| `client-only` | `window` / `document` 直接アクセス、ブラウザストレージ、Web API ラッパー |

`features/<domain>/_base/api/` 配下の fetcher はすべて先頭に `import "server-only"` を入れる。

## 9. ファイル単位 `"use server"` の罠

`"use server"` をファイル先頭に書くと、そのファイルの **`export` された全関数が Server Functions として公開される**。意図せず内部用ヘルパーが外部エンドポイント化されると情報漏洩につながる。Server Actions は **関数単位**で `"use server"` を付ける（または、専用ファイルに Server Actions だけを置く）ことを基本とする。

## 関連ルール

- 配置・命名: [`./directory-structure.md`](./directory-structure.md), [`./naming.md`](./naming.md)
- データフェッチ: [`./data-fetching.md`](./data-fetching.md)
- キャッシュ: [`./caching-and-rendering.md`](./caching-and-rendering.md)
- 非同期 UI: [`./async-ui.md`](./async-ui.md)
- エラー: [`./error-handling.md`](./error-handling.md)
