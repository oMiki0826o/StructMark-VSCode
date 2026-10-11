import test from "node:test";
import assert from "node:assert/strict";
import {DirectiveRegistry, lexDocument, lexLine, parseDocument, parseInline, renderHtml, serializeAst, getDefaultDirectiveRegistry, normalizeSource, validateWorkspace, fromMarkdown, toMarkdown} from "../dist/index.js";
import {formatSource} from "../dist/index.js";
import {formatBibliography, formatCitation, parseBibTeX, parseCslJson} from "../dist/index.js";

test("citation data APIs parse BibTeX and CSL JSON deterministically", () => {
  const bib = parseBibTeX('@article{smith2024, author = {Smith, Ada and Doe, Lin}, title = {A Study}, year = {2024}}');
  const csl = parseCslJson(JSON.stringify([{id: "doe2023", author: [{family: "Doe", given: "Lin"}], title: "Another Study", issued: {"date-parts": [[2023]]}}]));
  assert.equal(bib.get("smith2024")?.title, "A Study");
  assert.equal(csl.get("doe2023")?.year, "2023");
  assert.equal(formatCitation(["smith2024", "doe2023"], new Map([...bib, ...csl])), "(Smith & Doe, 2024; Doe, 2023)");
});

test("citation formatter supports documented APA and IEEE profiles", () => {
  const entries = new Map(parseBibTeX('@article{smith2024, author = {Smith, Ada and Doe, Lin}, title = {A Study}, journal = {Journal}, year = {2024}, volume = {2}, pages = {10--20} }'));
  assert.equal(formatCitation(["smith2024"], entries, {style: "apa"}), "(Smith & Doe, 2024)");
  assert.equal(formatCitation(["smith2024"], entries, {style: "ieee"}), "[1]");
  assert.deepEqual(formatBibliography(["smith2024"], entries, {style: "apa"}), ["Smith & Doe (2024). A Study. Journal, 2, 10–20."]);
});

test("KaTeX is an opt-in safe math renderer", () => {
  const document = parseDocument("Inline $E=mc^[2]$\n\n$$\n\\frac{1}{2}\n$$");
  const html = renderHtml(document, {math: "katex"});
  assert.match(html, /math-katex/);
  assert.match(html, /katex/);
  assert.doesNotMatch(html, /<script/);
});

test("round-trip formatter preserves semantics and normalizes safe source boundaries", () => {
  const source = "#1 Title\r\n\r\n```text\r\n@unknown stays literal\r\n```\r\n";
  const formatted = formatSource(source);
  assert.equal(formatted.source, "#1 Title\n\n```text\n@unknown stays literal\n```\n");
  assert.deepEqual(parseDocument(formatted.source).children, parseDocument(source).children);
  assert.equal(formatted.changed, true);
});

test("metadata accepts YAML 1.2 nested maps, sequences, and block scalars", () => {
  const document = parseDocument("---\ntitle: StructMark\nsettings:\n  enabled: true\n  tags: [language, docs]\nsummary: |\n  first line\n  second line\n---\n#1 Body");
  assert.equal(document.diagnostics.length, 0);
  assert.deepEqual(document.metadata.settings, {enabled: true, tags: ["language", "docs"]});
  assert.equal(document.metadata.summary, "first line\nsecond line\n");
});

