/*
 * File: positions.ts
 * Modification: 2026-10-11 — UTF-16 LSP position conversion.
 */
export interface LspPosition {line:number;character:number}
export function positionToOffset(text:string, pos:LspPosition):number {
  const lines=text.split('\n'); const line=Math.max(0,Math.min(pos.line,lines.length-1));
  let start=0;for(let i=0;i<line;i++) start+=lines[i]!.length+1;
  return start+Math.max(0,Math.min(pos.character,lines[line]!.replace(/\r$/,'').length));
}
export function offsetToPosition(text:string, offset:number):LspPosition {
  const prefix=text.slice(0,Math.max(0,Math.min(offset,text.length)));
  const lines=prefix.split('\n');return {line:lines.length-1,character:lines.at(-1)!.length};
}
