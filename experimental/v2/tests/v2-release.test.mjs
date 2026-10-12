/*
 * File: v2-release.test.mjs
 * Modification: 2026-10-12 — v2 語言、渲染、資料驗證與工作區驗收。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {parse, format, parseInline, renderHtml, validateWorkspace, directiveDefinitions} from '../../../src/v2/index.mjs';

const codes = (text) => parse(text).diagnostics.map(x => x.code);
const valid = text => {const result=parse(text);assert.deepEqual(result.diagnostics,[]);return result;};

test('同一套 v2 核心在正式 src/v2 位置提供完整 API', () => {
  assert.equal(typeof renderHtml,'function');
  assert.equal(typeof validateWorkspace,'function');
  assert.equal(directiveDefinitions.warning.alias,'w');
});
test('具備引號及逗號的屬性往返不變',()=>{
  const doc=valid('&w[title="Hello, world"]\nhello\n&e');
  assert.equal(doc.nodes[0].attributes.title,'Hello, world');
  assert.deepEqual(parse(format(doc)).nodes,doc.nodes);
});
test('未知屬性與重複屬性應給出診斷',()=>{
  assert.ok(codes('&w[unknown=x]\n&e').includes('SM203'));
  assert.ok(codes('&w[title=x,title=y]\n&e').includes('SM201'));
});
test('巢狀行內格式及安全 HTML',()=>{
  const doc=valid('#1 標題 (#intro)\n*[粗體 /[斜體]] 和 (#intro)');
  assert.match(renderHtml(doc),/<strong>粗體 <em>斜體<\/em><\/strong>/);
  assert.match(renderHtml(doc),/href="#intro"/);
});
test('HTML 內容、屬性與外部 URL 不可注入',()=>{
  const doc=valid('#1 <img src=x onerror=alert(1)> (#safe)\n&note[title="<script>alert(1)</script>"]\n[click](javascript:alert(1))\n&e');
  const output=renderHtml(doc);
  assert.doesNotMatch(output,/<script>|<img src=x|href="javascript:/);
  assert.match(output,/&lt;script&gt;/);
});
test('原生表格可宣告型別並驗證資料',()=>{
  const doc=valid('&table\n[Name:string][Count:number][Active:boolean]\n[A][2.5][true]\n&e');
  assert.deepEqual(doc.nodes[0].columns.map(c=>c.type),['string','number','boolean']);
  assert.ok(codes('&table\n[Count:number]\n[abc]\n&e').includes('SM303'));
});
test('JSON 資料區塊解析及不合法 JSON 診斷',()=>{
  const doc=valid('&data[format=json]\n{"name":"Miki","count":4}\n&e');
  assert.deepEqual(doc.nodes[0].data,{name:'Miki',count:4});
  assert.ok(codes('&data[format=json]\n{bad}\n&e').includes('SM304'));
});
test('跨文件參照與工作區診斷',()=>{
  const files=new Map([
    ['index.sm','#1 Index (#main)\n見 (#guide/intro.sm#topic)'],
    ['guide/intro.sm','#1 Topic (#topic)\n參見 (#../index.sm#main)']
  ]);
  const report=validateWorkspace(files);
  assert.deepEqual(report.diagnostics,[]);
  assert.equal(report.documents.size,2);
  const broken=validateWorkspace(new Map([['index.sm','參考 (#../outside.sm#hidden)']]));
  assert.ok(broken.diagnostics.some(d=>d.code==='SM405'));
});
test('跨文件與文件內參照會產生可用行內節點',()=>{
  const xs=parseInline('查看 (#guide/topic.sm#intro) 或 (#local)');
  assert.equal(xs.filter(x=>x.type==='reference').length,2);
});
test('過深巢狀與過大輸入會被安全限制',()=>{
  assert.ok(codes('&n\n'.repeat(64)+'&e\n'.repeat(64)).includes('SM105'));
  assert.ok(codes('A'.repeat(2_000_001)).includes('SM001'));
});
test('Formatter 再解析維持相同語義（Raw 內容含多個反斜線）',()=>{
  const original='&c[txt]\n\\&e\n\\\\&e\n&end';
  const first=valid(original);
  assert.deepEqual(parse(format(first)).nodes,first.nodes);
});
test('不應將文字中的普通括號誤當作參照',()=>{
  const doc=valid('一般括號 (hello) 與普通數學 (x+1)');
  assert.doesNotMatch(renderHtml(doc),/<a /);
});
test('行首跳脫的結束標記在 Formatter 往返後保持原文',()=>{
 const doc=valid('\\&end\n&note\n\\&e\n&end');
 const again=parse(format(doc));
 assert.equal(again.valid,true);
 assert.deepEqual(again.nodes,doc.nodes);
});
test('末尾 LF 不會引入虛構空白 AST 節點',()=>{
 assert.deepEqual(parse('word\n').nodes,parse('word').nodes);
});
test('Formatter 多次呼叫穩定（含中文、表格與引號）',()=>{
 const doc=valid('#1 文件 (#doc)\n\n&table\n[資料][數值:number]\n[甲][23]\n&end\n\n&w[title="你好, 世界"]\n*[文字] (#doc)\n&e');
 const encoded=format(doc);assert.equal(format(parse(encoded)),encoded);
});
test('原生資料 schema 檢查必填與型別',()=>{
 const source='&schema[Person]\n{"name":"string","age":"number","note?":"string"}\n&e\n&data[format=json,schema=Person]\n{"name":"小明","age":16}\n&e';
 assert.equal(valid(source).nodes[0].name,'schema');
 assert.ok(codes(source.replace('"age":16','"age":"sixteen"')).includes('SM504'));
 assert.ok(codes(source.replace('"name":"小明",','')).includes('SM504'));
 assert.ok(codes('&data[format=json,schema=Missing]\n{}\n&e').includes('SM502'));
});
test('Schema 重複宣告及非法欄位類型回報診斷',()=>{
 assert.ok(codes('&schema[P]\n{"x":"decimal"}\n&e').includes('SM503'));
 assert.ok(codes('&schema[P]\n{}\n&e\n&schema[P]\n{}\n&e').includes('SM501'));
});
test('指令 id 可作參照，重複 ID 不合法',()=>{
 valid('&note[id=notice]\nHello\n&e\n參考 (#notice)');
 assert.ok(codes('#1 One (#notice)\n&note[id=notice]\n&e').includes('SM401'));
});
test('空表格缺少標頭列必須診斷',()=>{
 assert.ok(codes('&tbl\n&e').includes('SM309'));
});
test('Schema data:null 必須被型別規範檢查，而非誤認 JSON 解析失敗',()=>{
 const source='&schema[S]\n{"id":"number"}\n&e\n&data[format=json,schema=S]\nnull\n&e';
 assert.ok(codes(source).includes('SM504'));
});
test('跨檔案可參照 directive id',()=>{
 const result=validateWorkspace(new Map([
  ['a.sm','請參考 (#b.sm#notes)'],
  ['b.sm','&note[id=notes]\n內容\n&e']
 ]));
 assert.deepEqual(result.diagnostics,[]);
});

test('Schema 的必要欄位檢查必須使用物件自有屬性',()=>{
 const source='&schema[Guard]\n{"constructor":"any"}\n&e\n&data[format=json,schema=Guard]\n{}\n&e';
 assert.ok(codes(source).includes('SM504'));
});
