# .gitignore Policy Reference

Ignore only generated, local or secret material relevant to the technology stack. Typical rules include `.DS_Store`, `.env`, `.venv/` and `__pycache__/` for Python, `node_modules/` for Node, `.gradle/` and `build/` for Java, and `target/` for Rust. Whether deployment assets and lockfiles should be committed depends on the project contract.

## Minimal common example

```gitignore
.DS_Store
.idea/
.vscode/
.env
.env.*
!.env.example
*.log

data/
```

All `data/` paths are reserved for untracked local collaboration and runtime records, as defined in the [bootstrap policy](../../rules/project-bootstrap.md). Publish only curated conclusions under `docs/`. Bootstrap enforces this ignore entry without replacing unrelated settings.
