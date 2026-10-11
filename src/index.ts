/*
 * File: index.ts
 * Modification: 2026-10-10 — V0.4 匯出語義與複雜表格驗證器。
 */
export {parseDocument} from "./parser.js";
export type {ParseOptions} from "./parser.js";
export {parseInline, normalizeMath, validateMath} from "./inline.js";
export type {InlineParseOptions} from "./inline.js";
export {readAttributes} from "./attributes.js";
export {renderHtml, renderInline, escapeHtml, parseDelimited} from "./html.js";
export type {RenderOptions} from "./html.js";
export type {Document, BlockNode, InlineNode, Diagnostic, SourceRange, Attributes} from "./types.js";

export {parseStructuredTable} from "./structured_table.js";
export {validateSemantics, validateWorkspace} from "./semantic.js";
export type {WorkspaceDocument} from "./semantic.js";
export {DirectiveRegistry, getDefaultDirectiveRegistry} from "./registry.js";
export type {DirectiveDefinition, DirectiveKind} from "./registry.js";
export {normalizeSource} from "./source.js";
export type {NormalizedSource} from "./source.js";
export {lexLine, lexDocument} from "./lexer.js";
export type {BlockToken, BlockTokenKind} from "./lexer.js";
export {serializeAst} from "./serialize.js";
export {fromMarkdown, markdownToStructMarkSource, toMarkdown, toMarkdownDetailed} from "./markdown.js";
export type {MarkdownExportResult} from "./markdown.js";
export {formatSource} from "./formatter.js";
export type {FormatResult} from "./formatter.js";
export {formatBibliography, formatCitation, parseBibTeX, parseCslJson} from "./citations.js";
export type {CitationEntry} from "./citations.js";

export {visitAst} from "./visitor.js";
export type {AstNode, AstVisitor} from "./visitor.js";
export {normalizeWorkspacePath, resolveWorkspaceReference} from "./workspace.js";
export type {WorkspaceReference} from "./workspace.js";

export {buildWorkspaceIndex} from "./workspace-index.js";
export type {WorkspaceIndex, WorkspaceDiagnostic, IndexedWorkspaceReference, IndexedWorkspaceDocument} from "./workspace-index.js";
