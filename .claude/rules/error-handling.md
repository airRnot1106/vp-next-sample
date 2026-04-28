# エラーハンドリング

Next.js のサーバーサイドエラーと React のクライアントサイドエラーを統合的に扱う。エラーが発生する場所によって扱いが異なるため、まず**どこで起きるか**を 3 つに分けて考える。

## 1. エラーの 3 区分

| 区分                       | 失敗の仕方                                        | キャッチ手段                              |
| -------------------------- | ------------------------------------------------- | ----------------------------------------- |
| Server Components          | レンダリング中に `throw` される                   | Route Segment 単位の `error.tsx`          |
| Server Functions / Actions | データ操作中に発生                                | **戻り値で表現する（throw しない）**      |
| Client Components          | ブラウザ実行時のレンダリング失敗 / 非同期処理失敗 | `react-error-boundary` の `ErrorBoundary` |

## 2. Server Components のエラー

Route Segment 単位の `error.tsx` で fallback を定義する。レイアウトはそのままに、`page.tsx` 部分が `error.tsx` に置き換わる。

```tsx
// app/posts/[postId]/error.tsx
'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
```

- `error.tsx` は **Client Component**である必要がある（先頭に `'use client'`）。
- `reset()` で再レンダリングを試みる。
- 404 は `notFound()` を `throw` し、`not-found.tsx` で受ける。SEO 上 404 を区別する必要があるためその他のエラーと一緒にしない。
- `unauthorized()` / `forbidden()` は実験的機能のため、安定版に入るまで採用を控える。

## 3. Server Functions / Server Actions のエラー

**予測可能なエラーは `throw` せず、戻り値で表現する**。理由は次の 2 つ。

1. `throw` するとページ全体が `error.tsx` に置き換わる。フォーム入力中だった内容が失われ、ユーザーは最初からやり直すことになる。
2. 関数型の Result 表現（既存スキル `byethrow` の `Result` 等）と整合する。バリデーション失敗・権限不足・在庫切れなど「想定済みの失敗」は値として扱えるべきである。

```ts
'use server';

import { redirect } from 'next/navigation';

export async function login(prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: loginSchema });

  if (submission.status !== 'success') {
    return submission.reply(); // throw しない
  }

  // 認証 NG など想定済みの失敗
  const result = await tryLogin(submission.value);
  if (!result.ok) {
    return { error: result.error.message };
  }

  redirect('/dashboard');
}
```

- `conform` + `zod` を使うときは `submission.reply()` を返す。フォームライブラリを使わない場合も自分で戻り値の型を切る。
- **予測不能なエラー**（DB が落ちた、ネットワーク断、バグなど）は `throw` のまま `error.tsx` に到達することを許容する。これは「ユーザーが入力をやり直してでも止まる方が良い」種類のエラーである。

### 3.1 既存スキル `byethrow` / `functional-ts` との接続

- ドメイン層・Use Case 層・Repository 層から `Result<T, E>` を返す（[skill: `byethrow`] / [skill: `functional-ts`]）。
- Server Action は `Result` を**戻り値としてそのままシリアライズして返す**。Client Components 側で `Result` を `match` してフォームエラーを表示する。
- Server Component から呼ぶ Use Case が `Result` を返した場合、ドメインエラーは UI に流して、システムエラーだけ `throw` する。境界で `Result` を `match` してから `throw` するか戻り値で扱うかを決める。

## 4. Client Components のエラー

クライアント側のレンダリングエラーは `react-error-boundary` の `ErrorBoundary` でキャッチする（React 自身は class API のみ提供）。

```tsx
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary FallbackComponent={Fallback}>
  <Suspense fallback={<Loading />}>
    <SearchResults query={query} />
  </Suspense>
</ErrorBoundary>;
```

`use(promise)` でサスペンドしている Promise が reject すると、その箇所で `throw` されたのと同じ扱いになり、Error Boundary がキャッチする。

## 5. ErrorBoundary と Suspense の配置

「**ここが消えても困らない範囲**」で境界を切る。境界内のコンテンツはエラー時に丸ごと fallback に置き換わるため、巻き込まれる範囲を最小化する。

### 5.1 アンチパターン: 検索バーごと巻き込む

```tsx
// ❌ 検索バーまで消える
<ErrorBoundary FallbackComponent={Fallback}>
  <SearchBox />
  <Suspense fallback={<Loading />}>
    <SearchResults />
  </Suspense>
</ErrorBoundary>
```

### 5.2 推奨: 結果だけ囲う

```tsx
// ✅ 結果のみ。バーは残るので再検索できる
<SearchBox />
<ErrorBoundary FallbackComponent={Fallback}>
  <Suspense fallback={<Loading />}>
    <SearchResults />
  </Suspense>
</ErrorBoundary>
```

### 5.3 ErrorBoundary は Suspense の外側

`ErrorBoundary` を `Suspense` の **外側**に置くと、リトライ時にエラー UI を保たず即 fallback に切り替わる。「エラー → 新結果」の遷移ではトランジションで古い UI を残しても不自然なので、外側配置のほうが UX に合う。

## 6. リトライ実装

Error Boundary のリセットと、再フェッチを発火させる state 更新を **`startTransition` でバッチ化**する。React 18 以降の自動バッチングにより、両更新が同一レンダーに乗り、リセット直後に再エラーになることを防ぐ。

```tsx
function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  const refetch = useRefetch(); // 例: 再フェッチをトリガーする state 更新関数
  const handleRetry = () => {
    startTransition(() => {
      resetErrorBoundary();
      refetch();
    });
  };

  return (
    <div>
      <p>エラー: {error.message}</p>
      <button type="button" onClick={handleRetry}>
        再試行
      </button>
    </div>
  );
}
```

## 7. グローバルなエラーロギング

`createRoot` のコールバックで一括ロギングする。

| コールバック         | 対象                                                          |
| -------------------- | ------------------------------------------------------------- |
| `onCaughtError`      | レンダリング中に発生し、Error Boundary でキャッチされたエラー |
| `onUncaughtError`    | レンダリング中に発生し、キャッチされなかったエラー            |
| `onRecoverableError` | React が自動回復したエラー（ハイドレーションミスマッチなど）  |

`onRecoverableError` は UI 上のエラーにならないため Error Boundary でも捕まらない。**ロギングしたければここで拾う**。

クライアント側のエラーはブラウザ依存で再現困難なため、Datadog 等の RUM（Real User Monitoring）導入を別途検討する。

## 8. アンチパターン

- ❌ Server Action の中でバリデーションエラーを `throw` する（フォーム入力が失われる）
- ❌ ページ全体を 1 つの `ErrorBoundary` で囲う（あらゆる失敗で全画面が消える）
- ❌ `useEffect` でエラーを `setState` し、`isError` フラグで分岐する（Suspense / Error Boundary を使う）
- ❌ `try / catch` でレンダリング中のエラーを握り潰し、null を返す（境界を曖昧にする）

## 関連ルール

- 配置・命名: [`./directory-structure.md`](./directory-structure.md), [`./naming.md`](./naming.md)
- データフェッチ: [`./data-fetching.md`](./data-fetching.md)
- Server / Client 境界: [`./server-client-boundary.md`](./server-client-boundary.md)
- キャッシュとレンダリング: [`./caching-and-rendering.md`](./caching-and-rendering.md)
- 非同期 UI: [`./async-ui.md`](./async-ui.md)
