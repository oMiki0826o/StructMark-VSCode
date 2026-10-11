/*
 * File: types.ts
 * Modification: 2026-10-10 — V0.4 行內來源區間、未知命名空間指令 AST。
 */

// ── 共用資料 ──
export interface Position { line: number; column: number; offset?: number; }
export interface SourceRange { start: Position; end: Position; }
export interface Diagnostic { code: string; severity: "warning" | "error"; message: string; position: Position; }
export type Attributes = Record<string, string | number | boolean>;

// ── 行內節點 ──
export type InlinePayload =
  | { type: "text"; value: string }
  | { type: "code" | "math" | "comment"; value: string }
  | { type: "softbreak" | "hardbreak" }
  | { type: "strong" | "em" | "underline" | "delete" | "highlight" | "sup" | "sub" | "kbd" | "abbr" | "term" | "var" | "lang"; children: InlineNode[]; attrs: Attributes }
  | { type: "inlineDirective"; name: string; children: InlineNode[]; attrs: Attributes }
  | { type: "link" | "image"; label: InlineNode[]; target: string; attrs: Attributes }
  | { type: "wiki"; target: string; label: string }
  | { type: "ref" | "footnoteRef"; target: string }
  | { type: "citation"; keys: string[]; locator: string | null; attrs: Attributes };
export type InlineNode = InlinePayload & { range: SourceRange };

// ── 區塊節點 ──
export type BlockNode =
  | { type: "heading"; level: number; children: InlineNode[]; id: string | null; range: SourceRange }
  | { type: "paragraph"; children: InlineNode[]; range: SourceRange }
  | { type: "thematicBreak"; range: SourceRange }
  | { type: "codeBlock"; lang: string | null; value: string; range: SourceRange }
  | { type: "commentBlock"; value: string; range: SourceRange }
  | { type: "blockquote"; children: BlockNode[]; range: SourceRange }
  | { type: "list"; ordered: boolean; automatic: boolean; start: number | null; items: ListItem[]; range: SourceRange }
  | { type: "table"; header: InlineNode[][]; aligns: ("left" | "center" | "right" | null)[]; rows: InlineNode[][][]; range: SourceRange }
  | { type: "directive"; name: string; attrs: Attributes; children: BlockNode[]; raw: string | null; range: SourceRange }
  | { type: "footnoteDef"; id: string; children: InlineNode[]; range: SourceRange };

export interface ListItem {
  type: "listItem";
  task: boolean | null;
  children: BlockNode[];
  range: SourceRange;
}
export interface Document {
  type: "document";
  version: "1.1";
  metadata: Record<string, unknown>;
  children: BlockNode[];
  diagnostics: Diagnostic[];
}
