#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""
Next.js Bundle Analyzer - Analyzes .next/diagnostics/analyze output

Usage:
    uv run analyze_bundle.py <analyze-dir>

Example:
    uv run analyze_bundle.py .next/diagnostics/analyze
    uv run analyze_bundle.py ./analyze-before-refactor
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path


def parse_data_file(path: Path) -> dict:
    """Parse a .data binary file (4-byte header + JSON)."""
    data = path.read_bytes()
    # Skip 4-byte header, decode JSON (raw_decode handles trailing binary data)
    content = data[4:].decode("utf-8", errors="replace")
    obj, _ = json.JSONDecoder().raw_decode(content)
    return obj


def fmt_size(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f} MB"
    if n >= 1_000:
        return f"{n / 1_000:.1f} KB"
    return f"{n} B"


def extract_package_name(filename: str) -> str | None:
    """Extract top-level npm package name from a module path."""
    # For pnpm: find the last node_modules/<pkg> segment (handles pnpm virtual store)
    # Pattern: node_modules/(@scope/name | name)
    matches = list(re.finditer(r"node_modules/(@[^/]+/[^/]+|[^/.][^/]*)", filename))
    if not matches:
        return None
    # Use the last match (innermost node_modules for pnpm paths)
    return matches[-1].group(1)


def extract_package_name_and_version(filename: str) -> tuple[str, str] | None:
    """Extract (package_name, version) from pnpm-style or standard node_modules path."""
    # pnpm: node_modules/.pnpm/<name>@<version>/node_modules/<name>/...
    m = re.search(r"node_modules/\.pnpm/([^/]+)@([^/]+)/", filename)
    if m:
        return m.group(1), m.group(2)
    # standard: node_modules/<name>/
    m = re.search(r"node_modules/(@[^/]+/[^/]+|[^/@][^/]*)/", filename)
    if m:
        return m.group(1), "unknown"
    return None


