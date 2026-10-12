/*
 * File: registry.mjs
 * Modification: 2026-10-12 — Declarative StructMark v2 directive registry.
 */

// ── 指令綱要：每個指令最多一個別名及一個預設位置參數 ──
export const directiveDefinitions = Object.freeze({
  note: {alias:'n', defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  warning: {alias:'w', defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  tip: {alias:'p', defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  quote: {alias:'q', defaultAttribute:'source', mode:'normal', attributes:['source','id']},
  important: {alias:'i', defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  caution: {alias:null, defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  details: {alias:null, defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  example: {alias:null, defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  figure: {alias:null, defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  definition: {alias:null, defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  theorem: {alias:null, defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  lemma: {alias:null, defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  proof: {alias:null, defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  abstract: {alias:null, defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  appendix: {alias:null, defaultAttribute:'title', mode:'normal', attributes:['title','id']},
  table: {alias:'tbl', defaultAttribute:null, mode:'table', attributes:['id']},
  equation: {alias:'eq', defaultAttribute:null, mode:'raw', attributes:['id']},
  code: {alias:'c', defaultAttribute:'lang', mode:'raw', attributes:['lang','id']},
  raw: {alias:null, defaultAttribute:null, mode:'raw', attributes:['id']},
  data: {alias:'d', defaultAttribute:'format', mode:'data', attributes:['format','schema','id']},
  schema: {alias:null, defaultAttribute:'name', mode:'data', attributes:['name','id']},
});

export const directiveLookup = new Map(Object.entries(directiveDefinitions).flatMap(([name, definition]) => [
  [name, name], ...(definition.alias ? [[definition.alias, name]] : [])
]));
export const IDENTIFIER = /^[a-z][a-z0-9_-]*$/;
export const MAX_SOURCE = 2_000_000;
export const MAX_DEPTH = 40;
export const MAX_TABLE_COLUMNS = 128;
export const MAX_TABLE_ROWS = 10_000;

export const issue = (line, code, message, severity='error', column=1) => ({line, column, code, message, severity});

// ── 依語法分割逗號，支援引號與跳脫 ──
function splitAttributes(text) {
  const result=[];let current='';let quote='';let escaped=false;
  for (const char of text) {
    if (escaped) {current+=char;escaped=false;continue;}
    if (char==='\\') {current+=char;escaped=true;continue;}
    if (quote) {if (char===quote) quote='';current+=char;continue;}
    if (char==='"'||char==="'") {quote=char;current+=char;continue;}
    if (char===',') {result.push(current.trim());current='';continue;}
    current+=char;
  }
  result.push(current.trim());
  return {parts:result,unclosed:!!quote||escaped};
}
function unquote(text) {
  const t=text.trim();
  if (t.startsWith('"') && t.endsWith('"')) {
    try {const value=JSON.parse(t);if(typeof value==='string')return value;}catch{}
    return null;
  }
  if(t.startsWith("'")&&t.endsWith("'"))return t.slice(1,-1).replace(/\\(['\\])/g,'$1');
  if(/[\[\]"']/.test(t))return null;
  return t.replace(/\\([,\\=])/g,'$1');
}
export function readDirectiveAttributes(text, definition, line, diagnostics) {
  const output=Object.create(null);
  if(text===undefined||text==='')return Object.assign({},output);
  const {parts,unclosed}=splitAttributes(text);
  if(unclosed)diagnostics.push(issue(line,'SM200','屬性引號或跳脫字元未閉合'));
  const positional=parts.length===1&&!parts[0].includes('=');
  if(positional) {
    const value=unquote(parts[0]);
    if(!definition.defaultAttribute)diagnostics.push(issue(line,'SM202','此指令沒有預設參數'));
    else if(value===null)diagnostics.push(issue(line,'SM200','預設參數語法不合法'));
    else output[definition.defaultAttribute]=value;
  }else{
    for(const part of parts){
      const m=/^([a-z][a-z0-9_-]*)\s*=\s*([\s\S]*)$/.exec(part);
      if(!m){diagnostics.push(issue(line,'SM200','無效屬性語法'));continue;}
      const [,key,encoded]=m;
      const value=unquote(encoded);
      if(value===null) {diagnostics.push(issue(line,'SM200',`無效屬性值：${key}`));continue;}
      if(Object.hasOwn(output,key))diagnostics.push(issue(line,'SM201',`重複屬性：${key}`));
      else output[key]=value;
    }
  }
  for(const key of Object.keys(output))if(!definition.attributes.includes(key))
    diagnostics.push(issue(line,'SM203',`& 指令不接受屬性：${key}`));
  return Object.assign({},output);
}
export function encodeAttribute(value){
  if(value!==''&&/^[^\s,=\[\]"'\\]+$/u.test(value))return value;
  return JSON.stringify(String(value));
}
