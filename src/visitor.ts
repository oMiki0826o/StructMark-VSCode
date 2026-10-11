/*
 * File: visitor.ts
 * Modification: 2026-10-11 — 無副作用的深度優先 AST Visitor 公開 API。
 */
import type {Document, BlockNode, InlineNode, ListItem} from './types.js';

export type AstNode = Document | BlockNode | InlineNode | ListItem;
export interface AstVisitor {
  /** Return false to omit this node's children, not the leave callback. */
  readonly enter?: (node: AstNode, ancestors: readonly AstNode[]) => boolean | void;
  readonly leave?: (node: AstNode, ancestors: readonly AstNode[]) => void;
}

// ── 子節點順序 ──
function childrenOf(node: AstNode): AstNode[] {
  if (node.type === 'document') return node.children;
  if (node.type === 'list') return node.items;
  if (node.type === 'listItem' || node.type === 'blockquote' || node.type === 'directive') return node.children;
  if (node.type === 'table') return [...node.header.flat(), ...node.rows.flat(2)];
  if ('children' in node) return node.children;
  if ('label' in node && Array.isArray(node.label)) return node.label;
  return [];
}

/** Walk the tree without changing its nodes; the array of ancestors is an immutable snapshot. */
export function visitAst(document: Document, visitor: AstVisitor): void {
  type Frame = {node: AstNode; ancestors: readonly AstNode[]; exiting: boolean};
  const stack: Frame[] = [{node: document, ancestors: [], exiting: false}];
  while (stack.length) {
    const frame = stack.pop()!;
    if (frame.exiting) {visitor.leave?.(frame.node, frame.ancestors); continue;}
    const traverse = visitor.enter?.(frame.node, frame.ancestors) !== false;
    stack.push({...frame, exiting: true});
    if (!traverse) continue;
    const ancestors = [...frame.ancestors, frame.node];
    const children = childrenOf(frame.node);
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push({node: children[index]!, ancestors, exiting: false});
    }
  }
}
