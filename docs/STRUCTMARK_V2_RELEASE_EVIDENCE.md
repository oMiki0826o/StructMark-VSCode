# StructMark 2.0.0-rc.1 — 實際驗證紀錄

記錄日期：2026-10-12。驗證對象：本次兩份來源候選包；此份報告**不是無錯證明，也不是正式 2.0.0 發行聲明**。

## 本地已成功執行

| 命令／檢查 | StructMark Core | StructMark VS Code |
| --- | --- | --- |
| `npm run check:v2` | 48 項 Node 回歸測試通過；800 個 seed 隨機案例、8 個惡意樣本及跨工作區路徑案例通過 | 同左，48 項通過 |
| `sm2 check examples/v2-introduction.sm examples/v2-complete.sm` | 通過 | 通過 |
| `sm2 workspace examples/workspace` | 3 份文件、0 項診斷 | 同左 |
| `npm pack --dry-run --json --ignore-scripts` | 通過；檢查 package 清單與 ES Module 匯出 | 通過；僅作套件內容檢查，非 VSIX |
| `cd apps/site && npm test` | 15 項網站 helper 測試通過 | 不適用（獨立 VS Code 倉庫不含網站） |
| `python3 benchmark/v2_compare.py` | 9 筆比較資料列、字元/UTF-8 位元組計數成功 | 同一比較工具與語料快照 |
| manifest、package-lock、JSON、GitHub workflow YAML | 版本一致、語法檢查通過 | 版本一致、語法檢查通過 |
| `src/v2` SHA-256 比對 | 與 VS Code 完全一致 | 與核心完全一致 |
| TypeScript `transpileModule` 語法解析 | v2 相關 TS/TSX 語法無診斷 | v2 相關 TS 語法無診斷 |

Node 22.16.0、TypeScript 5.8.3（全域命令）、Python 3.13.5。上述 TypeScript 靜態語法轉譯**不能代表**完整型別檢查、建置或 VS Code 實機驗證。

## 本地尚未通過的正式驗收

| 命令 | 本地結果與原因 |
| --- | --- |
| `npm run build`（core） | 失敗：找不到 `katex`、`yaml` npm 套件及宣告 |
| `cd apps/site && npm run build` | 失敗：`next: not found` |
| `npm run build --prefix packages/language-server` | 失敗：缺少 `@types/node`；LSP 依賴尚未安裝 |
| `npm run build --prefix packages/vscode` | 失敗：缺少 VS Code Language Client、型別宣告 |
| `npm run prepare:vscode` | 阻擋：找不到上述編譯輸出與 LSP 依賴；腳本正確拒絕不完整打包 |
| `npm ci`、真正 VSIX 打包/執行、完整站台 E2E | npm Registry DNS 無法解析；此環境沒有可用的 VS Code 執行驗收 |
| 真實 Markdown/@Doc/StructMark Tokenizer 比較 | `tiktoken` 未安裝；CSV Token 欄位明確輸出 `n/a`。人工語料尚未由 @Doc parser 驗證等價性 |

缺少 npm 依賴是環境阻擋，而非證實程式本身已能通過依賴齊全後的建置；需要在 CI 或開發者環境完成驗收，修復任何新出現的整合錯誤。

## 已實作的功能及仍有的限制

v2 Engine 已以 `src/v2/` 單一來源供 CLI 與工具程式使用，包含 Registry、Parser、AST、Formatter、安全 HTML、跨文件參照、最小 JSON Data Schema 與編輯器位置模型。校正過的回歸案例包括未宣告 Schema 欄位、跨檔引用、UTF-8、多種結束符號跳脫、巢狀區塊、末尾空白行、HTML 注入與 Schema 原型欄位。

核心倉庫的 v1.6 TypeScript API、CLI 與歷史文件仍予保留；v2 是獨立的 `src/v2/index.mjs` 與 `sm2` API，未將舊 v1.6 API 靜默替換。網站 Playground 在來源層新增 v2 模式及 AST 階層檢視，但網站完整建置與瀏覽器驗收待完成。VS Code LSP 原始碼使用 v2 Parser 與語義參照定位；VSIX 打包流程未通過依賴與實機驗收。

## 建議正式發行前於線上 CI 執行

```sh
npm ci
npm run check:v2
npm test
npm run docs:check
npm run fuzz
python3 benchmark/v2_compare.py --require-tokenizer
cd apps/site && npm ci && npm test && npm run build
cd ../..
npm ci --prefix packages/language-server
npm ci --prefix packages/vscode
npm run build --prefix packages/language-server
npm run build --prefix packages/vscode
npm run prepare:vscode
node scripts/validate-vscode-assets.mjs --packaged
```

再使用 VS Code 與 `@vscode/vsce` 實機打包/安裝 `.vsix`，檢查語言伺服器啟動、補全、診斷、跨檔 Definition/References 及失敗回復；在瀏覽器測試行內語法、HTML 安全、v2 AST Tree、手機排版。這些**均未在本次標記通過**。

## ZIP 檔驗證

兩份 ZIP 使用 `python3 scripts/package-v2.py /path/to/output.zip` 產生；封存腳本固定檔案順序與時間戳、排除快取及建置產物、檢查 CRC，並輸出 SHA-256。ZIP 的 CRC 與雜湊在封存後另於外部執行驗證；不在尚未執行前宣稱成功。
