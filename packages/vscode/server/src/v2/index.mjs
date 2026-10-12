/*
 * File: index.mjs
 * Modification: 2026-10-12 — Single shared public StructMark v2 engine.
 */
export {directiveDefinitions,directiveLookup} from './registry.mjs';
export {parseInline} from './inline.mjs';
export {parse} from './parser.mjs';
export {format} from './formatter.mjs';
export {renderHtml,renderInline,escapeHtml} from './html.mjs';
export {validateWorkspace,resolveWorkspaceTarget} from './workspace.mjs';
export {documentHeadings,referencesOnLine,referenceAt,headingAt,documentLocations} from './editor.mjs';
