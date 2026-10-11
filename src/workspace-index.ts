/*
 * File: workspace-index.ts
 * Modification: 2026-10-11 — v1.5 可追溯來源檔案的工作區 ID／參照索引。
 */
import {visitAst} from './visitor.js';
import {normalizeWorkspacePath, resolveWorkspaceReference, type WorkspaceReference} from './workspace.js';
import type {Diagnostic, Position, SourceRange, Document} from './types.js';

export interface IndexedWorkspaceDocument {
  readonly path: string;
  readonly document: Pick<Document, 'children'>;
}
export interface WorkspaceDiagnostic extends Diagnostic {readonly file: string}
export interface IndexedWorkspaceReference {
  readonly from: string;
  readonly targetText: string;
  readonly target: WorkspaceReference | null;
  readonly position: Position;
  readonly resolved: boolean;
}
export interface WorkspaceIndex {
  readonly documents: readonly string[];
  readonly identifiers: Readonly<Record<string, readonly string[]>>;
  readonly references: readonly IndexedWorkspaceReference[];
  readonly diagnostics: readonly WorkspaceDiagnostic[];
}

/** Non-destructive, browser-safe indexing. All file paths are workspace relative. */
export function buildWorkspaceIndex(documents: readonly IndexedWorkspaceDocument[]): WorkspaceIndex {
  const ids = new Map<string, Set<string>>();
  const pending: Array<{from: string; node: {target:string;range:SourceRange}}> = [];
  const diagnostics: WorkspaceDiagnostic[] = [];
  for (const entry of documents) {
    const path = normalizeWorkspacePath(entry.path);
    if (!path || !path.endsWith('.sm')) {
      diagnostics.push({file: entry.path, code:'MMK-S006',severity:'warning',message:`無效的工作區文件路徑：${entry.path}`,position:{line:1,column:1}});
      continue;
    }
    if (ids.has(path)) {
      diagnostics.push({file: entry.path, code:'MMK-S006',severity:'warning',message:`重複的工作區文件路徑：${path}`,position:{line:1,column:1}});
      continue;
    }
    const fileIds = new Set<string>();
    ids.set(path,fileIds);
    // The visitor traverses heading children, nested blocks, labels and table cells.
    visitAst({type:'document',version:'1.1',metadata:{},diagnostics:[],children:[...entry.document.children]}, {
      enter(node) {
        if (node.type==='heading' && node.id) fileIds.add(node.id.normalize('NFC'));
        if (node.type==='footnoteDef') fileIds.add(node.id.normalize('NFC'));
        if ('attrs' in node && typeof node.attrs.id==='string') fileIds.add(node.attrs.id.normalize('NFC'));
        if (node.type==='ref') pending.push({from:path,node});
      },
    });
  }
  const references: IndexedWorkspaceReference[] = pending.map(({from,node})=>{
    const target=resolveWorkspaceReference(from,node.target);
    const resolved=!!(target && ids.get(target.path)?.has(target.id));
    if (!resolved) diagnostics.push({file:from,code:'MMK-S005',severity:'warning',message:`未找到跨文件參照目標：${node.target}（來源：${from}）`,position:node.range.start});
    return {from,targetText:node.target,target,position:node.range.start,resolved};
  });
  const identifiers: Record<string,readonly string[]>=Object.create(null) as Record<string,readonly string[]>;
  for (const [path,group] of ids) identifiers[path]=[...group];
  return {documents:[...ids.keys()],identifiers,references,diagnostics};
}
