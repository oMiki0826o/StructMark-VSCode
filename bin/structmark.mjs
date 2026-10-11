#!/usr/bin/env node
/*
 * File: structmark.mjs
 * Modification: 2026-10-11 — StructMark v1.5 CLI，預設唯讀、檔案錯誤退出。
 */
import {readFile, writeFile, readdir, open, lstat, chmod, rename, unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {resolve, relative, extname, dirname, basename, join} from 'node:path';
import {pathToFileURL} from 'node:url';

const HELP = `StructMark v1.5 — .sm language tools
Usage: structmark <command> <file|folder> [options]

  check <files...>             Check diagnostics (exit 1 if any).
  render <file.sm>             Render HTML fragment.
  ast <file.sm>                Write source-located AST JSON.
  convert <file>              Convert to markdown, html, ast, or sm.
  format <file.sm>             Normalize source without overwriting.
  workspace <directory>       Check every .sm file and cross-file refs.

Options:
  -o, --output <file>         Write a new file; refuses to overwrite.
  --to <md|html|ast|sm>       Conversion target (default md).
  --from <sm|markdown>       Conversion source (default from extension).
  --write                    Overwrite the source file (format only).
  --json                     Print diagnostics in JSON (check/workspace).
  --strict                   Treat warnings as failure in output commands.
  -h, --help                 Show help.
`;
const commandNames = new Set(['check','render','ast','convert','format','workspace']);
function argumentsOf(argv) {
  const opts = {files:[],output:null,to:'md',from:null,write:false,json:false,strict:false};
  for (let i=0;i<argv.length;i++) {
    const a=argv[i];
    if (a==='--write') opts.write=true;
    else if (a==='--json') opts.json=true;
    else if (a==='--strict') opts.strict=true;
    else if (a==='--output'||a==='-o'||a==='--to'||a==='--from') {
      if (!argv[i+1] || argv[i+1].startsWith('-')) throw new UsageError(`${a} requires a value`);
      opts[a==='-o'||a==='--output'?'output':a.slice(2)]=argv[++i];
    } else if (a?.startsWith('-')) throw new UsageError(`Unknown option: ${a}`);
    else opts.files.push(a);
  }
  return opts;
}
class UsageError extends Error {}
const fail=(message)=>{process.stderr.write(`${message}\n`);process.exitCode=2;};
function report(file, diagnostics) {
  for (const d of diagnostics) process.stderr.write(`${file}:${d.position.line}:${d.position.column}: ${d.severity} ${d.code} ${d.message}\n`);
}
// ── 原子寫入：format --write 唯一允許覆寫來源的途徑 ──
async function writeAtomic(filename, contents) {
  const dest=resolve(filename);
  const original=await lstat(dest);
  if (original.isSymbolicLink()) throw new Error('Refusing to replace symbolic link source');
  if (!original.isFile()) throw new Error('Source must be a regular file');
  const temporary=join(dirname(dest),`.${basename(dest)}.${process.pid}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle=await open(temporary,'wx',original.mode & 0o777);
    await handle.writeFile(contents,'utf8');
    await handle.sync();
    await handle.close();
    handle=undefined;
    await chmod(temporary,original.mode & 0o777);
    await rename(temporary,dest);
  } finally {
    if(handle) await handle.close();
    await unlink(temporary).catch(error=>{if(error.code!=='ENOENT') throw error;});
  }
}
async function output(result, source, opts, canWrite=false) {
  if (opts.write && !canWrite) throw new UsageError('--write is only valid with format');
  if (opts.write && opts.output) throw new UsageError('Cannot combine --write and --output');
  if (!opts.write && !opts.output) {process.stdout.write(result);return;}
  const dest=resolve(opts.write?source:opts.output);
  if (opts.output && dest===resolve(source)) throw new UsageError('Refusing to replace input; use format --write');
  if (opts.write) await writeAtomic(dest,result);
  else await writeFile(dest,result,{encoding:'utf8',flag:'wx'});
}
async function walk(root, dir=root) {
  const files=[];
  for (const e of await readdir(dir,{withFileTypes:true})) {
    if (e.name.startsWith('.') || ['node_modules','dist','out'].includes(e.name)) continue;
    const path=resolve(dir,e.name);
    if (e.isDirectory()) files.push(...await walk(root,path));
    else if (e.isFile() && e.name.endsWith('.sm')) files.push(path);
  }
  return files.sort();
}
async function execute(command, args) {
  const opts=argumentsOf(args);
  if (opts.files.length===0 || (command!=='check' && opts.files.length!==1)) throw new UsageError(`Expected ${command==='check'?'one or more files':'one file or directory'} (.sm)`);
  const core=await import('../dist/index.js');
  if (command==='workspace') {
    if (opts.write||opts.output) throw new UsageError('workspace only checks files');
    const root=resolve(opts.files[0]);
    const paths=await walk(root);
    if (!paths.length) throw new UsageError('No .sm files in workspace');
    const documents=[];let count=0;
    for (const filename of paths) {
      const source=await readFile(filename,'utf8');
      const document=core.parseDocument(source);
      const path=relative(root,filename).replaceAll('\\','/');
      documents.push({path,document});
      count+=document.diagnostics.length;
      if (!opts.json) report(path,document.diagnostics);
    }
    const cross=core.buildWorkspaceIndex(documents).diagnostics;count+=cross.length;
    if (opts.json)process.stdout.write(JSON.stringify({files:paths.length,diagnostics:[...documents.flatMap(x=>x.document.diagnostics.map(d=>({...d,file:x.path}))),...cross]},null,2)+'\n');
    else {for (const issue of cross) report(issue.file,[issue]);process.stdout.write(`Checked ${paths.length} .sm files; ${count} diagnostic(s).\n`);}
    if(count)process.exitCode=1;
    return;
  }
  if (!['md','markdown','html','ast','sm'].includes(opts.to)) throw new UsageError(`Unsupported target: ${opts.to}`);
  if (opts.write && command!=='format') throw new UsageError('--write is only valid with format');
  if (opts.output && command==='check') throw new UsageError('check does not write output');
  let count=0;
  for(const filename of opts.files) {
    const data=await readFile(filename,'utf8');
    const input=opts.from??(extname(filename).toLowerCase()==='.md'?'markdown':'sm');
    if (!['sm','markdown'].includes(input)) throw new UsageError(`Unsupported input: ${input}`);
    if (command==='format') {
      if(input!=='sm')throw new UsageError('format only accepts .sm files');
      const result=core.formatSource(data);
      report(filename,result.diagnostics);
      if(result.diagnostics.some(d=>d.severity==='error')){process.exitCode=1;continue;}
      if(opts.strict&&result.diagnostics.length){process.exitCode=1;continue;}
      await output(result.source,filename,opts,true);
      continue;
    }
    if(command==='convert' && opts.to==='sm' && input==='markdown') {
      const converted=core.markdownToStructMarkSource(data);
      await output(converted,filename,opts);
      continue;
    }
    const doc=input==='markdown'?core.fromMarkdown(data):core.parseDocument(data);
    count+=doc.diagnostics.length;
    if(command==='check') {
      if(!opts.json)report(filename,doc.diagnostics);
      continue;
    }
    report(filename,doc.diagnostics);
    if(doc.diagnostics.some(d=>d.severity==='error')){process.exitCode=1;continue;}
    let result='';
    if(command==='ast'||(command==='convert'&&opts.to==='ast')) result=core.serializeAst(doc,2)+'\n';
    else if(command==='render'||(command==='convert'&&opts.to==='html'))result=core.renderHtml(doc)+'\n';
    else if(command==='convert'&&['md','markdown'].includes(opts.to)) {
      const detailed=core.toMarkdownDetailed(doc);
      report(filename,detailed.diagnostics);
      if(opts.strict&&detailed.diagnostics.length) process.exitCode=1;
      result=detailed.source;
    } else throw new UsageError('Unsupported conversion pair');
    if(opts.strict&&(doc.diagnostics.length || (command==='convert' && ['md','markdown'].includes(opts.to) && core.toMarkdownDetailed(doc).diagnostics.length))) {
      process.exitCode=1;continue;
    }
    await output(result,filename,opts);
  }
  if(command==='check') {
    if(opts.json)process.stdout.write(JSON.stringify({files:opts.files.length,diagnostics:await Promise.all(opts.files.map(async file=>({file,diagnostics:(opts.from==='markdown'?core.fromMarkdown:core.parseDocument)(await readFile(file,'utf8')).diagnostics})))},null,2)+'\n');
    else process.stdout.write(`Checked ${opts.files.length} file(s); ${count} diagnostic(s).\n`);
    if(count) process.exitCode=1;
  }
}
async function main(argv=process.argv.slice(2)) {
  if(!argv.length || argv.includes('--help') || argv.includes('-h')) {process.stdout.write(HELP);return;}
  const [command,...args]=argv;
  if(!commandNames.has(command)){fail(`Unknown command: ${command}. See --help.`);return;}
  try {await execute(command,args);}
  catch(error){if(error instanceof UsageError){fail(error.message);return;}
    process.stderr.write(`StructMark: ${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;}
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)await main();
