# GitHub 專案發布文件入口

這份文件統整 GitHub 專案文件的產生方式。它是 Template 索引，不重新定義 Agent 的工程行為。涉及事實、授權及安全時，以 [核心規範](../rules/core.md)、[決策規範](../rules/decision.md) 與 [文件規範](../rules/documentation.md) 為準。

## 依需求選擇輸出

| 產出 | 參考模板 |
| --- | --- |
| README | [README Template](github/readme.md) |
| 授權全文 | [License Template](github/license.md) |
| 忽略規則 | [.gitignore Template](github/gitignore.md) |
| Discord 發布訊息 | [Discord Release](github/discord-release.md) |
| GitHub 簡述 | [Repository Description](github/repo-description.md) |

只產生使用者要求或專案實際需要的內容，不為了形式補足所有文件。例如使用者只要 Discord 發布文案，就不應同時生成無關的 README 或 LICENSE。

## 品質檢查

- 版本、下載檔、技術棧與相容性必須能查證。
- 作品版本與 Minecraft／平台相容版本應分開標示。
- README 可以用中英文分區，兩種語言的主要資訊必須一致。
- LICENSE 使用正式授權條款全文，不得憑記憶自行改寫法律文字。
- `.gitignore` 不直接覆蓋既有專案設定，`data/` 屬於本地資料並應整體忽略。
- 只有真實存在的展示圖、比較對象及發布版本才應出現在文案。
- 連結必須指向實際存在的倉庫或發行檔，不能把範例網址當作正式網址。

實際格式、完整範例與額外注意事項，請參考上方對應的獨立模板。
