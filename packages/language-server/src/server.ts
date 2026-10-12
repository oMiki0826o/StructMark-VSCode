/*
 * File: server.ts
 * Modification: 2026-10-12 — LSP service migrated to the shared StructMark v2 engine.
 */
import {createConnection, ProposedFeatures, TextDocuments, TextDocumentSyncKind, CompletionItemKind, MarkupKind, SymbolKind, DiagnosticSeverity, type DocumentSymbol, type Location} from 'vscode-languageserver/node.js';
import {TextDocument} from 'vscode-languageserver-textdocument';
import {parse, directiveDefinitions, documentHeadings, documentLocations, resolveWorkspaceTarget, type StructMarkDocument} from '../../../src/v2/index.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {relative,resolve,isAbsolute,sep} from 'node:path';
import {realpathSync,readFileSync,statSync,readdirSync} from 'node:fs';

const connection=createConnection(ProposedFeatures.all);
const documents=new TextDocuments(TextDocument);
let workspaceRoots:string[]=[];
const range=(line:number,start:number,end:number)=>({start:{line:Math.max(0,line-1),character:Math.max(0,start)},end:{line:Math.max(0,line-1),character:Math.max(0,end)}});
const rangeOf=(line:number,length:number)=>range(line,0,length);

// ── 來源安全與檔案定位 ──
function safeFile(uri:string,root:string):string|null{
  try{
    const base=realpathSync(root);
    const path=realpathSync(fileURLToPath(uri));
    const rel=relative(base,path);
    if(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel)||!rel.endsWith('.sm')||!statSync(path).isFile())return null;
    return rel.split(sep).join('/');
  }catch{return null;}
}
function currentRoot(uri:string):string|null{return workspaceRoots.find(root=>safeFile(uri,root)!==null)??null;}
function sourceFor(uri:string):string|null{
  const open=documents.get(uri);if(open)return open.getText();
  try{return readFileSync(fileURLToPath(uri),'utf8');}catch{return null;}
}
function parsed(uri:string):StructMarkDocument|null{
  const src=sourceFor(uri);return src===null?null:parse(src);
}
function allFiles(root:string):string[]{
  const output:string[]=[],pending=[root];let directories=0;
  while(pending.length&&output.length<2000&&directories<2000){
    const dir=pending.pop()!;directories++;
    let entries;
    try{entries=readdirSync(dir,{withFileTypes:true});}catch{continue;}
    for(const item of entries){
      if(item.isSymbolicLink())continue;
      const absolute=resolve(dir,item.name);
      if(item.isDirectory()&&pending.length<2000&&!['node_modules','.git','out','dist','.next'].includes(item.name))pending.push(absolute);
      else if(item.isFile()&&item.name.endsWith('.sm')&&output.length<2000)output.push(pathToFileURL(absolute).href);
    }
  }
  return output;
}
function sendDiagnostics(uri:string){
  const doc=parsed(uri);
  const diagnostics=(doc?.diagnostics??[]).slice(0,200).map(d=>({
    range:range(d.line,(d.column??1)-1,(d.column??1)),
    severity:d.severity==='error'?DiagnosticSeverity.Error:DiagnosticSeverity.Warning,
    code:d.code,source:'structmark-v2',message:d.message
  }));
  connection.sendDiagnostics({uri,version:documents.get(uri)?.version,diagnostics});
}

