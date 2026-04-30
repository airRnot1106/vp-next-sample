# データフェッチルール

App Router におけるデータフェッチの設計原則を定める。配置・命名は [`./directory-structure.md`](./directory-structure.md) と [`./naming.md`](./naming.md) に従う。本ファイルは「どう取りに行くか」を扱う。

## 1. 思想

- データフェッチは **Server Components で行う**。`useEffect` + `fetch` + `useState` で状態を組み立てる従来の手法は禁止する。クライアントから直接フェッチする 3rd party ライブラリ（SWR・React Query 等）は、デフォルトでは導入しない。
- 理由は次の 3 つ。
  - サーバー間通信のほうが高速・安定で、クライアントから外部 API を叩くより応答が早い。
  - シークレットや認証情報をクライアントに露出させない。
  - Client Bundle にフェッチライブラリを含めずに済む。
- データはレンダリングの一部であり、ページの上位で集中取得して props で配るのではなく、**使う場所の近くで取得する**。Request Memoization により同一リクエストの重複は自動で排除される。

## 2. コロケーション

- データを参照するコンポーネントの直下にフェッチ処理を置く。Props Drilling（バケツリレー）でデータを上位から流さない。
- 「同じ ID のユーザーを 2 箇所で使うから上で 1 度取って配る」のような最適化を**先回りしない**。Request Memoization によって、レンダリング中の `getUser(id)` は同一引数なら 1 リクエストにまとまる。

## 3. fetcher 層の固定化

Request Memoization は **同一 URL・同一オプション**であることが前提条件である。これを保証するため、fetcher は分散させずドメインごとに 1 箇所に集約する。

- 配置: `features/<domain>/**/api/`（[`./directory-structure.md`](./directory-structure.md) 参照）
- すべての fetcher の先頭で `import "server-only"` を宣言し、誤って Client Bundle に混入することを防ぐ。
- Server Components / Server Actions / Container Components から fetcher を呼ぶ。Client Components が直接 fetcher を import してはならない。
- 同じリソースに対する fetch は必ず同じ関数を経由させる。`getUser(id)` を A コンポーネントと B コンポーネントから呼ぶときに、片方が独自の `fetch()` を書くと Memoization が効かなくなる。

```ts
// features/user/_base/api/get-user.ts
import 'server-only';

export async function getUser(id: string) {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    // 共通オプションは fetcher で固定する
  });
  if (!res.ok) throw new Error(`failed to fetch user: ${id}`);
  return (await res.json()) as User;
}
```

## 4. 並行フェッチ

データ間に依存関係がなければ、必ず並行で取得する。直列のウォーターフォールは禁止する。

- **コンポーネントの兄弟分割**: 独立したデータを参照する部位は別の Container に分け、それぞれが自分のデータを `await` する。Container 同士は並行でレンダリングが進む。
- **`Promise.all`**: ひとつの Container 内で複数のデータが必要なら `Promise.all` でまとめる。
- **preload パターン**: `await` を付けずに先に Promise を発火させ、必要な箇所で改めて `await` する。Request Memoization と組み合わせて使う。

判断軸:

| 状況                                                                       | 採用パターン           |
| -------------------------------------------------------------------------- | ---------------------- |
| 独立した UI 領域。`<Suspense>` 境界も分けたい                              | コンポーネント兄弟分割 |
| 同一 Container 内で複数フェッチが必要で、すべて揃ってからレンダーしたい    | `Promise.all`          |
| 親で先に発火させ、子の Container で `await` する形にしたい（依存連鎖あり） | preload パターン       |

```ts
// preload パターン
function preloadUser(id: string) {
  void getUser(id); // Memoization のキャッシュに載せる
}

export async function PostContainer({ postId }: { postId: string }) {
  const post = await getPost(postId);
  preloadUser(post.authorId); // 子の Container で await されるより先に発火
  return <UserProfileContainer userId={post.authorId} />;
}
```

## 5. N+1 対策

リスト UI で各アイテムが個別データを参照する場合、コンポーネントを末端まで分解した結果として N+1 リクエストになる。これは設計の失敗ではなく、**バックエンドと組み合わせて解消すべき問題**である。

- フロントエンド側: DataLoader（バッチング & キャッシュ）でフェッチを束ねる。`getUser` の内部実装を DataLoader 経由にすれば、コンポーネントツリーは変えずに N+1 を解消できる。
- バックエンド側: 「複数 ID 一括取得」のエンドポイント（例: `GET /users?ids=1,2,3`）を必ず用意する。これがなければ DataLoader を入れても効果がない。

```ts
// CommentsContainer 内で各コメントの著者を取得
async function CommentItemContainer({ comment }: { comment: Comment }) {
  const user = await getUser(comment.authorId); // 内部で DataLoader によりバッチ化
  return <CommentItem comment={comment} user={user} />;
}
```

## 6. API 粒度

- **細粒度 REST を基本**とする。`GET /users/:id`、`GET /posts/:id`、`GET /posts/:id/comments` のようにリソース単位で分ける。
- 1 ページ専用の「一発で全部返す」God API を作らない。コロケーションと Request Memoization を前提にすれば、フロントエンドからの呼び出し回数増加はサーバー間通信の中に閉じる。
- 逆に、極端に細かすぎて 1 ページで何十回も叩くようになる Chatty API も避ける。粒度の判断軸は「**画面のレイアウト変更で API を作り変えないで済むか**」である。

## 7. クライアント側でフェッチが必要なケース

例外的にクライアントからフェッチする場合は、その理由を明確にする。

- ユーザー操作に応じて変動する検索結果のインタラクティブな絞り込み
- 認証セッションを通したリアルタイム更新（WebSocket / SSE）
- ブラウザ API（Geolocation 等）と組み合わせる必要がある場合

これらの場合でも、**初回表示分は Server Components で取得**し、以降の更新だけクライアント側で取りに行く。初回からクライアントフェッチに任せると LCP・CLS が悪化する。

## 関連ルール

- 配置: [`./directory-structure.md`](./directory-structure.md)
- 命名: [`./naming.md`](./naming.md)
- Server / Client 境界: [`./server-client-boundary.md`](./server-client-boundary.md)
- キャッシュ: [`./caching-and-rendering.md`](./caching-and-rendering.md)
