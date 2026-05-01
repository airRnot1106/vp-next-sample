# 命名ルール（明名 & BCD Design）

コンポーネントや関心の **命名** に関するルールである。配置・依存方向・ディレクトリ構成については [`./directory-structure.md`](./directory-structure.md) を参照する。

本ファイルは「どう名付けるか」、`directory-structure.md` は「どこに置くか」を扱う。両者は対であり、必ず合わせて読む。

## 1. 明名の思想

- 命名とは「決める」行為ではなく、要件と概念から名前を **明らかにする（明名する）** 行為である。
- コンポーネント名は、要件 → 概念 → 名前という **関数的な写像** を目指す。同じ要件からは同じ名前が導かれる状態が理想である。
- 主観や「短いほうが良い」といった最適化を**最優先しない**。スケーラビリティと一貫性を優先する。
- 名前に迷ったら「君は一体何なんだい？」と問い、世の中の単語が持つ本来の意味から逆算する。

## 2. 明名フロー

新しいコンポーネントに名前を付けるときは、以下の順で行う。

1. **日本語で丁寧に説明する。** 役割・対象・UI を含む完全な日本語の説明文を書く。これが最重要。
   - 例: 「企画チームが開催しているイベントに参加している放送者の一覧を表示するセクション」
2. **説明と表示要素を突き合わせる。** 説明文が UI の責務を過不足なく覆っているか確認する。
3. **`(何の or 何を) (どうする) (UI)` に分解する。** §4 の組み立て型に当てはめる。
   - 例: `企画イベント / 参加放送者 / リスト / セクション`
4. **語順を保ったまま英訳する。** DeepL や英辞郎などで語ごとに訳し、無理に短縮しない。
5. **英語名と日本語名を並べて読み返す。** どちらでも違和感がなければ採用する。違和感があれば英訳の単語選びを疑う。
   - 例: `PlanningEventParticipatingBroadcasterListSection` ⇄ `企画イベント参加放送者リストセクション`
   - "Planning" は「計画中」とも読める。本来意図が "公式" なら `OfficialEvent...` を選ぶ。

## 3. BCD Design の概念軸

本プロジェクトのコンポーネントは **Base / Case / Domain** の 3 層で分類する（Common は使わない）。

| 層         | 役割                                                           | 例                                                  |
| ---------- | -------------------------------------------------------------- | --------------------------------------------------- |
| **Base**   | UI の型・カタログ。文脈を持たない汎用 UI                       | `Button`, `Field`, `Dialog`, `Menu`                 |
| **Case**   | 状況（Case）に応じた具体化。動詞や用途で Base を絞り込んだもの | `SearchButton`, `ConfirmDialog`, `AddButton`        |
| **Domain** | サービス固有の関心を持つ UI                                    | `UserCard`, `SiteHeader`, `ProgramCommentPostPanel` |

### 3.1 概念軸 > 粒度軸

Base 内では atoms / molecules といった粒度で整理してよいが、**Base / Case / Domain の分類は粒度では決めない**。何の関心に属するかという概念で決める。

なお、atoms / molecules は **ディレクトリ構成上には現れない**。`src/components/atoms/` のような粒度ディレクトリは作らず、Base / Case / Domain の概念軸でのみディレクトリを切る（粒度は思考の補助線にとどめる）。

### 3.2 Base と Case の判別

動詞が **UI 表現そのものに作用する** なら Base、**関心や処理に作用する** なら Case。

- `ToggleButton`, `Pulldown`, `Dropdown` → Base（UI の挙動そのものを表す）
- `SearchButton`, `AddButton`, `EditButton` → Case（処理を表す）

### 3.3 修飾語処理

複合的な名前は、**修飾語を取り除いて本質を確かめてから修飾語を戻す**。

- `ServiceCommonHeader` = (`Service` を「共通」で修飾) + `Header` → 本質は `Header`（Domain）
- `PremiumMemberRegistrationForm` = (`Member` を「プレミアム」で修飾) + `RegistrationForm` → 本質は `RegistrationForm`

## 4. コンポーネント名の組み立て型

各構成要素は次の役割を持つ。

- `(何の)` `(何を)` = **Domain** 構成要素（ドメイン名・関係名詞）
- `(どうする)` = **Case** 構成要素（動詞: `Search`, `Add`, `Edit`, `Delete`, `Post` など）
- `(UI)` = **Base** 構成要素（末尾の UI 名）

