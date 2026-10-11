export interface CitationEntry {
  readonly id: string;
  readonly title?: string | undefined;
  readonly authors: readonly string[];
  readonly year?: string | undefined;
  readonly type?: string | undefined;
  readonly fields: Readonly<Record<string, string>>;
}

function clean(value: string): string {
  return value.trim().replace(/^([{"'])|([}"'])$/g, "").replace(/\\([{}])/g, "$1").trim();
}

function families(value: string): string[] {
  return value.split(/\s+and\s+/i).map(part => {
    const item = clean(part);
    return item.includes(",") ? item.split(",", 1)[0]!.trim() : item.split(/\s+/).at(-1) ?? item;
  }).filter(Boolean);
}

/** Parse common BibTeX entries without evaluating macros or TeX commands. */
export function parseBibTeX(source: string): Map<string, CitationEntry> {
  const result = new Map<string, CitationEntry>();
  const entryPattern = /@([a-z]+)\s*\{\s*([^,\s]+)\s*,/gi;
  for (const match of source.matchAll(entryPattern)) {
    const opening = source.indexOf("{", match.index ?? 0);
    let depth = 1;
    let cursor = opening + 1;
    let quoted = false;
    for (; cursor < source.length && depth; cursor++) {
      const character = source[cursor]!;
      if (character === '"' && source[cursor - 1] !== "\\") quoted = !quoted;
      if (!quoted && character === "{") depth++;
      if (!quoted && character === "}") depth--;
    }
    const body = source.slice(match.index! + match[0].length, cursor - 1);
    const fields: Record<string, string> = {};
    for (const field of body.matchAll(/([a-z][\w-]*)\s*=\s*(\{[^{}]*\}|"[^"]*"|[^,\n]+)(?:,|$)/gi)) fields[field[1]!.toLowerCase()] = clean(field[2]!);
    result.set(match[2]!, {id: match[2]!, type: match[1]!.toLowerCase(), title: fields.title, authors: families(fields.author ?? ""), year: fields.year, fields});
  }
  return result;
}

/** Parse CSL JSON items or a CSL JSON object containing an `items` array. */
export function parseCslJson(source: string): Map<string, CitationEntry> {
  const parsed = JSON.parse(source) as unknown;
  const items = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && Array.isArray((parsed as {items?: unknown}).items) ? (parsed as {items: unknown[]}).items : [];
  const result = new Map<string, CitationEntry>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const value = item as Record<string, unknown>;
    const id = typeof value.id === "string" ? value.id : "";
    if (!id) continue;
    const authors = Array.isArray(value.author) ? value.author.map(author => {
      if (!author || typeof author !== "object") return "";
      const person = author as Record<string, unknown>;
      return typeof person.family === "string" ? person.family : typeof person.literal === "string" ? person.literal : "";
    }).filter(Boolean) : [];
    const parts = (value.issued as {"date-parts"?: unknown[][]} | undefined)?.["date-parts"];
    const year = Array.isArray(parts?.[0]?.[0]) ? String(parts[0][0]) : parts?.[0]?.[0] !== undefined ? String(parts[0][0]) : undefined;
    const fields = Object.fromEntries(Object.entries(value).filter(([, field]) => typeof field === "string")) as Record<string, string>;
    result.set(id, {id, authors, year, type: typeof value.type === "string" ? value.type : undefined, title: typeof value.title === "string" ? value.title : undefined, fields});
  }
  return result;
}

export type CitationStyle = "author-year" | "apa" | "ieee";
export interface CitationFormatOptions { readonly style?: CitationStyle; }

/**
 * Format the documented built-in citation profiles. This is deliberately a
 * small deterministic profile layer, not a claim of full CSL compatibility.
 */
export function formatCitation(keys: readonly string[], entries: ReadonlyMap<string, CitationEntry>, options: CitationFormatOptions = {}): string {
  if (options.style === "ieee") return `[${keys.map((key, index) => entries.has(key) ? String(index + 1) : key).join(", ")}]`;
  return `(${keys.map(key => {
    const entry = entries.get(key);
    if (!entry) return key;
    const names = entry.authors.length > 2 ? `${entry.authors[0]} et al.` : entry.authors.join(" & ");
    return [names || entry.id, entry.year ?? "n.d."].join(", ");
  }).join("; ")})`;
}

/** Format a deterministic bibliography subset for the built-in profiles. */
export function formatBibliography(keys: readonly string[], entries: ReadonlyMap<string, CitationEntry>, options: CitationFormatOptions = {}): string[] {
  return keys.map((key, index) => {
    const entry = entries.get(key);
    if (!entry) return options.style === "ieee" ? `[${index + 1}] ${key}` : `${key}.`;
    const authors = entry.authors.join(" & ") || entry.id;
    const title = entry.title ? `${entry.title}.` : "";
    const journal = entry.fields.journal ? ` ${entry.fields.journal},` : "";
    const volume = entry.fields.volume ? ` ${entry.fields.volume},` : "";
    const pages = entry.fields.pages ? ` ${entry.fields.pages.replace(/--/g, "–")}.` : "";
    if (options.style === "ieee") return `[${index + 1}] ${authors}, ${title}${journal}${volume}${pages} ${entry.year ?? "n.d."}`.replace(/\s+/g, " ").trim();
    return `${authors} (${entry.year ?? "n.d."}). ${title}${journal}${volume}${pages}`.replace(/\s+/g, " ").trim();
  });
}
