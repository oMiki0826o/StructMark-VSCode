import {parseDocument} from "./parser.js";
import type {Diagnostic} from "./types.js";

export interface FormatResult {
  readonly source: string;
  readonly changed: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Normalize source boundaries without rewriting user-authored semantics.
 * Protected code/data/raw content is intentionally left byte-for-byte intact
 * apart from CRLF normalization, so unknown syntax remains round-trippable.
 */
export function formatSource(source: string): FormatResult {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const formatted = normalized.length === 0 ? "" : `${normalized.replace(/\n*$/, "")}\n`;
  const document = parseDocument(formatted);
  const errors = document.diagnostics.filter(diagnostic => diagnostic.severity === "error");
  return {
    source: errors.length ? source : formatted,
    changed: errors.length ? false : formatted !== source,
    diagnostics: document.diagnostics,
  };
}
