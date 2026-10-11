import {parseDocument, renderHtml} from "../dist/index.js";

// Deterministic malformed-input smoke test for the public parser safety contract.
let state = 0x51a7;
function next() {
  state = (state * 1664525 + 1013904223) >>> 0;
  return state;
}
const alphabet = "&[](){}<>\\\n#*_/~=$`|:;中文abc123 \"'";
for (let sample = 0; sample < 500; sample++) {
  const length = next() % 240;
  let source = "";
  for (let index = 0; index < length; index++) source += alphabet[next() % alphabet.length];
  const document = parseDocument(source);
  const html = renderHtml(document);
  if (/<script\b/i.test(html)) throw new Error(`executable HTML emitted for sample ${sample}`);
}
console.log("fuzz: 500 deterministic malformed inputs passed");
