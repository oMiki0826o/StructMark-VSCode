/*
 * File: parser.ts
 * Modification: 2026-10-10 — V0.4 強化清單續行、raw 巢狀堆疊、表格格位驗證。
 */
import {isIdentifier, normalizeIdentifier, readAttributes} from "./attributes.js";
import {normalizeMath, parseInline} from "./inline.js";
import {parseStructuredTable} from "./structured_table.js";
import {parseDelimited} from "./html.js";
import {validateSemantics} from "./semantic.js";
import {getDefaultDirectiveRegistry, type DirectiveRegistry} from "./registry.js";
import {lexLine} from "./lexer.js";
import {parseDocument as parseYamlDocument} from "yaml";
import type {Attributes, BlockNode, Diagnostic, Document, InlineNode, ListItem, Position, SourceRange} from "./types.js";

// ── 結構判斷 ──
interface Line {text: string; no: number; column?: number; offset?: number;}
interface Marker {indent: number; mode: "unordered" | "automatic" | "numbered"; start: number | null; content: string; width: number;}
const MAX_SOURCE = 2_000_000;
const MAX_BLOCK_DEPTH = 40;
const HEADING = /^ {0,3}#([1-6])[ \t]+(.+)$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})([^`]*)$/;
const DIRECTIVE = /^ {0,3}&([a-z][a-z\d_]*(?::[a-z][a-z\d_]*)*)(?:[ \t]+)?(\[[^\]\n]*\])?[ \t]*$/;
const BLOCK_END = /^ {0,3}&(?:end|e)[ \t]*$/;
const COMMENT_FENCE = /^ {0,3}%%[ \t]*$/;
const FOOTNOTE_DEF = /^ {0,3}\[\^([\w:.-]+)\]:[ \t]*(.*)$/u;
const THEMATIC = /^ {0,3}---[ \t]*$/;
function point(line: Line, column = 1): Position {return {line: line.no, column: (line.column ?? 1) + column - 1, offset: (line.offset ?? 0) + column - 1};}
function span(lines: Line[], first: number, last: number): SourceRange {
  const a = lines[first] ?? {text: "", no: 1};
  const b = lines[Math.max(first, last)] ?? a;
  return {start: point(a), end: point(b, b.text.length + 1)};
}
function indentOf(value: string): number {return /^ */.exec(value)![0].length;}
function markerOf(value: string): Marker | null {
  const match = /^( *)(-|\.|\d{1,9}\.)([ \t]+)(.*)$/.exec(value);
  if (!match) return null;
  const literal = match[2]!;
  return {
    indent: match[1]!.length,
    mode: literal === "-" ? "unordered" : literal === "." ? "automatic" : "numbered",
    start: /^\d/.test(literal) ? Number.parseInt(literal, 10) : null,
    content: match[4]!,
    width: match[1]!.length + literal.length + match[3]!.length,
  };
}
interface PipeCell {value: string; start: number;}
function splitPipeLocated(line: string): PipeCell[] {
  let value = line.trim();
  let offset = line.length - line.trimStart().length;
  const isEscaped = (source: string, at: number): boolean => {
    let count = 0;
    while (at - count - 1 >= 0 && source[at - count - 1] === "\\") count++;
    return count % 2 === 1;
  };
  if (value.startsWith("|")) {value = value.slice(1); offset++;}
  if (value.endsWith("|") && !isEscaped(value, value.length - 1)) value = value.slice(0, -1);
  // Pre-index backtick runs, so unclosed runs do not protect a literal pipe.
  const closingTicks = new Map<number, number>();
  const pending = new Map<number, number>();
  for (let at = 0; at < value.length;) {
    if (value[at] !== "`" || isEscaped(value, at)) {at++; continue;}
    let size = 1;
    while (value[at + size] === "`") size++;
    const opening = pending.get(size);
    if (opening !== undefined) {
      closingTicks.set(opening, at);
      pending.delete(size);
    } else pending.set(size, at);
    at += size;
  }
  const cells: PipeCell[] = [];
  let current = "";
  let rawStart = 0;
  let codeEnd = -1;
  function push(): void {
    const leading = current.length - current.trimStart().length;
    cells.push({value: current.trim(), start: offset + rawStart + leading});
  }
  for (let p = 0; p < value.length; p++) {
    const c = value[p]!;
    if (p === codeEnd) codeEnd = -1;
    if (c === "`" && !isEscaped(value, p)) {
      let size = 1;
      while (value[p + size] === "`") size++;
      if (codeEnd < 0 && closingTicks.has(p)) codeEnd = closingTicks.get(p)!;
      current += value.slice(p, p + size);
      p += size - 1;
      continue;
    }
    if (c === "|" && codeEnd < 0 && !isEscaped(value, p)) {
      push(); current = ""; rawStart = p + 1; continue;
    }
    current += c;
  }
  push();
  return cells;
}
function splitPipe(line: string): string[] {return splitPipeLocated(line).map(c => c.value);}
function isBlockDirective(match: RegExpExecArray | null, registry: DirectiveRegistry): boolean {
  if (!match || match[1] === "end" || match[1] === "e") return false;
  if (registry.has(match[1]!, "inline")) return false;
  // 帶括號的未知單行指令，優先視為一般文字；只有合法的屬性形態才允許啟動區塊。
  if (!registry.has(match[1]!, "block") && !registry.has(match[1]!, "rawBlock") && match[2]) {
    const properties = match[2].slice(1, -1);
    if (!/^(?:\s*[#.][\p{L}\p{N}_]|\s*[a-zA-Z_]\w*=)/u.test(properties)) return false;
  }
  return true;
}

function getAligns(line: string): ("left" | "center" | "right" | null)[] | null {
  const cells = splitPipe(line);
  if (!cells.length || !cells.every(s => /^:?-{3,}:?$/.test(s))) return null;
  return cells.map(s => s.startsWith(":") && s.endsWith(":") ? "center" : s.startsWith(":") ? "left" : s.endsWith(":") ? "right" : null);
}
function isFenceEnd(text: string, fence: string): boolean {
  const m = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(text);
  return !!m && m[1]![0] === fence[0] && m[1]!.length >= fence.length;
}
function basicYaml(text: string, diagnostics: Diagnostic[]): Record<string, unknown> {
  const parsed = parseYamlDocument(text, {version: "1.2", prettyErrors: false, uniqueKeys: true});
  for (const error of parsed.errors) {
    const position = error.linePos?.[0];
    diagnostics.push({code: "MMK-M001", severity: "error", message: `YAML 1.2：${error.message}`, position: {line: (position?.line ?? 1) + 1, column: position?.col ?? 1}});
  }
  for (const warning of parsed.warnings) {
    const position = warning.linePos?.[0];
    diagnostics.push({code: "MMK-M002", severity: "warning", message: `YAML 1.2：${warning.message}`, position: {line: (position?.line ?? 1) + 1, column: position?.col ?? 1}});
  }
  if (parsed.errors.length) return {};
  const value = parsed.toJS({mapAsMap: false}) as unknown;
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

// ── 文件解析 ──
export interface ParseOptions { readonly registry?: DirectiveRegistry; }

export function parseDocument(source: string, options: ParseOptions = {}): Document {
  const registry = options.registry ?? getDefaultDirectiveRegistry();
  const diagnostics: Diagnostic[] = [];
  if (source.length > MAX_SOURCE) return {type: "document", version: "1.1", metadata: {}, children: [], diagnostics: [{code: "MMK-D001", severity: "error", message: "來源文件超出長度限制", position: {line: 1, column: 1}}]};
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  let sourceOffset = 0;
  const lines: Line[] = normalized.split("\n").map((text, i) => {
    const line = {text, no: i + 1, offset: sourceOffset, column: 1};
    sourceOffset += text.length + 1;
    return line;
  });
  let metadata: Record<string, unknown> = {};
  let startAt = 0;
  if (lines[0]?.text === "---") {
    const close = lines.findIndex((r, i) => i > 0 && r.text === "---");
    if (close > 1 && /^\w[\w-]*:/.test(lines[1]?.text ?? "")) {
      metadata = basicYaml(lines.slice(1, close).map(l => l.text).join("\n"), diagnostics);
      startAt = close + 1;
    }
  }
  function issue(code: string, msg: string, line: Line, severity: "warning" | "error" = "warning"): void {
    diagnostics.push({code, severity, message: msg, position: point(line)});
  }
  function inline(text: string, line: Line, offset = 1): InlineNode[] {
    const result = parseInline(text, point(line, offset), undefined, {registry});
    diagnostics.push(...result.diagnostics);
    return result.nodes;
  }
  function inlineRows(rows: Line[]): InlineNode[] {
    if (rows.length === 0) return [];
    const starts: number[] = [];
    let length = 0;
    for (const row of rows) {starts.push(length); length += row.text.length + 1;}
    const text = rows.map(row => row.text).join("\n");
    const locate = (index: number): Position => {
      let left = 0, right = rows.length;
      while (left + 1 < right) {
        const mid = (left + right) >> 1;
        if (starts[mid]! <= index) left = mid;
        else right = mid;
      }
      const relative = Math.min(index - starts[left]!, rows[left]!.text.length);
      return point(rows[left]!, relative + 1);
    };
    const result = parseInline(text, point(rows[0]!), locate, {registry});
    diagnostics.push(...result.diagnostics);
    return result.nodes;
  }
  function blockStarter(text: string): boolean {
    const token = lexLine(text, 1, 0, registry);
    const d = DIRECTIVE.exec(text);
    return token.kind !== "text" || HEADING.test(text) || THEMATIC.test(text) || FENCE.test(text) || /^ {0,3}\$\$[ \t]*$/.test(text) || /^ {0,3}%%[ \t]*$/.test(text) ||
      /^ {0,3}>[ \t]?/.test(text) || FOOTNOTE_DEF.test(text) || (markerOf(text)?.indent ?? Infinity) <= 3 ||
      /^ {0,3}&(?:end|e)[ \t]*$/.test(text) || isBlockDirective(d, registry);
  }
  function blocks(input: Line[], depth: number): BlockNode[] {
    if (depth >= MAX_BLOCK_DEPTH) {issue("MMK-B009", "區塊巢狀深度超出限制", input[0] ?? {text: "", no: 1}, "error"); return [];}
    const result: BlockNode[] = [];
    let cursor = 0;

    // ── 清單容器：項目續行採掛靠縮排，項目間空行不應拆成另一份清單 ──
    function parseList(): BlockNode {
      const begin = cursor;
      const initial = markerOf(input[cursor]!.text)!;
      const items: ListItem[] = [];
      while (cursor < input.length) {
        const m = markerOf(input[cursor]!.text);
        if (!m || m.indent !== initial.indent || m.mode !== initial.mode) break;
        const from = cursor;
        const task = initial.mode === "unordered" ? /^\[([ o])\](?:\s+|$)/.exec(m.content) : null;
        const firstText = task ? m.content.slice(task[0].length) : m.content;
        const first = input[cursor]!;
        const skipped = m.width + (task ? task[0].length : 0);
        const itemLines: Line[] = [{text: firstText, no: first.no, column: (first.column ?? 1) + skipped, offset: (first.offset ?? 0) + skipped}];
        cursor++;
        const continuation = m.width;
        let blanks: Line[] = [];
        while (cursor < input.length) {
          const next = input[cursor]!;
          const nextMarker = markerOf(next.text);
          if (nextMarker && nextMarker.indent <= initial.indent) break;
          if (!next.text.trim()) {blanks.push({text: "", no: next.no}); cursor++; continue;}
          if (indentOf(next.text) < continuation) break;
          itemLines.push(...blanks, {text: next.text.slice(continuation), no: next.no, column: (next.column ?? 1) + continuation, offset: (next.offset ?? 0) + continuation});
          blanks = [];
          cursor++;
        }
        // 尾端空行：如果後面仍是同層同模式項目，空行屬於清單；否則交回外層。
        const nextMarker = cursor < input.length ? markerOf(input[cursor]!.text) : null;
        const sameGroup = nextMarker?.indent === initial.indent && nextMarker.mode === initial.mode;
        if (!sameGroup) cursor -= blanks.length;
        const children = blocks(itemLines, depth + 1);
        items.push({type: "listItem", task: task ? task[1] === "o" : null, children, range: span(input, from, Math.max(from, cursor - 1))});
      }
      return {type: "list", ordered: initial.mode !== "unordered", automatic: initial.mode === "automatic", start: initial.mode === "numbered" ? initial.start : initial.mode === "automatic" ? 1 : null, items, range: span(input, begin, Math.max(begin, cursor - 1))};
    }

    while (cursor < input.length) {
      const line = input[cursor]!;
      const text = line.text;
      if (!text.trim()) {cursor++; continue;}
      let m: RegExpExecArray | null;

      // ── 原始程式碼圍欄 ──
      m = FENCE.exec(text);
      if (m) {
        const begin = cursor++;
        const fence = m[1]!;
        const lang = m[2]!.trim().split(/[ \t]/)[0] || null;
        const content: string[] = [];
        while (cursor < input.length && !isFenceEnd(input[cursor]!.text, fence)) content.push(input[cursor++]!.text);
        if (cursor >= input.length) issue("MMK-B002", "未閉合程式碼圍欄", line);
        else cursor++;
        result.push({type: "codeBlock", lang, value: content.join("\n"), range: span(input, begin, cursor - 1)});
        continue;
      }

      // ── 多行註解 ──
      if (/^ {0,3}%%[ \t]*$/.test(text)) {
        const begin = cursor++;
        const content: string[] = [];
        while (cursor < input.length && !/^ {0,3}%%[ \t]*$/.test(input[cursor]!.text)) content.push(input[cursor++]!.text);
        if (cursor >= input.length) issue("MMK-B001", "未閉合多行註解", line);
        else cursor++;
        result.push({type: "commentBlock", value: content.join("\n"), range: span(input, begin, cursor - 1)});
        continue;
      }

      // ── & 區塊指令：明確巢狀堆疊，raw 子區塊保護 &end 與內容 ──
      m = DIRECTIVE.exec(text);
      if (isBlockDirective(m, registry)) {
        const begin = cursor++;
        const name = registry.resolve(m![1]!);
        const attrs = m![2] ? readAttributes(m![2]!.slice(1, -1), point(line), diagnostics) ?? {} : {};
        if (!registry.has(name, "block") && !registry.has(name, "rawBlock")) issue("MMK-B013", `尚未註冊的區塊指令：&${name}`, line);
        for (const diagnostic of registry.validateAttributes(name, attrs)) issue("MMK-A003", diagnostic.message, line);
        const body: Line[] = [];
        // 每個內層區塊各自記錄 raw 模式，原始資料不應被當作其他區塊。
        const stack: boolean[] = [registry.has(name, "rawBlock")];
        let inFence: string | null = null;
        let inComment = false;
        let closed = false;
        while (cursor < input.length) {
          const candidate = input[cursor]!;
          const rawMode = stack.at(-1)!;
          if (rawMode) {
            if (BLOCK_END.test(candidate.text)) {
              stack.pop(); cursor++;
              if (!stack.length) {closed = true; break;}
              body.push(candidate); continue;
            }
            body.push(candidate); cursor++; continue;
          }
          if (inFence) {
            if (isFenceEnd(candidate.text, inFence)) inFence = null;
            body.push(candidate); cursor++; continue;
          }
          const fenceOpen = FENCE.exec(candidate.text);
          if (fenceOpen) {inFence = fenceOpen[1]!; body.push(candidate); cursor++; continue;}
          if (COMMENT_FENCE.test(candidate.text)) {inComment = !inComment; body.push(candidate); cursor++; continue;}
          if (inComment) {body.push(candidate); cursor++; continue;}
          if (BLOCK_END.test(candidate.text)) {
            stack.pop(); cursor++;
            if (!stack.length) {closed = true; break;}
            body.push(candidate); continue;
          }
          const nested = DIRECTIVE.exec(candidate.text);
          if (isBlockDirective(nested, registry)) stack.push(registry.has(nested![1]!, "rawBlock"));
          body.push(candidate); cursor++;
        }
        if (!closed) issue("MMK-B010", `未閉合區塊：&${name}`, line);
        if (registry.has(name, "rawBlock")) {
          let raw = body.map(row => row.text.replace(/^ {0,3}\\(&end)[ \t]*$/, "$1")).join("\n");
          if (name === "equation") raw = normalizeMath(raw);
          if (name === "table") {
            if (attrs.format === "json") {
              for (const error of parseStructuredTable(raw).errors) issue("MMK-T002", error, line);
            } else if (attrs.format === "csv" || attrs.format === "tsv") {
              try {
                const rows = parseDelimited(raw, attrs.format === "csv" ? "," : "\t");
                const width = rows[0]?.length ?? 0;
                if (width === 0 || rows.some(row => row.length !== width)) issue("MMK-T003", "CSV/TSV 各列的欄位數必須一致且非空", line);
              } catch (err) { issue("MMK-T004", `CSV/TSV 內容不合法：${String(err)}`, line); }
              } else issue("MMK-T005", "&table 必須指定 format=csv、tsv 或 json", line);
          }
          if (name === "data" && attrs.format === "json") {
            try { JSON.parse(raw); } catch {issue("MMK-DATA001", "&data 的 JSON 內容不合法", line);}
          }
          result.push({type: "directive", name, attrs, raw, children: [], range: span(input, begin, cursor - 1)});
        } else result.push({type: "directive", name, attrs, raw: null, children: blocks(body, depth + 1), range: span(input, begin, cursor - 1)});
        continue;
      }
      if (BLOCK_END.test(text)) {
        issue("MMK-B011", "沒有對應區塊的 &end", line); cursor++; continue;
      }

      // ── $$ LaTeX 公式區塊 ──
      if (/^ {0,3}\$\$[ \t]*$/.test(text)) {
        const begin = cursor++;
        const raw: string[] = [];
        while (cursor < input.length && !/^ {0,3}\$\$[ \t]*$/.test(input[cursor]!.text)) raw.push(input[cursor++]!.text);
        if (cursor >= input.length) issue("MMK-B012", "未閉合 $$ 公式", line);
        else cursor++;
        result.push({type: "directive", name: "math", attrs: {}, children: [], raw: normalizeMath(raw.join("\n")), range: span(input, begin, cursor - 1)});
        continue;
      }

      // ── 標題及標題 ID ──
      m = HEADING.exec(text);
      if (m) {
        let title = m[2]!;
        let id: string | null = null;
        const suffix = /(?:^|\s)\(#([^\s()]+)\)[ \t]*$/.exec(title);
        if (suffix && isIdentifier(suffix[1]!)) {
          id = normalizeIdentifier(suffix[1]!);
          title = title.slice(0, suffix.index).trimEnd();
        }
        result.push({type: "heading", level: Number(m[1]), id, children: inline(title, line, text.indexOf(m[2]!) + 1), range: span(input, cursor, cursor)});
        cursor++; continue;
      }
      if (THEMATIC.test(text)) {result.push({type: "thematicBreak", range: span(input, cursor, cursor)}); cursor++; continue;}
      m = FOOTNOTE_DEF.exec(text);
      if (m) {result.push({type: "footnoteDef", id: normalizeIdentifier(m[1]!), children: inline(m[2]!, line, text.length - m[2]!.length + 1), range: span(input, cursor, cursor)}); cursor++; continue;}

      // ── GFM 簡單表格：標頭＋有效分隔線 ──
      if (cursor + 1 < input.length && text.includes("|")) {
        const aligns = getAligns(input[cursor + 1]!.text);
        const header = splitPipe(text);
        if (aligns && aligns.length === header.length) {
          const begin = cursor;
          const cells = splitPipeLocated(text).map(cell => inline(cell.value, line, cell.start + 1));
          cursor += 2;
          const rows: InlineNode[][][] = [];
          while (cursor < input.length && input[cursor]!.text.trim() && input[cursor]!.text.includes("|")) {
            const rowLine = input[cursor]!;
            const parts = splitPipe(rowLine.text);
            if (parts.length !== cells.length) issue("MMK-T001", `表格欄位數不符：預期 ${cells.length}，實際 ${parts.length}`, rowLine);
            const located = splitPipeLocated(rowLine.text);
            rows.push(Array.from({length: cells.length}, (_, i) => inline(located[i]?.value ?? "", rowLine, (located[i]?.start ?? 0) + 1)));
            cursor++;
          }
          result.push({type: "table", header: cells, aligns, rows, range: span(input, begin, cursor - 1)});
          continue;
        }
      }

      // ── 引用區塊 ──
      if (/^ {0,3}>[ \t]?/.test(text)) {
        const begin = cursor;
        const collected: Line[] = [];
        while (cursor < input.length) {
          const match = /^ {0,3}>[ \t]?(.*)$/.exec(input[cursor]!.text);
          if (!match) break;
          const inputRow = input[cursor]!;
          const advance = inputRow.text.length - match[1]!.length;
          collected.push({no: inputRow.no, text: match[1]!, column: (inputRow.column ?? 1) + advance, offset: (inputRow.offset ?? 0) + advance}); cursor++;
        }
        result.push({type: "blockquote", children: blocks(collected, depth + 1), range: span(input, begin, cursor - 1)});
        continue;
      }

      // ── 清單及多層容器 ──
      const lm = markerOf(text);
      if (lm && lm.indent <= 3) {result.push(parseList()); continue;}

      // ── 段落 ──
      const begin = cursor++;
      const segments: Line[] = [line];
      while (cursor < input.length && input[cursor]!.text.trim() && !blockStarter(input[cursor]!.text) &&
        !(cursor + 1 < input.length && input[cursor]!.text.includes("|") && getAligns(input[cursor + 1]!.text))) {
        segments.push(input[cursor++]!);
      }
      result.push({type: "paragraph", children: inlineRows(segments), range: span(input, begin, cursor - 1)});
    }
    return result;
  }
  const children = blocks(lines.slice(startAt), 0);

  // ── 獨立語義驗證器 ──
  diagnostics.push(...validateSemantics({children}));
  // ── 所有診斷提供標準化輸入的 UTF-16 offset（CRLF 先轉 LF）──
  for (const d of diagnostics) {
    if (d.position.offset === undefined) {
      const row = lines[d.position.line - 1];
      d.position.offset = row ? (row.offset ?? 0) + Math.max(0, d.position.column - 1) : 0;
    }
  }
  return {type: "document", version: "1.1", metadata, children, diagnostics};
}
