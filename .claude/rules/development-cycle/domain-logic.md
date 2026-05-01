# ドメインロジック追加サイクル

新しいドメインロジックを追加するときの作業順序を定める。本ルールは「**何をどこに置くか**」（[`../directory-structure.md`](../directory-structure.md)）「**どう名付けるか**」（[`../naming.md`](../naming.md)）「**どう失敗を表すか**」（[`../error-handling.md`](../error-handling.md)）といった既存の静的規約を、**どの順序で適用するか**を示す動的な作業フローを定義する。

**射程**: `src/features/<domain>/**/models/` 配下に置かれる純粋なドメイン層に限定する。後方一致 variant が兄弟に存在するときの `_base/models/`、バリアントドメイン（例: `premium-user/models/`）、派生ドメイン側 feature の `models/`（例: `user-detail/models/`）配下のいずれも含む。Server Action や fetcher、UI 連携は本サイクルの対象外であり、別の開発サイクルルールで扱う。

なお、本プロジェクトはフロントエンドであり **UseCase 層・Repository 層は持たない**。`/functional-ts` スキルが触れる UseCase / Repository に関する記述は本プロジェクトでは適用範囲外として扱う。

## 1. 思想

- ドメインロジックは「どこに置くか」「どう名付けるか」を**決めてから書き始める**。書き始めてからリネームする運用は、参照側の修正コストが膨らみ続けるため取らない。
- 実装は **t-wada 流の TDD**（Red → Green → Refactor）で進める。「先に振る舞いを決め、最小実装で通し、一般化する」順序を守る。
- 全体的な型設計・関数設計の思想は [skill: `functional-ts`] に従う。本ルールはそれを「いつ適用するか」のタイムラインを示すに留める。
- 実装後は [skill: `functional-ts-review`] で**自己レビュー**を必ず行う。

## 2. サイクルの全体像

ドメインロジック 1 単位の追加は、次の 5 ステップで進める。

1. **明名と配置決定** — §3
2. **ValueObject / Entity の型設計** — §4
3. **t-wada 流 TDD で振る舞いを実装** — §5
4. **functional-ts の原則で整える（Refactor）** — §6
5. **functional-ts-review で自己レビュー** — §7

各ステップを完了せずに次へ進まない。手戻りが生じた場合は該当ステップに戻ってから再度進む。

## 3. Step 1: 明名と配置決定

実装を 1 行も書く前に、配置先のディレクトリパスを確定させる。

- [`../naming.md`](../naming.md) の**明名フロー**を必ず先に通す。「日本語で丁寧に説明する → 概念に分解する → 語順を保って英訳する → 英語名と日本語名を並べて読み返す」の手順を飛ばさない。
- 名前から features ディレクトリを決める。後方一致 / 前方一致 / 隠れドメインの判定軸は [`../naming.md`](../naming.md) §6・§8 と [`../directory-structure.md`](../directory-structure.md) を参照する。
- 配置先は次のとおり、すべて `models/` ディレクトリに**ファイル直置き**する。`_base/` の有無は [`../directory-structure.md`](../directory-structure.md) の規定（後方一致 variant が兄弟に存在するときに限り `_base/` を設ける）に従う。
  - 修飾子のないドメイン本体（後方一致 variant が**兄弟に存在する**）→ `src/features/<domain>/_base/models/`
  - 修飾子のないドメイン本体（後方一致 variant が**無い**）→ `src/features/<domain>/models/`
  - バリアントドメイン（後方一致）→ `src/features/<domain>/<variant>/models/`（例: `premium-user/models/`）
  - 派生ドメイン（前方一致）→ 独立 feature の `models/`（例: `user-detail/models/`）。派生 feature 側に後方一致 variant が存在する場合は `user-detail/_base/models/` に隔離する
- ディレクトリが存在しない場合のみ新規作成する。既存ドメインに後付けする場合は、既存ファイルの粒度・命名と揃えてから新ファイルを置く。
- **1 ファイル 1 概念**: Entity と Entity が依存する ValueObject はそれぞれ独立した概念として、同じ `models/` ディレクトリに**別ファイル**で置く。例: `order.ts`（Entity）/ `order-id.ts` / `order-item.ts`（依存 ValueObject）。同一ファイルに同居させない。
- **サイクルの射程**: Entity 追加が起点のサイクルでは、依存する ValueObject の新規追加も**同一サイクルの一部**として進める（明名・配置・型設計・TDD を Entity と並行して行う）。Entity ファイルだけを単独で完成させない。
- ドメイン層の外で再利用するユーティリティ（`Sensitive` ラッパー、schema → Result 変換ヘルパー等）は **`models/` 配下に置かない**。`src/utils/` に切り出す（[`../directory-structure.md`](../directory-structure.md) の `src/utils/` 規定）。

## 4. Step 2: ValueObject / Entity の型設計

最初に**型だけ**を組み、振る舞いは Step 3 で TDD により与える。

- **ValueObject** は **valibot の brand 型**で表現する。詳細は [skill: `functional-ts`] の `validation-libraries/valibot.md` を参照する。
- **Entity** は **Discriminated Union + Companion Object** で表現する。`type`（`interface` ではない）、`Readonly<>`、関数プロパティ表記、1 ファイル 1 概念を守る。詳細は [skill: `functional-ts`] の `domain-modeling.md`。
- 状態を持つ Entity の状態遷移は**遷移関数**で表現する。詳細は `state-modeling.md`。
- ドメイン層で例外を `throw` しない。失敗は **Result 型**で表現する。Result 型 API は [skill: `byethrow`] を参照する。

