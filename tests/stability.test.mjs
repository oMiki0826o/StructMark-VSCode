/*
 * File: stability.test.mjs
 * Modification: 2026-10-11 — Regression coverage for StructMark V1.1 stability fixes.
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import {
  fromMarkdown,
  normalizeSource,
  parseDocument,
  parseInline,
  renderHtml,
  toMarkdown,
  toMarkdownDetailed,
  validateWorkspace,
} from "../dist/index.js";

// ── Unicode 與 BOM 對映 ──
test("UTF-8 offset uses code points rather than UTF-16 surrogate halves", () => {
  const normalized = normalizeSource("A😀B");
  assert.equal(normalized.text, "A😀B");
  assert.deepEqual([0, 1, 2, 3, 4].map(normalized.byteOffsetAt), [0, 1, 1, 5, 6]);
  assert.equal(normalized.textOffsetAtOriginal(3), 3);
});

test("source mapping handles BOM, CRLF, and normalized offsets", () => {
  const normalized = normalizeSource("\uFEFF😀\r\nB");
  assert.equal(normalized.text, "😀\nB");
  assert.deepEqual([0, 1, 2, 3, 4].map(normalized.byteOffsetAt), [3, 3, 7, 9, 10]);
  assert.deepEqual([0, 1, 2, 3, 4].map(normalized.originalOffsetAt), [1, 2, 3, 5, 6]);
  assert.equal(normalized.textOffsetAtOriginal(4), 3);
});

// ── Markdown 輸入保護 ──
test("Markdown tilde fences retain a matching tilde closer", () => {
  const document = fromMarkdown("~~~js\n**literal**\n~~~\n\nAfter");
  assert.equal(document.children[0].type, "codeBlock");
  assert.equal(document.children[0].value, "**literal**");
  assert.equal(document.children[1].type, "paragraph");
  assert.equal(document.diagnostics.filter(d => d.code === "MMK-B002").length, 0);
});

test("Markdown code spans are not rewritten as StructMark strong spans", () => {
  const document = fromMarkdown("`**hi**` and **bold**");
  const nodes = document.children[0].children;
  assert.equal(nodes[0].type, "code");
  assert.equal(nodes[0].value, "**hi**");
  assert.ok(nodes.some(node => node.type === "strong"));
});

test("Markdown multi-backtick spans remain protected", () => {
  const document = fromMarkdown("``**hi**`` and ~~strike~~");
  const nodes = document.children[0].children;
  assert.equal(nodes[0].type, "code");
  assert.equal(nodes[0].value, "**hi**");
  assert.ok(nodes.some(node => node.type === "delete"));
});

// ── 參照與 Unicode ID ──
test("Nested inline formats receive numbering context", () => {
  const html = renderHtml(parseDocument("#1 Hello (#intro)\n\n*[See &ref[intro]]"), {numbering: true});
  assert.match(html, /<strong>See <a class="xref" href="#intro">1<\/a><\/strong>/);
});

test("Workspace references are validated in workspace pass only", () => {
  const first = parseDocument("&ref[b.sm#anchor]");
  const second = parseDocument("#1 Other (#anchor)");
  assert.equal(first.diagnostics.filter(d => d.code === "MMK-S003").length, 0);
  assert.equal(validateWorkspace([
    {path: "a.sm", document: first},
    {path: "b.sm", document: second},
  ]).length, 0);
});

test("Decomposed Unicode IDs normalize to NFC", () => {
  const document = parseDocument("&note[#e\u0301]\nHello\n&end\n\n&ref[é]");
  assert.equal(document.children[0].attrs.id, "é");
  assert.equal(document.diagnostics.filter(d => d.code === "MMK-S003").length, 0);
});

// ── 表格與匯出 ──
test("Double-backtick code spans do not split table columns", () => {
  const document = parseDocument("| A | B |\n| --- | --- |\n| ``a|b`` | c |");
  assert.equal(document.children[0].type, "table");
  assert.equal(document.children[0].rows[0].length, 2);
  assert.equal(document.diagnostics.filter(d => d.code === "MMK-T001").length, 0);
});

test("Unclosed ticks do not mask pipe separators", () => {
  const document = parseDocument("| A | B |\n| --- | --- |\n| `a | b |");
  assert.equal(document.children[0].type, "table");
  assert.equal(document.children[0].rows[0].length, 2);
});

test("Duplicate YAML keys produce diagnostics", () => {
  const document = parseDocument("---\ntitle: One\ntitle: Two\n---\n#1 Header");
  assert.ok(document.diagnostics.some(d => d.code === "MMK-M001"));
});

test("Directive exports are visible and loss is reported", () => {
  const document = parseDocument("&note\nThis is a note.\n&end");
  const exportResult = toMarkdownDetailed(document);
  assert.ok(exportResult.source.includes("&note"));
  assert.ok(exportResult.source.includes("This is a note."));
  assert.equal(exportResult.diagnostics[0]?.code, "SMK-C001");
  assert.equal(toMarkdown(document), exportResult.source);
});

test("Markdown ordered list serializes consecutive item numbers", () => {
  const document = parseDocument("3. One\n4. Two");
  assert.match(toMarkdown(document), /^3\. One\n4\. Two/m);
});

test("Markdown code fences lengthen around embedded triple backticks", () => {
  const document = parseDocument("~~~~text\n```embedded```\n~~~~");
  const markdown = toMarkdown(document);
  assert.ok(markdown.startsWith("````text"));
  assert.ok(markdown.includes("```embedded```"));
});

// ── 大量行內節點位置的正確性 ──
test("Inline multi-line locations retain absolute line/column positions", () => {
  const {nodes} = parseInline("first\n*[second]", {line: 3, column: 5, offset: 100});
  assert.equal(nodes[2]?.type, "strong");
  assert.equal(nodes[2]?.range.start.line, 4);
  assert.equal(nodes[2]?.range.start.column, 1);
  assert.equal(nodes[2]?.range.start.offset, 106);
});
