/*
 * File: inline.ts
 * Modification: 2026-10-10 — V0.4 為每個行內節點附上完整位置、巢狀範圍。
 */
import {normalizeIdentifier, readAttributeSuffix} from "./attributes.js";
import {getDefaultDirectiveRegistry, type DirectiveRegistry} from "./registry.js";
import type {Attributes, Diagnostic, InlineNode, InlinePayload, Position, SourceRange} from "./types.js";

// ── 詞法常數 ──
const MARKERS: ReadonlyArray<readonly [string, "strong_em" | "strong" | "em" | "underline" | "delete" | "highlight" | "sup" | "sub"]> = [
  ["/*[", "strong_em"], ["*[", "strong"], ["/[", "em"], ["-[", "underline"],
  ["~[", "delete"], ["=[", "highlight"], ["^[", "sup"], ["_[", "sub"],
];
const DIRECTIVES = new Set(["kbd", "abbr", "term", "var", "lang", "ref"]);
const ESCAPABLE = new Set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~".split(""));
const MAX_DEPTH = 48;
type DecoratorType = Exclude<Extract<InlineNode, { children: InlineNode[] }>["type"], "inlineDirective">;

function makePositionLookup(source: string, base: Position): (index: number) => Position {
  // Pre-index newline positions once; each AST position is a binary search.
  const starts: number[] = [0];
  for (let index = 0; index < source.length; index++) {
    if (source[index] === "\n") starts.push(index + 1);
  }
  return (index: number): Position => {
    let low = 0;
    let high = starts.length;
    while (low + 1 < high) {
      const middle = (low + high) >>> 1;
      if (starts[middle]! <= index) low = middle;
      else high = middle;
    }
    return {
      line: base.line + low,
      column: low === 0 ? base.column + index : index - starts[low]! + 1,
      offset: (base.offset ?? 0) + index,
    };
  };
}
function createDiagnostic(diagnostics: Diagnostic[], code: string, message: string, pos: Position): void {
  diagnostics.push({code, message, severity: "warning", position: pos});
}

// ── 配對括號索引：預掃描一次，避免未閉合標記導致 O(n²) 查找 ──
function pairDelimiters(text: string, open: string, close: string): Map<number, number> {
  const stack: number[] = [];
  const matches = new Map<number, number>();
  for (let p = 0; p < text.length; p++) {
    const c = text[p]!;
    if (c === "\\" && p + 1 < text.length) {p++; continue;}
    if (c === open) stack.push(p);
    else if (c === close && stack.length) matches.set(stack.pop()!, p);
  }
  return matches;
}
function matchTarget(text: string, opening: number, pairs: Map<number, number>): {url: string; end: number} | null {
  if (text[opening] !== "(") return null;
  const close = pairs.get(opening);
  if (close === undefined) return null;
  const url = text.slice(opening + 1, close).trim();
  if (!url || /[\s<>]/.test(url)) return null;
  return {url: url.replace(/\\([()])/g, "$1"), end: close + 1};
}
/** 在原始 LaTeX 字串內將 StructMark 簡式上下標轉為 LaTeX 標準分組。 */
export function normalizeMath(input: string): string {
  return input.replace(/(?<!\\)(\^|_)\[([^\[\]\n]*)\]/g, (_, op: string, value: string) => `${op}{${value}}`);
}

/** Validate the balanced-delimiter subset before an optional math renderer runs. */
export function validateMath(input: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const stack: number[] = [];
  const environments: Array<{name: string; index: number}> = [];
  const environmentPattern = /\\(begin|end)\s*\{([^{}]+)\}/g;
  for (const match of input.matchAll(environmentPattern)) {
    const name = match[2]!;
    const index = match.index ?? 0;
    if (match[1] === "begin") environments.push({name, index});
    else if (environments.at(-1)?.name === name) environments.pop();
    else diagnostics.push({code: "MMK-M004", severity: "warning", message: `數學公式環境未配對：${name}`, position: {line: 1, column: index + 1, offset: index}});
  }
  for (const environment of environments) diagnostics.push({code: "MMK-M004", severity: "warning", message: `數學公式環境未關閉：${environment.name}`, position: {line: 1, column: environment.index + 1, offset: environment.index}});
  for (let index = 0; index < input.length; index++) {
    if (input[index] === "\\") {index++; continue;}
    if (input[index] === "{") stack.push(index);
    else if (input[index] === "}" && stack.length) stack.pop();
    else if (input[index] === "}") diagnostics.push({code: "MMK-M003", severity: "warning", message: "數學公式包含未配對的大括號", position: {line: 1, column: index + 1, offset: index}});
  }
  for (const index of stack) diagnostics.push({code: "MMK-M003", severity: "warning", message: "數學公式包含未配對的大括號", position: {line: 1, column: index + 1, offset: index}});
  return diagnostics;
}

