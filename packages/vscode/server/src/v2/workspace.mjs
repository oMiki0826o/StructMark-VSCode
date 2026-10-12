/*
 * File: workspace.mjs
 * Modification: 2026-10-12 — Browser-safe POSIX workspace reference validation.
 */
import {parse} from './parser.mjs';
import {parseInline,inlineReferences} from './inline.mjs';
import {issue} from './registry.mjs';

// ── Pure POSIX path resolution; does not touch filesystem or import Node-specific libraries.
function canonical(parts) {
  const stack=[];
  for (const part of parts) {
    if(!part||part==='.')continue;
    if(part==='..'){if(!stack.length)return null;stack.pop();continue;}
    stack.push(part);
  }
  return stack.join('/');
}
function normalized(path) {
  if(typeof path!=='string'||!path.endsWith('.sm')||path.startsWith('/')||path.includes('\\')||path.includes('\0')||/[\u0000-\u001f]/.test(path))return null;
  return canonical(path.split('/'));
}
export function resolveWorkspaceTarget(from,file) {
  const base=normalized(from);
  if(!base||typeof file!=='string'||file.startsWith('/')||file.includes('\\')||file.includes('\0')||/[\u0000-\u001f]/.test(file))return null;
  const relative=[...base.split('/').slice(0,-1),...file.split('/')];
  const target=canonical(relative);
  return target&&target.endsWith('.sm')?target:null;
}
function iterateNodes(nodes,fn){for(const node of nodes){fn(node);if(node.children)iterateNodes(node.children,fn);}}
export function validateWorkspace(files){
  const entries=files instanceof Map?[...files.entries()]:Object.entries(files);
  const diagnostics=[],documents=new Map(),symbols=new Map();
  if(entries.length>2000)return {documents,diagnostics:[{path:'',...issue(1,'SM406','工作區檔案數量超過上限')}]};
  for(const [path,source] of entries){
    if(normalized(path)!==path){diagnostics.push({path,...issue(1,'SM405','不安全或非正規化的工作區路徑')});continue;}
    if(documents.has(path)){diagnostics.push({path,...issue(1,'SM401','工作區有重複檔案路徑')});continue;}
    const doc=parse(source);documents.set(path,doc);
    diagnostics.push(...doc.diagnostics.map(d=>({path,...d})));
    const ids=new Set();iterateNodes(doc.nodes,n=>{if(n.type==='heading'&&n.id)ids.add(n.id);if(n.type==='directive'&&n.attributes.id)ids.add(n.attributes.id);});
    symbols.set(path,ids);
  }
  for(const [path,doc] of documents){
    iterateNodes(doc.nodes,node=>{
      if(node.type!=='heading'&&node.type!=='text')return;
      for(const ref of inlineReferences(parseInline(node.text))){
        if(!ref.file)continue;
        const target=resolveWorkspaceTarget(path,ref.file);
        if(!target){diagnostics.push({path,...issue(node.line,'SM405',`參照路徑超出工作區：${ref.file}`)});continue;}
        if(!documents.has(target)){diagnostics.push({path,...issue(node.line,'SM403',`找不到文件：${target}`)});continue;}
        if(!symbols.get(target)?.has(ref.target))diagnostics.push({path,...issue(node.line,'SM404',`找不到目標：${target}#${ref.target}`)});
      }
    });
  }
  return {documents,diagnostics};
}
