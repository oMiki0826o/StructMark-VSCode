# .gitignore 參考規則

`.gitignore` 應保留 Repository 現有風格並依技術棧選擇必要內容，不要無差別複製大型通用清單。

## 通用範例

```gitignore
.DS_Store
Thumbs.db
.idea/
.vscode/
.env
.env.*
!.env.example
*.log

# 本地執行資料、AI 工作紀錄、交接草稿
data/
```

## 技術棧補充

| 技術 | 常見需忽略的資料 | 注意 |
| --- | --- | --- |
| Python | `__pycache__/`, `.venv/`, `.pytest_cache/` | 只忽略生成檔 |
| Node.js | `node_modules/`, `.next/` | `dist/` 是否追蹤依部署方式決定 |
| Java / Gradle | `.gradle/`, `build/`, `*.class` | Mod 發布用 JAR 應獨立處理 |
| Rust | `target/` | `Cargo.lock` 按專案用途決定 |
| Unity | `Library/`, `Temp/`, `Obj/` | 專案資產不可全部忽略 |

`data/` 的角色已由 [專案建立規範](../../rules/project-bootstrap.md) 定義，**整體不提交**。需要版本控制的決策文件應整理到 `docs/`，不能依另一份模板改為公開追蹤 `data/ai/`。Bootstrap 會協助補上 `data/` 忽略規則。
