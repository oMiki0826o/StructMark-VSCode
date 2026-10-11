# Codex 整合

Codex 可以在 Repository 內讀取 `AGENTS.md`。Bootstrap 會生成包含治理檔案相對路徑的精簡入口，Codex 可依任務讀取 `.governance/` 下的文件。

建議將專案特有的架構規範與實際測試命令補在 `AGENTS.md`，避免將完整規則複製到單一長 Prompt。重大工作計畫可留在本地 `data/ai/`。

官方參考：[Codex 文件](https://developers.openai.com/codex/)。
