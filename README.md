# StructMark VS Code 2.0

> **2.0.0-rc.1 原始碼候選版**：本專案是獨立的 VS Code 擴充套件與 Language Server 原始碼。未完成 VSIX 建置與 VS Code 實機驗收，不能當作正式 2.0.0 發行套件。

[語言核心](https://github.com/oMiki0826o/StructMark) · [語法契約](docs/STRUCTMARK_V2_LANGUAGE_CONTRACT.md) · [驗證證據](docs/STRUCTMARK_V2_RELEASE_EVIDENCE.md) · [發行狀態](V2_RELEASE_STATUS.md)

## 功能與架構

VS Code 支援 `.sm` 文件辨識、語法醒目提示與常用 snippets。Language Server 原始碼使用 `src/v2/index.mjs` 提供診斷、指令補全、Hover、文件標題符號、文件內及跨檔的 Definition／References。參照定位來自語義節點，避免把 Raw 文字或標題 ID 宣告當作引用；區塊的 `[id=...]` 也可作為跳轉目標。

根目錄包含 v2 語言引擎及相容用的 v1.6 核心檔案，使本倉庫在取得 npm 套件後可以獨立建置 Language Server。語法引擎與核心倉庫使用同一份來源，但為了讓兩個 ZIP 都能獨立使用，分別保留一份快照；功能變更時應同步更新並執行兩邊相同測試。

## 開發環境與建置

需要 Node.js 22+、npm 套件來源及適當的 VS Code 執行環境。在專案根目錄：

```bash
npm ci
npm run check:v2
npm ci --prefix packages/language-server
npm ci --prefix packages/vscode
npm run build --prefix packages/language-server
npm run build --prefix packages/vscode
npm run prepare:vscode
node scripts/validate-vscode-assets.mjs --packaged
```

完成後於 `packages/vscode/` 執行 `npx @vscode/vsce package`，產生 VSIX；**VSIX 是否能成功安裝與啟動，仍需另外在 VS Code 內測試**。這份 ZIP 不會假裝已包含預先編譯過的 VSIX。

`prepare:vscode` 將編譯後的語言伺服器、v2 核心與伺服器 npm 執行依賴複製到 `packages/vscode/server/`。擴充套件預期從 `server/packages/language-server/dist/server.js` 啟動，因此應先執行準備程序再打包。

## 免安裝依賴的檢查

```bash
npm run check:v2
node bin/sm2.mjs check examples/v2-introduction.sm
node bin/sm2.mjs check examples/v2-complete.sm
node bin/sm2.mjs workspace examples/workspace
```

這些驗證只涵蓋可用原生 Node.js 執行的 v2 API 與靜態資產；不得取代 `npm test`、Language Server TypeScript 編譯、VSIX 打包、JSON-RPC 互動及實機驗收。`docs/STRUCTMARK_V2_RELEASE_EVIDENCE.md` 記錄實際測試結果與未執行項目。

## 專案目錄

| 位置 | 用途 |
| --- | --- |
| `src/v2/` | 共用 ESM v2 引擎及 TypeScript 宣告 |
| `packages/language-server/` | 語言伺服器原始碼 |
| `packages/vscode/` | VS Code 擴充套件、語法著色與程式碼片段 |
| `scripts/prepare-vscode.mjs` | 準備 VSIX 所需伺服器資產 |
| `experimental/v2/tests/` | v2 回歸與安全測試 |
| `.governance/` | AI Development Governance 規範快照 |

## 授權

MIT License。更多語言相關資料請參閱 [StructMark](https://github.com/oMiki0826o/StructMark)。

## English

StructMark VS Code is the source repository for `.sm` language support and a TypeScript Language Server using the shared `src/v2/` parser. This ZIP is version **2.0.0-rc.1**, a source release candidate rather than a built or tested VSIX. It contains grammar and snippet assets plus source code for diagnostics, completion, hover, document symbols, definitions and references. Install npm dependencies, build the server and extension, run `npm run prepare:vscode`, and package with `@vscode/vsce` in an online development environment. See the [verification report](docs/STRUCTMARK_V2_RELEASE_EVIDENCE.md) for test results and limitations. The original v1.6 language API is retained for compatibility. Licensed under MIT.
