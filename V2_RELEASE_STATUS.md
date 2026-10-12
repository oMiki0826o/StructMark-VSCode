# StructMark 2.0.0-rc.1 開發狀態

本 ZIP 是有測試的**候選來源版本**，不是正式 `2.0.0` 發行版，更不代表已排除所有 Bug。

## 已整合

語言核心集中在 `src/v2/`，CLI、Playground v2 模式和 LSP 原始碼均使用這套 API。支援區塊與行內語法、型別化表格、JSON 資料 Schema 子集、參照驗證、安全 HTML、格式化及診斷；VS Code 專案有 snippets、著色規則、LSP 引用來源及打包準備腳本。

## 本地可執行的檢查

- `npm run check:v2`：Node 回歸測試、800 個 seeded 隨機輸入、惡意 HTML 與路徑案例、編輯器靜態資產檢查。
- `node bin/sm2.mjs workspace examples/workspace`：跨檔案參照檢查。
- `node bin/sm2.mjs check examples/v2-complete.sm`：v2 文件驗證。
- `cd apps/site && npm test`：既有網站 helper 測試（僅包含完整網站的本地可測部分）。
- `python3 benchmark/v2_compare.py`：字元/位元組及 Token 計數資料表；沒有 tokenizer 時 Token 欄位為 `n/a`。

實際執行結果、測試數量與阻塞因素請見 [驗證證據](docs/STRUCTMARK_V2_RELEASE_EVIDENCE.md)。

## 尚未通過正式發布檢查點

Node/npm 第三方依賴安裝、舊版 TypeScript 完整建置與測試、Next.js 完整建置與瀏覽器 E2E、LSP/VSIX 真實建置與實機運作、完整治理發行檢查、等價語料 tokenizer 比較，尚未在此環境驗收。不能將純 TS 語法轉譯或檔案結構檢查等同完整建置或執行驗收。

若要發布正式版，請先完成 [八項發行檢查點](docs/STRUCTMARK_V2_RELEASE_GATES.md)，尤其應在乾淨 CI/VS Code 中執行建置與端對端測試。
