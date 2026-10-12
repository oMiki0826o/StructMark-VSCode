#!/usr/bin/env node
/*
 * File: v2-fuzz.mjs
 * Modification: 2026-10-12 — Deterministic hostile and malformed v2 inputs.
 */
import {parse,format,renderHtml,validateWorkspace} from '../src/v2/index.mjs';
import assert from 'node:assert/strict';

// ── 固定 PRNG，使 CI 可穩定重現 ──
let seed=0x2a1026;
function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;}
const alphabet=['&','[',']','(',')','#','\\','\n','*','/','~','=','<','>','"','\'','%','a','中','0',' '];
let valid=0,invalid=0;
for(let run=0;run<800;run++){
  const len=random()%180;
  let text='';for(let i=0;i<len;i++)text+=alphabet[random()%alphabet.length];
  const document=parse(text);
  assert.ok(Array.isArray(document.nodes)&&Array.isArray(document.diagnostics));
  if(document.valid){
    const normalized=format(document),again=parse(normalized);
    assert.equal(again.valid,true,`Formatter produced invalid source at test ${run}: ${normalized}`);
    assert.deepEqual(again.nodes,document.nodes,`Formatter changed semantic AST at test ${run}`);
    valid++;
  }else invalid++;
  const html=renderHtml(document);
  assert.doesNotMatch(html,/<script\b|<iframe\b|<[^>]+\bonerror\s*=|href=["\']\s*javascript:/i);
}
const attack=[
 '#1 <script>alert(1)</script> (#x)',
 '&warning[title="<img src=x onerror=1>"]\n<script>alert(1)</script>\n&e',
 '[bad](javascript:alert(1))',
 '&table\n[a][b]\n[<script>][<iframe>]\n&e',
 '&data[format=json]\n{"x":"<script>alert(1)</script>"}\n&e',
 '&code[js]\n</code><script>alert(1)</script>\n&e',
 '&w[title="test, hello"]\nhi\n&e',
 '&n\n'.repeat(50)+'&e\n'.repeat(50),
];
for(const source of attack){const output=renderHtml(parse(source));assert.doesNotMatch(output,/<script\b|<iframe\b|<[^>]+\bonerror\s*=|href=["\']\s*javascript:/i);}
const outside=validateWorkspace(new Map([['safe.sm','(#../../secrets.sm#x)']]));
assert.ok(outside.diagnostics.some(d=>d.code==='SM405'));
console.log(`v2 fuzz: 800 random inputs (${valid} valid, ${invalid} rejected), ${attack.length} hostile samples, 1 workspace traversal case passed.`);
