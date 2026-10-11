/*
 * File: structured_table.ts
 * Modification: 2026-10-10 — V0.4 JSON 表格 Schema、span 格位驗證及 CSV/TSV 結構驗證。
 */

// ── 表格資料型別 ──
export interface StructuredCell {
  text: string;
  colspan: number;
  rowspan: number;
}
export interface StructuredTable {
  columns: string[];
  rows: StructuredCell[][];
}
export interface TableValidation {
  value: StructuredTable | null;
  errors: string[];
}
const MAX_COLUMNS = 128;
const MAX_ROWS = 10000;
const MAX_GRID_CELLS = 100000;
const own = (v: object, p: string): boolean => Object.prototype.hasOwnProperty.call(v, p);

// ── 格位填入與跨列驗證 ──
/**
 * 每一列只列出實際存在的儲存格；受到前面 rowspan 覆蓋的位置必須略過。
 * 例如第一列 colspan=2、rowspan=2，第二列只需要從第三欄提供儲存格。
 */
export function parseStructuredTable(raw: string): TableValidation {
  let input: unknown;
  try { input = JSON.parse(raw); }
  catch { return {value: null, errors: ["JSON 解析失敗"]}; }
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return {value: null, errors: ["表格最外層必須是物件"]};
  }
  const table = input as Record<string, unknown>;
  if (!Array.isArray(table.columns) || !Array.isArray(table.rows)) {
    return {value: null, errors: ["表格必須提供 columns、rows 陣列"]};
  }
  const columns = table.columns;
  const rows = table.rows;
  if (!columns.length || columns.length > MAX_COLUMNS || rows.length > MAX_ROWS || columns.length * rows.length > MAX_GRID_CELLS) {
    return {value: null, errors: ["表格超出欄數、列數或總格位限制"]};
  }
  if (!columns.every(c => typeof c === "string")) return {value: null, errors: ["欄名必須是字串"]};
  const width = columns.length;
  const occupied: number[][] = Array.from({length: rows.length}, () => Array(width).fill(0));
  const out: StructuredCell[][] = [];
  const errors: string[] = [];
  for (let r = 0; r < rows.length; r++) {
    const sourceRow: unknown = rows[r];
    if (!Array.isArray(sourceRow)) {errors.push(`第 ${r + 1} 列不是陣列`); continue;}
    const parsed: StructuredCell[] = [];
    let col = 0;
    for (const [i, rawCell] of sourceRow.entries()) {
      while (col < width && occupied[r]![col]) col++;
      if (col >= width) {errors.push(`第 ${r + 1} 列第 ${i + 1} 格超出欄界`); break;}
      let text: string;
      let colspan = 1;
      let rowspan = 1;
      if (typeof rawCell === "string" || typeof rawCell === "number" || typeof rawCell === "boolean") text = String(rawCell);
      else if (rawCell !== null && typeof rawCell === "object" && !Array.isArray(rawCell)) {
        const cell = rawCell as Record<string, unknown>;
        if (!own(cell, "text") || typeof cell.text !== "string") {errors.push(`第 ${r + 1} 列第 ${i + 1} 格需要 text 字串`); break;}
        text = cell.text;
        if (own(cell, "colspan")) {
          if (!Number.isInteger(cell.colspan) || typeof cell.colspan !== "number" || cell.colspan < 1) {
            errors.push(`第 ${r + 1} 列第 ${i + 1} 格 colspan 不合法`); break;
          }
          colspan = cell.colspan;
        }
        if (own(cell, "rowspan")) {
          if (!Number.isInteger(cell.rowspan) || typeof cell.rowspan !== "number" || cell.rowspan < 1) {
            errors.push(`第 ${r + 1} 列第 ${i + 1} 格 rowspan 不合法`); break;
          }
          rowspan = cell.rowspan;
        }
      } else {errors.push(`第 ${r + 1} 列第 ${i + 1} 格資料型別不合法`); break;}
      if (col + colspan > width || r + rowspan > rows.length) {
        errors.push(`第 ${r + 1} 列第 ${i + 1} 格 span 超出表格範圍`); break;
      }
      let overlap = false;
      for (let rr = r; rr < r + rowspan && !overlap; rr++) {
        for (let cc = col; cc < col + colspan; cc++) {
          if (occupied[rr]![cc]) {overlap = true; break;}
        }
      }
      if (overlap) {errors.push(`第 ${r + 1} 列第 ${i + 1} 格 span 與其他儲存格重疊`); break;}
      for (let rr = r; rr < r + rowspan; rr++) {
        for (let cc = col; cc < col + colspan; cc++) occupied[rr]![cc] = 1;
      }
      parsed.push({text, colspan, rowspan});
      col += colspan;
    }
    if (occupied[r]!.some(c => !c)) errors.push(`第 ${r + 1} 列有未填入的格位`);
    out.push(parsed);
  }
  return errors.length ? {value: null, errors} : {value: {columns: columns as string[], rows: out}, errors: []};
}
