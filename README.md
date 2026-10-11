# StructMark VS Code

[![Core CI](https://github.com/oMiki0826o/StructMark/actions/workflows/check.yml/badge.svg)](https://github.com/oMiki0826o/StructMark/actions/workflows/check.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> v1.6.0 development source. This repository is not yet a published VSIX.

StructMark 的獨立 VS Code 開發專案，提供 `.sm` 檔案的語法著色、Snippets、括號設定，以及基於 Language Server Protocol 的診斷、補全、Hover、文件符號、Definition 與 References。

本專案包含一份可建置的 StructMark language core 作為 Language Server 的來源依賴，但與官方核心倉庫 `oMiki0826o/StructMark` 分開維護。核心 AST 語法版本維持 `1.1`；套件發布版本為 `1.6.0`。

## 專案結構

```text
packages/
  language-server/   LSP server
  vscode/            VS Code extension manifest and client
src/                 StructMark core used by the server
tests/               core and integration regression tests
.governance/         AI Development Governance rules and gates
```

## 目錄

- [開發](#開發)
- [測試與建置](#測試與建置)
- [治理與驗證](#治理與驗證)
- [狀態邊界](#狀態邊界)
- [License](#license)

## 開發

需要 Node.js 22 或更新版本。

```bash
npm ci
npm test
npm run fuzz
npm run benchmark:perf

cd packages/language-server
npm ci
npm run build

cd ../vscode
npm ci
npm run build
```

目前 VS Code extension 與 Language Server 是可供接手開發的 v1.6.0 原始碼。正式 VSIX 發布前仍需完成真實 VS Code 啟動、LSP JSON-RPC 整合與跨平台打包驗證。

## 測試與建置

下列命令是此獨立倉庫目前可重現的驗證入口：

```bash
npm test
cd packages/language-server && npm run build
cd ../vscode && npm run build
```

`npm test` 會先建置核心，再執行核心與整合回歸測試。Language Server 與 extension 的建置則分別驗證 TypeScript 輸出。

## 治理與驗證

本專案依照 [AI Development Governance](https://github.com/oMiki0826o/AI-Development-Governance) 初始化雙語治理文件。規範、Gate、Workflow 與本地工作記錄位於 `.governance/` 與 `data/ai/`。

治理規範來源：[AI Development Governance](https://github.com/oMiki0826o/AI-Development-Governance)。

推送前至少執行：

```bash
npm test
cd packages/language-server && npm run build
cd ../vscode && npm run build
```

治理規範本身的單元測試，請在另行 clone 的治理倉庫中執行；本專案保存的是透過 bootstrap 匯入的 `.governance/` 規範快照，不把治理倉庫的測試套件混入產品原始碼。

## 狀態邊界

- `.sm` 語法與核心解析器已由核心回歸測試覆蓋。
- Language Server 已提供基本診斷、補全、Hover、Symbols、Definition 與 References API。
- 尚未宣稱完成 VSIX 正式發布、所有作業系統的 VS Code 實機驗證或完整 LSP 效能驗證。

## 授權

MIT License。核心與擴充功能的授權邊界以各自套件檔案為準。

## License

MIT License. See [LICENSE](LICENSE) for the full text.

## English

StructMark VS Code is an independent development repository for `.sm` language support. It contains syntax highlighting, snippets, language configuration, a Language Server, and the StructMark core source used by that server.

The project currently provides development source only. Diagnostics, completion, hover, document symbols, definition, and references are implemented as LSP capabilities, but a production VSIX still requires real VS Code startup, JSON-RPC, packaging, and cross-platform verification.

Follow the build commands above. The repository follows the bilingual AI Development Governance files under `.governance/` and uses the MIT license.
