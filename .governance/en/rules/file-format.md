# File Format

### FMT-001 — UTF-8 and LF

Default to UTF-8, LF and one final newline for text; exclude binary data.

### FMT-002 — Honor project formatters

Prioritize repository formatters, `.editorconfig` and established conventions.

### FMT-003 — Consistent naming and indentation

Follow language and local conventions without accidental mixed indentation.

### FMT-004 — Parse structured files

Parse changed JSON, YAML and TOML with appropriate tools.

### FMT-005 — Readable Markdown

Use coherent headings, valid links and identified code blocks.

### FMT-006 — Keep secrets separate

Use examples for configuration shape; never commit real secrets.

### FMT-007 — Classify artifact types

Differentiate source, runtime, generated and release artifacts.

### FMT-008 — Avoid formatting noise

Keep unrelated reformatting out of focused changes.

### FMT-009 — No arbitrary migrations

Do not migrate configuration or dependency formats without engineering benefit.
