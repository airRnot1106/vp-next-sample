# キャッシュとレンダリング

Next.js 16 の Cache Components（`"use cache"` / PPR / Dynamic IO）を前提に、レンダリング戦略・キャッシュ・Server Actions による無効化を扱う。本プロジェクトは Next.js 16 + Turbopack を使うため、**v14 以前の暗黙キャッシュ前提（`fetch()` の `force-cache` がデフォルト等）は持ち込まない**。

## 1. 思想

- Next.js は v15 で **暗黙的・多層のキャッシュ**を捨て、v16 の Cache Components で **明示的・合成可能なキャッシュ**へ移行した。
- Cache Components は次の 3 つの統合である。
  - **PPR（Partial Pre-Rendering）**: ページ全体を Static にしつつ、部分だけ Dynamic にできるレンダリングモデル。
  - **Dynamic IO**: 動的 I/O は必ず `<Suspense>` の内側に置く制約。これにより `<Suspense>` の外側を Static Shell として即時配信できる。
  - **`"use cache"`**: 「キャッシュ可能」を関数 / コンポーネント / ファイル単位で宣言する第 3 のドア（`"use client"` / `"use server"` に並ぶ）。
- **Static Rendering を基本**とし、Dynamic Rendering は**理由があるときだけ**選ぶ。

## 2. レンダリングの型

| 型                | 何が起きるか                                                               |
| ----------------- | -------------------------------------------------------------------------- |
| Static Rendering  | ビルド時または revalidate 後に HTML / RSC Payload を生成。CDN キャッシュ可 |
| Dynamic Rendering | リクエスト毎にレンダリング。従来の SSR 相当                                |
| PPR               | Static Shell（外郭）と Dynamic Content（`<Suspense>` 内）を組み合わせる    |

ユーザー固有の動的 I/O が無い限り、ページは Static で済ませる。

## 3. Dynamic IO の制約

次の処理は **必ず `<Suspense>` の内側**に置く。`<Suspense>` の外側で実行するとビルドエラーになる。

- データフェッチ（`fetch()` / DB アクセス）
- Runtime Data: `cookies()`、`headers()`、`generateStaticParams()` で事前解決されない `params`
- Next.js がラップするモジュール（`Date`、`Math`、Node の `crypto` など）
- マイクロタスクを除く任意の非同期関数

```tsx
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // generateStaticParams で解決されていれば Static
  return (
    <>
      <PostContainer slug={slug} /> {/* Static */}
      <Suspense fallback={<>Loading...</>}>
        <CommentsContainer slug={slug} /> {/* Dynamic */}
      </Suspense>
    </>
  );
}

export async function generateStaticParams() {
  return [{ slug: '1' }, { slug: '2' }];
}
```

`<Suspense>` の境界が **Static Shell と Dynamic Content の境目**になる。

## 4. `"use cache"` ディレクティブ

「この関数 / コンポーネントはキャッシュ可能」を宣言する。`"use client"` がサーバーとクライアントの境界を、`"use server"` がクライアントからサーバーへの呼び出し境界を表すのに対し、`"use cache"` は **キャッシュ境界**を表す。

```tsx
async function PostContainer({ slug }: { slug: string }) {
  'use cache';
  const post = await getPost({ slug });
  return <Post post={post} />;
}
```

- **主用途**: Static Shell に動的処理を取り込む。これで「動的に見えるが事前生成できる」UI が可能になる。
- Dynamic Content から `"use cache"` を呼ぶこともできる。この場合インメモリキャッシュのマーカーとして機能する。
- 複数プロセスや複数インスタンスでキャッシュを共有したい場合、`"use cache"` のままではプロセス間共有できない。`cacheHandlers` を設定するか、`"use cache: remote"` を検討する（Next.js のリリース状況に応じて選定）。

### 4.1 キャッシュキーは自動算出される

`"use cache"` のキャッシュキーは Next.js が以下から自動算出する。

