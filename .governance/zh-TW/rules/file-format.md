# 檔案格式

### FMT-001 — UTF-8 與 LF

純文字檔預設 UTF-8、LF、單一檔尾換行；二進位檔不套用。

### FMT-002 — 專案設定優先

以 formatter、`.editorconfig` 及現有格式契約優先。

### FMT-003 — 命名與縮排一致

遵守語言與專案既有風格，不任意混用縮排。

### FMT-004 — 結構化檔案須解析

JSON、YAML、TOML 等修改後，以適當 Parser 驗證。

### FMT-005 — Markdown 可閱讀

維持合理標題層級、可用連結與清楚的程式碼區塊。

### FMT-006 — Secrets 分離

以 Example 呈現設定格式，不提交實際密鑰。

### FMT-007 — 區分產物角色

Source、Runtime、Generated 與 Release Artifact 的追蹤政策應分開決定。

### FMT-008 — 避免無關格式變更

局部修復不大幅重排不相關程式碼。

### FMT-009 — 不擅自格式遷移

不得只因偏好變更 Manifest 或設定格式。