| パターン | 構成                         | 層     | 例                                           |
| -------- | ---------------------------- | ------ | -------------------------------------------- |
| A        | `(UI)`                       | Base   | `Button`, `Dialog`                           |
| B        | `(どうする)(UI)`             | Case   | `SearchButton`, `ConfirmDialog`              |
| C        | `(何の)(UI)`                 | Domain | `SiteHeader`, `UserCard`                     |
| D        | `(何を)(どうする)(UI)`       | Domain | `UserDeleteButton`, `CommentPostForm`        |
| E        | `(何の)(何を)(どうする)(UI)` | Domain | `UserNameTextBox`, `ProgramCommentPostPanel` |

末尾は必ず UI 名で終える（§4.2 の規定リストを参照）。`(どうする)` は省略可能（D の `UserNameField` のような「Domain だけで完結する」形は E から `(どうする)` を抜いた形と読む）。

**D と E の境界**: ドメイン名を日本語で表したときに「**何の何**」のように **「の」が出るかどうか**で決まる。

- D: 単一ドメイン。「ユーザを削除する」「コメントを投稿する」 → 「の」が出ない
- E: 複合ドメイン。「ユーザ**の**名前」「番組**の**コメントを投稿する」 → 「の」が出る

### 4.1 層判定ルール

1. **Domain 構成要素を含む（パターン C / D / E）** なら **Domain**。`Name` `Title` `Email` のような関係名詞も Domain 構成要素として扱う。汎用的か固有かは判定に**関与しない**。
2. **Case 構成要素のみ（パターン B）** なら **Case**（例: `SearchButton`, `AddButton`）。
3. **Base 構成要素のみ（パターン A）** なら **Base**（例: `Button`, `Dialog`）。

Domain 構成要素を含む名前は必ず `features/<domain>/` 配下に置かれる。逆に `components/` 配下に置く Base / Case はドメイン名を含めてはならない（含めるならそれは `features/` 配下の Domain）。

複合ドメイン名（パターン E）は **独立した feature の存在を示唆する**。例えば `UserNameTextBox` は `user/` ドメイン配下ではなく、`user-name`（§6 前方一致の派生）という独立 feature の Domain として `features/user-name/components/` に置く（後方一致 variant が兄弟に存在しない場合。存在する場合は `_base/components/` に隔離する。詳細は [`./directory-structure.md`](./directory-structure.md)）。命名パターンは E のままで、**配置のみ** `user-name` feature 配下になる点に注意。

### 4.2 末尾 UI 名の規定リスト

末尾に置ける UI 名は以下に限る。これ以外を末尾に置きたい場合は §7.1 / §10 で要検討。

| 種別         | UI 名                                                         | 意味                           |
| ------------ | ------------------------------------------------------------- | ------------------------------ |
| 操作系       | `Button`                                                      | 押下で処理を起動する要素       |
| 入力系       | `Field`, `TextBox`, `Form`                                    | 入力を受け付ける要素・集合     |
| 情報系       | `Card`, `Label`, `Chip`, `Badge`                              | 情報を一塊／断片で表示する要素 |
| 構造系       | `Section`, `Panel`, `Header`, `Footer`, `Bar`, `List`, `Item` | 領域・並び・要素を表す構造     |
| 浮遊系       | `Dialog`, `Menu`, `Tooltip`, `Popover`                        | 重ねて表示する要素             |
| メッセージ系 | `Message`, `Banner`                                           | 通知・誘導の表示               |

`List` は **末尾の UI 名として使ってよい**（例: `UserList`）。`(どうする)` 枠で「並べる」を表したい場合は、UI 名を別途末尾に置く（例: `ArticleListSection` = `(何を=Article)(どうする=List)(UI=Section)`）。

`Label` / `Chip` / `Badge` の使い分け:

- `Label`: 短い属性的情報を貼り付けるラベル（例: `CategoryLabel`, `TagLabel`）
- `Chip`: タグや選択肢を表す小さな矩形要素（例: `TagChip`）
- `Badge`: 数値・状態を表す小さな印（例: `NotificationBadge`）

**末尾 UI 名の省略**: 通常は末尾の UI 名を必須とするが、Base のうち `Text` / `Number` / `Value` の 3 つは省略可能。これらはデータ型としての一般性が高く、それ自体が UI 名として機能するため、`UserNameText` を `UserName` と書いても許容される。`Text` / `Number` / `Value` 以外の Base（`Button`, `Form` など）は省略不可。

