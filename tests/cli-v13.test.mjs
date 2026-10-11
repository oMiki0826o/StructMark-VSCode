/*
 * File: cli-v13.test.mjs
 * Modification: 2026-10-11 — CLI 幫助、參數錯誤與非破壞性預設的驗證。
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const run=(...args)=>spawnSync(process.execPath,['bin/structmark.mjs',...args],{encoding:'utf8'});
test('CLI help lists stable commands',()=>{
 const r=run('--help');assert.equal(r.status,0);for(const cmd of ['check','render','ast','convert','format','workspace']) assert.match(r.stdout,new RegExp(cmd));
});
test('CLI invalid command returns argument error',()=>{
 const r=run('frobnicate');assert.equal(r.status,2);assert.match(r.stderr,/Unknown command|未知指令/);
});
test('CLI refuses format --write without filename',()=>{
 const r=run('format','--write');assert.equal(r.status,2);assert.match(r.stderr,/\.sm|file|檔案/);
});