1. Build ID（ビルドごとに一意）
2. Function ID（コード位置とシグネチャから安全なハッシュ）
3. シリアライズ可能な引数 / props
4. HMR refresh hash（開発時のみ）

**`ReactNode` などシリアライズ不能な props はキーに含まれない**。これを利用すると、cached なコンポーネントの `children` に non-cached なコンポーネントを渡して合成できる。

```tsx
export default function Page() {
  return (
    <CachedShell>
      <NonCachedDynamic />{' '}
      {/* children は cache key に含まれず、そのまま動的にレンダリングされる */}
    </CachedShell>
  );
}
```

### 4.2 配置の選び方

`"use cache"` は次の 4 階層に置ける。**キャッシュしたい単位 = Static Shell として送りたい単位**に合わせて選ぶ。

| 置き場所                                                          | 採用するとき                                                                                                                                 |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **ファイル先頭**（モジュールトップに `'use cache'`）              | そのファイルの全 export が純粋にキャッシュ可能（例: `_base/api/` の fetcher 群を一括宣言）。**全 export が async function であることが前提** |
| **ルートセグメント**（`page.tsx` / `layout.tsx` トップ）          | ルート / セグメント全体を Static Shell にしたい                                                                                              |
| **Server Components**（Container や任意のサーバーコンポーネント） | 「fetch + 整形 + 子のレンダー結果まで」一塊でキャッシュしたい。動的部分は `children` 経由で pass-through する（§4.1 参照）                   |
| **async 関数**（fetcher 等）                                      | データ取得単独をキャッシュ・共有したい。複数の呼び出し元から使われるとき寿命 / tag を一箇所に集約できる                                      |

制約:

- `cookies()` / `headers()` / `searchParams` を `"use cache"` の内側で**直接呼ばない**。値は引数として外側から渡す。
- 引数・戻り値は **serializable** であること。`ReactNode`（`children`）と Server Action は **pass-through 限定**で受け取れる（中身を読んだり呼んだりしない）。
- **入れ子配置は合法**。外側コンポーネントと内側 fetcher の両方に `"use cache"` を置くと、それぞれが独立したキャッシュエントリ（独自の key / `cacheLife` / `cacheTag`）になる。例えば外側 = `cacheTag('news-list')` + `cacheLife('minutes')`、内側 fetcher = ``cacheTag(`news:${id}`)`` + `cacheLife('hours')` のように **粒度の異なる無効化軸**を持たせる用途で使う。
- 入れ子にするときは **外側に必ず明示の `cacheLife` を置く**。外側を省略すると `default` プロファイルが使われ、内側に短寿命キャッシュ（`seconds` 等）が混じった瞬間に外側まで短寿命に引きずられる。Next.js は予測不能な伝播を防ぐため、短寿命の内側キャッシュ + 外側 `cacheLife` 未指定の組み合わせを **prerender でエラー**にする。
- 入れ子の意図が無いなら 1 箇所に集約する。「Container にも fetcher にも何となく付ける」は無駄なエントリと `cacheLife` / `cacheTag` の重複を増やし、保守を難しくするだけ。

## 5. `cacheLife(profile)`

キャッシュの寿命を 3 つの時間軸で指定する。

| 時間軸       | 意味                                                       |
| ------------ | ---------------------------------------------------------- |
| `stale`      | クライアント側でキャッシュを使い続ける期間                 |
| `revalidate` | 次のリクエスト時にバックグラウンドで再取得するまでの期間   |
| `expire`     | 次のリクエスト時にレンダリングをブロックして再取得する期間 |

- profile 文字列（`seconds` / `minutes` / `hours` / `days` / `weeks` / `max`）か、個別オブジェクト指定（`cacheLife({ stale: 300 })`）を渡す。
- **profile を指定しないまま `"use cache"` を使わない**。デフォルト挙動は変わりうるため、意図を明示する。

