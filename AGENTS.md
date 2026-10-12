# Repository Agent Instructions

This project uses AI Development Governance, revision recorded in `.governance/manifest.json`. Use the project’s own conventions and higher-priority safety instructions first.

## Governance entry points

- `zh-TW`: `.governance/zh-TW/rules/core.md`, `.governance/zh-TW/rules/decision.md`, `.governance/zh-TW/workflows/task-lifecycle.md`.
- `en`: `.governance/en/rules/core.md`, `.governance/en/rules/decision.md`, `.governance/en/workflows/task-lifecycle.md`.
- For bug fixes, read the corresponding `workflows/bugfix.md` and `rules/convergence.md` when present.

Default language: `zh-TW`. Read only the rules relevant to the current task.

## Project-specific configuration

Document the project architecture, main entry points, and test commands here. Avoid repeating shared governance rules.

## Validation and reporting

Report commands actually executed and their outcomes. Do not claim tests or integration checks that were not performed.

## StructMark v2.0.0-rc.1

新開發的語法契約以 `docs/STRUCTMARK_V2_LANGUAGE_CONTRACT.md` 為準；v2 僅能使用 `src/v2/index.mjs` 公開入口。執行 `npm run check:v2`，並依 `docs/STRUCTMARK_V2_RELEASE_GATES.md` 驗證；不可將既有 v1.6 API 擅自改成 v2 或宣稱尚未執行的測試通過。
