# StructMark v2.0 實驗核心

這是附加於 v1.6.0 原始碼的 **v2.0 實驗性語法核心**，不是宣稱已完成 v2.0 正式版。它不會修改既有 v1.6 的 Parser、網站或 LSP 行為。

## 已實作

- `&w[test]` 與 `&warning[title=test]` 正規化為相同語義。
- `&e` 與 `&end`、有限指令 Registry、單一預設參數。
- `#1 標題 (#id)`、`(#id)` 參照與重複／缺失診斷。
- `&table` 的相鄰 `[]` 儲存格、欄位數驗證與 `\]` 跳脫。
- 原樣區塊、未閉合區塊診斷、格式化與 Node.js 測試。

## 尚未實作

- 完整行內標記、型別化資料、跨文件參照、通用巢狀容錯。
- 與 v1.6 AST、CLI、網站、LSP、VS Code 擴充套件整合。
- 對 Markdown / @Doc 的等價語義 Token 實測與使用者測試。

## 執行

```bash
node --test experimental/v2/tests/*.test.mjs
```

此資料夾僅使用 Node.js 內建模組，不需要額外安裝套件。
