// Static checks: JS syntax, JSON validity, template references, pack folders.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const fail = msg => { failures++; console.error("FAIL", msg); };

function walk(dir, ext, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, acc);
    else if (p.endsWith(ext)) acc.push(p);
  }
  return acc;
}

for (const f of walk(path.join(ROOT, "module"), ".mjs")) {
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); }
  catch (e) { fail(`${path.relative(ROOT, f)}: ${e.stderr.toString().split("\n").slice(0, 4).join(" ")}`); }
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));
JSON.parse(fs.readFileSync(path.join(ROOT, "lang/en.json"), "utf8"));
for (const f of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(l => l.path)]) {
  if (!fs.existsSync(path.join(ROOT, f))) fail(`manifest file missing: ${f}`);
}
for (const pack of manifest.packs) {
  const dir = path.join(ROOT, pack.path);
  if (!fs.existsSync(dir) || !fs.readdirSync(dir).length) fail(`pack not built: ${pack.path}`);
}
const allPacks = new Set(manifest.packs.map(p => p.name));
const folderPacks = JSON.stringify(manifest.packFolders).match(/"packs":\[[^\]]*\]/g).flatMap(s => JSON.parse(s.slice(8)));
for (const p of folderPacks) if (!allPacks.has(p)) fail(`packFolders references unknown pack ${p}`);

for (const f of walk(path.join(ROOT, "module"), ".mjs")) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/systems\/\$\{SYSTEM_ID\}\/(templates\/[^`"']+\.hbs)/g)) {
    if (!fs.existsSync(path.join(ROOT, m[1]))) fail(`template missing: ${m[1]} (from ${path.relative(ROOT, f)})`);
  }
}

console.log(failures ? `${failures} problem(s) found.` : "All checks passed.");
process.exit(failures ? 1 : 0);
