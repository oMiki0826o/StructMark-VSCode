/*
 * File: validate-vscode-assets.mjs
 * Modification: 2026-10-12 — Verify VS Code grammar, snippet and compiled layout consistency.
 */
import {readFile,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const editor=join(root,'packages','vscode');
const parse=async file=>JSON.parse(await readFile(file,'utf8'));
const manifest=await parse(join(editor,'package.json'));
const grammar=await parse(join(editor,'syntaxes','structmark.tmLanguage.json'));
const snippets=await parse(join(editor,'snippets','structmark.json'));
if(!manifest.main?.endsWith('dist/extension.js'))throw new Error('VS Code main must point to compiled extension');
if(grammar.scopeName!=='source.structmark')throw new Error('TextMate scope mismatch');
if(!Object.values(snippets).some(x=>x.prefix==='smtable'))throw new Error('Missing v2 table snippet');
if(!manifest.contributes?.languages?.some(x=>x.extensions?.includes('.sm')))throw new Error('Missing .sm registration');
if(process.argv.includes('--packaged')){
  await access(join(editor,'server','packages','language-server','dist','server.js'));
  await access(join(editor,'server','src','v2','index.mjs'));
  await access(join(editor,'server','node_modules','vscode-languageserver','node.js'));
}
console.log('VS Code static assets: verified.');