// ── LSP 能力 ──
connection.onInitialize(params=>{
  workspaceRoots=(params.workspaceFolders??[]).flatMap(f=>{try{return f.uri.startsWith('file:')?[fileURLToPath(f.uri)]:[];}catch{return [];}});
  if(!workspaceRoots.length&&params.rootUri?.startsWith('file:')){
    try{workspaceRoots=[fileURLToPath(params.rootUri)];}catch{workspaceRoots=[];}
  }
  return {capabilities:{textDocumentSync:TextDocumentSyncKind.Incremental,completionProvider:{triggerCharacters:['&','[','#']},hoverProvider:true,documentSymbolProvider:true,definitionProvider:true,referencesProvider:true}};
});
connection.onInitialized(()=>connection.console.info('StructMark v2 LSP ready'));
documents.onDidChangeContent(e=>sendDiagnostics(e.document.uri));
documents.onDidClose(e=>connection.sendDiagnostics({uri:e.document.uri,diagnostics:[]}));
connection.onCompletion(()=>Object.entries(directiveDefinitions).flatMap(([name,def])=>{
  const full={label:'&'+name,kind:CompletionItemKind.Keyword,detail:'StructMark v2 directive'};
  return def.alias?[full,{label:'&'+def.alias,kind:CompletionItemKind.Keyword,detail:'Alias of &'+name}]:[full];
}));
connection.onHover(params=>{
  const source=sourceFor(params.textDocument.uri);if(source===null)return null;
  const line=source.replace(/\r\n?/g,'\n').split('\n')[params.position.line]??'';
  const command=/&([a-z][a-z0-9_-]*)/g;
  for(const match of line.matchAll(command)){
    if(params.position.character>=(match.index??0)&&params.position.character<(match.index??0)+match[0].length)
      return {contents:{kind:MarkupKind.Markdown,value:'StructMark v2 指令 `&'+match[1]+'`'}};
  }
  return null;
});
connection.onDocumentSymbol(params=>{
  const source=sourceFor(params.textDocument.uri),doc=parsed(params.textDocument.uri);
  if(!source||!doc)return [];
  const lines=source.replace(/\r\n?/g,'\n').split('\n');
  const results:DocumentSymbol[]=[],stack:Array<{level:number;symbol:DocumentSymbol}>=[];
  for(const item of documentHeadings(doc)){
    const r=rangeOf(item.line,lines[item.line-1]?.length??0);
    const symbol:DocumentSymbol={name:item.text,kind:SymbolKind.String,range:r,selectionRange:r,children:[]};
    while(stack.length&&stack.at(-1)!.level>=item.level)stack.pop();
    if(stack.length)stack.at(-1)!.symbol.children!.push(symbol);else results.push(symbol);
    stack.push({level:item.level,symbol});
  }
  return results;
});

// ── 定義與引用使用同一份 v2 AST，避免 raw 區塊誤導跳轉 ──
function symbolsAndReferences(uri:string){
  const source=sourceFor(uri),doc=parsed(uri);
  if(source===null||doc===null)return {ids:[],refs:[]} as {
    ids:Array<{id:string;range:ReturnType<typeof range>}>,
    refs:Array<{file:string|null;target:string;range:ReturnType<typeof range>}>
  };
  const locations=documentLocations(doc,source);
  return {
    ids:locations.ids.map(item=>({id:item.id,range:range(item.line,item.start,item.end)})),
    refs:locations.refs.map(item=>({file:item.file,target:item.target,range:range(item.line,item.start,item.end)}))
  };
}
function contains(position:{line:number;character:number},r:ReturnType<typeof range>):boolean{
  return position.line===r.start.line&&position.character>=r.start.character&&position.character<r.end.character;
}
function navigate(uri:string,position:{line:number;character:number},getReferences:boolean):Location[]{
  const root=currentRoot(uri),current=root?safeFile(uri,root):null;
  if(!root||!current)return [];
  const source=sourceFor(uri),doc=parsed(uri);
  if(!source||!doc)return [];
  const positions=symbolsAndReferences(uri);
  const posRef=positions.refs.find(ref=>contains(position,ref.range));
  const declaration=positions.ids.find(id=>contains(position,id.range));
  const target=posRef?{
    path:posRef.file?resolveWorkspaceTarget(current,posRef.file):current,id:posRef.target
  }:declaration?{path:current,id:declaration.id}:null;
  if(!target?.path||!target.id)return [];
  const targetUri=pathToFileURL(resolve(root,target.path)).href;
  if(safeFile(targetUri,root)===null)return [];
  if(!getReferences)return symbolsAndReferences(targetUri).ids.filter(x=>x.id===target.id).map(x=>({uri:targetUri,range:x.range}));
  const output:Location[]=[];
  for(const candidate of allFiles(root)){
    const from=safeFile(candidate,root);if(!from)continue;
    for(const ref of symbolsAndReferences(candidate).refs){
      const destination=ref.file?resolveWorkspaceTarget(from,ref.file):from;
      if(destination===target.path&&ref.target===target.id)output.push({uri:candidate,range:ref.range});
    }
  }
  return output;
}
connection.onDefinition(params=>navigate(params.textDocument.uri,params.position,false));
connection.onReferences(params=>navigate(params.textDocument.uri,params.position,true));
documents.listen(connection);connection.listen();
