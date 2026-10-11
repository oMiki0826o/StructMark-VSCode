/*
 * File: v13-integration.test.mjs
 * Modification: 2026-10-11 — CLI、Markdown、Visitor、Formatter 整合規格測試。
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parseDocument,markdownToStructMarkSource,fromMarkdown,toMarkdownDetailed,formatSource,visitAst} from '../dist/index.js';
const run=(...args)=>spawnSync(process.execPath,['bin/structmark.mjs',...args],{encoding:'utf8'});
test('Markdown conversion preserves code, fences and common emphasis',()=>{
 const source='## Section\n\n`**literal**` and **strong**\n\n~~~js\n**unchanged**\n~~~';
 const sm=markdownToStructMarkSource(source);
 assert.match(sm,/#2 Section/);
 assert.match(sm,/\*\[strong\]/);
 assert.match(sm,/`\*\*literal\*\*`/);
 const document=fromMarkdown(source);
 assert.equal(document.children.at(-1)?.type,'codeBlock');
});
test('Markdown export diagnoses representational losses and escaping',()=>{
 const doc=parseDocument('#1 Sample\n\n-[underlined] and =[highlighted]\n\n| A | B |\n| --- | --- |\n| foo\\|bar | literal |');
 const result=toMarkdownDetailed(doc);
 assert.ok(result.diagnostics.filter(d=>d.code==='SMK-C002').length>=2);
 assert.match(result.source,/foo\\\|bar/);
});
test('Format is idempotent for CRLF and keeps stable AST visit order',()=>{
 const source='#1 Title\r\n\r\n*[Body]';
 const first=formatSource(source);
 assert.equal(formatSource(first.source).source,first.source);
 const nodes=[];visitAst(parseDocument(first.source),{enter(n){nodes.push(n.type);}});
 assert.deepEqual(nodes.slice(0,3),['document','heading','text']);
});
test('CLI produces HTML safely, JSON AST, and refuses unsafe overwrite',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'structmark-cli-'));
 const input=join(folder,'input.sm');
 await writeFile(input,'#1 Heading\n\n*[Text]','utf8');
 const render=run('render',input);
 assert.equal(render.status,0,render.stderr); assert.match(render.stdout,/<strong>Text<\/strong>/);
 const ast=run('ast',input);assert.equal(ast.status,0,ast.stderr);
 assert.equal(JSON.parse(ast.stdout).type,'document');
 const forbidden=run('render',input,'--output',input);
 assert.notEqual(forbidden.status,0);assert.equal(await readFile(input,'utf8'),'#1 Heading\n\n*[Text]');
});
test('Workspace CLI resolves sibling and parent-relative paths',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'structmark-workspace-'));
 const {mkdir}=await import('node:fs/promises');await mkdir(join(folder,'chapters'));
 await writeFile(join(folder,'index.sm'),'#1 Root (#root)\n');
 await writeFile(join(folder,'chapters','one.sm'),'#1 One\n\n&ref[../index.sm#root] and &ref[two.sm#next]');
 await writeFile(join(folder,'chapters','two.sm'),'#1 Next (#next)');
 const result=run('workspace',folder);
 assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/Checked 3 .sm files/);
});
