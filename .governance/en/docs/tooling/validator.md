# Validator Guide

Run `python3 scripts/validate.py` or use `--root <repository>`. Checks include repository structure, UTF-8, LF, trailing newlines and whitespace, local Markdown links and anchors, rule references, gate metadata, bilingual filenames, release versions and `.gitignore`.

The tool reports failures without hiding missing files or corrupt text. It intentionally does not fetch external URLs or claim to judge architecture quality or root-cause correctness. Untracked `data/` remains outside the scan.
