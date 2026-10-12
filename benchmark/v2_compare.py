#!/usr/bin/env python3
"""
File: v2_compare.py
Modification: 2026-10-12 — Reproducible v2 candidate comparison with honest tokenizer fallback.
"""

# ── 資料與選項 ──
import csv
import json
from pathlib import Path
import argparse

ROOT = Path(__file__).resolve().parent
ENCODINGS = ("cl100k_base", "o200k_base")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-tokenizer", action="store_true")
    args = parser.parse_args()
    try:
        import tiktoken
    except ImportError:
        tiktoken = None
    if args.require_tokenizer and tiktoken is None:
        raise SystemExit("未安裝 tiktoken，無法進行真實 Tokenizer 驗證")
    tokenizers = {}
    if tiktoken is not None:
        for name in ENCODINGS:
            try:
                tokenizers[name] = tiktoken.get_encoding(name)
            except Exception as exc:
                if args.require_tokenizer:
                    raise SystemExit(f"{name} 無法載入：{exc}")
                print(f"警告：{name} 無法載入：{exc}")
    samples = json.loads((ROOT / "v2_corpus.json").read_text(encoding="utf-8"))
    rows = []
    for sample in samples:
        for fmt in ("markdown", "atdoc", "structmark"):
            source = sample[fmt]
            row = {"id": sample["id"], "format": fmt, "characters": len(source),
                   "utf8_bytes": len(source.encode("utf-8"))}
            for name in ENCODINGS:
                row[f"tokens_{name}"] = len(tokenizers[name].encode(source)) if name in tokenizers else "n/a"
            rows.append(row)
    path = ROOT / "v2_results.csv"
    with path.open("w", encoding="utf-8", newline="") as stream:
        fieldnames = ["id", "format", "characters", "utf8_bytes", *[f"tokens_{x}" for x in ENCODINGS]]
        writer = csv.DictWriter(stream, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"Generated {path.name}: {len(rows)} rows")
    print("Tokenizers:", ", ".join(tokenizers) or "none; Token counts n/a")
    print("注意：例子由人工建立；未經 @Doc 解析器確認語義等價；不能據此宣稱全面效能優勢。")


if __name__ == "__main__":
    main()
