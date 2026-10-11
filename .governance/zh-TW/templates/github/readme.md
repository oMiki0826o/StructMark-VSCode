# README.md 撰寫模板

這份模板提供可重複使用的出版結構，不強制每個專案都展示不存在的功能。主要依據為實際原始碼、測試、發行檔及使用者確認的產品資訊。

## 撰寫前先確認

- 專案名稱、用途及預期使用者。
- 技術棧、必要依賴、支援版本、主要功能與使用方法。
- 已發布的版本與 LICENSE 類型；不自行假設下載網址或相容性。
- 是否有實際展示圖、線上 Demo 或比較對象；沒有就省略相關區塊。
- 對模糊但能從 Repository 查明的事項先自行查證；影響契約或授權的選擇才詢問。

## 建議格式

```markdown
# Project Name

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

[中文](#中文) | [English](#english)

## 中文

### 關於
專案具體用途、適用情境與主要限制。

### 功能
- 可從原始碼或實際操作確認的能力。

### 安裝
寫出實際測試過的安裝條件、命令與版本限制。

### 使用方式
提供真實可執行的最小範例。

### 授權
參考 LICENSE。

## English

### About
State the actual purpose and scope.

### Features
List implemented capabilities.

### Installation
Use verified steps.

### Usage
Show an executable example.

### License
Refer to LICENSE.
```

此為結構示例，徽章版本、名稱與命令都應替換成專案真實資訊，不得直接複製佔位範例發布。只有真的存在的展示、相容性表格或替代產品比較才額外加入對應章節。

## 內容檢查

- 中文與英文對應章節的主要事實、版本與限制必須相同。
- 徽章上顯示的作品版本，不應和支援平台或遊戲版本混為一談。
- 授權縮寫使用一致的 SPDX Identifier；LICENSE 為實際條款來源。
- README 目錄及 Markdown 連結應可正常跳轉。
- 範例命令、相容性、展示圖與下載連結必須能夠查證。
