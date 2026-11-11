// Generates assets/domains/voice/<technique>.wav — "領域展開。<Domain name>" — with a locally running VOICEVOX engine
// (http://127.0.0.1:50021; start the VOICEVOX app first). Voices and readings come from module/domain-names.mjs.
// Credit lines are required by each voice's terms and are listed in README.md.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DOMAIN_NAMES, voiceSlug } from "../module/domain-names.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "assets", "domains", "voice");
const ENGINE = process.env.VOICEVOX_URL ?? "http://127.0.0.1:50021";
const only = process.argv.slice(2);

fs.mkdirSync(OUT, { recursive: true });
let made = 0;
for (const [technique, [, reading, speaker]] of Object.entries(DOMAIN_NAMES)) {
  if (only.length && !only.includes(technique)) continue;
  // The comma/full stop give VOICEVOX a dramatic pause between the call and the name.
  const text = `りょういき、てんかい。　${reading}。`;
  const q = await fetch(`${ENGINE}/audio_query?speaker=${speaker}&text=${encodeURIComponent(text)}`, { method: "POST" });
  if (!q.ok) throw new Error(`audio_query failed for ${technique}: ${q.status}`);
  const query = await q.json();
  Object.assign(query, {
    speedScale: 0.82, pitchScale: -0.06, intonationScale: 1.35, volumeScale: 1.25,
    prePhonemeLength: 0.05, postPhonemeLength: 0.35, pauseLengthScale: 1.6,
    outputSamplingRate: 22050, outputStereo: false
  });
  const w = await fetch(`${ENGINE}/synthesis?speaker=${speaker}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query) });
  if (!w.ok) throw new Error(`synthesis failed for ${technique}: ${w.status}`);
  fs.writeFileSync(path.join(OUT, `${voiceSlug(technique)}.wav`), Buffer.from(await w.arrayBuffer()));
  made++;
}
const size = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`${made} clip(s) → ${OUT} (${(size / 1024 / 1024).toFixed(1)} MB total)`);
