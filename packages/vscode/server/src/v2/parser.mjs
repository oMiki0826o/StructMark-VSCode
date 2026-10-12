/*
 * File: parser.mjs
 * Modification: 2026-10-12 — v2 independent structured parser, diagnostics and typed data.
 */
import {directiveDefinitions,directiveLookup,readDirectiveAttributes,IDENTIFIER,issue,MAX_SOURCE,MAX_DEPTH,MAX_TABLE_COLUMNS,MAX_TABLE_ROWS} from './registry.mjs';
import {parseInline,inlineReferences} from './inline.mjs';

// ── 詞法 ──
const headingPattern=/^#([1-6])[ \t]+(.+)$/;
const trailingId=/^(.*?)[ \t]+\(#([a-z][a-z0-9_-]*)\)$/;
const directivePattern=/^&([a-z][a-z0-9_-]*)(?:\[((?:\\.|[^\]\\\n])*)\])?[ \t]*$/;
const endPattern=/^&(?:end|e)[ \t]*$/;
const rawEscaped=/^(\\+)&(end|e)[ \t]*$/;
const typePattern=/^(.*?):(string|number|boolean|date)$/;

// ── 原生方括號表格，每行必須由相鄰的儲存格組成 ──
function parseRow(row,line,diagnostics){
  const cells=[];let i=0;
  while(i<row.length){
    if(row[i]!=='['){diagnostics.push(issue(line,'SM301','表格每一列必須由相鄰的方括號儲存格組成', 'error', i+1));return null;}
    i++;let current='';let finished=false;
    while(i<row.length){
      const c=row[i++];
      if(c===']'){finished=true;break;}
      if(c==='\\'){
        const next=row[i];
        if(next==='\\'||next===']'||next==='['){current+=next;i++;continue;}
        diagnostics.push(issue(line,'SM305','無效的表格跳脫序列','error',i));return null;
      }
      current+=c;
    }
    if(!finished){diagnostics.push(issue(line,'SM301','表格儲存格缺少結束括號'));return null;}
    cells.push(current);
  }
  if(cells.length===0)diagnostics.push(issue(line,'SM301','表格至少需要一個儲存格'));
  return cells.length?cells:null;
}
function validateTable(node,diagnostics){
  const header=node.rows[0]??[];
  if(!header.length)diagnostics.push(issue(node.line,'SM309','表格必須包含標頭列'));
  node.columns=header.map(cell=>{const matched=typePattern.exec(cell);return matched?{name:matched[1],type:matched[2]}:{name:cell,type:'string'};});
  for(let k=1;k<node.rows.length;k++){
    const row=node.rows[k];if(row.length!==header.length)continue;
    for(let n=0;n<row.length;n++){
      const {type}=node.columns[n],value=row[n];
      const ok=type==='string'||(type==='number' && value.trim()!=='' && Number.isFinite(Number(value)))||
        (type==='boolean'&&(value==='true'||value==='false'))||
        (type==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);
      if(!ok)diagnostics.push(issue(node.rowLines[k]??node.line,'SM303',`型別 ${type} 不接受數值：${value}`));
    }
  }
}
function validateData(node,diagnostics){
  const format=node.attributes.format??'json';
  if(format!=='json'){
    diagnostics.push(issue(node.line,'SM306','v2 data 區塊目前僅支援 JSON 格式'));return;
  }
  try{node.data=JSON.parse(node.raw.join('\n'));node.dataError=false;}
  catch{node.dataError=true;diagnostics.push(issue(node.line,'SM304','資料區塊包含不合法的 JSON'));}
}
// ── 最小 Schema 契約，欄位以 ? 表示選填；不冒稱完整 JSON Schema ──
function validateSchemas(nodes,diagnostics){
  const known=new Map(),data=[];
  function collect(list){
    for(const node of list){
      if(node.type==='directive'){
        if(node.name==='schema'){
          const name=node.attributes.name;
          if(!name||!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)){
            diagnostics.push(issue(node.line,'SM503','Schema 必須宣告合法名稱'));continue;
          }
          if(known.has(name)){diagnostics.push(issue(node.line,'SM501',`Schema 重複宣告：${name}`));continue;}
          const definition=node.data;
          if(!definition||Array.isArray(definition)||typeof definition!=='object'||Object.keys(definition).length>128){
            diagnostics.push(issue(node.line,'SM503','Schema 必須為不超過 128 欄的 JSON 物件'));continue;
          }
          let valid=true;const fields=new Set();
          for(const [key,type] of Object.entries(definition)){
            const name=key.endsWith('?')?key.slice(0,-1):key;
            if(!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name)||!['any','string','number','boolean','null','array','object'].includes(type)||fields.has(name)){
              valid=false;break;
            }
            fields.add(name);
          }
          if(!valid){diagnostics.push(issue(node.line,'SM503','Schema 欄位名稱、型別或重複宣告不合法'));continue;}
          known.set(name,definition);
        }else if(node.name==='data'&&node.attributes.schema)data.push(node);
        if(node.mode==='normal')collect(node.children);
      }
    }
  }
  collect(nodes);
  for(const node of data){
    const name=node.attributes.schema,fields=known.get(name);
    if(!fields){diagnostics.push(issue(node.line,'SM502',`找不到 Schema：${name}`));continue;}
    if(node.dataError)continue; // JSON parse diagnostics already reported.
    const values=Array.isArray(node.data)?node.data:[node.data];
    for(const row of values){
      if(!row||Array.isArray(row)||typeof row!=='object'){
        diagnostics.push(issue(node.line,'SM504','Schema 資料必須是物件或物件陣列'));continue;
      }
      const allowed=new Set();
      for(const [field,type] of Object.entries(fields)){
        const optional=field.endsWith('?'),key=optional?field.slice(0,-1):field;
        allowed.add(key);
        const value=row[key];
        if(!Object.hasOwn(row,key)){if(!optional)diagnostics.push(issue(node.line,'SM504',`缺少必填欄位：${key}`));continue;}
        const correct=type==='any'||(type==='null'&&value===null)||
          (type==='number'&&typeof value==='number'&&Number.isFinite(value))||
          (type==='string'&&typeof value==='string')||
          (type==='boolean'&&typeof value==='boolean')||
          (type==='array'&&Array.isArray(value))||
          (type==='object'&&!!value&&typeof value==='object'&&!Array.isArray(value));
        if(!correct)diagnostics.push(issue(node.line,'SM504',`欄位 ${key} 應為 ${type}`));
      }
      for(const key of Object.keys(row))if(!allowed.has(key))
        diagnostics.push(issue(node.line,'SM505',`Schema 未宣告的欄位：${key}`));
    }
  }
}

