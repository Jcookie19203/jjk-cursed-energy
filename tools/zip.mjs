// Packages the system into dist/jjk-cursed-energy.zip (only what Foundry needs at runtime).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const STAGE = path.join(DIST, "jjk-cursed-energy");
const INCLUDE = ["system.json", "LICENSE.md", "README.md", "module", "templates", "styles", "lang", "packs", "assets"];

// Empty dist/ rather than deleting it, so a shell sitting inside it doesn't lock the build.
fs.mkdirSync(DIST, { recursive: true });
for (const f of fs.readdirSync(DIST)) fs.rmSync(path.join(DIST, f), { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });
for (const entry of INCLUDE) {
  const src = path.join(ROOT, entry);
  if (!fs.existsSync(src)) throw new Error(`Missing ${entry} — run npm run build:packs first?`);
  fs.cpSync(src, path.join(STAGE, entry), { recursive: true, filter: f => !/[\\/](LOCK|LOG|LOG\.old)$/.test(f) });
}
const zip = path.join(DIST, "jjk-cursed-energy.zip");
// Windows' bsdtar writes forward-slash entry names, which unzip correctly on Linux servers
// (PowerShell 5.1's Compress-Archive uses backslashes and breaks there).
const tar = process.platform === "win32" ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "zip";
if (process.platform === "win32") execFileSync(tar, ["-a", "-c", "-f", zip, "jjk-cursed-energy"], { cwd: DIST, stdio: "inherit" });
else execFileSync("zip", ["-r", zip, "jjk-cursed-energy"], { cwd: DIST, stdio: "inherit" });
console.log(`Wrote ${zip} (${(fs.statSync(zip).size / 1024 / 1024).toFixed(1)} MB)`);
