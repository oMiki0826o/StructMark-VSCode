/*
 * File: v15-convert.test.mjs
 * Modification: 2026-10-11 — conversion-loss warnings and strict-mode I/O tests.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toMarkdownDetailed,parseDocument} from '../dist/index.js';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

test('Markdown export reports semantic loss for keyboard and abbreviation spans',()=>{
 const document=parseDocument('The keys: &kbd[Ctrl+C] and &abbr[HTML][title="HyperText Markup Language"]');
 const result=toMarkdownDetailed(document);
 assert.ok(result.diagnostics.some(d=>d.code==='SMK-C002'), JSON.stringify(result.diagnostics));
});

test('Markdown export reports hidden comments and preserves visible content',()=>{
 const document=parseDocument('Before\n\n%%\nHidden\n%%\n\nAfter');
 const result=toMarkdownDetailed(document);
 assert.match(result.source,/Before/);assert.match(result.source,/After/);
 assert.ok(result.diagnostics.some(d=>d.code==='SMK-C003'));
});

test('CLI strict conversion refuses to create output when semantic loss would occur',()=>{
 const dir=mkdtempSync(join(tmpdir(),'sm-convert-'));
 try{
  const input=join(dir,'input.sm'),output=join(dir,'out.md');
  writeFileSync(input,'&note\nRead me\n&end\n');
  const r=spawnSync(process.execPath,['bin/structmark.mjs','convert',input,'--strict','--output',output],{encoding:'utf8'});
  assert.equal(r.status,1,r.stderr);
  assert.equal(existsSync(output),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
