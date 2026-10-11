/*
 * File: v04.test.mjs
 * Modification: 2026-10-10 — V0.4 巢狀區塊、掛靠縮排、原始資料、表格格位、來源位置測試。
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import {parseDocument, parseInline, renderHtml, parseStructuredTable} from "../dist/index.js";

// ── JSON 表格格位與安全性 ──
const t = (columns, rows) => JSON.stringify({columns, rows});
const tableCases = [
  ["基本資料", t(["A", "B"], [["1", "2"]]), true],
  ["跨欄", t(["A", "B"], [[{text:"x", colspan:2}]]), true],
  ["跨列", t(["A", "B"], [[{text:"x", rowspan:2}, "y"], ["z"]]), true],
  ["完整混合 span", t(["A", "B", "C"], [[{text:"x", colspan:2, rowspan:2}, "z"], ["w"]]), true],
  ["缺格", t(["A", "B"], [["x"]]), false],
  ["多格", t(["A"], [["x", "y"]]), false],
  ["span 跨越欄界", t(["A", "B"], [[{text:"x", colspan:3}]]), false],
  ["span 超過列界", t(["A"], [[{text:"x", rowspan:2}]]), false],
  ["span 值為小數", t(["A"], [[{text:"x", colspan:1.5}]]), false],
  ["span 值為字串", t(["A"], [[{text:"x", rowspan:"2"}]]), false],
  ["span 衝突", t(["A", "B"], [[{text:"x", rowspan:2}, "y"], [{text:"z", colspan:2}]]), false],
  ["未知儲存格型別", t(["A"], [[null]]), false],
  ["cell text 非字串", t(["A"], [[{text:{a:1}}]]), false],
  ["欄名非字串", t(["A", 4], [["x", "y"]]), false],
  ["缺少 columns", '{"rows":[]}', false],
  ["JSON 不合法", '{"columns":', false],
  ["最外層是陣列", '[]', false],
];
for (const [name, raw, expected] of tableCases) {
  test(`structured table: ${name}`, () => {
    const result = parseStructuredTable(raw);
    assert.equal(result.value !== null, expected, JSON.stringify(result.errors));
    const doc = parseDocument(`&table[format=json]\n${raw}\n&end`);
    assert.equal(doc.diagnostics.some(d => d.code === "MMK-T002"), !expected);
  });
}

test("結構化表格跨列能正確輸出 HTML", () => {
  const source = `&table[format=json]\n${t(["A", "B"], [[{text:"a", rowspan:2}, "b"], ["c"]])}\n&end`;
  const html = renderHtml(parseDocument(source));
  assert(html.includes('rowspan="2"'));
  assert.equal((html.match(/<tr>/g) ?? []).length, 3); // 包含標頭
});
test("無效 JSON 表格不輸出不合法的跨列 HTML", () => {
  const source = `&table[format=json]\n${t(["A"], [[{text:"a", rowspan:3}]])}\n&end`;
  const html = renderHtml(parseDocument(source));
  assert(html.includes('class="invalid-data"'));
  assert(!html.includes('rowspan="3"'));
});
test("表格儲存格文字絕不當作 HTML", () => {
  const source = `&table[format=json]\n${t(["A"], [["<svg onload=alert(1)>"]])}\n&end`;
  const html = renderHtml(parseDocument(source));
  assert(!html.includes("<svg"));
  assert(html.includes("&lt;svg"));
});

// ── CSV/TSV 與 &raw 區塊 ──
for (const [name, raw, expectedCode] of [
  ["欄數不一致", "A,B\n1", "MMK-T003"],
  ["未閉合的引號", 'A,B\n"x,y', "MMK-T004"],
  ["缺少格式", "A,B", "MMK-T005"],
]) {
  test(`CSV/TSV 區塊診斷：${name}`, () => {
    const format = name === "缺少格式" ? "" : "[format=csv]";
    const d = parseDocument(`&table${format}\n${raw}\n&end`);
    assert(d.diagnostics.some(x => x.code === expectedCode));
  });
}
test("原始資料 &end 可透過反斜線表示字面文字", () => {
  const d = parseDocument("&raw\nstart\n\\&end\nend\n&end");
  assert.equal(d.children[0].raw, "start\n&end\nend");
  assert.equal(d.diagnostics.length, 0);
});
test("巢狀 raw 區塊不將其內部 &note 當成巢狀起點", () => {
  const src = "&note\n&raw\n&note\nHello\n&end\nOutside\n&end";
  const d = parseDocument(src);
  assert.equal(d.diagnostics.length, 0, JSON.stringify(d.diagnostics));
  assert.equal(d.children[0].children.length, 2);
  assert.equal(d.children[0].children[0].raw, "&note\nHello");
});
test("程式碼圍欄與多行註解都不會誤關閉 & 容器", () => {
  const src = "&note\n%%\n&end\n%%\n```text\n&end\n```\nfinish\n&end";
  const d = parseDocument(src);
  assert.equal(d.diagnostics.length, 0);
  assert.equal(d.children[0].children.at(-1).type, "paragraph");
});
test("&kbd 行首時必須仍是行內語義節點", () => {
  const d = parseDocument("&kbd[Ctrl+C]");
  assert.equal(d.children[0].type, "paragraph");
  assert.equal(d.children[0].children[0].type, "kbd");
  assert.equal(d.diagnostics.length, 0);
});
test("未知行內形式不會被錯誤當作區塊", () => {
  const d = parseDocument("&custom[not-attrs]");
  assert.equal(d.children[0].type, "paragraph");
  assert.equal(d.diagnostics.length, 0);
});
test("未知區塊產生警告但完整保留正文", () => {
  const d = parseDocument("&custom[title=hello]\n正文\n&end");
  assert.equal(d.children[0].name, "custom");
  assert.equal(d.children[0].children[0].children[0].value, "正文");
  assert(d.diagnostics.some(x => x.code === "MMK-B013"));
});

// ── 清單容器、續行、編號 ──
test("清單以空白行分開項目時仍屬於同一個清單", () => {
  const d = parseDocument("- First\n\n- Second");
  assert.equal(d.children.length, 1);
  assert.equal(d.children[0].items.length, 2);
});
test("長數字清單採標記總寬度進行掛靠縮排", () => {
  const d = parseDocument("10. First\n    continuation\n11. Second");
  assert.equal(d.children[0].items.length, 2);
  assert.equal(d.children[0].items[0].children.length, 1);
  assert.equal(d.children[0].items[0].children[0].children.some(x => x.type === "softbreak"), true);
});
test("巢狀清單內可以有多段落和程式碼", () => {
  const d = parseDocument("- 第一段\n\n  第二段\n\n  ```ts\n  x\n  ```\n- 下一項");
  assert.equal(d.children[0].items[0].children.length, 3);
  assert.equal(d.children[0].items[0].children[2].type, "codeBlock");
  assert.equal(d.children[0].items.length, 2);
});

// ── 位置：原始碼經換行、縮排、表格與巢狀後仍可定位 ──
test("行內節點範圍為半開區間，Offset 從零開始", () => {
  const s = "ab *[粗體] c";
  const nodes = parseInline(s).nodes;
  const strong = nodes[1];
  assert.equal(strong.type, "strong");
  assert.deepEqual(strong.range.start, {line:1, column:4, offset:3});
  assert.deepEqual(strong.range.end, {line:1, column:9, offset:8});
  assert.deepEqual(strong.children[0].range.start, {line:1, column:6, offset:5});
});
test("標題內樣式使用實際來源位置", () => {
  const s = "#2 前綴 *[粗體] (#heading)";
  const d = parseDocument(s);
  const strong = d.children[0].children[1];
  assert.equal(strong.range.start.offset, s.indexOf("*[") );
  assert.equal(strong.range.end.offset, s.indexOf("*[") + "*[粗體]".length);
});
test("清單與引用內行內格式的來源位置不是虛構的第一欄", () => {
  const a = parseDocument("- *[清單]").children[0].items[0].children[0].children[0];
  const b = parseDocument("> *[引用]").children[0].children[0].children[0];
  assert.equal(a.range.start.column, 3);
  assert.equal(b.range.start.column, 3);
});
test("GFM 表格儲存格能追蹤原始欄位位置", () => {
  const d = parseDocument("| Name | V |\n|---|---|\n| A | 1 |");
  assert.equal(d.children[0].header[0][0].range.start.column, 3);
  assert.equal(d.children[0].header[1][0].range.start.column, 10);
  assert.equal(d.children[0].rows[0][0][0].range.start.line, 3);
  assert.equal(d.children[0].rows[0][0][0].range.start.column, 3);
});
test("多行段落的 offset 對應到真實第二行", () => {
  const s = "第一行\n第二行含 *[樣式]";
  const d = parseDocument(s);
  const span = d.children[0].children.find(n => n.type === "strong").range;
  assert.equal(span.start.line, 2);
  assert.equal(span.start.column, 6);
  assert.equal(span.start.offset, s.indexOf("*["));
});
test("語義診斷指出實際參照 token 的位置", () => {
  const s = "前文，&ref[missing]";
  const d = parseDocument(s);
  const diagnostic = d.diagnostics.find(x => x.code === "MMK-S003");
  assert.equal(diagnostic.position.offset, s.indexOf("&ref"));
  assert.equal(diagnostic.position.column, s.indexOf("&ref") + 1);
});
test("原始輸入 CRLF 換行會先正規化並採 UTF-16 offset", () => {
  const d = parseDocument("第一行\r\n*[測試]");
  assert.equal(d.children[0].children.at(-1).range.start.line, 2);
  assert.equal(d.children[0].children.at(-1).range.start.offset, "第一行\n".length);
});

test("大量未閉合中括號應保留輸入而不耗盡堆疊", () => {
  const source = "*\u005b".repeat(12000);
  const d = parseDocument(source);
  assert.equal(d.children[0].type, "paragraph");
  assert(d.diagnostics.length > 0);
});
test("段落內萬字級別普通中文文字可完整保留", () => {
  const source = "中文測試。".repeat(3000);
  const d = parseDocument(source);
  assert.equal(d.diagnostics.length, 0);
  assert.equal(d.children[0].children[0].value, source);
});

test("未知命名空間的行內指令保留名稱與內容，不冒充 term", () => {
  const source = "&science:unit[m/s][title=velocity]";
  const node = parseInline(source).nodes[0];
  assert.equal(node.type, "inlineDirective");
  assert.equal(node.name, "science:unit");
  assert.equal(node.children[0].value, "m/s");
  assert.equal(node.attrs.title, "velocity");
  assert(renderHtml(parseDocument(source)).includes('data-structmark-directive="science:unit"'));
});
