/*
 * File: editor.mjs
 * Modification: 2026-10-12 — Pure navigation utilities shared with editor adapters.
 */
import {parseInline} from './inline.mjs';

// ── 將 v2 AST 投影成 Editor 所需的符號與精確範圍 ──
export function documentHeadings(doc){
  const nodes=[];
  function walk(list){for(const item of list){if(item.type==='heading')nodes.push(item);if(item.children)walk(item.children);}}
  walk(doc.nodes);return nodes;
}
export function referencesOnLine(lineText){
  const found=[];const re=/\(\#([^()\s]+)\)/g;
  for(const m of lineText.matchAll(re)){
    let escapes=0;for(let at=m.index-1;at>=0&&lineText[at]==='\\';at--)escapes++;
    if(escapes%2===1)continue;
    // 標題行最後的 (#id) 是宣告，而非指向自身的參照。
    if(/^#([1-6])[ \t]+/.test(lineText)&&m.index+m[0].length===lineText.length&&m.index>0&&/[ \t]/.test(lineText[m.index-1]))continue;
    const node=parseInline(m[0])[0];
    if(node?.type==='reference')found.push({target:node.target,file:node.file,start:m.index,end:m.index+m[0].length});
  }
  return found;
}
export function referenceAt(source,line,character){
  const lines=source.replace(/\r\n?/g,'\n').split('\n');
  return referencesOnLine(lines[line]??'').find(r=>r.start<=character&&character<r.end)??null;
}
export function headingAt(doc,line,character,source){
  const heading=documentHeadings(doc).find(x=>x.line===line+1&&x.id);
  if(!heading)return null;
  const raw=source.replace(/\r\n?/g,'\n').split('\n')[line]??'';
  const suffix='(#'+heading.id+')';
  const index=raw.lastIndexOf(suffix);
  return index>=0&&character>=index&&character<index+suffix.length?heading:null;
}

/** Position index derived from parsed semantic nodes, not from unstructured raw text. */
export function documentLocations(doc,source){
  const lines=source.replace(/\r\n?/g,'\n').split('\n');
  const ids=[],refs=[];
  function walk(nodes){
    for(const node of nodes){
      const text=lines[node.line-1]??'';
      if(node.type==='heading'&&node.id){
        const marker='(#'+node.id+')';
        const start=text.lastIndexOf(marker);
        if(start>=0)ids.push({id:node.id,line:node.line,start,end:start+marker.length});
      }
      if(node.type==='directive'&&node.attributes.id){
        // Match only a named id= argument, rather than a coincidentally similar title.
        const expression=/(?:\[|,)\s*id\s*=\s*(?:"([a-z][\w-]*)"|'([a-z][\w-]*)'|([a-z][\w-]*))/g;
        for(const m of text.matchAll(expression)){
          const id=m[1]??m[2]??m[3];
          if(id===node.attributes.id){
            const start=(m.index??0)+m[0].lastIndexOf(id);
            ids.push({id,line:node.line,start,end:start+id.length});break;
          }
        }
      }
      if(node.type==='heading'||node.type==='text'){
        for(const ref of referencesOnLine(text))refs.push({...ref,line:node.line});
      }
      if(node.type==='directive'&&node.mode==='normal')walk(node.children);
    }
  }
  walk(doc.nodes);
  return {ids,refs};
}
