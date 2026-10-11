/*
 * File: attributes.ts
 * Modification: 2026-10-10 — 共用 [] 屬性欄位解析器，不使用原生 {} 屬性。
 */
import type {Attributes, Diagnostic, Position} from "./types.js";

// ── 屬性文法 ──
const KEY = /^[a-zA-Z_][\w:-]*/;
const IDENT = /^[\p{L}_][\p{L}\p{N}\p{M}_:.-]*$/u;
export function normalizeIdentifier(value: string): string { return value.normalize("NFC"); }
export function isIdentifier(value: string): boolean { return IDENT.test(normalizeIdentifier(value)); }
function error(diagnostics: Diagnostic[], code: string, message: string, position: Position): void {
  diagnostics.push({code, severity: "warning", message, position});
}

/** 內容不含外層 [ ]；只允許空白分隔、引號字串、ID、class 與 key=value。 */
export function readAttributes(content: string, position: Position, diagnostics: Diagnostic[]): Attributes | null {
  const attrs: Attributes = {};
  let p = 0;
  let valid = true;
  while (p < content.length) {
    while (/\s/.test(content[p] ?? "") && p < content.length) p++;
    if (p >= content.length) break;
    let key: string;
    if (content[p] === "#" || content[p] === ".") {
      const kind = content[p++]!;
      const name = /^[\p{L}\p{N}\p{M}_:.-]+/u.exec(content.slice(p))?.[0] ?? "";
      if (!name || !isIdentifier(name)) { valid = false; break; }
      p += name.length;
      key = kind === "#" ? "id" : "class";
      if (Object.hasOwn(attrs, key)) { error(diagnostics, "MMK-A002", `重複屬性：${key}`, position); valid = false; }
      else attrs[key] = kind === "#" ? normalizeIdentifier(name) : name;
    } else {
      const m = KEY.exec(content.slice(p));
      if (!m) {valid = false; break;}
      key = m[0]; p += key.length;
      if (content[p] !== "=") {
        if (Object.hasOwn(attrs, key)) {error(diagnostics, "MMK-A002", `重複屬性：${key}`, position); valid = false;}
        else attrs[key] = true;
        continue;
      }
      p++;
      let value: string | number | boolean = "";
      if (content[p] === '"' || content[p] === "'") {
        const quote = content[p++]!;
        let closed = false;
        while (p < content.length) {
          if (content[p] === quote) {p++; closed = true; break;}
          if (content[p] === "\\" && p + 1 < content.length) {
            const next = content[p + 1]!;
            value += next === "n" ? "\n" : next === "t" ? "\t" : next;
            p += 2;
          } else value += content[p++]!;
        }
        if (!closed) {valid = false; break;}
      } else {
        const token = /^[^\s\]]+/.exec(content.slice(p))?.[0];
        if (!token) {valid = false; break;}
        p += token.length;
        value = token === "true" ? true : token === "false" ? false : /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(token) ? Number(token) : token;
      }
      if (Object.hasOwn(attrs, key)) {error(diagnostics, "MMK-A002", `重複屬性：${key}`, position); valid = false;}
      else attrs[key] = value;
    }
    if (p < content.length && !/\s/.test(content[p]!)) {valid = false; break;}
  }
  if (!valid) {error(diagnostics, "MMK-A001", "屬性格式無效或不支援，請使用 [#id key=value]", position); return null;}
  return attrs;
}

/** 解析緊鄰節點後方的 [屬性]，無完整合法屬性時維持原文字。 */
export function readAttributeSuffix(source: string, start: number, pos: Position, diagnostics: Diagnostic[]): {attrs: Attributes; end: number} {
  if (source[start] !== "[") return {attrs: {}, end: start};
  let quoted: string | null = null;
  let escaped = false;
  let end = start + 1;
  while (end < source.length) {
    const char = source[end]!;
    if (escaped) escaped = false;
    else if (char === "\\") escaped = true;
    else if (quoted && char === quoted) quoted = null;
    else if (!quoted && (char === '"' || char === "'")) quoted = char;
    else if (!quoted && char === "]") break;
    end++;
  }
  if (end >= source.length) return {attrs: {}, end: start};
  const inner = source.slice(start + 1, end);
  if (!/^(?:\s*[#.\w]|\s*[a-zA-Z_])/.test(inner) || !/(?:=|^\s*[#.])/.test(inner)) return {attrs: {}, end: start};
  const attrs = readAttributes(inner, pos, diagnostics);
  return attrs === null ? {attrs: {}, end: start} : {attrs, end: end + 1};
}
