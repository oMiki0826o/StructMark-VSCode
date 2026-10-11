import { buildWorkspaceIndex } from "./workspace-index.js";
// ── 文件層識別碼與參照 ──
export function validateSemantics(document) {
    const diagnostics = [];
    const identifiers = new Set();
    const footnotes = new Set();
    const references = [];
    const footnoteReferences = [];
    function issue(code, message, line, column = 1, offset) {
        diagnostics.push({ code, severity: "warning", message, position: { line, column, ...(offset === undefined ? {} : { offset }) } });
    }
    function addId(id, line, column, offset) {
        if (identifiers.has(id))
            issue("MMK-S001", `重複 ID：${id}`, line, column, offset);
        identifiers.add(id);
    }
    function visitInline(nodes) {
        for (const node of nodes) {
            if (node.type === "ref")
                references.push(node);
            if (node.type === "footnoteRef")
                footnoteReferences.push(node);
            if ("attrs" in node && typeof node.attrs.id === "string") {
                addId(node.attrs.id, node.range.start.line, node.range.start.column, node.range.start.offset);
            }
            if ("children" in node)
                visitInline(node.children);
            if ("label" in node && Array.isArray(node.label))
                visitInline(node.label);
        }
    }
    function visit(nodes) {
        for (const node of nodes) {
            const p = node.range.start;
            if (node.type === "heading" && node.id)
                addId(node.id, p.line, p.column, p.offset);
            if (node.type === "footnoteDef") {
                if (footnotes.has(node.id))
                    issue("MMK-S002", `重複註腳定義：${node.id}`, p.line, p.column, p.offset);
                footnotes.add(node.id);
            }
            if (node.type === "directive" && typeof node.attrs.id === "string")
                addId(node.attrs.id, p.line, p.column, p.offset);
            if (node.type === "paragraph" || node.type === "heading" || node.type === "footnoteDef")
                visitInline(node.children);
            if (node.type === "table") {
                node.header.forEach(visitInline);
                node.rows.forEach(row => row.forEach(visitInline));
            }
            if (node.type === "blockquote" || node.type === "directive")
                visit(node.children);
            if (node.type === "list")
                node.items.forEach(item => visit(item.children));
        }
    }
    visit(document.children);
    for (const node of references) {
        if (node.type !== "ref" || identifiers.has(node.target))
            continue;
        // Cross-document targets are validated by validateWorkspace(), not here.
        const separator = node.target.lastIndexOf("#");
        if (separator > 0 && node.target.slice(0, separator).endsWith(".sm"))
            continue;
        const p = node.range.start;
        issue("MMK-S003", `未找到參照目標：${node.target}`, p.line, p.column, p.offset);
    }
    for (const node of footnoteReferences) {
        if (node.type !== "footnoteRef" || footnotes.has(node.target))
            continue;
        const p = node.range.start;
        issue("MMK-S004", `未找到註腳定義：${node.target}`, p.line, p.column, p.offset);
    }
    return diagnostics;
}
/** Validate references that explicitly name another .sm document: path#id. */
export function validateWorkspace(documents) {
    return buildWorkspaceIndex(documents).diagnostics.map(({ file: _file, ...diagnostic }) => diagnostic);
}
