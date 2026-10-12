# StructMark 2.0 語法契約（RC1）

此文件記錄目前 `src/v2/` **已實作的子集合**，而非對未來所有擴充語法的承諾。使用 `npm run check:v2` 可執行契約測試。正式版名稱待所有發行檢查點通過後才可使用。

## 1. 文件與區塊

文件採 UTF-8；換行解析會正規化為 LF。`#1`～`#6` 代表六層標題，**不是** Markdown 的 `#` 重複次數。`#1 標題 (#id)` 宣告文件 ID，其中 ID 符合 `[a-z][a-z0-9_-]*`。同一份文件內不得重複。

每行起始的 `&name[...]` 可建立語義區塊；`&e`／`&end` 結束最內層區塊，容許 40 層巢狀。簡寫由 Registry 宣告；每個指令最多一個別名與一個預設參數。例如 `&w[提示]` 與 `&warning[title=提示]` 相等。未知指令或未結束區塊會產生診斷。

```ebnf
heading     = "#", ("1" | "2" | "3" | "4" | "5" | "6"), ws, text, [ ws, "(#", id, ")" ];
start       = "&", name, [ "[", attribute-list-or-default, "]" ];
end         = "&e" | "&end";
reference   = "(#", id, ")" | "(#", relative-sm-path, "#", id, ")";
table-row   = cell, { cell };
cell        = "[", { plain-character | ("\\", ("[" | "]" | "\\")) }, "]";
id          = lower, { lower | digit | "-" | "_" };
```

此 EBNF 僅表達主要區塊輪廓；行內配對、合法屬性與內容模式的細節由下列條款規定。

## 2. 屬性

`&warning[title=提示]` 是具名屬性，`&warning[提示]` 是由 Schema 指定的預設屬性。多個屬性以逗號分隔，例如 `&data[format=json,schema=Record]`。帶空白或逗號的屬性值請用 JSON 風格的雙引號：`&w[title="Hello, world"]`。重複、未知或不合法屬性都會回報診斷。

## 3. 行內語法

| 輸入 | 意義 |
| --- | --- |
| `*[內容]` | 粗體 |
| `/[內容]` | 斜體 |
| `/*[內容]` | 粗斜體 |
| `-[內容]` | 底線 |
| `~[內容]` | 刪除線 |
| `=[內容]` | 標記 |
| `[名稱](https://example.com)` | 連結，Renderer 有 URL 白名單 |
| `(#id)` | 文件內參照 |
| `(#guide/intro.sm#id)` | 工作區相對參照 |

內文允許巢狀行內格式。使用 `\` 跳脫行內保留符號。一般括號如 `(a+b)` 不會自動變成參照。這個行內集合不承諾完整 Markdown/CommonMark 相容。

## 4. 原生表格

```sm
&tbl
[項目:string][價格:number][販售:boolean]
[早餐][60][true]
[午餐][90][false]
&e
```

第一列是表頭；其餘列數量必須相同。欄位型別目前支援 `string`（預設）、`number`、`boolean`、`date`（`YYYY-MM-DD`）。表格儲存格可用 `\]`、`\[`、`\\` 跳脫；欄位上限 128、列數上限 10,000。尚未支援多行儲存格及嵌入式區塊。

## 5. Schema 與資料

```sm
&schema[Person]
{"name":"string","age":"number","note?":"string"}
&e

&data[format=json,schema=Person]
{"name":"Miki","age":16}
&e
```

`&schema` 是 StructMark 自有的**最小型別綱要**，不是完整 JSON Schema 標準。欄位以 `?` 後綴指定選填；支援 `string`、`number`、`boolean`、`object`、`array`、`null`、`any`。未宣告欄位、缺漏必填、型別錯誤、同名 Schema 或格式錯誤會產生診斷。`&data` 可包含單一 JSON 物件或物件陣列，Schema 目前限同文件內查找。

## 6. Raw 與跳脫

`&code`、`&equation`、`&raw` 內容不解析行內標記。Raw 中一整行 `&e` 會結束區塊；若要寫出同名文字，寫成 `\&e`。Raw 中原本帶反斜線的結束記號需再多加一個反斜線。Formatter 負責輸出可往返的正規化表示。

## 7. 安全性、限制及診斷

Parser 不執行文件程式碼，不讀取磁碟或網路。Renderer 預設跳脫 HTML，只允許安全連結類型。CLI 的工作區檢查不追蹤符號連結、拒絕跳出工作區的相對檔案參照。來源大小上限 2,000,000 字元，最多 40 層區塊。

| 診斷碼 | 意義 |
| --- | --- |
| SM001 / SM105 | 文件過大／巢狀過深 |
| SM101–104 | 結束標記、未知指令、無效指令、未關閉區塊 |
| SM200–203 | 屬性語法、重複參數、無預設參數、未知屬性 |
| SM301–309 | 表格格式、欄數、型別、JSON、跳脫、資料格式與上限 |
| SM400–405 | ID 不合法、重複 ID、找不到參照、缺少文件或不安全路徑 |
| SM501–505 | Schema 重複、未定義、不合法、型別錯誤、未宣告欄位 |

更多背景及尚未支援的語法請參閱 [發行狀態](../V2_RELEASE_STATUS.md)。