/** Returns a semantic AST; no file I/O, network calls or code execution. */
export function parse(source,{strict=true}={}){
  const diagnostics=[],nodes=[],symbols=new Map(),references=[];
  if(typeof source!=='string')throw new TypeError('StructMark source must be a string');
  if(source.length>MAX_SOURCE)return {version:'2.0',nodes,diagnostics:[issue(1,'SM001','文件超過最大長度限制')],valid:false,strict};
  const normalized=source.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const lines=normalized.split('\n');
  // 最後的 LF 是檔案終止符，不是額外的空白文字節點。
  if(normalized.endsWith('\n'))lines.pop();
  const stack=[];
  const append=(node)=>(stack.length?stack.at(-1).children:nodes).push(node);
  const addRefs=(text,line)=>{for(const ref of inlineReferences(parseInline(text)))references.push({...ref,line});};
  const isUnknown=(line)=>/^&[a-z]/.test(line);
  for(let idx=0;idx<lines.length;idx++){
    const raw=lines[idx],line=idx+1,top=stack.at(-1);
    if(top?.mode==='raw'||top?.mode==='data'){
      const escape=rawEscaped.exec(raw);
      if(escape){top.raw.push(raw.slice(1));continue;}
      if(endPattern.test(raw)){
        stack.pop();if(top.mode==='data')validateData(top,diagnostics);
        continue;
      }
      top.raw.push(raw);continue;
    }
    if(endPattern.test(raw)){
      if(!top)diagnostics.push(issue(line,'SM101','沒有對應開始標記的結束指令'));
      else{
        stack.pop();
        if(top.mode==='table')validateTable(top,diagnostics);
      }
      continue;
    }
    if(top?.mode==='table'){
      if(raw.trim()==='')continue;
      if(top.rows.length>=MAX_TABLE_ROWS){diagnostics.push(issue(line,'SM307','表格超過列數上限'));continue;}
      const row=parseRow(raw.trim(),line,diagnostics);
      if(row){
        if(row.length>MAX_TABLE_COLUMNS){diagnostics.push(issue(line,'SM308','表格超過欄數上限'));continue;}
        if(top.rows.length&&row.length!==top.rows[0].length)diagnostics.push(issue(line,'SM302','表格欄位數量不一致'));
        top.rows.push(row);top.rowLines.push(line);
      }
      continue;
    }
    const heading=headingPattern.exec(raw);
    if(heading){
      let text=heading[2],id=null;
      const match=trailingId.exec(text);
      if(match){text=match[1];id=match[2];}
      const node={type:'heading',level:Number(heading[1]),text,id,line};append(node);
      if(id){if(symbols.has(id))diagnostics.push(issue(line,'SM401',`重複識別符：${id}`));else symbols.set(id,node);}
      addRefs(text,line);continue;
    }
    const directive=directivePattern.exec(raw);
    if(directive){
      const canonical=directiveLookup.get(directive[1]);
      if(!canonical){diagnostics.push(issue(line,'SM102',`未知指令：${directive[1]}`,strict?'error':'warning'));append({type:'text',text:raw,line});continue;}
      if(stack.length>=MAX_DEPTH){diagnostics.push(issue(line,'SM105','巢狀區塊超過深度上限'));append({type:'text',text:raw,line});continue;}
      const definition=directiveDefinitions[canonical];
      const node={type:'directive',name:canonical,attributes:readDirectiveAttributes(directive[2],definition,line,diagnostics),mode:definition.mode,children:[],line};
      if(definition.mode==='raw'||definition.mode==='data')node.raw=[];
      if(definition.mode==='table'){node.rows=[];node.rowLines=[];node.columns=[];}
      if(definition.mode==='data')node.data=null;
      // The same document ID namespace is shared by headings and directives.
      const id=node.attributes.id;
      if(id){
        if(!IDENTIFIER.test(id))diagnostics.push(issue(line,'SM400',`不合法的識別符：${id}`));
        else if(symbols.has(id))diagnostics.push(issue(line,'SM401',`重複識別符：${id}`));
        else symbols.set(id,node);
      }
      append(node);stack.push(node);continue;
    }
    if(isUnknown(raw))diagnostics.push(issue(line,'SM103','指令語法不合法'));
    if(/^\\&(?:end|e)[ \t]*$/.test(raw)){
      append({type:'text',text:raw.slice(1),line});addRefs(raw.slice(1),line);
    }else{append({type:'text',text:raw,line});addRefs(raw,line);}
  }
  for(const node of stack){diagnostics.push(issue(node.line,'SM104',`未關閉區塊：${node.name}`));if(node.mode==='table')validateTable(node,diagnostics);}
  validateSchemas(nodes,diagnostics);
  for(const ref of references)if(ref.file===null&&!symbols.has(ref.target))diagnostics.push(issue(ref.line,'SM402',`找不到參照目標：${ref.target}`));
  return {version:'2.0',nodes,diagnostics,valid:!diagnostics.some(x=>x.severity==='error'),strict};
}
