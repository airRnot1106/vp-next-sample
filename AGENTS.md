<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ built-in commands (`vp dev`, `vp build`, `vp test`, etc.) always run the Vite+ built-in tool, not any `package.json` script of the same name. To run a custom script that shares a name with a built-in command, use `vp run <script>`. For example, if you have a custom `dev` script that runs multiple services concurrently, run it with `vp run dev`, not `vp dev` (which always starts Vite's dev server).
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## CI Integration

For GitHub Actions, consider using [`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp) to replace separate `actions/setup-node`, package-manager setup, cache, and install steps with a single action.

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
- run: vp check
- run: vp test
```

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
<!--VITE PLUS END-->

## Project Scripts

Vite+ ブロック既出のコマンド（`vp dev` / `vp build` / `vp test` / `vp check` / `vp lint` / `vp fmt` 等）に加え、`package.json` の scripts として以下を `vp run <script>` で叩ける：

- `vp run analyze` / `vp run analyze:output` — Next.js バンドル分析（Turbopack）。`/next-bundle-analyzer` skill が起点とする
- `vp run lint:markup` — Markuplint による JSX/TSX/HTML マークアップチェック（`--fix` 対応）
- `vp run storybook` — Storybook dev サーバ（port 6006）
- `vp run build-storybook` — Storybook ビルド
- `vp run test:e2e` / `vp run test:e2e:ui` — Playwright E2E
- `vp run prepare` — `vp config && panda codegen`（依存導入後の自動実行）

### 単一テスト / in-source test の走らせ方

- 単一ファイル: `vp test <path/to/file>`（例: `vp test src/features/user/_base/models/user-id.ts`）
- 単一テスト名フィルタ: `vp test -- -t "<test name>"`
- in-source test（`if (import.meta.vitest)` ブロック）は `vp test` で通常テストと一緒に走る。`vite.config.ts` の `includeSource: ['src/**/*.{ts,tsx}']` で有効化済み

## Architecture

複数ファイルを読まないと掴めない big picture：

- **Next.js + React + React Compiler** — `babel-plugin-react-compiler` / `eslint-plugin-react-compiler` 導入済み。`useMemo` / `useCallback` を予防的に入れない
- **Cache Components**（PPR / Dynamic IO / `"use cache"`）前提。動的 I/O は必ず `<Suspense>` 内側に置く
- **Vite+ 統合 testing** — `vite.config.ts` 1 ファイルで複数プロジェクト構成（in-source `*.{ts,tsx}` ＋ `*.test.{ts,tsx}` ＋ Storybook addon-vitest）
- **MSW** — `mocks/handlers.ts` / `mocks/browser.ts` / `mocks/server.ts` で SSR / CSR 両対応。`src/lib/msw/` の Provider 経由で起動
- **Panda CSS** — `panda.config.ts` + `styled-system/`（自動生成）。生 CSS / Tailwind / styled-components / 文字列クラス直書きは禁止。`@/` エイリアス禁止、相対パスで import
- **ドメイン層** — valibot brand 型 + `@praha/byethrow` Result 型 + Discriminated Union + Companion Object パターン。throw 禁止、`as` 禁止、`interface` 禁止
- **UseCase / Repository 層は持たない**（フロントエンド前提）

## Where to look

詳細ルールは `.claude/rules/` に集約されている。本ファイルでは再掲せず、入口だけ示す：

- 配置・命名: [`./.claude/rules/directory-structure.md`](./.claude/rules/directory-structure.md) + [`./.claude/rules/naming.md`](./.claude/rules/naming.md)（BCD Design: Base / Case / Domain）
- 開発サイクル: [`./.claude/rules/development-cycle/feature.md`](./.claude/rules/development-cycle/feature.md)（機能 = ユーザーストーリー追加 8 ステップ、上位サイクル）/ [`./.claude/rules/development-cycle/component.md`](./.claude/rules/development-cycle/component.md)（コンポーネント追加 6 ステップ）/ [`./.claude/rules/development-cycle/domain-logic.md`](./.claude/rules/development-cycle/domain-logic.md)（ドメインロジック追加 5 ステップ）
- Server / Client 境界 + Composition: [`./.claude/rules/server-client-boundary.md`](./.claude/rules/server-client-boundary.md)
- データフェッチ: [`./.claude/rules/data-fetching.md`](./.claude/rules/data-fetching.md)（Server Components 集中、コロケーション、Request Memoization）
- Cache Components: [`./.claude/rules/caching-and-rendering.md`](./.claude/rules/caching-and-rendering.md)（`"use cache"` / `cacheLife` / `cacheTag` / `revalidateTag`）
- 非同期 UI: [`./.claude/rules/async-ui.md`](./.claude/rules/async-ui.md)（Suspense 境界、`startTransition` 単体が基本）
- エラー: [`./.claude/rules/error-handling.md`](./.claude/rules/error-handling.md)（Server Action は throw せず Result を戻す）
- スタイリング: [`./.claude/rules/styling.md`](./.claude/rules/styling.md)（Panda CSS、文字依存/非依存で単位を切る、container query 優先）
