/*
 * File: source.ts
 * Modification: 2026-10-11 — Correct UTF-16 ↔ UTF-8 mapping for astral code points and CRLF.
 */

export interface NormalizedSource {
  readonly text: string;
  readonly originalOffsetAt: (textOffset: number) => number;
  readonly textOffsetAtOriginal: (originalOffset: number) => number;
  readonly byteOffsetAt: (textOffset: number) => number;
}

// ── 字元與位元組位置 ──
function utf8Length(codepoint: number): number {
  if (codepoint <= 0x7f) return 1;
  if (codepoint <= 0x7ff) return 2;
  if (codepoint <= 0xffff) return 3;
  return 4;
}

/**
 * Offset indexing uses UTF-16 code units (matching JavaScript string offsets).
 * At the middle of a surrogate pair the byte offset is mapped to the start
 * of that code point; there is no UTF-8 boundary inside the scalar value.
 * A leading BOM is excluded from normalized text, matching parseDocument.
 */
export function normalizeSource(input: string): NormalizedSource {
  const normalized: string[] = [];
  const originalAt: number[] = [];
  const bytesAt: number[] = [];
  let original = input.charCodeAt(0) === 0xfeff ? 1 : 0;
  let bytes = original ? 3 : 0;
  while (original < input.length) {
    const codepoint = input.codePointAt(original)!;
    const size = codepoint > 0xffff ? 2 : 1;
    const start = original;
    const byteStart = bytes;
    if (input[original] === "\r") {
      const width = input[original + 1] === "\n" ? 2 : 1;
      normalized.push("\n");
      originalAt.push(start);
      bytesAt.push(byteStart);
      original += width;
      bytes += width;
      continue;
    }
    normalized.push(String.fromCodePoint(codepoint));
    for (let part = 0; part < size; part++) {
      originalAt.push(start + part);
      bytesAt.push(byteStart);
    }
    original += size;
    bytes += utf8Length(codepoint);
  }
  const text = normalized.join("");
  function clamp(value: number, maximum: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(maximum, Math.trunc(value)));
  }
  const originalOffsetAt = (offset: number): number => {
    const index = clamp(offset, text.length);
    return index === text.length ? original : originalAt[index]!;
  };
  const byteOffsetAt = (offset: number): number => {
    const index = clamp(offset, text.length);
    return index === text.length ? bytes : bytesAt[index]!;
  };
  const textOffsetAtOriginal = (offset: number): number => {
    const target = clamp(offset, input.length);
    let low = 0;
    let high = originalAt.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (originalAt[middle]! < target) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  return {text, originalOffsetAt, textOffsetAtOriginal, byteOffsetAt};
}
