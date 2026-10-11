/*
 * File: workspace.ts
 * Modification: 2026-10-11 — 瀏覽器相容的工作區相對路徑與參照解析。
 */

export interface WorkspaceReference { readonly path: string; readonly id: string; }

// ── 相對路徑邊界 ──
export function normalizeWorkspacePath(path: string): string | null {
  if (!path || path.startsWith('/') || /^(?:[a-zA-Z]:|\\\\|[a-z][\w+.-]*:)/i.test(path)) return null;
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else if (/\0/.test(part)) return null;
    else parts.push(part);
  }
  return parts.join('/') || null;
}

/** Reference paths are resolved beside the referring .sm document. */
export function resolveWorkspaceReference(from: string, target: string): WorkspaceReference | null {
  const sourcePath = normalizeWorkspacePath(from);
  if (!sourcePath || !sourcePath.endsWith('.sm')) return null;
  const hash = target.lastIndexOf('#');
  const rawPath = hash < 0 ? '' : target.slice(0, hash);
  const id = (hash < 0 ? target : target.slice(hash + 1)).normalize('NFC');
  if (!id || id.includes('#') || /[\x00-\x1f]/.test(id) || rawPath.startsWith('/')) return null;
  if (hash < 0 || rawPath === '') return {path: sourcePath, id};
  if (!rawPath.endsWith('.sm') || /^[a-z][\w+.-]*:/i.test(rawPath)) return null;
  const fromDirectory = sourcePath.includes('/') ? sourcePath.slice(0, sourcePath.lastIndexOf('/') + 1) : '';
  const path = normalizeWorkspacePath(fromDirectory + rawPath);
  return path ? {path, id} : null;
}