test("Markdown import and export cover the documented common subset", () => {
  const document = fromMarkdown("# Title {#intro}\n\n**bold** and [link](https://example.com).\n\n- one\n- two\n\n> quote\n\n```ts\nconst x = 1;\n```");
  assert.equal(document.children[0]?.type, "heading");
  assert.equal(document.children.some((node) => node.type === "list"), true);
  assert.match(toMarkdown(document), /# Title \{#intro\}/);
  assert.match(toMarkdown(document), /\*\*bold\*\*/);
  assert.match(toMarkdown(document), /```ts/);
});

test("optional numbering labels sections, figures, tables, equations, and references", () => {
  const document = parseDocument(`#1 Intro (#intro)\nSee &ref[fig:one].\n&figure[id=fig:one]\nA diagram\n&end\n&equation[id=eq:one]\nx = 1\n&end`);
  const html = renderHtml(document, {numbering: true});
  assert.match(html, /data-number="1"/);
  assert.match(html, /Figure 1/);
  assert.match(html, /Equation 1/);
  assert.match(html, /href="#fig:one">Figure 1<\/a>/);
});

test("V1.0 registry exposes separate inline, block, and raw-block directives", () => {
  const registry = getDefaultDirectiveRegistry();
  assert.equal(registry.get("kbd")?.kind, "inline");
  assert.equal(registry.get("note")?.kind, "block");
  assert.equal(registry.get("data")?.kind, "rawBlock");
  assert.equal(registry.get("not-real"), undefined);
});

test("V1.0 source normalization keeps CRLF mapping and UTF-8 byte offsets", () => {
  const source = normalizeSource("甲\r\n\ud83d\ude00\r\n乙");
  assert.equal(source.text, "甲\n\ud83d\ude00\n乙");
  assert.deepEqual(source.originalOffsetAt(2), 3);
  assert.equal(source.byteOffsetAt(2), 5);
  assert.equal(source.textOffsetAtOriginal(3), 2);
});

test("V1.0 parse reports an isolated closing directive without swallowing later blocks", () => {
  const document = parseDocument("&end\n\n#1 Kept");
  assert.equal(document.children[0]?.type, "heading");
  assert.ok(document.diagnostics.some((diagnostic) => diagnostic.code === "MMK-B011"));
});

test("V1.0 parser uses a caller registry for custom block directives", () => {
  const registry = new DirectiveRegistry().register({name: "custom", kind: "block", attributes: ["title"]});
  const document = parseDocument("&custom[title=ok]\nbody\n&end", {registry});
  assert.equal(document.children[0]?.type, "directive");
  assert.equal(document.children[0]?.name, "custom");
  assert.equal(document.diagnostics.length, 0);
});

test("V1.0 directive schemas diagnose unknown attributes without dropping the block", () => {
  const document = parseDocument("&note[title=ok extra=yes]\nbody\n&end");
  assert.equal(document.children[0]?.type, "directive");
  assert.ok(document.diagnostics.some((diagnostic) => diagnostic.code === "MMK-A003"));
});

test("V1.0 lexer classifies block starts without parsing inline content", () => {
  assert.equal(lexLine("#2 Title").kind, "heading");
  assert.equal(lexLine("- [ ] task").kind, "list");
  assert.equal(lexLine("&note[title=hi]").kind, "directive");
  assert.equal(lexLine("&end").kind, "directiveEnd");
  assert.equal(lexLine("*[not a block]").kind, "text");
});

test("V1.0 lexer keeps normalized LF offsets and raw protected lines identifiable", () => {
  const tokens = lexDocument("```json\r\n&note\r\n```");
  assert.deepEqual(tokens.map((token) => token.kind), ["fence", "directive", "fence"]);
  assert.equal(tokens[1]?.start, 8);
  assert.equal(tokens[1]?.line, 2);
});

test("V1.0 inline parser accepts a registered custom directive and preserves its range", () => {
  const registry = new DirectiveRegistry().register({name: "mark", kind: "inline", attributes: ["tone"]});
  const result = parseInline("前 &mark[字][tone=hot] 後", {line: 2, column: 3, offset: 10}, undefined, {registry});
  const node = result.nodes.find((candidate) => candidate.type === "inlineDirective");
  assert.equal(node?.type, "inlineDirective");
  assert.equal(node?.name, "mark");
  assert.equal(node?.range.start.line, 2);
  assert.equal(result.diagnostics.length, 0);
});

test("V1.0 inline registry reports an unknown attribute without losing custom content", () => {
  const registry = new DirectiveRegistry().register({name: "mark", kind: "inline", attributes: ["tone"]});
  const result = parseInline("&mark[字][unknown=x]", undefined, undefined, {registry});
  assert.ok(result.nodes.some((candidate) => candidate.type === "inlineDirective"));
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "MMK-A003"));
});

test("V1.0 AST serialization is deterministic and preserves diagnostics", () => {
  const first = serializeAst(parseDocument("#1 標題\n\n&end"));
  const second = serializeAst(parseDocument("#1 標題\n\n&end"));
  assert.equal(first, second);
  const parsed = JSON.parse(first);
  assert.equal(parsed.type, "document");
  assert.equal(parsed.diagnostics[0].code, "MMK-B011");
  assert.ok(first.indexOf('"children"') < first.indexOf('"diagnostics"'));
});

test("StructMark uses ampersand block directives", () => {
  const document = parseDocument("&note[title=ok]\nBody\n&end");
  assert.equal(document.children[0]?.type, "directive");
  assert.equal(document.children[0]?.name, "note");
  assert.equal(document.diagnostics.length, 0);
});

test("ampersand directive aliases normalize to canonical names", () => {
  const document = parseDocument("&n[title=ok]\nBody\n&e");
  assert.equal(document.children[0]?.type, "directive");
  assert.equal(document.children[0]?.name, "note");
  assert.equal(document.diagnostics.length, 0);
});

test("ampersand directives allow spaced boolean attributes", () => {
  const document = parseDocument("&test [typing]\nTest\n&e");
  assert.equal(document.children[0]?.type, "directive");
  assert.equal(document.children[0]?.name, "test");
  assert.deepEqual(document.children[0]?.attrs, {typing: true});
  assert.equal(document.diagnostics.length, 0);
});

test("StructMark documents expose the stable 1.1 language version", () => {
  const document = parseDocument("#1 Stable document");
  assert.equal(document.version, "1.1");
});

test("Unicode identifiers normalize canonically before duplicate checks", () => {
  const document = parseDocument("#1 First (\u0023café)\n#1 Second (\u0023cafe\u0301)");
  assert.equal(document.children[0]?.type, "heading");
  assert.equal(document.children[1]?.type, "heading");
  assert.equal(document.children[0]?.id, "café");
  assert.equal(document.children[1]?.id, "café");
  assert.ok(document.diagnostics.some((diagnostic) => diagnostic.code === "MMK-S001"));
});

test("workspace validation resolves explicit cross-file references", () => {
  const guide = parseDocument("#1 Introduction (#intro)");
  const index = parseDocument("See &ref[guide.sm#intro].");
  const missing = parseDocument("See &ref[missing.sm#nope].");
  assert.equal(validateWorkspace([
    {path: "guide.sm", document: guide},
    {path: "index.sm", document: index},
  ]).length, 0);
  assert.ok(validateWorkspace([
    {path: "guide.sm", document: guide},
    {path: "missing.sm", document: missing},
  ]).some((diagnostic) => diagnostic.code === "MMK-S005"));
});
