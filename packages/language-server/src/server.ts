/*
 * File: server.ts
 * Modification: 2026-10-11 — Standalone StructMark LSP server.
 */
import {createConnection, ProposedFeatures, TextDocuments, TextDocumentSyncKind, CompletionItemKind, MarkupKind, SymbolKind, DiagnosticSeverity, Location, type DocumentSymbol} from 'vscode-languageserver/node.js';
import {TextDocument} from 'vscode-languageserver-textdocument';
import {parseDocument} from '../../../src/parser.js';
import {positionToOffset} from './positions.js';
import {resolveWorkspaceReference} from '../../../src/workspace.js';
import {visitAst} from '../../../src/visitor.js';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {relative, resolve, isAbsolute, sep} from 'node:path';
import {realpathSync, readFileSync, statSync, readdirSync} from 'node:fs';
import type {BlockNode} from '../../../src/types.js';

const connection=createConnection(ProposedFeatures.all);
const documents=new TextDocuments(TextDocument);
const directives=['note','warning','tip','important','quote','details','tabs','tab','figure','video','audio','include'];
const ranges=(start:{line:number;column:number},end:{line:number;column:number})=>({start:{line:Math.max(0,start.line-1),character:Math.max(0,start.column-1)},end:{line:Math.max(0,end.line-1),character:Math.max(0,end.column-1)}});
function parse(uri:string){const doc=documents.get(uri);return doc?parseDocument(doc.getText()):null;}
function walk(blocks:BlockNode[],cb:(node:BlockNode)=>void){for(const b of blocks){cb(b);if(b.type==='blockquote'||b.type==='directive')walk(b.children,cb);if(b.type==='list')for(const i of b.items)walk(i.children,cb);}}
function diagnostics(uri:string){const ast=parse(uri);return ast?.diagnostics.slice(0,200).map(d=>({range:ranges(d.position,{line:d.position.line,column:d.position.column+1}),severity:d.severity==='error'?DiagnosticSeverity.Error:DiagnosticSeverity.Warning,code:d.code,source:'structmark',message:d.message}))??[];}
connection.onInitialize(params=>{ workspaceRoots = (params.workspaceFolders ?? []).flatMap(f=>{try{return f.uri.startsWith('file:')?[fileURLToPath(f.uri)]:[];}catch{return [];}}); if (!workspaceRoots.length && params.rootUri?.startsWith('file:')) {try{workspaceRoots=[fileURLToPath(params.rootUri)];}catch{workspaceRoots=[];}} return {capabilities:{textDocumentSync:TextDocumentSyncKind.Incremental,completionProvider:{triggerCharacters:['&','[','#']},hoverProvider:true,documentSymbolProvider:true,definitionProvider:true,referencesProvider:true}}; });
documents.onDidChangeContent(e=>connection.sendDiagnostics({uri:e.document.uri,version:e.document.version,diagnostics:diagnostics(e.document.uri)}));
documents.onDidClose(e=>connection.sendDiagnostics({uri:e.document.uri,diagnostics:[]}));
connection.onCompletion(()=>directives.map(label=>({label:'&'+label,kind:CompletionItemKind.Keyword,detail:'StructMark directive'})));
connection.onHover(params=>{const doc=documents.get(params.textDocument.uri);if(!doc)return null;const text=doc.getText();const at=positionToOffset(text,params.position);const match=/&([a-z][a-z0-9_]*)/g;let m;while((m=match.exec(text))){if(at>=m.index&&at<=m.index+m[0].length)return {contents:{kind:MarkupKind.Markdown,value:'StructMark 指令 `&'+m[1]+'`'}};}return null;});
connection.onDocumentSymbol(params=>{const ast=parse(params.textDocument.uri);if(!ast)return [];const output:DocumentSymbol[]=[];const stack:Array<{level:number;node:DocumentSymbol}>=[];walk(ast.children,b=>{if(b.type!=='heading')return;const name=b.children.map(n=>n.type==='text'?n.value:'').join('').trim()||'Heading';const node:DocumentSymbol={name,kind:SymbolKind.String,range:ranges(b.range.start,b.range.end),selectionRange:ranges(b.range.start,b.range.end),children:[]};while(stack.length&&stack.at(-1)!.level>=b.level)stack.pop();if(stack.length)stack.at(-1)!.node.children!.push(node);else output.push(node);stack.push({level:b.level,node});});return output;});
// ── 安全工作區定位 ──
let workspaceRoots: string[] = [];
connection.onInitialized(() => { connection.console.info('StructMark LSP ready'); });
function safeFile(uri: string, root: string): string | null {
  try {
    const base = realpathSync(root);
    const file = realpathSync(fileURLToPath(uri));
    const rel = relative(base, file);
    if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel) || !rel.endsWith('.sm')) return null;
    if (!statSync(file).isFile()) return null;
    return rel.split(sep).join('/');
  } catch { return null; }
}
function currentRoot(uri: string): string | null {
  for (const root of workspaceRoots) if (safeFile(uri, root) !== null) return root;
  return null;
}
function astFor(uri: string) {
  const doc = documents.get(uri);
  if (doc) return parseDocument(doc.getText());
  try { return parseDocument(readFileSync(fileURLToPath(uri), 'utf8')); }
  catch { return null; }
}
function allFiles(root: string): string[] {
  // Limit traversal to .sm files, refuse symlinks, and cap resource usage.
  const found: string[] = [], pending = [root];
  while (pending.length && found.length < 2000) {
    const dir = pending.pop()!;
    let entries;
    try { entries = readdirSync(dir, {withFileTypes:true}); } catch { continue; }
    for (const item of entries) {
      if (item.isSymbolicLink()) continue;
      const absolute = resolve(dir, item.name);
      if (item.isDirectory() && pending.length < 2000) pending.push(absolute);
      else if (item.isFile() && item.name.endsWith('.sm')) found.push(pathToFileURL(absolute).href);
    }
  }
  return found;
}
function refsAndIds(uri: string) {
  const ast = astFor(uri);
  const ids: Array<{id:string;range:ReturnType<typeof ranges>}> = [];
  const refs: Array<{target:string;range:ReturnType<typeof ranges>}> = [];
  if (!ast) return {ids,refs};
  visitAst(ast, {enter(node) {
    if (node.type === 'heading' && node.id) ids.push({id:node.id.normalize('NFC'),range:ranges(node.range.start,node.range.end)});
    if (node.type === 'footnoteDef') ids.push({id:node.id.normalize('NFC'),range:ranges(node.range.start,node.range.end)});
    if (node.type === 'ref') refs.push({target:node.target,range:ranges(node.range.start,node.range.end)});
  }});
  return {ids,refs};
}
function within(pos:{line:number;character:number},r:ReturnType<typeof ranges>) {
  return (pos.line>r.start.line || pos.line===r.start.line && pos.character>=r.start.character) &&
    (pos.line<r.end.line || pos.line===r.end.line && pos.character<=r.end.character);
}
function navigation(uri:string,position:{line:number;character:number},references:boolean):Location[] {
  const root=currentRoot(uri); if (!root) return [];
  const source=safeFile(uri,root); if (!source) return [];
  const local=refsAndIds(uri);
  const ref=local.refs.find(r=>within(position,r.range));
  const id=local.ids.find(r=>within(position,r.range));
  const resolved=ref?resolveWorkspaceReference(source,ref.target):id?{path:source,id:id.id}:null;
  if (!resolved) return [];
  const targetUri=pathToFileURL(resolve(root,resolved.path)).href;
  if (safeFile(targetUri,root)===null) return [];
  if (!references) return refsAndIds(targetUri).ids.filter(x=>x.id===resolved.id).map(x=>({uri:targetUri,range:x.range}));
  const output:Location[]=[];
  for (const candidate of allFiles(root)) {
    const from=safeFile(candidate,root);if (!from) continue;
    for (const r of refsAndIds(candidate).refs) {
      const to=resolveWorkspaceReference(from,r.target);
      if (to?.path===resolved.path && to.id===resolved.id) output.push({uri:candidate,range:r.range});
    }
  }
  return output;
}
connection.onDefinition(params=>navigation(params.textDocument.uri,params.position,false));
connection.onReferences(params=>navigation(params.textDocument.uri,params.position,true));
documents.listen(connection);connection.listen();
