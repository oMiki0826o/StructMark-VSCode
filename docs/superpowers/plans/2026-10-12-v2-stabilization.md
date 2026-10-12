# StructMark v2 Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans; complete checks task by task.

**Goal:** Two source ZIP packages with a shared v2 engine, CLI, editor integration, documentation and repeatable verification.

**Architecture:** ESM v2 engine is the source of truth; core and editor copy the same verified tree. Legacy 1.x parser stays available during migration.

**Tech Stack:** Node.js >=22, JavaScript ESM, TypeScript LSP/VS Code, Next.js site.

**Spec:** `docs/superpowers/specs/2026-10-12-v2-stabilization-design.md`

## Global Constraints
- No silent interpretation of invalid directives.
- Strict diagnostics, HTML escape and safe URL schemes.
- UTF-8/LF, Traditional Chinese documentation, no invented test results.

## Review Focus
- Raw block escapes and premature `&e` termination.
- Duplicate and missing references, including across nested blocks.
- Malformed table cells and hostile HTML attributes/URLs.
- Formatter semantic roundtrip with quoted values.
- Compiled LSP path and packaging output.

## Tasks
- [x] 1. Add v2 contract regression tests (failure before fix) and migrate engine to shared `src/v2/`.
- [x] 2. Implement deterministic diagnostics, safe inline grammar, typed tables/data, and normalization; run tests.
- [x] 3. Implement safe v2 HTML renderer, CLI and workspace validator; run integration tests.
- [x] 4. Integrate playground and LSP entry, fix editor packaging paths; validate available checks.
- [x] 5. Review documentation, governance and benchmarks; run release checks, create two reproducible ZIP files.

## 執行結果與未完成事項

已在 v2 ESM 執行回歸、模糊與 CLI 測試；兩份來源樹須在封存前再度執行驗收。第三方 npm 依賴無法於此容器取得，故完整 TypeScript / Next.js / VSIX 建置及真實 Tokenizer 比較仍待 CI 驗證；詳見發行證據。

### Release ruling

Source ZIP and local tests are deliverable; G5/G6/G7/G8 remain gated by external package installation, compiled VS Code/Next.js verification and genuine tokenizer evaluation. Do not relabel RC1 as stable.
