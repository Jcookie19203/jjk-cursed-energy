// Builds every compendium pack from the supplement's markdown plus /content, then compiles them to LevelDB.
// Usage: npm run build:packs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import * as CORE from "../content/core-items.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SUPP = path.resolve(ROOT, "..", "JJK Cursed Energy Supplement (PF2e)");
const BUILD = path.join(ROOT, "build", "src");
const PACKS = path.join(ROOT, "packs");
const SYSTEM_ID = "jjk-cursed-energy";
const STATS = { coreVersion: "14.370", systemId: SYSTEM_ID, systemVersion: "0.1.0", createdTime: 0, modifiedTime: 0, lastModifiedBy: null, compendiumSource: null, duplicateSource: null };

const TIER = { "Fledgling": "fledgling", "Grade 4": "grade4", "Grade 3": "grade3", "Grade 2": "grade2", "Semi-Grade 1": "semi1", "Grade 1": "grade1", "Special Grade": "special" };
const GRADE_BY_LABEL = { ...TIER, "Grade 1 ": "grade1" };
const GRADE_DC = { fledgling: 17, grade4: 20, grade3: 23, grade2: 27, semi1: 30, grade1: 34, special: 38 };
const GRADE_ATK = { fledgling: 7, grade4: 11, grade3: 15, grade2: 19, semi1: 23, grade1: 27, special: 31 };

/* ---------------- helpers ---------------- */

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function makeId(seed) {
  const bytes = crypto.createHash("sha256").update(seed).digest();
  let id = "";
  for (let i = 0; i < 16; i++) id += ALNUM[bytes[i] % ALNUM.length];
  return id;
}
const read = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const mdFiles = dir => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(".md")).sort() : [];
const subdirs = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort() : [];

