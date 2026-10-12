/*
 * File: robustness.test.mjs
 * Modification: 2026-10-12 — 測試巢狀參照、空屬性及原始區塊結束標記。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,format} from '../core.mjs';

test('巢狀標題中的參照必須驗證',()=>{
 const doc=parse('&n[標題]\n#2 內文 (#inner)\n&e\n參考 (#inner)');
 assert.equal(doc.valid,true);
});
test('巢狀標題中的無效參照必須回報',()=>{
 const doc=parse('&n[標題]\n#2 內文 (#inner)\n#3 指向 (#missing) 參照\n&e');
 assert.ok(doc.diagnostics.some(x=>x.code==='SM402'));
});
test('原始區塊允許跳脫結束標記並保留往返語義',()=>{
 const source='&code[js]\n\\&e\nconst value = 1;\n&e';
 const doc=parse(source);assert.equal(doc.valid,true);
 assert.equal(doc.nodes[0].raw[0],'&e');
 const again=parse(format(doc));assert.equal(again.valid,true);
 assert.deepEqual(again.nodes[0].raw,doc.nodes[0].raw);
});
test('空屬性槽不產生空白預設參數',()=>{
 const doc=parse('&w[]\n內容\n&e');
 assert.equal(doc.valid,true);
 assert.deepEqual(doc.nodes[0].attributes,{});
});
