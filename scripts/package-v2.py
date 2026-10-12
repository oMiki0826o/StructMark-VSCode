#!/usr/bin/env python3
"""
File: package-v2.py
Modification: 2026-10-12 — Deterministic source ZIP; excludes transient build/cache artifacts.
"""
from __future__ import annotations
import argparse
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
from hashlib import sha256

ROOT = Path(__file__).resolve().parent.parent
EXCLUDED_DIRS = {".git", "node_modules", ".next", ".turbo", "dist", "out", "__pycache__", "coverage", "server", ".smoke-public"}
EXCLUDED_SUFFIXES = (".pyc", ".vsix")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create verified reproducible StructMark source archive")
    parser.add_argument("output", type=Path, help="Destination .zip file")
    args = parser.parse_args()
    output = args.output.resolve()
    if output.suffix.lower() != ".zip":
        parser.error("Output must be a .zip file")
    members = []
    for file in ROOT.rglob("*"):
        relative = file.relative_to(ROOT)
        if any(component in EXCLUDED_DIRS for component in relative.parts):
            continue
        if file.is_symlink() or not file.is_file() or file.suffix.lower() in EXCLUDED_SUFFIXES:
            continue
        if file.resolve() == output:
            continue
        members.append((relative, file))
    members.sort(key=lambda item: item[0].as_posix())
    if not members:
        raise SystemExit("No source files to package")
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for relative, file in members:
            info = ZipInfo(f"{ROOT.name}/{relative.as_posix()}", date_time=(2026, 10, 12, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = (0o644 << 16)
            archive.writestr(info, file.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    with ZipFile(output) as archive:
        bad = archive.testzip()
        if bad is not None:
            raise SystemExit(f"ZIP CRC verification failed: {bad}")
    print(f"{output.name}: {len(members)} files, sha256={sha256(output.read_bytes()).hexdigest()}")

if __name__ == "__main__":
    main()
