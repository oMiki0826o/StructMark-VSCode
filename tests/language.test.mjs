/*
 * File: language.test.mjs
 * Modification: 2026-10-10 — 語言核心規格回歸、AST、容錯及 HTML 安全性測試。
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseDocument, parseInline, renderHtml, normalizeMath, validateMath, readAttributes, parseDelimited} from "../dist/index.js";

// ── 行內語法合格範例 ──
const cases = [
  ["*[粗體]", "strong"], ["/[斜體]", "em"], ["/*[粗斜體]", "em"],
  ["-[底線]", "underline"], ["~[刪除線]", "delete"], ["=[螢光]", "highlight"],
  ["^[2]", "sup"], ["_[i]", "sub"], ["&kbd[Ctrl+C]", "kbd"],
  ["&abbr[HTML]", "abbr"], ["&term[Lexer]", "term"], ["&var[x]", "var"],
  ["&lang[日本語]", "lang"], ["&ref[fig:m42]", "ref"],
  ["[GitHub](https://github.com)", "link"], ["![M42](m42.jpg)", "image"],
  ["[[Minecraft]]", "wiki"], ["[[Minecraft|麥塊]]", "wiki"],
  ["[&smith2024]", "citation"], ["[&smith2024; &jones2023]", "citation"],
  ["[^note]", "footnoteRef"], ["$E=mc^[2]$", "math"],
  ["%%忽略%%", "comment"], ["`*[not bold]`", "code"],
];
for (const [source, kind] of cases) test(`inline: ${source}`, () => {
  const {nodes, diagnostics} = parseInline(source);
  assert.equal(diagnostics.length, 0, JSON.stringify(diagnostics));
  assert.equal(nodes[0]?.type, kind);
});

test("巢狀行內樣式及 combined strong+em 的等價語義", () => {
  const shortcut = parseInline("/*[內容]").nodes;
  const nested = parseInline("/[*[內容]]").nodes;
  const dropPositions = value => JSON.parse(JSON.stringify(value, (key, v) => key === "range" ? undefined : v));
  assert.deepEqual(dropPositions(shortcut), dropPositions(nested));
  const ast = parseInline("*[外層 /[內層] 與 =[亮色]]").nodes[0];
  assert.equal(ast.type, "strong");
  assert.equal(ast.children[1].type, "em");
  assert.equal(ast.children[3].type, "highlight");
});
test("跳脫中括號與格式記號", () => {
  assert.equal(parseInline("\\*[文字]").nodes[0].value, "*[文字]");
  assert.equal(parseInline("*[abc\\]def]").nodes[0].children[0].value, "abc]def");
});
test("一般網址日期不會錯誤變為斜體", () => {
  const n = parseInline("2026/10/10 https://example.com/a/b").nodes;
  assert.equal(n.length, 1);
  assert.equal(n[0].type, "text");
});
test("數學簡寫只在適當位置轉換", () => {
  assert.equal(normalizeMath("E=mc^[2] + x_[i]"), "E=mc^{2} + x_{i}");
  assert.equal(normalizeMath("\\^[escaped]"), "\\^[escaped]");
  assert.equal(parseInline("$E=mc^[2]$").nodes[0].value, "E=mc^{2}");
});
test("數學驗證會診斷未平衡的大括號", () => {
  assert.equal(validateMath("x^{2}").length, 0);
  assert.equal(validateMath("\\frac{1{2}")[0]?.code, "MMK-M003");
  assert.equal(validateMath("\\begin{aligned}x\\end{aligned}").length, 0);
  assert.equal(validateMath("\\begin{aligned}x\\end{matrix}")[0]?.code, "MMK-M004");
});
test("不合法語法保留字面原文並回報警告", () => {
  const {nodes, diagnostics} = parseInline("*[未結尾");
  assert.equal(nodes[0].value, "*[未結尾");
  assert.equal(diagnostics[0].code, "MMK-I001");
});
test("外部輸入含括號及跳脫的 URL", () => {
  const {nodes} = parseInline("[示例](images/(draft).png)");
  assert.equal(nodes[0].target, "images/(draft).png");
});
test("圖片加屬性與文獻引用加屬性", () => {
  const {nodes, diagnostics} = parseInline("![M42](m42.jpg)[#fig:m42 width=600] [&chen2024][mode=narrative]");
  assert.equal(diagnostics.length, 0, JSON.stringify(diagnostics));
  assert.equal(nodes[0].attrs.id, "fig:m42");
  assert.equal(nodes[0].attrs.width, 600);
  assert.equal(nodes[2].attrs.mode, "narrative");
});
test("屬性引號與重複鍵診斷", () => {
  const diagnostics = [];
  assert.deepEqual(readAttributes('title="hello world" #foo enabled=true', {line:1,column:1}, diagnostics), {title:"hello world", id:"foo", enabled:true});
  assert.equal(readAttributes("id=foo id=bar", {line:1,column:1}, diagnostics), null);
  assert(diagnostics.some(d => d.code === "MMK-A002"));
});

// ── 區塊文法實例 ──
const blocks = [
  ["#1 標題", "heading"], ["#6 標題", "heading"], ["---", "thematicBreak"],
  ["- a\n- b", "list"], [". a\n. b", "list"], ["5. a\n6. b", "list"],
  ["- [o] 完成\n- [ ] 未完成", "list"], ["> 引用", "blockquote"],
  ["```py\nprint(1)\n```", "codeBlock"], ["$$\na=b\n$$", "directive"],
  ["%%\n隱藏\n%%", "commentBlock"], ["&note\n內容\n&end", "directive"],
  ["&equation[#eq:one]\nx^[2]\n&end", "directive"],
  ["&table[format=csv]\na,b\n1,2\n&end", "directive"],
  ["[^a]: 註腳內容", "footnoteDef"],
  ["| A | B |\n|---|---|\n| 1 | 2 |", "table"],
];
for (const [source, kind] of blocks) test(`block: ${source.split("\n")[0]}`, () => {
  const document = parseDocument(source);
  assert.equal(document.children[0].type, kind, JSON.stringify(document.children));
});
test("標題尾端 (#id) 被辨識為 ID，而普通括號保留", () => {
  const doc = parseDocument("#2 紅石系統 (#redstone)\n\n#2 普通 (附註)");
  assert.equal(doc.children[0].id, "redstone");
  assert.equal(doc.children[1].id, null);
});
test("普通 Setext 寫法不視為標題", () => {
  const doc = parseDocument("普通文字\n===");
  assert.equal(doc.children[0].type, "paragraph");
});
test("Metadata 與獨立 --- 分隔線互不干擾", () => {
  const doc = parseDocument('---\ntitle: "測試"\nlang: zh-TW\n---\n\n---');
  assert.equal(doc.metadata.title, "測試");
  assert.equal(doc.children[0].type, "thematicBreak");
  assert.equal(parseDocument("---").children[0].type, "thematicBreak");
});
test("巢狀清單可以包含子清單與多個段落", () => {
  const doc = parseDocument("- 父項目\n  - 子項目\n  - 子項目二\n- 另一項");
  assert.equal(doc.children[0].items.length, 2);
  assert.equal(doc.children[0].items[0].children[1].type, "list");
});
test(". 與 1. 不能在同一清單混為同一個節點", () => {
  const doc = parseDocument("1. A\n. B");
  assert.equal(doc.children.length, 2);
  assert.equal(doc.children[0].automatic, false);
  assert.equal(doc.children[1].automatic, true);
});
test("一般清單與 -[底線] 形式可區分", () => {
  const doc = parseDocument("- 列表\n\n-[底線]");
  assert.equal(doc.children[0].type, "list");
  assert.equal(doc.children[1].children[0].type, "underline");
});
test("& 區塊可巢狀，最近 &end 匹配內層", () => {
  const doc = parseDocument("&note\n外層\n&warning\n內層\n&end\n外層二\n&end");
  assert.equal(doc.children.length, 1);
  assert.equal(doc.children[0].type, "directive");
  assert.equal(doc.children[0].children[1].name, "warning");
  assert.equal(doc.children[0].children.length, 3);
});
test("指令正文的程式碼圍欄內 &end 不應關閉容器", () => {
  const doc = parseDocument("&note\n```txt\n&end\n```\n有效內文\n&end");
  assert.equal(doc.children[0].children[0].type, "codeBlock");
  assert.equal(doc.children[0].children[1].type, "paragraph");
  assert.equal(doc.diagnostics.length, 0);
});
test("多行 raw 資料區塊不解析其內部格式", () => {
  const doc = parseDocument("&data[format=json]\n{\"value\":\"*[literal]\"}\n&end");
  assert.equal(doc.children[0].raw, '{"value":"*[literal]"}');
});
test("標題與區塊 ID、註腳與交叉參照診斷", () => {
  const doc = parseDocument("#2 A (#same)\n#2 B (#same)\n引用 &ref[missing] 與註腳[^n]");
  const codes = doc.diagnostics.map(d => d.code);
  assert(codes.includes("MMK-S001"));
  assert(codes.includes("MMK-S003"));
  assert(codes.includes("MMK-S004"));
});
test("&end 孤立與未閉合 &note 都有診斷", () => {
  assert(parseDocument("&end").diagnostics.some(d => d.code === "MMK-B011"));
  assert(parseDocument("&note\n未關閉").diagnostics.some(d => d.code === "MMK-B010"));
});
test("GFM 表格跳脫豎線", () => {
  const doc = parseDocument("| A | B |\n|---|---|\n| a\\|b | ok |");
  assert.equal(doc.children[0].type, "table");
  assert.equal(doc.children[0].rows[0][0][0].value, "a|b");
});
test("表格欄數不符提供診斷", () => {
  const doc = parseDocument("| A | B |\n|---|---|\n| A | B | C |");
  assert(doc.diagnostics.some(d => d.code === "MMK-T001"));
});
test("CSV 內容含引號、逗號、換行", () => {
  assert.deepEqual(parseDelimited('a,b\n"a,b","line1\nline2"', ","), [["a","b"],["a,b","line1\nline2"]]);
  assert.throws(() => parseDelimited('a,"b', ","));
});
test("TSV 與 JSON 合併儲存格 HTML", () => {
  const csv = parseDocument("&table[format=tsv]\nA\tB\n1\t2\n&end");
  assert(renderHtml(csv).includes("<th>A</th>"));
  const json = parseDocument('&table[format=json]\n{"columns":["A","B"],"rows":[[{"text":"合併","colspan":2}]]}\n&end');
  assert(renderHtml(json).includes('colspan="2"'));
});

// ── 輸出安全與完整示例 ──
test("不允許腳本連結，不能插入 HTML 標記", () => {
  const doc = parseDocument('[click](javascript:alert(1)) <script>alert(1)</script>');
  const html = renderHtml(doc);
  assert(!html.includes('href="javascript:'));
  assert(!html.includes("<script>"));
  assert(html.includes("&lt;script&gt;"));
});
test("連結屬性只輸出白名單，阻擋任意 onerror", () => {
  const html = renderHtml(parseDocument('![x](x.png)[onerror="alert(1)" width=600]'));
  assert(html.includes('width="600"'));
  assert(!html.includes("onerror="));
});
test("程式碼與資料內容保持原樣不會轉成 HTML", () => {
  const html = renderHtml(parseDocument('```html\n<script>hi</script>\n```\n\n&raw\n<img src=x onerror=bad>\n&end'));
  assert(!html.includes("<script>"));
  assert(html.includes("&lt;script&gt;"));
  assert(html.includes("&lt;img"));
});
test("完整示範文件無語義診斷", () => {
  const source = readFileSync(new URL("../examples/spec-sample.sm", import.meta.url), "utf8");
  const doc = parseDocument(source);
  assert.deepEqual(doc.diagnostics, []);
  assert(doc.children.length > 10);
  assert(renderHtml(doc).includes('id="eq:energy"'));
});
test("空文件與巨大輸入提供穩定診斷", () => {
  assert.equal(parseDocument("").children.length, 0);
  assert.equal(parseDocument("a".repeat(2_000_001)).diagnostics[0].code, "MMK-D001");
});
test("無法辨識文字不應使解析器丟出例外：固定種子亂數壓力測試", () => {
  let seed = 19391;
  const charset = "[](){}@*-_$%:!.>\\ abc中日\n`\"|";
  for (let i = 0; i < 1200; i++) {
    let data = "";
    for (let n = 0, len = i % 130; n < len; n++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data += charset[seed % charset.length];
    }
    assert.doesNotThrow(() => renderHtml(parseDocument(data)));
  }
});
