# StructMark v2 指令列工具

`bin/sm2.mjs` 直接呼叫 `src/v2/index.mjs`，使用 Node.js 22 或更新版本即可執行，不需先下載 npm 套件。

| 指令 | 功能 |
| --- | --- |
| `node bin/sm2.mjs check file.sm` | 解析、驗證並回傳退出碼 |
| `node bin/sm2.mjs ast file.sm` | 輸出 v2 語義 AST JSON |
| `node bin/sm2.mjs html file.sm` | 安全 HTML 輸出至 stdout |
| `node bin/sm2.mjs format file.sm` | 在 stdout 輸出標準格式，不覆蓋原始碼 |
| `node bin/sm2.mjs format file.sm --check` | 格式不符合時回傳退出碼 1 |
| `node bin/sm2.mjs format file.sm --write` | 有效文件才使用暫存檔置換來源 |
| `node bin/sm2.mjs workspace path/` | 檢查目錄下所有 `.sm` 文件及跨文件參照 |

退出碼 `0` 表示執行成功，`1` 表示驗證或格式錯誤，`2` 表示參數或檔案 I/O 錯誤。`workspace` 會略過 `node_modules`、`.git`、`dist`、`.next` 及符號連結，最多處理 2,000 份文件。

v1.6 的 `bin/structmark.mjs` 保留供舊版相容，不會靜默改用 v2。若程式直接引用 API，請使用 `./src/v2/index.mjs`（原始碼）或預定發布的 `structmark-language-core/v2` subpath。
