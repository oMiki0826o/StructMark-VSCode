/*
 * File: v15-core.test.mjs
 * Modification: 2026-10-11 — v1.5 workspace indexing regression tests (test-first).
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildWorkspaceIndex} from '../dist/index.js';
import {validateWorkspace} from '../dist/semantic.js';

const p=(line,column=1)=>({line,column,offset:0});
const range=line=>({start:p(line),end:p(line,18)});
const heading=(id,line)=>({type:'heading',level:2,id,children:[],range:range(line)});
const reference=(target,line)=>({type:'paragraph',range:range(line),children:[{type:'ref',target,range:range(line)}]});
const doc=(...children)=>({type:'document',version:'1.1',metadata:{},children,diagnostics:[]});

test('workspace index resolves target and traces diagnostics to referring file',()=>{
  const files=[{path:'guide/first.sm',document:doc(reference('../index.sm#intro',3),reference('missing.sm#oops',6))},{path:'index.sm',document:doc(heading('intro',1))}];
  const index=buildWorkspaceIndex(files);
  assert.deepEqual(index.documents,['guide/first.sm','index.sm']);
  assert.equal(index.references.length,2);
  assert.deepEqual(index.references[0].target,{path:'index.sm',id:'intro'});
  assert.equal(index.references[0].resolved,true);
  assert.equal(index.references[1].resolved,false);
  assert.equal(index.diagnostics.length,1);
  assert.equal(index.diagnostics[0].file,'guide/first.sm');
  assert.equal(index.diagnostics[0].position.line,6);
  assert.equal(index.diagnostics[0].code,'MMK-S005');
  assert.equal(validateWorkspace(files).length,1);
});

test('workspace index normalizes Unicode IDs and rejects traversal',()=>{
  const files=[{path:'ch/a.sm',document:doc(reference('../b.sm#e\u0301',2),reference('../../evil.sm#x',4))},{path:'b.sm',document:doc(heading('é',1))}];
  const index=buildWorkspaceIndex(files);
  assert.equal(index.references[0].resolved,true);
  assert.equal(index.references[1].resolved,false);
  assert.equal(index.references[1].target,null);
  assert.equal(index.diagnostics[0].file,'ch/a.sm');
});

test('workspace index provides ordered IDs for downstream navigation',()=>{
  const files=[{path:'b.sm',document:doc(heading('one',2),heading('two',7))}];
  const index=buildWorkspaceIndex(files);
  assert.deepEqual(index.identifiers['b.sm'],['one','two']);
});
