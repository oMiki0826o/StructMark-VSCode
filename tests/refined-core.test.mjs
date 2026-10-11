/*
 * File: refined-core.test.mjs
 * Modification: 2026-10-11 — 由實際 parser 與 converter 驗證修補功能。
 * Must run within the complete StructMark project after `npm run build`.
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import {parseDocument, toMarkdown, toMarkdownDetailed, validateWorkspace} from "../dist/index.js";

test("pipe inside a table cell is escaped for Markdown", () => {
  const document = parseDocument("| Word | Note |\n| --- | --- |\n| Test | A \\| B |");
  const output = toMarkdown(document);
  assert.match(output, /A \\\| B/);
});
test("combined emphasis survives Markdown conversion", () => {
  const document = parseDocument("/*[both bold and italic]");
  assert.match(toMarkdown(document), /\*\*\*both bold and italic\*\*\*/);
});
test("workspace resolves explicit ./ and ../ references", () => {
  const intro = parseDocument("&ref[../reference.sm#intro]");
  const ref = parseDocument("#1 Intro (#intro)");
  assert.deepEqual(validateWorkspace([
    {path: "guides/getting-started.sm", document: intro},
    {path: "reference.sm", document: ref},
  ]), []);
});

// ── 格式降級警告 ──
test("nested highlight/underline nodes report Markdown semantic loss", () => {
  const source = "*[Important =[marked] and -[underlined]]";
  const exported = toMarkdownDetailed(parseDocument(source));
  assert.equal(exported.diagnostics.filter(d => d.code === "SMK-C002").length, 2);
  assert.match(exported.source, /marked/);
});
