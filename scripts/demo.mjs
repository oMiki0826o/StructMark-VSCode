/*
 * File: demo.mjs
 * Modification: 2026-10-10 — 範例語言解析命令列程式，無編輯器功能。
 */
import {readFileSync} from "node:fs";
import {parseDocument, renderHtml} from "../dist/index.js";

const flags = new Set(["--ast", "--strict"]);
const file = process.argv.slice(2).find(arg => !flags.has(arg)) ?? "examples/spec-sample.sm";
const source = readFileSync(file, "utf8");
const parsed = parseDocument(source);
if (process.argv.includes("--ast")) console.log(JSON.stringify(parsed, null, 2));
else console.log(renderHtml(parsed));
if (parsed.diagnostics.length) console.error(JSON.stringify(parsed.diagnostics, null, 2));
if (process.argv.includes("--strict") && parsed.diagnostics.length) process.exitCode = 1;