def analyze(analyze_dir: Path) -> None:
    data_dir = analyze_dir / "data"
    analyze_data_path = data_dir / "analyze.data"
    modules_data_path = data_dir / "modules.data"
    routes_json_path = data_dir / "routes.json"

    if not analyze_data_path.exists():
        print(f"ERROR: {analyze_data_path} not found.")
        print("Run `next experimental-analyze --output` first to generate the analysis.")
        sys.exit(1)

    print("Parsing bundle data...")
    analyze_data = parse_data_file(analyze_data_path)
    if modules_data_path.exists():
        parse_data_file(modules_data_path)

    routes = json.loads(routes_json_path.read_text()) if routes_json_path.exists() else []

    sources = analyze_data["sources"]
    chunk_parts = analyze_data["chunk_parts"]
    output_files = analyze_data["output_files"]

    # --- Total bundle size ---
    total_size = sum(cp["size"] for cp in chunk_parts)
    total_compressed = sum(cp["compressed_size"] for cp in chunk_parts)

    print()
    print("=" * 60)
    print("NEXT.JS BUNDLE ANALYSIS")
    print("=" * 60)
    print(f"Total bundle size   : {fmt_size(total_size)}")
    print(f"Total compressed    : {fmt_size(total_compressed)}")
    print(f"Routes              : {len(routes)}")
    print(f"Output files        : {len(output_files)}")
    print(f"Sources             : {len(sources)}")

    # --- Top output files by size ---
    file_sizes: dict[int, int] = defaultdict(int)
    file_compressed: dict[int, int] = defaultdict(int)
    for cp in chunk_parts:
        file_sizes[cp["output_file_index"]] += cp["size"]
        file_compressed[cp["output_file_index"]] += cp["compressed_size"]

    top_files = sorted(file_sizes.items(), key=lambda x: -x[1])[:15]

    print()
    print("-" * 60)
    print("TOP OUTPUT FILES BY SIZE")
    print("-" * 60)
    for idx, size in top_files:
        fname = output_files[idx]["filename"]
        compressed = file_compressed[idx]
        # Shorten long pnpm paths
        short = re.sub(r"\[project\]/node_modules/\.pnpm/[^/]+/node_modules/", "[pkg]/", fname)
        short = re.sub(r"\[project\]/", "", short)
        print(f"  {fmt_size(size):>10}  ({fmt_size(compressed)} gzip)  {short[-80:]}")

    # --- Top npm packages by size (aggregate via output_files) ---
    pkg_sizes: dict[str, int] = defaultdict(int)
    for idx, size in file_sizes.items():
        fname = output_files[idx]["filename"]
        if "node_modules" in fname:
            pkg = extract_package_name(fname)
            if pkg:
                pkg_sizes[pkg] += size

    top_pkgs = sorted(pkg_sizes.items(), key=lambda x: -x[1])[:20]

    print()
    print("-" * 60)
    print("TOP NPM PACKAGES BY BUNDLE SIZE")
    print("-" * 60)
    for pkg, size in top_pkgs:
        print(f"  {fmt_size(size):>10}  {pkg}")

    # --- Duplicate package detection (via output_files filenames) ---
    pkg_versions: dict[str, set[str]] = defaultdict(set)
    for of in output_files:
        result = extract_package_name_and_version(of["filename"])
        if result:
            name, version = result
            if version != "unknown":
                pkg_versions[name].add(version)

    duplicates = {k: v for k, v in pkg_versions.items() if len(v) > 1}

    print()
    print("-" * 60)
    print("DUPLICATE PACKAGES (multiple versions in bundle)")
    print("-" * 60)
    if duplicates:
        for pkg, versions in sorted(duplicates.items()):
            print(f"  {pkg}: {', '.join(sorted(versions))}")
    else:
        print("  No duplicate packages detected.")

    # --- Optimization recommendations ---
    print()
    print("-" * 60)
    print("OPTIMIZATION RECOMMENDATIONS")
    print("-" * 60)

    # 1. Large packages that may benefit from optimizePackageImports
    icon_or_utility_threshold = 50_000
    large_util_pkgs = [
        pkg for pkg, size in top_pkgs
        if size > icon_or_utility_threshold and not pkg.startswith("next") and not pkg.startswith("react")
    ]
    if large_util_pkgs:
        print()
        print("1. Consider adding to `optimizePackageImports` in next.config:")
        print("   (improves tree-shaking for packages with many named exports)")
        for pkg in large_util_pkgs[:5]:
            size = pkg_sizes[pkg]
            print(f"     - {pkg}  ({fmt_size(size)})")
        print()
        print("   Example next.config.ts:")
        print("     experimental: {")
        print(f"       optimizePackageImports: {json.dumps(large_util_pkgs[:5])},")
        print("     }")

    # 2. Duplicate package warning
    if duplicates:
        print()
        print("2. Duplicate packages detected — consider deduplicating:")
        print("   Run your package manager's dedupe command, e.g.:")
        print("     npm dedupe  /  pnpm dedupe  /  yarn dedupe")
        for pkg, versions in list(duplicates.items())[:5]:
            print(f"     - {pkg}: {', '.join(sorted(versions))}")

    # 3. Client bundle large server-friendly packages
    client_files_size: dict[str, int] = defaultdict(int)
    for idx, size in file_sizes.items():
        fname = output_files[idx]["filename"]
        if ("[client-fs]" in fname or "static/chunks" in fname) and "node_modules" in fname:
            result = extract_package_name_and_version(fname)
            if result:
                client_files_size[result[0]] += size

    server_friendly = ["date-fns", "lodash", "moment", "dayjs", "zod", "marked", "prism", "shiki", "highlight.js"]
    found_server_friendly = [
        (pkg, client_files_size[pkg]) for pkg in server_friendly
        if client_files_size.get(pkg, 0) > 10_000
    ]
    if found_server_friendly:
        print()
        print("3. These packages are in the CLIENT bundle but may run server-side:")
        print("   Consider moving logic to Server Components:")
        for pkg, size in found_server_friendly:
            print(f"     - {pkg}  ({fmt_size(size)} in client bundle)")

    print()
    print("=" * 60)
    print("For interactive visualization, run without --output:")
    print("  npx next experimental-analyze")
    print("  (or: pnpm / yarn / bunx)")
    print("=" * 60)


def main():
    if len(sys.argv) < 2:
        print("Usage: uv run analyze_bundle.py <analyze-dir>")
        print("Example: uv run analyze_bundle.py .next/diagnostics/analyze")
        sys.exit(1)

    analyze_dir = Path(sys.argv[1])
    if not analyze_dir.exists():
        print(f"ERROR: Directory not found: {analyze_dir}")
        print("Run `next experimental-analyze --output` first.")
        sys.exit(1)

    analyze(analyze_dir)


if __name__ == "__main__":
    main()
