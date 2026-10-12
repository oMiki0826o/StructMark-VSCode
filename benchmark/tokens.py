#!/usr/bin/env python3
"""
File: benchmark/tokens.py
Modification: 2026-10-10 — 實際 tokenizer 基準測試及無 tiktoken 時的明確降級。
"""

# ── 套件及資料 ──
import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CORPUS = ROOT / "corpus.json"
OUTPUT = ROOT / "results.csv"
ENCODINGS = ("cl100k_base", "o200k_base")


def main() -> None:
    """比較語義對等的兩種來源文件，不把字元數混稱為 Token。"""
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-tokenizer", action="store_true", help="缺少 tiktoken 時使基準測試失敗")
    args = parser.parse_args()
    samples = json.loads(CORPUS.read_text(encoding="utf-8"))
    try:
        import tiktoken
    except ImportError:
        tiktoken = None

    tokenizers = {}
    if tiktoken is not None:
        for name in ENCODINGS:
            try:
                tokenizers[name] = tiktoken.get_encoding(name)
            except Exception as exc:
                print(f"無法載入 {name}：{exc}")
    else:
        if args.require_tokenizer:
            raise SystemExit("需要 tiktoken 才能執行真實 Token 基準測試")
        print("未安裝 tiktoken，本次僅提供字元數與 UTF-8 位元組數；Token 欄位標示為 n/a。")
    if args.require_tokenizer and len(tokenizers) != len(ENCODINGS):
        missing = ", ".join(name for name in ENCODINGS if name not in tokenizers)
        raise SystemExit(f"無法載入真實 tokenizer：{missing}")

    columns = ["id", "format", "characters", "utf8_bytes", *[f"tokens_{name}" for name in ENCODINGS]]
    results = []
    for item in samples:
        for fmt in ("markdown", "structmark"):
            content = item[fmt]
            row = {"id": item["id"], "format": fmt,
                   "characters": len(content), "utf8_bytes": len(content.encode("utf-8"))}
            for name in ENCODINGS:
                row[f"tokens_{name}"] = len(tokenizers[name].encode(content)) if name in tokenizers else "n/a"
            results.append(row)
    with OUTPUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, lineterminator="\n")
        writer.writeheader()
        writer.writerows(results)

    print(f"已建立 {OUTPUT}")
    for fmt in ("markdown", "structmark"):
        group = [x for x in results if x["format"] == fmt]
        print(f"{fmt}: 字元={sum(x['characters'] for x in group)}, UTF-8 位元組={sum(x['utf8_bytes'] for x in group)}")
        for name in tokenizers:
            print(f"  {name}={sum(x[f'tokens_{name}'] for x in group)}")
    print("注意：結果是語料集上的實測，不代表所有文件的 Token 優勢。")


if __name__ == "__main__":
    main()
