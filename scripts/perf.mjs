#!/usr/bin/env node
/**
 * Deterministic large-document performance check for the language core.
 * The limits are intentionally conservative: this is a regression signal,
 * not a machine-independent benchmark claim.
 */
import {parseDocument, renderHtml} from "../dist/index.js";

const repetitions = 12_000;
const source = Array.from({length: repetitions}, (_, index) => [
  `#3 Section ${index + 1} (#section-${index + 1})`,
  "A paragraph with *[structure]*, a [[reference]], and a stable source range.",
  `- item ${index + 1}`,
  "  - nested item",
  "",
].join("\n")).join("\n");

const started = performance.now();
const document = parseDocument(source);
const parsedAt = performance.now();
const html = renderHtml(document);
const finished = performance.now();
const result = {
  repetitions,
  sourceBytes: Buffer.byteLength(source, "utf8"),
  htmlBytes: Buffer.byteLength(html, "utf8"),
  headings: document.children.filter((node) => node.type === "heading").length,
  diagnostics: document.diagnostics.length,
  parseMs: Number((parsedAt - started).toFixed(2)),
  renderMs: Number((finished - parsedAt).toFixed(2)),
  totalMs: Number((finished - started).toFixed(2)),
};

if (result.diagnostics !== 0 || result.headings !== repetitions || !html.includes("section-12000")) {
  throw new Error(`large-document invariant failed: ${JSON.stringify(result)}`);
}
if (result.totalMs > 10_000) {
  throw new Error(`large-document regression exceeded 10s: ${JSON.stringify(result)}`);
}

console.log(JSON.stringify(result, null, 2));