```ts
// 例: ValueObject (valibot brand)
import * as v from 'valibot';

const UserNameSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(50), v.brand('UserName'));
export type UserName = v.InferOutput<typeof UserNameSchema>;
```

コード例は形を示すための最小例である。実際の型構築は [skill: `functional-ts`] のガイドに従う。

## 5. Step 3: t-wada 流 TDD で振る舞いを実装

**in-source test**（`if (import.meta.vitest)` ブロック）で進める。`models/` 配下に `.test.ts` / `.spec.ts` を作らない（[`../directory-structure.md`](../directory-structure.md) の規定）。

### 5.1 Red: 失敗するテストを先に書く

- 最初は最小の例から書く。「正常系の最も単純なケース 1 つ」で始める。
- AAA パターン（Arrange / Act / Assert）を可視化する。詳細は [skill: `javascript-testing-expert`]。
- `describe` は対象関数名、`it` は `should ...` で始める命名に揃える。

### 5.2 Green: 仮実装で通す

- ハードコードでもよいので最速でテストを通す（**仮実装**）。
- 1 ケースでは一般化に飛び付かない。**三角測量**のため 2 ケース目を追加し、ハードコードでは通らなくなった瞬間に初めて実装を一般化する。

### 5.3 Refactor: 一般化と整理

- テストが green の状態を保ったまま、実装を [skill: `functional-ts`] の原則（`type` / Discriminated Union / `Readonly<>` / 関数プロパティ表記 / Companion Object）に揃える。
- 振る舞いを変える変更は Refactor フェーズに混ぜない。Refactor 中に新しい振る舞いが必要だと気付いたら、Step 5.1 の Red に戻る。

### 5.4 Property-Based Testing で性質を固める

ドメインエンティティ・ドメインロジックは、例示テストだけでなく **fast-check による Property-Based Testing**（PBT）で性質を検証する。詳細は [skill: `javascript-testing-expert`]。

- 「ラウンドトリップ」「冪等性」「順序非依存」「境界値での破綻」など、**仕様が満たすべき性質**を `fc.property` で記述する。
- in-source test ブロック内から fast-check を呼び出す。

```ts
if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const fc = await import('fast-check');

  describe('UserName', () => {
    it('should reject empty string', () => {
      // 例示テスト
    });

    it('should accept any string within length bounds', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), (s) => {
          // 性質テスト
        }),
      );
    });
  });
}
```

## 6. Step 4: functional-ts の原則で整える

実装が一通り動いた段階で、[skill: `functional-ts`] の各章を順に適用する。

- Domain Modeling — 型・Discriminated Union・Companion Object
- State Transitions — 遷移関数と `assertNever`
- Error Handling — Result 型と Railway Oriented Programming
- Boundary Defense — 外部入力の schema 検証、`as` 禁止
- Declarative Style — `filter` / `map` / `reduce` と Companion Object 述語の合成
- Test Data — `as const satisfies Type` で判別子リテラルを潰さない

各章の適用後にテストを再走させ、green を維持する。

## 7. Step 5: functional-ts-review で自己レビュー

実装が落ち着いた段階で、[skill: `functional-ts-review`] のチェックリストを上から順に当てる。代表的な観点：

- ドメインモデルに `class` を使っていないか
- 型定義内で関数を**メソッド表記**していないか（関数プロパティ表記であるべき）
- ドメイン型を `interface` で定義していないか（`type` であるべき）
- `as` で型アサーションしていないか
- ドメイン層で例外を `throw` していないか（Result 型であるべき）
- Discriminated Union を扱う `switch` に `assertNever` の `default` があるか
- 外部境界で schema 検証しているか
- PII フィールドに `Sensitive` ラッパーが付いているか

違反があれば該当する Step に戻ってサイクルを再開する。違反のない指摘（改善提案）は次回以降の判断材料として控える。

## 8. サイクルの停止条件

次のすべてが満たされた時点でサイクルを終える。

- in-source test がすべて green
- `/functional-ts-review` のチェックリストにヒットなし
- `vp check`（lint + format + 型）が通る
- `vp test`（in-source test 含む）が通る

`vp` コマンドの詳細は `AGENTS.md` を参照する。

## 9. アンチパターン

- ❌ 明名フローを飛ばし、思いつきの英訳でディレクトリを切る
- ❌ 実装してからテストを後付けで書く（Red → Green → Refactor の順序を崩す）
- ❌ 1 ケース目で一般化に飛び付き、三角測量を省く
- ❌ Refactor フェーズに新しい振る舞いの追加を混ぜる
- ❌ `models/` 配下に `.test.ts` / `.spec.ts` を作る（in-source test の規定違反）
- ❌ ValueObject を素の `string` / `number` で扱う（Brand 化を後回しにする）
- ❌ ドメイン層で例外を `throw` する（Result 型を使う）
- ❌ レビューを「気が向いたとき」に行う（Step 5 として組み込む）

## 関連ルール

- 配置: [`../directory-structure.md`](../directory-structure.md)
- 命名: [`../naming.md`](../naming.md)
- エラー: [`../error-handling.md`](../error-handling.md)

## 関連スキル

- [skill: `functional-ts`] — 関数型ドメインモデリングの全体思想
- [skill: `functional-ts-review`] — Step 5 の自己レビュー
- [skill: `javascript-testing-expert`] — Step 3 の TDD・PBT 詳細
- [skill: `byethrow`] — Result 型 API の詳細
