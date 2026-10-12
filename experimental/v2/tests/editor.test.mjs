/*
 * File: editor.test.mjs
 * Modification: 2026-10-12 — Editor helper source-position tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,format,documentHeadings,documentLocations,referenceAt,headingAt,referencesOnLine} from '../../../src/v2/index.mjs';
test('編輯器符號包含巢狀指令中的標題',()=>{
 const doc=parse('&note\n#2 Nested (#nested)\n&e');
 assert.deepEqual(documentHeadings(doc).map(x=>x.id),['nested']);
});
test('精準的錨點位置；文件 ID 與參照不混淆',()=>{
 const source='#1 Title (#main)\nsee (#main) and (#page.sm#x)';
 const doc=parse(source);
 assert.equal(headingAt(doc,0,12,source)?.id,'main');
 assert.equal(referenceAt(source,0,12),null);
 assert.equal(referenceAt(source,1,7)?.target,'main');
 assert.equal(referenceAt(source,1,24)?.file,'page.sm');
});
test('一般括號不是參照；跳脫標記不導航',()=>{
 assert.deepEqual(referencesOnLine('plain (text) and \\(#no)'),[]);
});

test('編輯器位置索引包含 directive ID 且略過 raw 與宣告的偽參照',()=>{
 const source='#1 Topic (#heading)\n&note[id=notice]\nsee (#heading)\n&e\n&code[js]\n(#hidden)\n&e\n\\(#escaped)';
 const doc=parse(source);
 const locations=documentLocations(doc,source);
 assert.deepEqual(locations.ids.map(x=>x.id),['heading','notice']);
 assert.deepEqual(locations.refs.map(x=>x.target),['heading']);
 assert.equal(locations.ids[1].line,2);
 assert.equal(locations.refs[0].line,3);
});

test('尾端明確空白文字列的格式化往返一致',()=>{
 const doc=parse('Hello\n\n');
 assert.deepEqual(parse(format(doc)).nodes,doc.nodes);
});