```ts
import { cacheLife } from 'next/cache';

async function getPosts() {
  'use cache';
  cacheLife('hours');
  return await fetch('/api/posts').then((res) => res.json());
}
```

## 6. `cacheTag(...)` と `revalidateTag` / `updateTag`

- `cacheTag(...tags)` は、`"use cache"` 関数の **戻り値を tagging** する。`fetch()` の `next.tags` と異なり、**フェッチ結果の値に基づいて動的に tag を付けられる**（例: `cacheTag('posts', `post:${post.id}`)`）。
- `revalidateTag(tag)` は対象の tag をバックグラウンドで再検証する。古いキャッシュを返しながら裏で更新する。
- `updateTag(tag)` は対象の tag を**即座に更新**して結果を画面に反映する。
- セマンティックなキー設計を心がける（`'posts'`、`'user:123'` 等）。

## 7. Server Actions と revalidate

データ変更後はキャッシュを更新する。

```ts
'use server';

import { revalidateTag, redirect } from 'next/cache';

export async function updatePost(postId: string, data: PostUpdate) {
  await api.updatePost(postId, data);
  revalidateTag(`post:${postId}`);
  redirect(`/posts/${postId}`);
}
```

- **`revalidatePath()` を濫用しない**。`revalidatePath()` は **Router Cache を全破棄**するため、ブラウザバック時のスクロール復元やナビゲーション応答が悪化する。
- 可能な限り `revalidateTag` / `updateTag` を使い、影響範囲を最小化する。
- `redirect()` を Server Action 内で呼ぶと、レスポンスに遷移先の RSC Payload が含まれ、HTTP リダイレクトをせず 1 往復で遷移できる。
- Server Actions は**直列実行**される。高頻度に発火させる設計にしない。

### 7.1 サイト外で発生するデータ更新

ヘッドレス CMS など Next.js の外で更新が起きる場合、Route Handlers + Web hook で `revalidateTag` を呼び出してサーバー側キャッシュ（Data Cache / Full Route Cache）を更新する。Router Cache はユーザー端末のインメモリにあるため、全ユーザー分を一括破棄する手段はない（自然失効を待つ）。

## 8. Streaming SSR の判断軸

`<Suspense>` でラップして遅延配信するかどうかは、**TTFB 短縮 vs CLS リスク**のトレードオフで判断する。

| 遅延コスト                        | 判断                         |
| --------------------------------- | ---------------------------- |
| データフェッチ 200ms 程度         | Streaming しない（CLS 優先） |
| 1s を超える Server Components     | 迷わず Streaming する        |
| fallback の高さが固定できない場合 | Streaming を慎重に検討する   |

fallback の高さは可能な限り固定し、Layout Shift を防ぐ。

## 9. Next.js 16 / Turbopack 前提の注意

- `fetch()` のキャッシュデフォルトはキャッシュ無効。キャッシュしたい場合は `"use cache"` を使うか、`fetch()` のオプションを明示する。
- `<Activity>` / `experimental.cachedNavigations` によるブラウザバック時の状態復元は **Route 単位**であり、BF Cache とは異なる。同一 URL へリンクから遷移しても状態が「復元されたように」見える、保持できる Route 数に上限がある（執筆時点で最大 3）など、MPA とは挙動が異なる。
- `vp dev` / `vp build` は内部で Vite+ 経由で Next.js を起動する。コマンドの叩き方は `AGENTS.md` を参照する。

## 関連ルール

- 配置・命名: [`./directory-structure.md`](./directory-structure.md), [`./naming.md`](./naming.md)
- データフェッチ: [`./data-fetching.md`](./data-fetching.md)
- Server / Client 境界: [`./server-client-boundary.md`](./server-client-boundary.md)
- 非同期 UI: [`./async-ui.md`](./async-ui.md)
- エラー: [`./error-handling.md`](./error-handling.md)
