# 依任務載入規範

| 情境 | 基本文件 | 額外參考 |
| --- | --- | --- |
| 一般修改 | `rules/core.md`、`rules/decision.md`、`workflows/task-lifecycle.md` | `rules/engineering.md` |
| Bug 修復 | `workflows/bugfix.md` | `rules/convergence.md`、`rules/validation.md` |
| 新專案 | `rules/project-bootstrap.md` | `templates/GithubRepoTemplate.md` |
| Git Commit / Push | `rules/git.md` | `gates/pre-commit.md`、`gates/pre-push.md` |
| 正式發行 | `rules/release.md`、`workflows/release.md` | `gates/pre-release.md` |

以上路徑均相對於選定的語言目錄。Bootstrap 的目標專案則使用 `.governance/<語言>/` 為根目錄。`minimal` 只提供核心入口；需要額外規則可重新套用 `standard` 或 `full`，並先檢查差異。
