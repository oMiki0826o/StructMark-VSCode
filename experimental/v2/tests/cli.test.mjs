/*
 * File: cli.test.mjs
 * Modification: 2026-10-12 — Subprocess CLI end-to-end validation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const cli=resolve('bin/sm2.mjs');
function run(...args){return spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});}
test('check, AST, HTML, formatter CLI',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'sm2-cli-'));
 try{
  const f=join(dir,'test.sm');await writeFile(f,'#1 測試 (#t)\n&w[test]\n*[Hello] (#t)\n&e');
  assert.equal(run('check',f).status,0);
  assert.equal(JSON.parse(run('ast',f).stdout).version,'2.0');
  assert.match(run('html',f).stdout,/<strong>Hello<\/strong>/);
  assert.equal(run('format',f,'--check').status,1);
  assert.equal(run('format',f,'--write').status,0);
  assert.equal(run('format',f,'--check').status,0);
  const modified=await readFile(f,'utf8');assert.match(modified,/&warning\[title=test\]/);
  assert.equal(run('check',join(dir,'absent.sm')).status,2);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('workspace CLI handles references and invalid paths',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'sm2-ws-'));
 try{
  const guide=join(dir,'guide');await mkdir(guide);
  await writeFile(join(dir,'index.sm'),'#1 Index (#index)\n(#guide/start.sm#start)');
  await writeFile(join(guide,'start.sm'),'#1 Start (#start)');
  assert.equal(run('workspace',dir).status,0);
  await writeFile(join(guide,'start.sm'),'#1 Start (#other)');
  const broken=run('workspace',dir);assert.equal(broken.status,1);assert.match(broken.stderr,/SM404/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
