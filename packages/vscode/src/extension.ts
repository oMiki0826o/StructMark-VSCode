/*
 * File: extension.ts
 * Modification: 2026-10-11 — VS Code language client.
 */
import * as path from 'node:path';
import * as vscode from 'vscode';
import {LanguageClient,TransportKind,type LanguageClientOptions,type ServerOptions} from 'vscode-languageclient/node.js';
let client:LanguageClient|undefined;
export async function activate(context:vscode.ExtensionContext):Promise<void>{
  const serverModule=context.asAbsolutePath(path.join('server','packages','language-server','dist','server.js'));
  const serverOptions:ServerOptions={run:{module:serverModule,transport:TransportKind.stdio},debug:{module:serverModule,transport:TransportKind.stdio}};
  const clientOptions:LanguageClientOptions={documentSelector:[{scheme:'file',language:'structmark'}]};
  client=new LanguageClient('structmark','StructMark Language Server',serverOptions,clientOptions);
  try{await client.start();}catch(error){void vscode.window.showErrorMessage('StructMark Language Server 啟動失敗：'+String(error));}
}
export async function deactivate():Promise<void>{if(client)await client.stop();}
