/*
 * File: v13-security.test.mjs
 * Modification: 2026-10-11 — 未受信任內容的 HTML 輸出與惡意連結回歸。
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDocument,renderHtml} from '../dist/index.js';

test('renderer escapes literal HTML without creating active tags',()=>{
 const output=renderHtml(parseDocument('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>'));
 assert.doesNotMatch(output,/<script\b|<img\b/i);
 assert.match(output,/&lt;script&gt;/);
});
test('renderer blocks dangerous URL protocols',()=>{
 const output=renderHtml(parseDocument('[click](javascript:alert(1))\n\n![bad](javascript:alert(1))'));
 assert.doesNotMatch(output,/\b(?:href|src)="\s*(?:javascript|data):/i);
});
test('parser caps gigantic untrusted input with deterministic diagnostic',()=>{
 const document=parseDocument('x'.repeat(2_000_001));
 assert.ok(document.diagnostics.some(d=>d.severity==='error'));
});
test('Markdown export handles many short code delimiter runs without argument-list overflow', async()=>{
 const {toMarkdownDetailed}=await import('../dist/index.js');
 const source='~~~text\n'+ '`a'.repeat(150_000) + '\n~~~';
 const output=toMarkdownDetailed(parseDocument(source)).source;
 assert.ok(output.startsWith('```text'));
});
