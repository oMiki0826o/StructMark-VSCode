/*
 * File: formatter.mjs
 * Modification: 2026-10-12 — Canonical, deterministic v2 formatter.
 */
import {encodeAttribute} from './registry.mjs';
const end=/^\\*&(?:e|end)[ \t]*$/;
const cell=value=>'['+value.replace(/\\/g,'\\\\').replace(/\]/g,'\\]').replace(/\[/g,'\\[')+']';
export function format(document){
  const result=[];
  function write(node){
    if(node.type==='heading'){result.push(`#${node.level} ${node.text}${node.id?' (#'+node.id+')':''}`);return;}
    if(node.type==='text'){result.push(/^&(?:e|end)[ \t]*$/.test(node.text)?'\\'+node.text:node.text);return;}
    const attrs=Object.entries(node.attributes);
    result.push('&'+node.name+(attrs.length?'['+attrs.map(([key,value])=>key+'='+encodeAttribute(value)).join(',')+']':''));
    if(node.mode==='table')for(const row of node.rows)result.push(row.map(cell).join(''));
    else if(node.mode==='raw'||node.mode==='data')result.push(...node.raw.map(x=>end.test(x)?'\\'+x:x));
    else node.children.forEach(write);
    result.push('&end');
  }
  document.nodes.forEach(write);
  const formatted=result.join('\n');
  // A final empty text line is semantic only when another node precedes it.
  return document.nodes.length>1&&document.nodes.at(-1)?.type==='text'&&document.nodes.at(-1).text===''?formatted+'\n':formatted;
}
