// ── 子節點順序 ──
function childrenOf(node) {
    if (node.type === 'document')
        return node.children;
    if (node.type === 'list')
        return node.items;
    if (node.type === 'listItem' || node.type === 'blockquote' || node.type === 'directive')
        return node.children;
    if (node.type === 'table')
        return [...node.header.flat(), ...node.rows.flat(2)];
    if ('children' in node)
        return node.children;
    if ('label' in node && Array.isArray(node.label))
        return node.label;
    return [];
}
/** Walk the tree without changing its nodes; the array of ancestors is an immutable snapshot. */
export function visitAst(document, visitor) {
    const stack = [{ node: document, ancestors: [], exiting: false }];
    while (stack.length) {
        const frame = stack.pop();
        if (frame.exiting) {
            visitor.leave?.(frame.node, frame.ancestors);
            continue;
        }
        const traverse = visitor.enter?.(frame.node, frame.ancestors) !== false;
        stack.push({ ...frame, exiting: true });
        if (!traverse)
            continue;
        const ancestors = [...frame.ancestors, frame.node];
        const children = childrenOf(frame.node);
        for (let index = children.length - 1; index >= 0; index--) {
            stack.push({ node: children[index], ancestors, exiting: false });
        }
    }
}
