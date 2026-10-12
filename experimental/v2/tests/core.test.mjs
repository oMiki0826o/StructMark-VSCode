/*
 * File: core.test.mjs
 * Modification: 2026-10-12 — v2 語法契約測試。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,format} from '../core.mjs';
const check=(source)=>{const result=parse(source);assert.deepEqual(result.diagnostics,[]);return result;};
test('簡寫與完整指令產生相同的語義 AST',()=>{
  const a=check('&w[test]\nHello\n&e');const b=check('&warning[title=test]\nHello\n&end');
  assert.equal(format(a),format(b));
});
test('原生表格欄位',()=>{const d=check('&tbl\n[A][B]\n[1][2]\n&e');assert.deepEqual(d.nodes[0].rows,[['A','B'],['1','2']]);});
test('表格跳脫',()=>{const d=check('&table\n[A][B]\n[a\\]b][c\\\\d]\n&end');assert.deepEqual(d.nodes[0].rows[1],['a]b','c\\d']);});
test('表格欄數錯誤',()=>{assert.equal(parse('&table\n[A][B]\n[1]\n&e').diagnostics[0].code,'SM302');});
test('識別符與參照',()=>{check('#1 標題 (#intro)\n參見 (#intro)');assert.equal(parse('參見 (#missing)').diagnostics[0].code,'SM402');});
test('重複識別符',()=>{assert.equal(parse('#1 A (#x)\n#2 B (#x)').diagnostics[0].code,'SM401');});
test('未關閉與孤立結束',()=>{assert.equal(parse('&w[test]').diagnostics[0].code,'SM104');assert.equal(parse('&e').diagnostics[0].code,'SM101');});
test('未知指令不得靜默忽略',()=>{assert.equal(parse('&bad').diagnostics[0].code,'SM102');});
test('無預設參數拒絕位置參數',()=>{assert.equal(parse('&table[csv]\n&e').diagnostics[0].code,'SM202');});
test('raw 不解析指令',()=>{const d=check('&eq\n&w[not-a-block]\n&e');assert.deepEqual(d.nodes[0].raw,['&w[not-a-block]']);});
test('格式化後保持語義',()=>{const d=check('#1 Intro (#intro)\n&w[test]\nHi\n&e');assert.deepEqual(parse(format(d)).nodes, d.nodes);});

// ── Regression: headings use only the #N form ──
test('標題階層解析與錨點',()=>{
 const d=check('#1 主標題 (#main)\n#6 最深層');
 assert.equal(d.nodes[0].level,1);assert.equal(d.nodes[0].id,'main');
 assert.equal(d.nodes[1].level,6);
});
test('標題文字中的參照也需驗證',()=>{
 assert.equal(parse('#2 參考 (#missing)').valid,true); // suffix is a definition, not a reference
 assert.equal(parse('#2 參考 (#target) 的說明').diagnostics[0].code,'SM402');
});