// ── 行內文法解析 ──
export interface InlineParseOptions { readonly registry?: DirectiveRegistry; }

export function parseInline(source: string, base: Position = {line: 1, column: 1, offset: 0}, locate?: (index: number) => Position, options: InlineParseOptions = {}): {nodes: InlineNode[]; diagnostics: Diagnostic[]} {
  const diagnostics: Diagnostic[] = [];
  const registry = options.registry ?? getDefaultDirectiveRegistry();
  const squarePairs = pairDelimiters(source, "[", "]");
  const targetPairs = pairDelimiters(source, "(", ")");
  const at = locate ?? makePositionLookup(source, base);
  function parseSpan(start: number, stop: number, depth: number): InlineNode[] {
    if (depth > MAX_DEPTH) {
      createDiagnostic(diagnostics, "MMK-I003", "行內節點巢狀深度超出限制", at(start));
      return [{type: "text", value: source.slice(start, stop), range: {start: at(start), end: at(stop)}}];
    }
    const result: InlineNode[] = [];
    let buffer = "";
    let bufferStart = start;
    let cursor = start;
    function emit(node: InlinePayload, begin: number, end: number): void {
      result.push({...node, range: {start: at(begin), end: at(end)}});
    }
    function flush(): void {
      if (buffer) {emit({type: "text", value: buffer}, bufferStart, cursor); buffer = "";}
      bufferStart = cursor;
    }
    function append(char: string): void {
      if (!buffer) bufferStart = cursor;
      buffer += char;
    }
    function attributeSuffix(end: number): {attrs: Attributes; end: number} {
      return readAttributeSuffix(source.slice(0, stop), end, at(end), diagnostics);
    }
    while (cursor < stop) {
      const c = source[cursor]!;
      if (c === "\\" && source[cursor + 1] === "\n") {
        flush(); emit({type: "hardbreak"}, cursor, cursor + 2); cursor += 2; continue;
      }
      if (c === "\\" && ESCAPABLE.has(source[cursor + 1] ?? "")) {
        append(source[cursor + 1]!); cursor += 2; continue;
      }
      if (c === "\n") {flush(); emit({type: "softbreak"}, cursor, cursor + 1); cursor++; continue;}

      if (c === "`" ) {
        let len = 1;
        while (source[cursor + len] === "`" && cursor + len < stop) len++;
        let p = cursor + len;
        while (p < stop) {
          if (source[p] !== "`") {p++; continue;}
          let closeLen = 1;
          while (source[p + closeLen] === "`" && p + closeLen < stop) closeLen++;
          if (closeLen === len) break;
          p += closeLen;
        }
        if (p < stop) {
          flush();
          emit({type: "code", value: source.slice(cursor + len, p).replace(/\n/g, " ")}, cursor, p + len);
          cursor = p + len; continue;
        }
      }

      if (source.startsWith("%%", cursor)) {
        const at = source.indexOf("%%", cursor + 2);
        if (at !== -1 && at < stop && !source.slice(cursor, at).includes("\n")) {
          flush(); emit({type: "comment", value: source.slice(cursor + 2, at)}, cursor, at + 2); cursor = at + 2; continue;
        }
      }

      if (c === "$" && source[cursor + 1] !== "$" && source[cursor - 1] !== "$" && source[cursor + 1] && !/\s/.test(source[cursor + 1]!)) {
        let at = cursor + 1;
        while (at < stop) {
          if (source[at] === "\\") {at += 2; continue;}
          if (source[at] === "$" && source[at - 1] !== "$" && source[at + 1] !== "$" && !/\s/.test(source[at - 1]!)) break;
          at++;
        }
        if (at < stop && !source.slice(cursor, at).includes("\n")) {
          flush(); emit({type: "math", value: normalizeMath(source.slice(cursor + 1, at))}, cursor, at + 1); cursor = at + 1; continue;
        }
      }

      // Wiki 連結、文獻、註腳屬於具有固定前綴的中括號文法。
      if (source.startsWith("[[", cursor)) {
        const close = source.indexOf("]]", cursor + 2);
        if (close >= 0 && close < stop && !source.slice(cursor, close).includes("\n")) {
          const content = source.slice(cursor + 2, close);
          const [target, ...labelParts] = content.split("|");
          if (target?.trim()) {flush(); emit({type: "wiki", target: target.trim(), label: labelParts.join("|").trim() || target.trim()}, cursor, close + 2); cursor = close + 2; continue;}
        }
      }
      if (source.startsWith("[&", cursor)) {
        const close = squarePairs.get(cursor) ?? -1;
        if (close >= 0 && close < stop) {
          const inner = source.slice(cursor + 2, close);
          const items = inner.split(/\s*;\s*/);
          const first = /^([\w:.-]+)(?:\s*,\s*(.+))?$/u.exec(items[0] ?? "");
          const extra = items.slice(1).every(x => /^&[\w:.-]+$/u.test(x));
          if (first && extra) {
            const {attrs, end} = attributeSuffix(close + 1);
            flush(); emit({type: "citation", keys: [first[1]!, ...items.slice(1).map(x => x.slice(1))], locator: first[2] ?? null, attrs}, cursor, end);
            cursor = end; continue;
          }
        }
      }
      if (source.startsWith("[^", cursor)) {
        const match = /^\[\^([\w:.-]+)\]/u.exec(source.slice(cursor, stop));
        if (match) {flush(); emit({type: "footnoteRef", target: normalizeIdentifier(match[1]!)}, cursor, cursor + match[0].length); cursor += match[0].length; continue;}
      }

      if ((c === "!" && source[cursor + 1] === "[") || c === "[") {
        const image = c === "!";
        const opening = cursor + (image ? 1 : 0);
        const closing = squarePairs.get(opening) ?? -1;
        if (closing >= 0 && closing + 1 < stop && source[closing + 1] === "(") {
          const target = matchTarget(source, closing + 1, targetPairs);
          if (target && target.end <= stop) {
            const props = attributeSuffix(target.end);
            flush();
            emit({type: image ? "image" : "link", label: parseSpan(opening + 1, closing, depth + 1), target: target.url, attrs: props.attrs}, cursor, props.end);
            cursor = props.end; continue;
          }
        }
      }

      if (c === "&") {
        const match = /^&([a-z][\w]*(?::[a-z][\w]*)*)\[/u.exec(source.slice(cursor, stop));
        if (match && (registry.has(match[1]!, "inline") || match[1]!.includes(":"))) {
          const opening = cursor + match[0].length - 1;
          const close = squarePairs.get(opening) ?? -1;
          if (close >= 0 && close < stop) {
            const props = attributeSuffix(close + 1);
            for (const diagnostic of registry.validateAttributes(match[1]!, props.attrs)) createDiagnostic(diagnostics, "MMK-A003", diagnostic.message, at(cursor));
            const inner = source.slice(opening + 1, close);
            if (match[1] === "ref") {
              flush(); emit({type: "ref", target: normalizeIdentifier(inner)}, cursor, props.end); cursor = props.end; continue;
            }
            flush();
            const children = parseSpan(opening + 1, close, depth + 1);
            if (registry.has(match[1]!, "inline") && DIRECTIVES.has(match[1]!)) emit({type: match[1] as DecoratorType, children, attrs: props.attrs}, cursor, props.end);
            else emit({type: "inlineDirective", name: match[1]!, children, attrs: props.attrs}, cursor, props.end);
            cursor = props.end; continue;
          }
        }
      }

      const marker = MARKERS.find(([prefix]) => source.startsWith(prefix, cursor));
      if (marker) {
        const [prefix, kind] = marker;
        const opening = cursor + prefix.length - 1;
        const closing = squarePairs.get(opening) ?? -1;
        if (closing >= 0 && closing < stop && !source.slice(cursor, closing).includes("\n\n")) {
          const props = attributeSuffix(closing + 1);
          const children = parseSpan(opening + 1, closing, depth + 1);
          flush();
          if (kind === "strong_em") {
            const range: SourceRange = {start: at(cursor), end: at(props.end)};
            emit({type: "em", children: [{type: "strong", children, attrs: {}, range}], attrs: props.attrs}, cursor, props.end);
          } else emit({type: kind, children, attrs: props.attrs}, cursor, props.end);
          cursor = props.end; continue;
        }
        createDiagnostic(diagnostics, "MMK-I001", `未閉合行內標記：${prefix}`, at(cursor));
      }
      append(c); cursor++;
    }
    flush();
    return result;
  }
  return {nodes: parseSpan(0, source.length, 0), diagnostics};
}
