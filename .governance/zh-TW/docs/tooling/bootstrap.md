# Bootstrap 工具使用說明

使用 `python3 scripts/bootstrap_project.py <專案目錄>` 將治理入口放入其他專案。預設語言為繁體中文、模式為 `minimal`，並會補上 `.gitignore` 的 `data/` 規則。

三種模式各有用途：`minimal` 複製核心 Rule 與基本 Workflow，`standard` 增加常用工程規則與 Gate，`full` 包含選定語言下全部規範、範例與模板。可加 `--language en` 或 `--language bilingual`。

開始寫入前會確認所有目的地。既有 `AGENTS.md` 或已安裝的治理檔案若衝突，預設拒絕覆蓋；要明確更新可先使用 `--dry-run --force` 審查，再使用 `--force`。即使 `--force`，也不會覆寫 `data/ai/` 下已存在的個人工作紀錄。

每次安裝產生 `.governance/manifest.json`，記錄治理版本、模式、語言及檔案雜湊。`--dry-run` 不會新增任何檔案。工具在寫入失敗時會盡力恢復先前內容。

此版本尚未提供增量合併器：更新前仍應檢查目的地的既有修改。
