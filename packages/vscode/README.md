# StructMark VS Code — 2.0 RC1

本目錄包含 `.sm` 語法著色、常用語法片段，以及使用 `src/v2/` **同一套語言引擎**的 LSP 原始碼。VS Code 與 Language Server 的程式碼分開編譯；此原始碼包**不是已驗收的 VSIX**。

## 開發與安裝

在整個專案的根目錄執行（需能存取 npm 套件來源）：

```bash
npm ci
npm ci --prefix packages/language-server
npm ci --prefix packages/vscode
npm run build --prefix packages/language-server
npm run build --prefix packages/vscode
npm run prepare:vscode
node scripts/validate-vscode-assets.mjs --packaged
```

編譯後的 Server 位於 `packages/vscode/server/packages/language-server/dist/server.js`。打包腳本會複製 v2 核心與 Server 執行依賴；Extension 從此固定路徑啟動 Server，不依賴開發倉庫的相對工作目錄。

若要建立 VSIX，需額外安裝 `@vscode/vsce`：

```bash
cd packages/vscode
npx @vscode/vsce package
```

正式發布前需要確認 VSIX 內包含 `dist/extension.js`、`server/`、`syntaxes/`、`snippets/`，並在 VS Code 實機驗證開啟 `.sm`、診斷、補全、Hover、符號、Definition、References 與啟動/停止。

## 語法功能

- 指令 `&name`、`&short`、`&e`、`&end` 的醒目提示和補全。
- `.sm` 標題與可導航的文件 ID／跨檔案參照。
- 基礎安全診斷與文件符號。
- 插入標題、警告、備註、型別表格、方程式及程式碼的 Snippets。

## 尚未完成的驗證

在此開發環境未能安裝 npm LSP 依賴，因此 **TS Server 編譯、VSIX 安裝與 VS Code 內實際互動**仍待具備依賴與編輯器的環境驗收；目前只能將程式碼、資產驗證與 ESM 引擎測試列為已執行項目。
