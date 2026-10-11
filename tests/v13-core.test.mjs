/*
 * File: v13-core.test.mjs
 * Modification: 2026-10-11 — AST 訪問與工作區參照行為的回歸測試。
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visitAst} from '../dist/visitor.js';
import {resolveWorkspaceReference} from '../dist/workspace.js';
import {validateWorkspace} from '../dist/semantic.js';

const p={line:1,column:1,offset:0};const range={start:p,end:p};
const text=value=>({type:'text',value,range});
const para=(...children)=>({type:'paragraph',children,range});
const heading=(id, name='Header')=>({type:'heading',level:1,id,children:[text(name)],range});
const ref=target=>({type:'ref',target,range});
const doc=(...children)=>({type:'document',version:'1.1',metadata:{},children,diagnostics:[]});

test('visitor traverses nested lists, tables, inline labels without changing document',()=>{
 const tree=doc(heading('h'), {type:'list',ordered:false,automatic:false,start:null,range,items:[{type:'listItem',task:null,range,children:[para(text('X'))]}]}, {type:'table',range,header:[[text('K')]],aligns:[null],rows:[[[text('V')]]]},para({type:'link',target:'https://example.com',label:[text('Link')],attrs:{},range}));
 const before=JSON.stringify(tree);
 const visited=[];visitAst(tree,{enter(node){visited.push(node.type);}});
 assert.deepEqual(visited,['document','heading','text','list','listItem','paragraph','text','table','text','text','paragraph','link','text']);
 assert.equal(JSON.stringify(tree),before);
});

test('visitor skips subtree when enter returns false and always calls leave',()=>{
 const seen=[]; visitAst(doc(para(text('hidden')),heading('show')),{enter(node){seen.push('+'+node.type);return node.type!=='paragraph';},leave(node){seen.push('-'+node.type);}});
 assert.deepEqual(seen,['+document','+paragraph','-paragraph','+heading','+text','-text','-heading','-document']);
});

test('workspace resolves refs relative to source directory including bare filenames',()=>{
 assert.deepEqual(resolveWorkspaceReference('chapters/one.sm','two.sm#e\u0301'),{path:'chapters/two.sm',id:'é'});
 assert.deepEqual(resolveWorkspaceReference('chapters/one.sm','../index.sm#start'),{path:'index.sm',id:'start'});
 assert.deepEqual(resolveWorkspaceReference('chapters/one.sm','local'),{path:'chapters/one.sm',id:'local'});
 assert.equal(resolveWorkspaceReference('a.sm','../private.sm#id'),null);
 assert.equal(resolveWorkspaceReference('a.sm','https://evil.invalid/x.sm#id'),null);
});

test('validateWorkspace checks bare relative .sm links and keeps local refs',()=>{
 const first=doc(para(ref('two.sm#exists')),para(ref('local')),heading('local'));
 const second=doc(heading('exists'));
 assert.deepEqual(validateWorkspace([{path:'chapters/one.sm',document:first},{path:'chapters/two.sm',document:second}]),[]);
 assert.equal(validateWorkspace([{path:'chapters/one.sm',document:first}]).filter(d=>d.code==='MMK-S005').length,1);
});
