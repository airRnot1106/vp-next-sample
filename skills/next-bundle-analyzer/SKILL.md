---
name: next-bundle-analyzer
description: >
  Analyze and quality-check this project's Next.js 16 (Turbopack) bundle sizes using
  `vp run analyze:output` (i.e. `next experimental-analyze --output`). Use when the
  user wants to: inspect bundle sizes, find large dependencies, detect duplicate
  modules, quality-check production builds, or get optimization recommendations.
  Triggers on requests like "analyze the bundle", "check bundle size", "find large
  packages", "bundle quality check", "バンドル分析", "バンドルサイズ確認",
  or when the user mentions `next experimental-analyze`.
---

# Next.js Bundle Analyzer (project-scoped)

Analyze Turbopack bundle output from `next experimental-analyze --output` for this repository.

## Workflow

### Step 1: Generate analyze output

Use the pre-defined scripts (see `package.json`):

```bash
vp run analyze:output
```

This runs `next experimental-analyze --output` and writes results to `.next/diagnostics/analyze/`.

> Note: Next.js 16 is a breaking-change release. If the command is missing or the output path changes, consult `node_modules/next/dist/docs/` before adjusting.

### Step 2: Run the analysis script

```bash
uv run .claude/skills/next-bundle-analyzer/scripts/analyze_bundle.py .next/diagnostics/analyze
```

The script has PEP 723 inline metadata (`requires-python = ">=3.11"`), so `uv` provisions its own interpreter automatically — no venv needed.

### Step 3: Interpret results

| Section                | What to look for                                             |
| ---------------------- | ------------------------------------------------------------ |
| **Total bundle size**  | Compressed size matters for network; raw size for parse time |
| **Top output files**   | Files >100KB (raw) are candidates for investigation          |
| **Top npm packages**   | User-land packages unexpectedly large (not `next`/`react`)   |
| **Duplicate packages** | Same package at multiple versions = wasted bytes             |
| **Recommendations**    | Auto-detected optimization opportunities                     |

The script is pnpm-aware and correctly attributes packages from `node_modules/.pnpm/<name>@<version>/`.

#### Output file markers (in "TOP OUTPUT FILES" listing)

- `[client-fs]` — shipped to the browser. **Focus optimization here.**
- `[output]` — server-only artifacts (SSR / RSC runtime).
- `[pkg]` — internal `next/dist/compiled/*`. A gzip size of `2 B` is a marker that the file is not a shipped compressed chunk; usually framework overhead, not actionable.

When the ">100KB candidate" rule from the table above triggers on `[pkg]` / `[output]` entries, it's almost always framework weight. Real wins come from trimming `[client-fs]` entries.

#### When "Recommendations" is empty

The script's auto-recommendations only fire on user-land packages crossing a size threshold. Empty = no _obviously_ large user-land package. This is **not** a signal that nothing can be optimized — cross-reference `package.json` and manually flag icon / UI / utility libraries (e.g. `lucide-react`, `@base-ui/react`) that may still benefit from `optimizePackageImports`.

### Step 4: Apply optimizations

Reference: `node_modules/next/dist/docs/01-app/02-guides/package-bundling.md` (read this before editing config to confirm API names for Next.js 16).

**Large packages with many named exports** → Add to `optimizePackageImports` in `next.config.ts`:

```ts
experimental: {
  optimizePackageImports: ['icon-library', 'utility-library'],
}
```

Candidates in this project are typically: `lucide-react`, `@base-ui/react`, or similar icon/utility-heavy packages.

**Heavy client-side libraries that could run server-side** → Move logic to a Server Component (e.g. markdown parsing, date formatting, syntax highlighting).

**Duplicate packages** → Run `pnpm dedupe`.

**Server-only packages leaking into client** → Add to `serverExternalPackages` in `next.config.ts`:

```ts
serverExternalPackages: ['package-name'],
```

## Comparing before/after

```bash
# Save current state
cp -r .next/diagnostics/analyze ./analyze-before

# Make changes, then re-analyze
vp run analyze:output

# Compare
uv run .claude/skills/next-bundle-analyzer/scripts/analyze_bundle.py ./analyze-before
uv run .claude/skills/next-bundle-analyzer/scripts/analyze_bundle.py .next/diagnostics/analyze
```

Key diff signals to compare:

- **Total compressed** increased → user-facing network cost went up.
- **Top npm packages** gained an unexpected entry → a refactor pulled a new heavy dep into the client bundle.
- **Duplicate packages** went from none to some → run `pnpm dedupe`.
- A new `[client-fs]` output file crossed 100KB → candidate for code-splitting or `optimizePackageImports`.

## Interactive mode (visual treemap)

For browser-based exploration (no `--output` flag):

```bash
vp run analyze
# Opens http://localhost:4000
```
