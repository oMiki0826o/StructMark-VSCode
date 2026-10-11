# Documentation

### DOC-001 — Document implemented behavior

Document actual behavior; do not present plans as implemented.

### DOC-002 — Write for people

Write README and docs for human readers, not as oversized agent prompts.

### DOC-003 — Separate documentation roles

Rules are authoritative; docs explain reasons without redefining policy.

### DOC-004 — Test examples

Keep example commands and paths consistent with the project.

### DOC-005 — The GitHub publication template has the highest format authority

For README, LICENSE, `.gitignore`, Discord release copy, or GitHub repository descriptions, follow `templates/GithubRepoTemplate.md` first. Split templates under `templates/github/`, README, Docs, and Workflows may supplement or reference it, but must not weaken or rewrite its confirmation checklist, bilingual structure, badges, license, or output validation requirements.

### DOC-006 — README creation must reference the GitHub repository template

Whenever a task creates, rewrites, or substantially updates a README, read and follow `templates/GithubRepoTemplate.md` before producing the output. A small unrelated typo or link fix does not require regenerating the README, but it must not violate the template's established structure or checks.
