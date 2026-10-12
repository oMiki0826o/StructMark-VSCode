/*
 * File: html.mjs
 * Modification: 2026-10-12 — Escaped, URL-validated HTML for v2 AST.
 */
import {parseInline} from './inline.mjs';
export const escapeHtml=input=>String(input).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function safeUrl(value){
  if(/[\u0000-\u001f\u007f]/.test(value)||value.startsWith('//')||value.includes('\\'))return null;
  const trimmed=value.trim();
  if(/^(https?:\/\/|mailto:)/i.test(trimmed))return trimmed;
  if(/^[a-z][\w./-]*\.sm(?:#[a-z][\w-]*)?$/.test(trimmed)||/^#[a-z][\w-]*$/.test(trimmed))return trimmed;
  return null;
}
export function renderInline(nodes){
  return nodes.map(node=>{
    if(node.type==='text')return escapeHtml(node.value);
    if(node.type==='reference'){
      const url=node.file?node.file+'#'+node.target:'#'+node.target;
      const href=safeUrl(url);return href?`<a class="sm-reference" href="${escapeHtml(href)}">${escapeHtml(node.target)}</a>`:escapeHtml(node.target);
    }
    if(node.type==='link'){
      const href=safeUrl(node.target);
      return href?`<a href="${escapeHtml(href)}">${renderInline(node.children)}</a>`:renderInline(node.children);
    }
    const tag={strong:'strong',em:'em',strongEm:'strong',underline:'u',delete:'del',highlight:'mark'}[node.type];
    if(tag)return `<${tag}>${node.type==='strongEm'?'<em>':''}${renderInline(node.children)}${node.type==='strongEm'?'</em>':''}</${tag}>`;
    return '';
  }).join('');
}
export function renderHtml(doc){
  const output=[];let paragraph=[];
  const closeParagraph=()=>{if(paragraph.length){const content=paragraph.join('\n').trim();if(content)output.push('<p>'+renderInline(parseInline(content))+'</p>');paragraph=[];}};
  function emit(nodes){
    for(const node of nodes){
      if(node.type==='text'){
        if(node.text.trim()===''){closeParagraph();continue;}
        paragraph.push(node.text);continue;
      }
      closeParagraph();
      if(node.type==='heading'){
        output.push(`<h${node.level}${node.id?` id="${escapeHtml(node.id)}"`:''}>${renderInline(parseInline(node.text))}</h${node.level}>`);
        continue;
      }
      if(node.type==='directive'){
        const attrs=node.attributes, title=attrs.title?`<div class="sm-title">${escapeHtml(attrs.title)}</div>`:'';
        if(node.mode==='table'){
          const header=node.columns.map(col=>`<th>${escapeHtml(col.name)}</th>`).join('');
          const rows=node.rows.slice(1).map(row=>'<tr>'+row.map(value=>'<td>'+escapeHtml(value)+'</td>').join('')+'</tr>').join('\n');
          output.push(`<table>${header?'<thead><tr>'+header+'</tr></thead>':''}<tbody>${rows}</tbody></table>`);
        }else if(node.mode==='data'){
          output.push(`<pre class="sm-data">${escapeHtml(node.raw.join('\n'))}</pre>`);
        }else if(node.mode==='raw'){
          const lang=/^[a-zA-Z0-9_+.-]+$/.test(attrs.lang??'')?` class="language-${escapeHtml(attrs.lang)}"`:'';
          if(node.name==='equation')output.push(`<div class="sm-equation"><pre>${escapeHtml(node.raw.join('\n'))}</pre></div>`);
          else output.push(`<pre><code${lang}>${escapeHtml(node.raw.join('\n'))}</code></pre>`);
        }else{
          const start=output.length;
          emit(node.children);closeParagraph();
          const content=output.splice(start).join('\n');
          output.push(`<aside class="sm-directive sm-${node.name}">${title}${content}</aside>`);
        }
      }
    }
  }
  emit(doc.nodes);closeParagraph();return output.join('\n');
}
