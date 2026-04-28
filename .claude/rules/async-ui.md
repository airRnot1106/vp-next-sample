# 非同期 UI

Suspense / Transition を中心にした非同期 UI の設計原則を扱う。本ファイルでは「**ローディングをどう表現するか**」「**画面遷移時のちらつきをどう防ぐか**」を扱う。エラー表示は [`./error-handling.md`](./error-handling.md) を参照する。

## 1. 思想

- 「やりたいこと（仕様）」だけを宣言的に書き、「具体的なロード状態の管理」と「最適化」は React に任せる。
- `useEffect` + `useState` + `isLoading` を手で管理する従来の手続き型を**禁止**する。`use(promise)` でサスペンドさせ、Suspense にローディングを任せる。
- React Compiler 前提のため、`useMemo` / `useCallback` の手動最適化はデフォルトでは入れない。

## 2. Suspense 境界の戦略

`<Suspense>` の境界は「**ロード時間が異なる単位**」「**fallback に切り替わっても許容できる単位**」で切る。

- Container 単位の境界が基本。データを取得するコンポーネントの直近で `<Suspense fallback={...}>` を置く。
- 重い処理と軽い処理を同じ境界に入れない。重い側に引きずられて軽い側まで遅延する。
- ページ全体を 1 つの `<Suspense>` で囲うアンチパターンは避ける。Streaming SSR の効果を捨てることになる。

```tsx
<>
  <PostContainer postId={postId} /> {/* 速い */}
  <Suspense fallback={<CommentsSkeleton />}>
    <CommentsContainer postId={postId} /> {/* 遅い */}
  </Suspense>
</>
```

## 3. `useTransition` を活用する

状態切替に伴ってサスペンドが起きるとき、`startTransition` でトランジション化すると **古い UI が保たれたまま新しい UI を待つ**ことができる（fallback には切り替わらない）。

```tsx
const [isPending, startTransition] = useTransition();
const [userId, setUserId] = useState('user1');

const handleSelect = (id: string) => {
  startTransition(() => {
    setUserId(id);
  });
};
```

- `isPending` で「処理中」を示すサブ表示（"(読み込み中...)" / 半透明化 / スピナー）を出す。fallback とは別の、現在の UI に対する**プラスアルファ**として表現する。
- これにより `古い UI → fallback → 新しい UI` ではなく `古い UI → 新しい UI` の流れになり、ちらつきがなくなる。

## 4. 複数トランジションは独立に持つ

ユーザー切替・カテゴリ切替など UI の異なる領域に影響する更新がある場合、`useTransition` は **領域ごとに独立**して持つ。

```tsx
const [isPendingUser, startTransitionUser] = useTransition();
const [isPendingPost, startTransitionPost] = useTransition();
```

ひとつの `isPending` を共用すると、ユーザーを切り替えただけで投稿一覧側にも「(読み込み中...)」が出てしまい、ユーザーに誤った情報を与える。

## 5. 制御コンポーネントは非トランジション

`<input value={...} onChange={...}>` のような **制御コンポーネントの値更新をトランジション化しない**。トランジション化すると入力値の反映が遅れ、ユーザーに「入力が効いていない」と感じさせる。

トランジションの対象は派生値の更新やページ遷移など、**ユーザー入力そのものの即時反映を妨げないもの**に限る。

## 6. Suspense の opt-out（古い UI を残さない）

トランジション中はデフォルトで古い UI が残るが、`key` 属性で `<Suspense>` を再生成すれば、**古い UI を破棄して fallback に戻す**ことができる。

```tsx
<Suspense key={query} fallback={<Skeleton />}>
  <SearchResults query={query} />
</Suspense>
```

「古い結果が見えているより、何も見えない方が誠実」というケース（検索条件が大きく変わったとき等）でこの opt-out を使う。

## 7. Streaming SSR との関係

Next.js では `<Suspense>` は Streaming SSR の単位でもある。同じ境界が次の 2 つの役割を兼ねる。

- サーバー: `<Suspense>` の外側を即時送信し、内側は完成次第追加送信する
- クライアント: トランジション時の「古い UI を保つ単位」になる

両方の役割を意識して境界を切る。Streaming SSR の判断軸（TTFB vs CLS）は [`./caching-and-rendering.md`](./caching-and-rendering.md) を参照する。

## 8. fallback と Layout Shift

- fallback の高さは可能な限り**固定する**。スケルトン UI でレイアウトを先に確保すれば CLS を抑えられる。
- 高さを固定できない要素は、Streaming SSR 化のメリット（TTFB 短縮）と Layout Shift のデメリットを天秤にかける。200ms 程度の遅延なら Streaming しない判断もある。

## 9. アンチパターン

- ❌ `useEffect` で fetch して `useState` でデータと `isLoading` を管理する
- ❌ ページ全体を 1 つの `<Suspense>` で包む
- ❌ ひとつの `useTransition` を複数の独立した状態更新で共用する
- ❌ `<input>` の `onChange` を `startTransition` で囲む
- ❌ React Compiler 前提なのに `useMemo` / `useCallback` を予防的に入れる

## 関連ルール

- 配置・命名: [`./directory-structure.md`](./directory-structure.md), [`./naming.md`](./naming.md)
- データフェッチ: [`./data-fetching.md`](./data-fetching.md)
- Server / Client 境界: [`./server-client-boundary.md`](./server-client-boundary.md)
- キャッシュとレンダリング: [`./caching-and-rendering.md`](./caching-and-rendering.md)
- エラー: [`./error-handling.md`](./error-handling.md)
