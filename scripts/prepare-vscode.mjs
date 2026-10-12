#!/usr/bin/env node
/*
 * File: prepare-vscode.mjs
 * Modification: 2026-10-12 — Reproducible layout for a portable VS Code extension.
 */
import {access,cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const repo=resolve(import.meta.dirname,'..');
const editor=join(repo,'packages','vscode');
const packageDir=join(editor,'server');
const required=[
  join(repo,'packages','language-server','dist','packages','language-server','src','server.js'),
  join(editor,'dist','extension.js'),
  join(repo,'packages','language-server','node_modules','vscode-languageserver','node.js')
];
try {for(const path of required)await access(path);}catch{
  console.error('Missing compiled TypeScript output. Run npm ci and npm run build in packages/language-server and packages/vscode first.');
  process.exit(1);
}
await rm(packageDir,{recursive:true,force:true});
await mkdir(join(packageDir,'packages','language-server','dist'),{recursive:true});
await mkdir(join(packageDir,'src'),{recursive:true});
await cp(join(repo,'src','v2'),join(packageDir,'src','v2'),{recursive:true});
await cp(required[0],join(packageDir,'packages','language-server','dist','server.js'));
// VSIX 不會自動安裝相鄰 language-server 套件的依賴，因此明確包含它們。
await cp(join(repo,'packages','language-server','node_modules'),join(packageDir,'node_modules'),{recursive:true});
const rootManifest=JSON.parse(await readFile(join(repo,'package.json'),'utf8'));
await writeFile(join(packageDir,'package.json'),JSON.stringify({name:'structmark-vscode-server',type:'module',version:rootManifest.version},null,2)+'\n');
console.log('Prepared VS Code portable server at packages/vscode/server/');