### 4.3 ドメイン名の前置規則

ドメイン名の前置は **コンポーネント名単独で意味が確定するか** で決まる。

- **前置する**: コンポーネント名がインポート文・Storybook タイトル・レビュー指摘などで配置先文脈なしに読まれる場面が想定されるとき。デフォルトはこちら。
- **省略する**: 当該ドメイン配下に閉じた小さな部品で、外部から参照されない、または対称性のための短縮が必要なとき。

`features/user/components/` 配下でも、`UserDeleteButton` のようにドメイン名を残すのが原則（後方一致 variant がある場合は `_base/components/`）。`DeleteButton` まで縮めると `features/article/components/delete-button` と `features/user/components/delete-button` が import 文上で区別できない（§9 アンチパターン「形式が似ているだけでまとめる」と同じリスク）。

## 5. 対称性とスケーラビリティ

複数のバリエーションが存在しうる関心は、**動詞を対称に揃える** ことで将来の拡張に備える。

- ❌ `CommentForm`（編集が増えた瞬間に破綻する）
- ✅ `CommentPostForm` / `CommentEditForm`

一語増えても、対称性とスケーラビリティが得られるなら積極的に長くする。

## 6. 後方一致 vs 前方一致

複合語の主語がどちらに寄るかで意味が変わる。命名時に意識する（配置への落とし方は `directory-structure.md`）。

- **後方一致**: 「部品 A を利用する B」。B が主語。
  - `TextBoxField` は `Field` の一種。`Field` が主語。
  - `PremiumUser` は `User` の一種。`User` が主語。
- **前方一致**: 「関心 A で利用する B」。A が主語。
  - `SearchTextBoxField` は `Search` の関心の中で使う `TextBoxField`。`Search` が主語。
  - `UserDetail` は `User` の **派生ドメイン** であって `User` のバリアントではない。

迷ったときは「これは何の一種か？」と問う。「○○ の一種」と言えるなら後方一致。

## 7. ブレやすい単語の扱い

抽象度が高く、単独では UI なのか関心なのか判別できない単語は、**必ず UI 名を付与する**。

- `Tag` → `TagChip`, `TagLabel`
- `Category` → `CategoryLabel`
- `Error` → `ErrorMessage`
- `Ad` → `AdBanner`, `AdPanel`
- `History` → `HistoryCard`, `HistoryArticle`
- `Information` → `InformationSection`, `InfoMessage`
- `Summary` → `SummarySection`

複数 Domain で似た関心が出るときは、**Domain 名を先頭に付けて衝突を避ける**。後から関係性が生じたときの修正コストより、初期コストのほうが安い。

- ✅ `ProgramTag` + `Chip` → `ProgramTagChip`
- ✅ `ArticleTag` + `Chip` → `ArticleTagChip`

### 7.1 紛らわしい UI 名の使い分け

- **Menu**: 選択肢が並んだもの。単体で意味を成す。
- **Panel**: 浮かせる／はめ込む領域。文脈に依存する。
- **Section**: ページ内の意味的なまとまり。
- **Card**: 一塊の情報を矩形にまとめたもの。

## 8. 隠れドメイン

明示的なエンティティ名でなくても、概念として存在するなら Domain として扱う。代表例が `site`。

- `SiteHeader`, `SiteFooter`, `SiteNavigationBar`
- 複数サイトを横断する場合は、より上位の汎用 UI へ昇格させることもある。

## 9. アンチパターン

以下は明名の失敗パターンである。コードレビュー時に検出する。

- **英語だけで考える。** 「日本語に戻すと違和感がある」名前は誤訳の疑い。
- **短さを最優先する。** 一語短いだけで意味を失うなら、長くしてよい。
- **形式が似ているだけでまとめる。** 関心が違うものを同じディレクトリに置くと「関心の千切り」が起きる。
- **UI 名を省略した抽象語を使う。** `Tag`, `Error`, `Summary` 単体は禁止。必ず UI 名を付ける。
- **`Common*` / `Util*` で逃げる。** 何の関心かを必ず明示する。

## 10. AI を活用した検証

明名の妥当性は、AI に第三者として答えさせると検証できる。

- 「このコンポーネント名から何を想像しますか？」と問い、想像が要件と一致するかを見る。
- 「単語 X は UI ですか？」と問い、Base 候補かどうかを判定する。

AI の回答は「世の中一般の解釈」の代理として扱う。AI の解釈と要件がズレるなら、名前の側を疑う。
