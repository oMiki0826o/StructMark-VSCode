/*
 * File: inline.mjs
 * Modification: 2026-10-12 — StructMark v2 inline tokens and references.
 */
import {MAX_DEPTH} from './registry.mjs';

// ── 行內指令明確前綴；避免把一般文字推測為標記 ──
const decorations=[['/*[','strongEm'],['*[','strong'],['/[','em'],['-[','underline'],['~[','delete'],['=[','highlight']];
const identifier=/^[a-z][a-z0-9_-]*$/;
const workspaceRef=/^(.+\.sm)#([a-z][a-z0-9_-]*)$/;
const escapable=new Set(['\\','[',']','(',')','*','/','-','~','=','&']);

function closed(text, start, open, close){
  let depth=0;
  for(let i=start;i<text.length;i++){
    if(text[i]==='\\'&&i+1<text.length){i++;continue;}
    if(text[i]===open)depth++;
    if(text[i]===close){depth--;if(depth===0)return i;}
  }
  return -1;
}
function referenceTarget(text){
  if(identifier.test(text))return {target:text,file:null};
  const match=workspaceRef.exec(text);
  if(match)return {target:match[2],file:match[1]};
  return null;
}
/** A pure inline parser. Unknown syntax remains literal text. */
export function parseInline(text,depth=0){
  if(depth>MAX_DEPTH)return [{type:'text',value:text}];
  const result=[];let buffer='';
  const flush=()=>{if(buffer){result.push({type:'text',value:buffer});buffer='';}};
  for(let i=0;i<text.length;){
    if(text[i]==='\\'&&escapable.has(text[i+1])){buffer+=text[i+1];i+=2;continue;}
    if(text.startsWith('(#',i)){
      const end=closed(text,i,'(',')');
      if(end!==-1){
        const found=referenceTarget(text.slice(i+2,end));
        if(found){flush();result.push({type:'reference',...found});i=end+1;continue;}
      }
    }
    // [label](target) retains readable resource syntax; URL schemes are validated during rendering.
    if(text[i]==='['){
      const end=closed(text,i,'[',']');
      if(end!==-1&&text[end+1]==='('){
        const stop=closed(text,end+1,'(',')');
        if(stop!==-1){
          const target=text.slice(end+2,stop);
          if(target&&!/[<>\u0000-\u001f]/.test(target)){
            flush();result.push({type:'link',target,children:parseInline(text.slice(i+1,end),depth+1)});
            i=stop+1;continue;
          }
        }
      }
    }
    const token=decorations.find(([marker])=>text.startsWith(marker,i));
    if(token){
      const open=i+token[0].length-1;const end=closed(text,open,'[',']');
      if(end!==-1){flush();result.push({type:token[1],children:parseInline(text.slice(open+1,end),depth+1)});i=end+1;continue;}
    }
    buffer+=text[i];i++;
  }
  flush();return result;
}
export function inlineReferences(nodes){
  const refs=[];
  function inspect(items){for(const item of items){if(item.type==='reference')refs.push(item);else if(item.children)inspect(item.children);}}
  inspect(nodes);return refs;
}