/** Markdown → HTML. Cross-file .md links become bold text (the files live in other packs). */
function toHTML(md) {
  const cleaned = md
    .replace(/\[([^\]]+)\]\(([^)]*?\.md[^)]*)\)/g, "**$1**")
    .replace(/\[([^\]]+)\]\(([^)]*%20[^)]*)\)/g, "**$1**");
  return marked.parse(cleaned, { mangle: false, headerIds: false });
}
function stripH1(md) {
  const lines = md.split("\n");
  const i = lines.findIndex(l => l.startsWith("# "));
  const title = i >= 0 ? lines[i].slice(2).trim() : "";
  if (i >= 0) lines.splice(i, 1);
  return { title, body: lines.join("\n").trim() };
}
const cleanTitle = t => t.replace(/\s*\*\(.*?\)\*\s*$/, "").replace(/\s*\*\(.*$/, "").replace(/\*\*/g, "").trim();

const out = {};
function emit(pack, doc) {
  (out[pack] ??= []).push(doc);
}
function folderDoc(pack, name, type, sort = 0, parent = null) {
  const _id = makeId(`${pack}:folder:${parent ?? ""}:${name}`);
  emit(pack, { _id, _key: `!folders!${_id}`, name, type, folder: parent, sorting: "a", sort, color: null, description: "", flags: {}, _stats: STATS });
  return _id;
}
function journalDoc(pack, name, html, { folder = null, sort = 0, seed = name } = {}) {
  const _id = makeId(`${pack}:journal:${seed}`);
  const pid = makeId(`${pack}:page:${seed}`);
  emit(pack, {
    _id, _key: `!journal!${_id}`, name, folder, sort, categories: [],
    pages: [{ _id: pid, _key: `!journal.pages!${_id}.${pid}`, name, type: "text", title: { show: false, level: 1 },
      text: { content: html, format: 1 }, sort: 0, ownership: { default: -1 }, flags: {}, _stats: STATS }],
    ownership: { default: 0 }, flags: {}, _stats: STATS
  });
}
function itemDoc(pack, { name, type, img, system, folder = null, sort = 0, seed }) {
  const _id = makeId(`${pack}:item:${seed ?? name}`);
  emit(pack, { _id, _key: `!items!${_id}`, name, type, img, system, effects: [], folder, sort, ownership: { default: 0 }, flags: {}, _stats: STATS });
}

/* ---------------- card parsing ---------------- */

const CARD_RE = /^(Fledgling|Grade [1-4]|Semi-Grade 1|Special Grade) - ([1-3]) - (.+)\.md$/;

function parseCard(file, md, technique, ladder) {
  const m = path.basename(file).match(CARD_RE);
  const tier = TIER[m[1]];
  const slot = Number(m[2]);
  const { title, body } = stripH1(md);
  const lines = body.split("\n");
  const mech = lines.find(l => /^\*\*[^*]+\*\*\s+—\s+/.test(l)) ?? "";
  const after = lines.slice(lines.indexOf(mech) + 1).join("\n");

  const costMatch = mech.match(/\*\*Cost:?\s*([^*]+?)\*\*/) ?? body.match(/\*\*Cost:?\s*([^*]+?)\*\*/);
  const costText = costMatch ? costMatch[1].replace(/\.$/, "").trim() : "";
  const ceNum = costText.match(/^(\d+)(?:\s*[–-]\s*\d+)?\s*CE/);
  const allPool = /all (?:your )?remaining CE|entire remaining CE|whole CE pool|entire CE/i.test(costText);

  let actions = "none";
  const a = mech.match(/`\[([123])\]`/);
  if (a) actions = a[1];
  else if (/`free`/.test(mech)) actions = "free";
  else if (/`reaction`/.test(mech)) actions = "reaction";
  else if (/passive|modifies/i.test(mech)) actions = "passive";

  const traitMatch = mech.match(/·\s*\*([^*]+)\*/);
  const traits = traitMatch ? traitMatch[1].trim() : "";
  const range = mech.split("·").map(s => s.trim()).filter(s => s && !s.startsWith("**") && !s.startsWith("`") && !s.startsWith("*") && !/^Pressure/i.test(s)).join(", ").replace(/\.\s*$/, "");

  const text = after || body;
  const atk = text.search(/cursed strike/i);
  const saveM = text.match(/(basic )?(Fortitude|Reflex|Will) save/i);
  const saveIdx = saveM ? text.indexOf(saveM[0]) : -1;
  let resolution = "none";
  if (atk >= 0 && (saveIdx < 0 || atk <= saveIdx)) resolution = "attack";
  else if (saveIdx >= 0) resolution = "save";
  const save = saveM ? saveM[2].toLowerCase() : "reflex";
  const pressureM = body.match(/Pressure:?\**\s*\+?(\d+)/i);

  const universal = /\(Universal/.test(path.basename(file)) || /Universal/.test(title);
  return {
    name: cleanTitle(title) || m[3],
    type: "ability",
    img: universal ? "icons/svg/sun.svg" : "icons/svg/aura.svg",
    system: {
      technique, tier, slot, ladder, universal,
      granted: tier === "fledgling" && slot === 1,
      costText, ce: ceNum ? Number(ceNum[1]) : null, allPool, actions, traits, range,
      resolution, save, basicSave: !!(saveM && saveM[1]),
      usesOutput: /output damage/i.test(body),
      isDomain: /Domain Expansion/.test(path.basename(file)) && universal,
      pressure: pressureM ? Math.min(10, Number(pressureM[1])) : 0,
      description: toHTML(body)
    }
  };
}

function buildLadders({ baseDir, itemPack, ladderFor }) {
  let sort = 0;
  for (const dir of subdirs(baseDir)) {
    const full = path.join(baseDir, dir);
    const files = mdFiles(full);
    if (!files.some(f => f.startsWith("00 - START"))) continue;
    const ladder = ladderFor(dir);
    const folder = folderDoc(itemPack, dir, "Item", sort++);
    for (const f of files) {
      if (!CARD_RE.test(f)) continue;
      const card = parseCard(f, read(path.join(full, f)), dir, ladder);
      itemDoc(itemPack, { ...card, folder, sort: Object.keys(TIER).indexOf(Object.keys(TIER).find(k => TIER[k] === card.system.tier)) * 10 + card.system.slot, seed: `${dir}/${f}` });
    }
    const primer = files.find(f => f.startsWith("00 - START"));
    if (primer) journalDoc("player-primers", `${dir} — Player Primer`, toHTML(read(path.join(full, primer))), { folder: itemPack === "techniques" ? FOLDERS.primerTech : FOLDERS.primerPath, seed: `${dir}/primer` });
    const gm = files.find(f => f.startsWith("_GM"));
    if (gm) journalDoc("gm-master-sheets", `${dir} — GM Master Sheet`, toHTML(read(path.join(full, gm))), { folder: itemPack === "techniques" ? FOLDERS.gmTech : FOLDERS.gmPath, seed: `${dir}/gm` });
  }
}

/* ---------------- bestiary parsing ---------------- */

function num(md, re, fallback) {
  const m = md.match(re);
  return m ? Number(m[1]) : fallback;
}
function parseCurse(file, md) {
  const base = path.basename(file, ".md").replace(/ \[GM\]$/, "");
  const gm = base.match(/\(([^)]*)\)$/)?.[1] ?? "";
  const gradeLabel = gm.split(",").map(s => s.trim()).reverse().find(s => TIER[s]) ?? "Grade 4";
  const grade = TIER[gradeLabel];
  const name = base.replace(/^\d+\s*-\s*/, "").replace(/\s*\([^)]*\)$/, "");
  const level = num(md, /level\s*~?(\d+)/i, 4);
  const field = re => (md.match(re)?.[1] ?? "").replace(/\*\*/g, "").trim().replace(/[;.]$/, "");
  const melee = md.match(/\*\*(?:Melee|Ranged)\*\*[^\n]*?([A-Za-z][A-Za-z' ,-]*?)\s+\+(\d+)\b[^\n]*?\*\*(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*([a-z]+)?/);
  const items = [];
  const actorId = makeId(`curses:actor:${base}`);
  if (melee) {
    const iid = makeId(`curses:strike:${base}`);
    items.push({ _id: iid, _key: `!actors.items!${actorId}.${iid}`, name: melee[1].trim() || "Strike", type: "weapon", img: "icons/svg/sword.svg",
      system: { dieSize: "d8", attackOverride: Number(melee[2]), formula: melee[3].replace(/\s+/g, ""), damageType: melee[4] ?? "", traits: "", range: "melee", cursedTool: false, charge: 0, bonus: 0, equipped: true, quantity: 1, bulk: "-", price: "", description: "" },
      effects: [], folder: null, sort: 0, ownership: { default: 0 }, flags: {}, _stats: STATS });
  }
  const hp = num(md, /\*\*HP\*\*\s*(\d+)/, 50);
  const ce = num(md, /\*\*CE Pool\*\*\s*(\d+)/, 6);
  // Most-used DC in the stat block (ignores the larger numbers in "up a grade" scaling notes).
  const statBlock = md.split(/\n##\s*Scaling/i)[0];
  const dcCounts = {};
  for (const x of statBlock.matchAll(/DC\s*(\d{2})/g)) dcCounts[x[1]] = (dcCounts[x[1]] ?? 0) + 1;
  const dcMode = Object.entries(dcCounts).sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))[0]?.[0];
  const dcs = dcMode ? [Number(dcMode)] : [];
  return {
    _id: actorId, _key: `!actors!${actorId}`, name, type: "curse", img: "icons/svg/skull.svg",
    system: {
      grade, level, role: field(/·\s*([^*\n]+)\*\*\s*$/m),
      attributes: {
        hp: { value: hp, max: hp, temp: 0 }, ce: { value: ce, max: ce },
        ac: { base: num(md, /\*\*AC\*\*\s*(\d+)/, 20) },
        perception: { base: num(md, /\*\*Perception\*\*\s*\+?(\d+)/, level + 7) },
        speed: field(/\*\*Speed\*\*\s*([^\n]+)/) || "30 ft",
        reinforcement: num(md, /\*\*Reinforcement\*\*\s*(\d+)/, 4),
        domainActive: false
      },
      saves: { fortitude: num(md, /\*\*Fort\*\*\s*\+?(-?\d+)/, level + 6), reflex: num(md, /\*\*Ref\*\*\s*\+?(-?\d+)/, level + 6), will: num(md, /\*\*Will\*\*\s*\+?(-?\d+)/, level + 6) },
      cursedAttack: { base: melee ? Number(melee[2]) : GRADE_ATK[grade] },
      techniqueDC: { base: dcs.length ? Math.max(...dcs.filter(d => d >= 10 && d <= 50)) : GRADE_DC[grade] },
      keyMod: 4,
      immunities: field(/\*\*Immunities\*\*\s*([^\n*;]+)/), weaknesses: field(/\*\*Weakness(?:es)?\*\*\s*([^\n*;]+)/),
      resistances: field(/\*\*Resistances?\*\*\s*([^\n*;]+)/), languages: field(/\*\*Languages\*\*\s*([^\n*;]+)/),
      description: toHTML(md), conditions: {}
    },
    items, effects: [], folder: null, sort: 0,
    prototypeToken: { name, actorLink: false, disposition: -1, displayBars: 20, bar1: { attribute: "attributes.hp" }, bar2: { attribute: "attributes.ce" } },
    ownership: { default: 0 }, flags: {}, _stats: STATS
  };
}

/* ---------------- build everything ---------------- */

const FOLDERS = {};
FOLDERS.primerTech = folderDoc("player-primers", "Cursed Techniques", "JournalEntry", 0);
FOLDERS.primerPath = folderDoc("player-primers", "Cursed Paths", "JournalEntry", 1);
FOLDERS.gmTech = folderDoc("gm-master-sheets", "Cursed Techniques", "JournalEntry", 0);
FOLDERS.gmPath = folderDoc("gm-master-sheets", "Cursed Paths", "JournalEntry", 1);

// Techniques and paths.
buildLadders({ baseDir: path.join(SUPP, "03 - Cursed Techniques"), itemPack: "techniques", ladderFor: () => "technique" });
buildLadders({ baseDir: path.join(SUPP, "06 - Cursed Paths"), itemPack: "cursed-paths", ladderFor: d => (d === "Death Painting" ? "layer" : "replacement") });

// Rules journals (player-visible).
let s = 0;
journalDoc("rules", "Start Here", toHTML(read(path.join(SUPP, "00 - START HERE (Index).md"))), { sort: s++ });
for (const f of mdFiles(path.join(SUPP, "01 - Core Rules"))) journalDoc("rules", stripH1(read(path.join(SUPP, "01 - Core Rules", f))).title || f, toHTML(read(path.join(SUPP, "01 - Core Rules", f))), { sort: s++, seed: `core/${f}` });
for (const f of mdFiles(path.join(SUPP, "02 - Optional Rules"))) journalDoc("rules", stripH1(read(path.join(SUPP, "02 - Optional Rules", f))).title || f, toHTML(read(path.join(SUPP, "02 - Optional Rules", f))), { sort: s++, seed: `opt/${f}` });
for (const f of mdFiles(path.join(SUPP, "03 - Cursed Techniques"))) journalDoc("rules", stripH1(read(path.join(SUPP, "03 - Cursed Techniques", f))).title || f, toHTML(read(path.join(SUPP, "03 - Cursed Techniques", f))), { sort: s++, seed: `tech/${f}` });
journalDoc("rules", "Bestiary Overview", toHTML(read(path.join(SUPP, "04 - Curses & Monsters", "00 - Bestiary Overview.md"))), { sort: s++ });

// GM guide.
s = 0;
for (const f of mdFiles(path.join(SUPP, "05 - GM Guide"))) journalDoc("gm-guide", stripH1(read(path.join(SUPP, "05 - GM Guide", f))).title || f, toHTML(read(path.join(SUPP, "05 - GM Guide", f))), { sort: s++, seed: f });

// PF2e core summary.
s = 0;
for (const f of mdFiles(path.join(ROOT, "content", "pf2e-core"))) {
  const md = read(path.join(ROOT, "content", "pf2e-core", f));
  journalDoc("pf2e-core", stripH1(md).title || f, toHTML(md), { sort: s++, seed: f });
}

// Bestiary.
const bestDir = path.join(SUPP, "04 - Curses & Monsters");
for (const f of mdFiles(path.join(bestDir, "Player Versions"))) journalDoc("curse-field-notes", path.basename(f, ".md").replace(/^\d+\s*-\s*/, ""), toHTML(read(path.join(bestDir, "Player Versions", f))), { seed: f });
for (const f of mdFiles(path.join(bestDir, "GM Versions"))) emit("curses", parseCurse(f, read(path.join(bestDir, "GM Versions", f))));

// Core items.
for (const a of CORE.ANCESTRIES) itemDoc("ancestries", { name: a.name, type: "ancestry", img: "icons/svg/mystery-man.svg", system: a });
for (const b of CORE.BACKGROUNDS) itemDoc("backgrounds", { name: b.name, type: "background", img: "icons/svg/book.svg", system: b });
const eqWeapons = folderDoc("equipment", "Weapons", "Item", 0);
const eqTools = folderDoc("equipment", "Cursed Tools", "Item", 1);
const eqArmor = folderDoc("equipment", "Armor", "Item", 2);
const eqGear = folderDoc("equipment", "Gear", "Item", 3);
const wBase = { attackOverride: null, formula: "", cursedTool: false, charge: 0, bonus: 0, equipped: true, quantity: 1, bulk: "1", price: "" };
for (const w of CORE.WEAPONS) itemDoc("equipment", { name: w.name, type: "weapon", img: "icons/svg/sword.svg", folder: eqWeapons, system: { ...wBase, ...w } });
for (const w of CORE.CURSED_TOOLS) itemDoc("equipment", { name: w.name, type: "weapon", img: "icons/svg/lightning.svg", folder: eqTools, system: { ...wBase, ...w } });
for (const a of CORE.ARMOR) itemDoc("equipment", { name: a.name, type: "armor", img: "icons/svg/shield.svg", folder: eqArmor, system: { traits: "", equipped: false, bulk: "1", price: "", ...a } });
for (const g of CORE.GEAR) itemDoc("equipment", { name: g.name, type: "gear", img: "icons/svg/item-bag.svg", folder: eqGear, system: { quantity: 1, traits: "", ...g } });

/* ---------------- write + compile ---------------- */

fs.rmSync(BUILD, { recursive: true, force: true });
const summary = {};
for (const [pack, docs] of Object.entries(out)) {
  const dir = path.join(BUILD, pack);
  fs.mkdirSync(dir, { recursive: true });
  const seen = new Set();
  for (const doc of docs) {
    if (seen.has(doc._id)) throw new Error(`Duplicate id ${doc._id} in ${pack} (${doc.name})`);
    seen.add(doc._id);
    fs.writeFileSync(path.join(dir, `${doc._id}.json`), JSON.stringify(doc, null, 1));
  }
  summary[pack] = docs.length;
}
for (const pack of Object.keys(out)) {
  const dest = path.join(PACKS, pack);
  fs.rmSync(dest, { recursive: true, force: true });
  await compilePack(path.join(BUILD, pack), dest, { log: false });
}
console.log("Packs built:", summary);
