# StructMark v1.6.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付獨立 LSP、VS Code 擴充套件、治理文件及兩個可驗證 ZIP。

**Architecture:** `src/` 保留唯一 Parser；`packages/language-server/` 提供獨立 stdio LSP；`packages/vscode/` 提供 VS Code Client。現有 Core、CLI、網站保持相容。

**Tech Stack:** TypeScript、Node.js >=22、vscode-languageserver、vscode-languageclient、Node test runner、Next.js。

**Spec:** `docs/superpowers/specs/2026-10-11-v160-lsp-design.md`

## Global Constraints

- 全部版本統一為 1.6.0；Node.js >=22。
- Core 不依賴 VS Code；不重寫 Parser。
- 不執行文件內容；只允許工作區內 `.sm` 檔案。
- 人類閱讀的 Docs 與 Agent 規範分開；依治理專案 Rule、Workflow、Gate、Template、Docs 分工逐項核對。
- 不把替身測試當成正式相依套件測試；ZIP 排除 node_modules、秘密及暫存資料。

## Review Focus

1. 非 BMP 字元前後的 UTF-16 位置準確（Task 2）。
2. 連續 didChange 的舊診斷不得覆蓋新版（Task 3）。
3. `../`、編碼 URI、符號連結不可越界（Task 5）。
4. 重複 ID、缺失目標、本地參照安全退回空結果（Task 5）。
5. VS Code 找不到 server 時能安全失敗（Task 6）。

---

### Task 1: Core 回歸修復
**Files:** `tests/v16-core-regression.test.mjs`（新增）、`src/workspace-index.ts`、`src/semantic.ts`（必要時修改）。
**Interfaces:** 保持 `buildWorkspaceIndex(documents)` 與 `validateWorkspace(...)` 公開簽章。
- [ ] 寫本地參照、重複 ID、Unicode NFC、非法路徑測試。
- [ ] 執行 `npm ci && npm test` 確認失敗案例。
- [ ] 最小幅度修正可重現問題。
- [ ] 執行 `npm test && npm run fuzz && npm run docs:check`。
- [ ] Commit `fix(core): stabilize workspace references`。

### Task 2: 文件同步與 UTF-16
**Files:** `packages/language-server/{package.json,tsconfig.json}`、`packages/language-server/src/{documents,positions}.ts`、`packages/language-server/tests/documents.test.mjs`。
**Interfaces:** `positionToOffset(text, position): number`、`offsetToPosition(text, offset): Position`、`DocumentStore.open/change/close/get`。
- [ ] 寫 emoji、CRLF、空文件、版本倒退測試。
- [ ] 執行文件測試，確認失敗。
- [ ] 實作文件儲存及 UTF-16 位置轉換。
- [ ] 建置並重跑測試。
- [ ] Commit `feat(lsp): track text documents`。

### Task 3: JSON-RPC 與 Diagnostics
**Files:** `packages/language-server/src/{server,diagnostics}.ts`、`packages/language-server/tests/protocol.test.mjs`。
**Interfaces:** `startLanguageServer()`；`collectDiagnostics(uri,text): Diagnostic[]`。
- [ ] 寫 initialize、open/change/close、舊版競態與清除診斷測試。
- [ ] 執行 protocol 測試確認失敗。
- [ ] 以 `vscode-languageserver/node` 實作 stdio server，設定診斷上限。
- [ ] 重跑測試並確認 stdout 無非協定日誌。
- [ ] Commit `feat(lsp): implement diagnostics`。

### Task 4: Completion、Hover、Symbols
**Files:** `packages/language-server/src/features.ts`、`packages/language-server/tests/features.test.mjs`、`packages/language-server/src/server.ts`。
**Interfaces:** `completeAt(document,position)`、`hoverAt(document,position)`、`symbolsFor(document)`。
- [ ] 寫合法指令上下文、未知語法、標題階層與來源範圍測試。
- [ ] 執行測試確認失敗。
- [ ] 重用 Registry 與 AST 實作三個 handlers。
- [ ] 執行功能及協定測試。
- [ ] Commit `feat(lsp): add editing assistance`。

### Task 5: Definition 與 References
**Files:** `packages/language-server/src/{navigation,workspace}.ts`、`packages/language-server/tests/navigation.test.mjs`、`packages/language-server/src/server.ts`。
**Interfaces:** `findDefinition(uri,position,workspaceRoot): Location[]`、`findReferences(uri,position,workspaceRoot): Location[]`。
- [ ] 寫同文件與跨文件、重複 ID、缺失目標、URI 編碼、symlink 越界測試。
- [ ] 執行測試確認失敗。
- [ ] 重用 Workspace Index，實作安全路徑與版本快取。
- [ ] 執行導航及全套 LSP 測試。
- [ ] Commit `feat(lsp): add safe navigation`。

### Task 6: VS Code Extension
**Files:** `packages/vscode/{package.json,tsconfig.json,language-configuration.json}`、`packages/vscode/src/extension.ts`、`packages/vscode/syntaxes/structmark.tmLanguage.json`、`packages/vscode/snippets/structmark.json`、`packages/vscode/tests/extension.test.mjs`。
**Interfaces:** `activate(context: vscode.ExtensionContext)`、`deactivate()`；client 啟動 bundled server。
- [ ] 寫 manifest、server 路徑及異常退出測試。
- [ ] 執行測試確認失敗。
- [ ] 實作 client、語法著色、括號、snippets。
- [ ] 建置並測試 server 缺失情境。
- [ ] Commit `feat(vscode): add StructMark extension`。

### Task 7: 治理與雙語文件
**Files:** `AGENTS.md`、`README.md`、`CONTRIBUTING.md`、`CHANGELOG.md`、`VALIDATION.md`、`docs/`、`apps/site/content/`、`.github/workflows/check.yml`。
**Interfaces:** `npm run docs:check` 仍驗證既有雙語文件。
- [ ] 核對治理倉庫實際 Rule / Workflow / Gate，建立對照。
- [ ] 撰寫自然語氣的 LSP 與 VS Code 安裝及疑難排解文件。
- [ ] 更新 CI 加入 LSP、Extension、封裝檢查。
- [ ] 執行文件及 CI 對應命令。
- [ ] Commit `docs: align governance and editor docs`。

### Task 8: 版本、驗證與兩個 ZIP
**Files:** `scripts/package-v16.mjs`、`VALIDATION.md`、`package.json`、`apps/site/package.json`、`packages/*/package.json`。
**Interfaces:** `StructMark-v1.6.0-Full-Source.zip`、`StructMark-VSCode-v1.6.0.zip`、SHA-256。
- [ ] 寫版本一致、必要檔案、無 node_modules/秘密的打包測試。
- [ ] 執行測試確認失敗。
- [ ] 實作可重現打包；第二包包含獨立建置需要的 Core/LSP。
- [ ] 真實 `npm ci`、Core/LSP/Extension 測試、Next.js 建置、ZIP CRC 與 SHA-256 驗證；未執行項目如實記錄。
- [ ] Commit `chore(release): package v1.6.0`。

## Execution

依序 TDD、測試、提交；最後逐項對照設計規格。正式發布前不得將未驗證項目標為完成。
