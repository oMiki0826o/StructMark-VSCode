# StructMark 2.0 設計說明（2.0.0-rc.1）

本文件說明 `src/v2/` 實作及其正式可用邊界。StructMark 的目標是提供語法簡潔、結構嚴謹、易讀易寫、低 Token 消耗且高度可擴充的通用標記語言，兼顧日常寫作、技術文件、學術研究與結構化資料。**Token 效率是需要驗證的目標，不是已證實的優勢。**

## 與 Markdown 及 @Doc 的差異

StructMark 以同一份語義 AST 表示區塊、型別欄位、資料 Schema、宣告與參照；不把資料表格當成渲染時才識別的純文字。語義區塊採用 `&name[attributes] ... &e`；簡寫由指令表宣告，`&w[Title]` 與 `&warning[title=Title]` 必須得到同樣 AST。原生表格以 `[cell]` 組成且支援型別，工作區參照可診斷遺失檔案或 ID，CLI 以非零退出碼回報不合格內容。

Markdown 可透過擴充功能達到部分能力；此設計**不宣稱所有 Markdown 工具都缺乏這些功能**。對比必須限定相同語義、相同驗證範圍與相同 tokenizer。

## 已實作的分層

- `src/v2/registry.mjs` — 指令定義、別名、屬性解析與診斷碼。
- `src/v2/parser.mjs` — v2 語義 AST、型別表格、資料 Schema 子集和文件內參照。
- `src/v2/inline.mjs` — 明確前綴的行內標記、連結和參照。
- `src/v2/workspace.mjs` — 瀏覽器可用的跨文件參照驗證，拒絕路徑越界。
- `src/v2/formatter.mjs` — 可往返的標準形式，不會默默修正有錯文件。
- `src/v2/html.mjs` — HTML 跳脫、URL 白名單和基本語義 HTML。
- `src/v2/editor.mjs` — 由語義 AST 建立定位資訊；略過 Raw 區塊。
- `src/v2/index.mjs` 與 `index.d.mts` — 單一穩定入口、TypeScript 宣告。

舊 `experimental/v2/core.mjs` 只重新匯出正式 v2 API，避免平行維護兩套引擎。原有 `src/*.ts` 為 v1.6 相容工具鏈，保持獨立公開介面。

## 已實作與尚未實作

已實作：六層標題、Registry 指令與簡寫、位置參數、行內格式、文件內及跨檔參照、方括號表格、`number`/`boolean`/`date` 欄位、JSON Data/Schema 子集、輸入上限、安全 HTML、CLI、測試及模糊測試。Playground 可明確選擇 v1.6 與 v2。編輯器/LSP 原始碼使用 v2 API，但未經本環境編譯與 VSIX 實機驗收。

尚未實作或尚未確認：完整的 JSON Schema、數學排版引擎與外掛執行、跨工作區 Symbol Index 持久化、可編輯 AST 的互動式網站介面、與 Markdown/@Doc 的經驗證等價語義及真實 Token 比較、各平台 VSIX 與站台 E2E 驗證。

## 語言邊界與擴充原則

新的指令必須由 Registry 宣告，最多一個短別名及預設位置參數；不要在 Lexer / Parser 中新增僅針對特定命名的捷徑。所有新增語法先定義輸入規則、對應 AST、錯誤診斷與 Formatter 往返案例；不應為了縮短字數加入具二義性的語法。

語法細節以 [v2 語言契約](STRUCTMARK_V2_LANGUAGE_CONTRACT.md) 為準，發行狀態以 [發行檢查點](STRUCTMARK_V2_RELEASE_GATES.md) 為準。
