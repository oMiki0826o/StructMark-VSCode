/*
 * File: browser-bundle.test.mjs
 * Modification: 2026-10-12 — Cross-platform ESM syntax and absence of Node-only dependencies.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {resolveWorkspaceTarget} from '../../../src/v2/index.mjs';
test('v2 ESM engine only uses platform-independent imports',async()=>{
 const files=(await readdir(resolve('src/v2'))).filter(x=>x.endsWith('.mjs'));
 for(const f of files){
  const content=await readFile(resolve('src/v2',f),'utf8');
  assert.doesNotMatch(content,/from\s+['"]node:/,`Node built-in import in ${f}`);
 }
});
test('相對路徑不允許越過工作區',()=>{
 assert.equal(resolveWorkspaceTarget('a/b.sm','../index.sm'),'index.sm');
 assert.equal(resolveWorkspaceTarget('a/b.sm','../../outside.sm'),null);
 assert.equal(resolveWorkspaceTarget('a/b.sm','/outside.sm'),null);
});
