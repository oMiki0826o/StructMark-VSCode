# Changelog

## 2.0.0-rc.1 — Source candidate (2026-10-12)

- Shared `src/v2/` ESM parser, semantic AST, directive registry, typed table and minimal data Schema.
- Safe v2 HTML rendering, canonical formatter, workspace references, CLI and regression/fuzz tests.
- Editor location metadata for directive IDs, VS Code language client/server source, packaging preparation, static grammar/snippet verification.
- Bilingual v2 documentation examples and Playground version selector where included.
- Release evidence distinguishes locally verified tests from unavailable third-party dependency builds.
- This is a pre-release; v1.6 API is preserved separately.

## Earlier releases — historical record

# Changelog

## 1.6.0 — development snapshot

- 建立獨立的 StructMark VS Code extension 專案。
- 納入 Language Server、語法著色、snippets 與 `.sm` 語言設定。
- 納入 StructMark core 作為 Language Server 的來源依賴。
- 通過核心回歸測試與 TypeScript 建置驗證。
- 尚未宣稱完成 VSIX 正式發布、VS Code 實機啟動或跨平台驗證。
