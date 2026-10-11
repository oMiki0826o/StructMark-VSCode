# Bootstrap Guide

Run `python3 scripts/bootstrap_project.py <project-directory>`. Modes: `minimal` provides core policies and entry points; `standard` adds common engineering policies and gates; `full` includes all docs and templates. Select `--language zh-TW`, `en`, or `bilingual`.

Conflicts block writes unless `--force` is explicitly requested. Existing `data/ai/` work files are never overwritten. `--dry-run` previews all changes and writes nothing. All modes enforce `data/` in the target `.gitignore` and record a `.governance/manifest.json` including version, selected mode and SHA-256 hashes. Review diffs before updating vendored rules; no automatic merge facility is included yet.
