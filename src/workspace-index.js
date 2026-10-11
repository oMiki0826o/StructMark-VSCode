/*
 * File: workspace-index.ts
 * Modification: 2026-10-11 — v1.5 可追溯來源檔案的工作區 ID／參照索引。
 */
import { visitAst } from './visitor.js';
import { normalizeWorkspacePath, resolveWorkspaceReference } from './workspace.js';
/** Non-destructive, browser-safe indexing. All file paths are workspace relative. */
export function buildWorkspaceIndex(documents) {
    const ids = new Map();
    const pending = [];
    const diagnostics = [];
    for (const entry of documents) {
        const path = normalizeWorkspacePath(entry.path);
        if (!path || !path.endsWith('.sm')) {
            diagnostics.push({ file: entry.path, code: 'MMK-S006', severity: 'warning', message: `無效的工作區文件路徑：${entry.path}`, position: { line: 1, column: 1 } });
            continue;
        }
        if (ids.has(path)) {
            diagnostics.push({ file: entry.path, code: 'MMK-S006', severity: 'warning', message: `重複的工作區文件路徑：${path}`, position: { line: 1, column: 1 } });
            continue;
        }
        const fileIds = new Set();
        ids.set(path, fileIds);
        // The visitor traverses heading children, nested blocks, labels and table cells.
        visitAst({ type: 'document', version: '1.1', metadata: {}, diagnostics: [], children: [...entry.document.children] }, {
            enter(node) {
                if (node.type === 'heading' && node.id)
                    fileIds.add(node.id.normalize('NFC'));
                if (node.type === 'footnoteDef')
                    fileIds.add(node.id.normalize('NFC'));
                if ('attrs' in node && typeof node.attrs.id === 'string')
                    fileIds.add(node.attrs.id.normalize('NFC'));
                if (node.type === 'ref')
                    pending.push({ from: path, node });
            },
        });
    }
    const references = pending.map(({ from, node }) => {
        const target = resolveWorkspaceReference(from, node.target);
        const resolved = !!(target && ids.get(target.path)?.has(target.id));
        if (!resolved)
            diagnostics.push({ file: from, code: 'MMK-S005', severity: 'warning', message: `未找到跨文件參照目標：${node.target}（來源：${from}）`, position: node.range.start });
        return { from, targetText: node.target, target, position: node.range.start, resolved };
    });
    const identifiers = Object.create(null);
    for (const [path, group] of ids)
        identifiers[path] = [...group];
    return { documents: [...ids.keys()], identifiers, references, diagnostics };
}
