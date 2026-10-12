# StructMark v2.0.0-rc.1 驗收紀錄

日期：2026-10-12

這份紀錄只記錄本次實際執行過的結果；沒有把靜態檔案檢查當成執行環境驗收。

## 已通過

| 驗收項目 | 指令／結果 |
| --- | --- |
| 全專案 TypeScript | 根專案 `npm run build` 通過；language-server 與 VS Code extension 各自 `npm run build` 通過 |
| 核心回歸 | `npm test`：185/185 通過 |
| v2 核心 | `npm run test:v2`：48/48 通過 |
| 模糊與安全性 | v1 fuzz 500 筆通過；v2 fuzz 800 筆、8 hostile samples、1 workspace traversal 通過 |
| 文件檢查 | 30 個 `.sm` 文件，0 errors、0 warnings |
| Next.js 正式建置 | Next.js production build、38 個靜態頁面、export route 檢查通過 |
| 網站測試 | site test 15/15 通過 |
| VS Code 靜態資產 | `validate-vscode-assets` 通過 |
| VSIX 封裝 | `structmark-vscode-2.0.0-rc.1.vsix` 成功產生，468 files、5.09 MB |

## 真實 tokenizer 比較

使用 `tiktoken` 的 `cl100k_base` 與 `o200k_base`，語料位於 `benchmark/v2_corpus.json`，結果位於 `benchmark/v2_results.csv`。

| 格式 | cl100k_base 總 Token | o200k_base 總 Token |
| --- | ---: | ---: |
| Markdown | 73 | 56 |
| @Doc | 83 | 64 |
| StructMark | 60 | 44 |

在這 3 組人工對照語料中，StructMark 相對 Markdown 分別少 17.8% 與 21.4%；相對 @Doc 分別少 27.7% 與 31.3%。這是該語料的實測結果，不是所有文件的保證。

目前仍不能稱為「解析器驗證過的等價語料」：倉庫沒有可執行的 @Doc parser，因此 `benchmark/v2_compare.py` 仍明確標示人工語義對照限制。要把這項升格為正式效率驗收，需加入可執行的 @Doc parser 或固定 AST fixture，先驗證三種輸入語義相同，再將語料擴充後重跑。

## 尚未能在本機完成

本機沒有 `code` 或 `code-insiders` 執行檔，因此無法在此環境完成 VSIX 安裝後的 VS Code extension host 實機啟動測試。VSIX 已成功封裝，portable language server 也已內嵌；實機安裝驗收仍需在裝有 VS Code 的 CI runner 或開發機執行：

```sh
code --install-extension structmark-vscode-2.0.0-rc.1.vsix --force
code --list-extensions --show-versions
```

網站瀏覽器 E2E 腳本已具備，但本機 macOS 12 不被目前 Playwright Chromium 下載器支援，因而沒有把瀏覽器測試結果誤記為通過。需在 CI 的 Chromium runner 執行：

```sh
python3 -m playwright install chromium
python3 scripts/browser_smoke.py --base-url http://127.0.0.1:8765/StructMark/
```
