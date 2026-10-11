/*
 * File: v15-cli.test.mjs
 * Modification: 2026-10-11 — CLI write safety and workspace output regression tests.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,chmodSync,statSync,symlinkSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const run=(...args)=>spawnSync(process.execPath,['bin/structmark.mjs',...args],{encoding:'utf8'});

test('format --write replaces content and retains permission mode without temporary files',()=>{
 const folder=mkdtempSync(join(tmpdir(),'sm-v15-'));
 try {
  const filename=join(folder,'a.sm');writeFileSync(filename,'#1 Title\r\n\r\nText\r\n');chmodSync(filename,0o640);
  const r=run('format',filename,'--write');assert.equal(r.status,0,r.stderr);
  assert.equal(readFileSync(filename,'utf8'),'#1 Title\n\nText\n');
  assert.equal(statSync(filename).mode & 0o777,0o640);
  assert.deepEqual(readdirSync(folder),['a.sm']);
 }finally{rmSync(folder,{recursive:true,force:true});}
});

test('format --write refuses to replace symbolic links and retains referent',t=>{
 const folder=mkdtempSync(join(tmpdir(),'sm-v15-'));
 try {
  const real=join(folder,'real.sm'), link=join(folder,'alias.sm');writeFileSync(real,'#1 Real\r\n');
  try {symlinkSync(real,link);} catch(error) {if(error.code==='EPERM' || error.code==='EACCES'){t.skip('Symbolic links are restricted on this OS');return;} throw error;}
  const r=run('format',link,'--write');assert.equal(r.status,1);
  assert.match(r.stderr,/symbolic|symlink|連結/i);
  assert.equal(readFileSync(real,'utf8'),'#1 Real\r\n');
  assert.deepEqual(readdirSync(folder).sort(),['alias.sm','real.sm']);
 }finally{rmSync(folder,{recursive:true,force:true});}
});

test('workspace JSON diagnostics includes actual relative source filename',()=>{
 const folder=mkdtempSync(join(tmpdir(),'sm-v15-'));
 try {
  mkdirSync(join(folder,'chapters'));writeFileSync(join(folder,'chapters','one.sm'),'&ref[missing.sm#gone]\n');
  const r=run('workspace',folder,'--json');assert.equal(r.status,1,r.stderr);
  const output=JSON.parse(r.stdout);
  assert.equal(output.diagnostics[0].file,'chapters/one.sm');
  assert.equal(output.diagnostics[0].code,'MMK-S005');
  assert.ok(!output.diagnostics.some(d=>d.file==='workspace'));
 }finally{rmSync(folder,{recursive:true,force:true});}
});
