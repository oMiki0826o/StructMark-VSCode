/*
 * File: semantic.ts
 * Modification: 2026-10-10 — V0.4 將 ID、註腳、交叉參照語義驗證自區塊解析器拆分。
 */
import type {BlockNode, Diagnostic, Document, InlineNode} from "./types.js";
import {buildWorkspaceIndex} from "./workspace-index.js";

export interface WorkspaceDocument { readonly path: string; readonly document: Pick<Document, "children">; }

// ── 文件層識別碼與參照 ──
export function validateSemantics(document: Pick<Document, "children">): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const identifiers = new Set<string>();
  const footnotes = new Set<string>();
  const references: InlineNode[] = [];
  const footnoteReferences: InlineNode[] = [];
  function issue(code: string, message: string, line: number, column = 1, offset?: number): void {
    diagnostics.push({code, severity: "warning", message, position: {line, column, ...(offset === undefined ? {} : {offset})}});
  }
  function addId(id: string, line: number, column: number, offset?: number): void {
    if (identifiers.has(id)) issue("MMK-S001", `重複 ID：${id}`, line, column, offset);
    identifiers.add(id);
  }
  function visitInline(nodes: InlineNode[]): void {
    for (const node of nodes) {
      if (node.type === "ref") references.push(node);
      if (node.type === "footnoteRef") footnoteReferences.push(node);
      if ("attrs" in node && typeof node.attrs.id === "string") {
        addId(node.attrs.id, node.range.start.line, node.range.start.column, node.range.start.offset);
      }
      if ("children" in node) visitInline(node.children);
      if ("label" in node && Array.isArray(node.label)) visitInline(node.label);
    }
  }
  function visit(nodes: BlockNode[]): void {
    for (const node of nodes) {
      const p = node.range.start;
      if (node.type === "heading" && node.id) addId(node.id, p.line, p.column, p.offset);
      if (node.type === "footnoteDef") {
        if (footnotes.has(node.id)) issue("MMK-S002", `重複註腳定義：${node.id}`, p.line, p.column, p.offset);
        footnotes.add(node.id);
      }
      if (node.type === "directive" && typeof node.attrs.id === "string") addId(node.attrs.id, p.line, p.column, p.offset);
      if (node.type === "paragraph" || node.type === "heading" || node.type === "footnoteDef") visitInline(node.children);
      if (node.type === "table") {
        node.header.forEach(visitInline);
        node.rows.forEach(row => row.forEach(visitInline));
      }
      if (node.type === "blockquote" || node.type === "directive") visit(node.children);
      if (node.type === "list") node.items.forEach(item => visit(item.children));
    }
  }
  visit(document.children);
  for (const node of references) {
    if (node.type !== "ref" || identifiers.has(node.target)) continue;
    // Cross-document targets are validated by validateWorkspace(), not here.
    const separator = node.target.lastIndexOf("#");
    if (separator > 0 && node.target.slice(0, separator).endsWith(".sm")) continue;
    const p = node.range.start;
    issue("MMK-S003", `未找到參照目標：${node.target}`, p.line, p.column, p.offset);
  }
  for (const node of footnoteReferences) {
    if (node.type !== "footnoteRef" || footnotes.has(node.target)) continue;
    const p = node.range.start;
    issue("MMK-S004", `未找到註腳定義：${node.target}`, p.line, p.column, p.offset);
  }
  return diagnostics;
}

/** Validate references that explicitly name another .sm document: path#id. */
export function validateWorkspace(documents: readonly WorkspaceDocument[]): Diagnostic[] {
  return buildWorkspaceIndex(documents).diagnostics.map(({file: _file, ...diagnostic}) => diagnostic);
}
