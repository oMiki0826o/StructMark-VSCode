import type {Document} from "./types.js";

type JsonValue = null | boolean | number | string | JsonValue[] | {[key: string]: JsonValue};

function sortValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  if (typeof value === "object") {
    const object: {[key: string]: JsonValue} = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) object[key] = sortValue((value as Record<string, unknown>)[key]);
    return object;
  }
  return String(value);
}

/** Stable JSON representation for snapshots, caches, and language-tool integrations. */
export function serializeAst(document: Document, space?: number): string {
  return JSON.stringify(sortValue(document), null, space);
}
