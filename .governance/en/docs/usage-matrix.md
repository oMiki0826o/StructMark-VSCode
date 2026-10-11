# Task-specific Policy Loading

| Task | Read first | Additional policy |
| --- | --- | --- |
| General changes | `rules/core.md`, `rules/decision.md`, `workflows/task-lifecycle.md` | `rules/engineering.md` |
| Bug fixing | `workflows/bugfix.md` | `rules/convergence.md`, `rules/validation.md` |
| Bootstrap | `rules/project-bootstrap.md` | `templates/GithubRepoTemplate.md` |
| Commit and push | `rules/git.md` | `gates/pre-commit.md`, `gates/pre-push.md` |
| Release | `rules/release.md`, `workflows/release.md` | `gates/pre-release.md` |

Paths are relative to the selected language root. Installed projects use `.governance/<language>/` as their root. Minimal mode offers core files only; choose standard or full for optional material.
