import {getDefaultDirectiveRegistry, type DirectiveRegistry} from "./registry.js";

export type BlockTokenKind = "blank" | "heading" | "fence" | "directive" | "directiveEnd" | "list" | "quote" | "tableCandidate" | "thematicBreak" | "footnoteDefinition" | "commentFence" | "mathFence" | "text";
export interface BlockToken {
  readonly kind: BlockTokenKind;
  readonly text: string;
  readonly line: number;
  readonly indent: number;
  readonly start: number;
  readonly end: number;
  readonly name?: string;
}

const HEADING = /^ {0,3}#([1-6])[ \t]+(.+)$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})([^`]*)$/;
const DIRECTIVE = /^ {0,3}&([a-z][a-z\d_]*(?::[a-z][a-z\d_]*)*)(?:[ \t]+)?(\[[^\]\n]*\])?[ \t]*$/;
const LIST = /^( *)(-|\.|\d{1,9}\.)[ \t]+/;

export function lexLine(text: string, line = 1, start = 0, registry: DirectiveRegistry = getDefaultDirectiveRegistry()): BlockToken {
  const indent = /^ */.exec(text)![0].length;
  const match = DIRECTIVE.exec(text);
  let kind: BlockTokenKind = "text";
  let name: string | undefined;
  if (!text.trim()) kind = "blank";
  else if (HEADING.test(text)) kind = "heading";
  else if (FENCE.test(text)) kind = "fence";
  else if (/^ {0,3}&(?:end|e)[ \t]*$/.test(text)) kind = "directiveEnd";
  else if (match && (registry.has(match[1]!, "block") || registry.has(match[1]!, "rawBlock") || !match[2])) { kind = "directive"; name = registry.resolve(match[1]!); }
  else if (LIST.test(text)) kind = "list";
  else if (/^ {0,3}>[ \t]?/.test(text)) kind = "quote";
  else if (/^ {0,3}%%[ \t]*$/.test(text)) kind = "commentFence";
  else if (/^ {0,3}\$\$[ \t]*$/.test(text)) kind = "mathFence";
  else if (/^ {0,3}---[ \t]*$/.test(text)) kind = "thematicBreak";
  else if (/^ {0,3}\[\^[\w:.-]+\]:/.test(text)) kind = "footnoteDefinition";
  else if (text.includes("|")) kind = "tableCandidate";
  return {kind, text, line, indent, start, end: start + text.length, ...(name ? {name} : {})};
}

export function lexDocument(source: string, registry: DirectiveRegistry = getDefaultDirectiveRegistry()): readonly BlockToken[] {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  let offset = 0;
  return normalized.split("\n").map((text, index) => {
    const token = lexLine(text, index + 1, offset, registry);
    offset += text.length + 1;
    return token;
  });
}
