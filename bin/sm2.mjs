#!/usr/bin/env node
/*
 * File: sm2.mjs
 * Modification: 2026-10-12 — Shared v2 CLI with explicit format write, HTML and workspace checks.
 */
import {readFile,writeFile,rename,readdir,lstat,rm} from 'node:fs/promises';
import {resolve,relative,join,extname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {parse,format,renderHtml,validateWorkspace} from '../src/v2/index.mjs';

const usage=`StructMark 2.0 CLI (Node.js >=22)
Usage:
  sm2 check <file.sm> [...]
  sm2 ast <file.sm>
  sm2 html <file.sm>
  sm2 format <file.sm> [--check | --write]
  sm2 workspace <directory>

format prints canonical source by default; --write replaces the input only if valid.`;
const [command,...args]=process.argv.slice(2);
async function load(path){return readFile(path,'utf8');}
const report=(path,d)=>console.error(`${path}:${d.line}:${d.column??1} ${d.code} ${d.severity}: ${d.message}`);
async function run(){
  if(command==='help'||command==='--help'||command===undefined){console.log(usage);return;}
  if(command==='workspace'){
    if(args.length!==1)throw new Error('workspace requires one directory');
    const root=resolve(args[0]); const files=new Map(), pending=[root];
    const status=await lstat(root);if(!status.isDirectory())throw new Error('workspace path must be a directory');
    while(pending.length){
      const dir=pending.pop();
      for(const entry of await readdir(dir,{withFileTypes:true})){
        if(entry.isSymbolicLink())continue;
        const full=join(dir,entry.name);
        if(entry.isDirectory()){
          if(!['node_modules','.git','.next','dist','out'].includes(entry.name))pending.push(full);
        }else if(entry.isFile()&&extname(full)==='.sm'){
          if(files.size>=2000)throw new Error('Workspace has more than 2000 .sm files');
          files.set(relative(root,full).split('\\').join('/'),await load(full));
        }
      }
    }
    const result=validateWorkspace(files);
    result.diagnostics.forEach(d=>report(d.path,d));
    console.log(`Checked ${result.documents.size} documents: ${result.diagnostics.length} diagnostic(s).`);
    if(result.diagnostics.some(d=>d.severity==='error'))process.exitCode=1;
    return;
  }
  if(!['check','ast','html','format'].includes(command)||!args.length)throw new Error(usage);
  if(command!=='check'&&(args.length>2||args.length===2&&!['--check','--write'].includes(args[1])))throw new Error(usage);
  if(command!=='format'&&args.some(s=>s.startsWith('--')))throw new Error(usage);
  if(command==='format'&&args.length===2&&!['--check','--write'].includes(args[1]))throw new Error(usage);
  const targets=command==='check'?args:[args[0]];
  for(const file of targets){
    if(extname(file)!=='.sm')throw new Error(`Expected a .sm file: ${file}`);
    const source=await load(file),doc=parse(source);
    doc.diagnostics.forEach(d=>report(file,d));
    if(!doc.valid){process.exitCode=1;continue;}
    if(command==='ast')console.log(JSON.stringify(doc,null,2));
    if(command==='html')console.log(renderHtml(doc));
    if(command==='format'){
      const formatted=format(doc)+'\n';
      if(args[1]==='--check'){
        if(source.replace(/\r\n?/g,'\n')!==formatted){console.error(`${file}: noncanonical formatting`);process.exitCode=1;}
      }else if(args[1]==='--write'){
        const absolute=resolve(file),state=await lstat(absolute);
        if(!state.isFile())throw new Error('Only regular files can be written');
        const temp=absolute+'.sm2-'+randomUUID();
        try{await writeFile(temp,formatted,{mode:state.mode});await rename(temp,absolute);}catch(error){await rm(temp,{force:true});throw error;}
      }else process.stdout.write(formatted);
    }
    if(command==='check')console.log(`${file}: valid`);
  }
}
try{await run();}catch(error){console.error(`sm2: ${error instanceof Error?error.message:String(error)}`);process.exitCode=2;}
