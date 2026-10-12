/*
 * File: index.d.mts
 * Modification: 2026-10-12 — Public ESM declaration for the v2 engine.
 */
export type StructMarkDiagnostic={line:number;column:number;code:string;message:string;severity:'warning'|'error'};
export type StructMarkInline={type:string;value?:string;target?:string;file?:string|null;children?:StructMarkInline[]};
export type StructMarkHeading={type:'heading';level:number;text:string;id:string|null;line:number};
export type StructMarkText={type:'text';text:string;line:number};
export type StructMarkDirective={type:'directive';name:string;attributes:Record<string,string>;mode:'normal'|'table'|'raw'|'data';children:StructMarkNode[];line:number;raw?:string[];rows?:string[][];columns?:Array<{name:string;type:string}>;data?:unknown};
export type StructMarkNode=StructMarkHeading|StructMarkText|StructMarkDirective;
export interface StructMarkDocument {version:'2.0';nodes:StructMarkNode[];diagnostics:StructMarkDiagnostic[];valid:boolean;strict:boolean;}
export declare const directiveDefinitions:Readonly<Record<string,{alias:string|null;defaultAttribute:string|null;mode:'normal'|'table'|'raw'|'data';attributes:readonly string[]}>>;
export declare const directiveLookup:ReadonlyMap<string,string>;
export declare function parse(source:string,options?:{strict?:boolean}):StructMarkDocument;
export declare function parseInline(source:string,depth?:number):StructMarkInline[];
export declare function format(document:StructMarkDocument):string;
export declare function renderHtml(document:StructMarkDocument):string;
export declare function renderInline(nodes:StructMarkInline[]):string;
export declare function escapeHtml(input:unknown):string;
export declare function resolveWorkspaceTarget(from:string,file:string):string|null;
export declare function validateWorkspace(files:Map<string,string>|Record<string,string>):{documents:Map<string,StructMarkDocument>;diagnostics:Array<StructMarkDiagnostic&{path:string}>};
export declare function documentHeadings(document:StructMarkDocument):StructMarkHeading[];
export declare function referencesOnLine(line:string):Array<{target:string;file:string|null;start:number;end:number}>;
export declare function referenceAt(source:string,line:number,character:number):{target:string;file:string|null;start:number;end:number}|null;
export declare function headingAt(doc:StructMarkDocument,line:number,character:number,source:string):StructMarkHeading|null;

export declare function documentLocations(doc:StructMarkDocument,source:string):{ids:Array<{id:string;line:number;start:number;end:number}>;refs:Array<{target:string;file:string|null;line:number;start:number;end:number}>};
