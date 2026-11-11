/**
 * Reads the conditions a card or stat-block action inflicts, and on which result, from its rules text:
 *   "must save (Will DC 20) or become frightened 1"                 → frightened 1 on failure / crit failure
 *   "On a failure it is enfeebled 1; on a critical failure, stunned 1" → per degree
 *   "on a hit the Doll can Grab … on a crit the target is frightened 1" → hit / crit
 * Mentions that are requirements ("a creature that is frightened", "while grabbed") are ignored.
 */
import { VALUED_CONDITIONS, TOGGLE_CONDITIONS } from "./config.mjs";

const NAMES = {
  ...Object.fromEntries(Object.keys(VALUED_CONDITIONS).filter(k => !["dying", "wounded", "doomed"].includes(k)).map(k => [k, k])),
  "off-guard": "offGuard", "flat-footed": "offGuard",
  prone: "prone", grabbed: "grabbed", restrained: "restrained", immobilized: "immobilized", blinded: "blinded",
  dazzled: "dazzled", deafened: "deafened", fatigued: "fatigued", fleeing: "fleeing", paralyzed: "paralyzed"
};
const COND_RE = new RegExp(`\\b(${Object.keys(NAMES).join("|")})\\b(?:\\s+(\\d+))?`, "gi");
// Words right before a condition that make it a requirement, not an effect.
const REQUIRE = /(?:\b(?:that|who|which|or)\s+(?:is|are|was)\s+(?:already\s+|currently\s+|still\s+)?|\b(?:that's|who's|isn't|aren't)\s+|\balready\s+|\bcurrently\s+|\bwhile\s+(?:\w+\s+){0,2}|\bif\s+(?:\w+\s+){0,4}|\bimmune to\s+(?:\w+\s+)?|\bno longer\s+|\bnot\s+|\bremains?\s+|\bstays?\s+|\bends?\s+(?:the\s+)?|\bremoves?\s+(?:\w+\s+)?)$/i;
// "the grabbed creature": an adjective, not an effect.
const ADJECTIVE = /^\s+(?:creature|target|foe|ally|enemy|victim|one|ones|creatures|targets|equal|by)\b/i;
// "(frightened 1 on a success)": the result named after the condition.
const AFTER = /^\s*(?:\(|,)?\s*(?:instead\s+)?on a (critical )?(success|failure|hit)\b/i;

/** Degree keys: 0 crit fail · 1 fail · 2 success · 3 crit success (saves); "hit" / "crit" (attacks). */
function degreesIn(clause) {
  const c = clause.toLowerCase();
  if (/critical failure|critically fail/.test(c)) return [0];
  if (/critical success|critically succeed/.test(c)) return [3];
  if (/critical hit|on a crit\b|crits?\b/.test(c)) return ["crit"];
  if (/\bon a hit\b|\bhits?\b/.test(c) && !/save/.test(c)) return ["hit", "crit"];
  if (/\bfailure|fails?\b|failed\b|\bor (?:be|become|is|it's|they're|take)\b|\bnegates\b/.test(c)) return [0, 1];
  if (/\bsuccess|succeeds?\b/.test(c)) return [2];
  return null;
}

/**
 * @param {string} text   Plain rules text.
 * @param {"save"|"attack"|"none"} resolution
 * @returns {{ key, value, valued, label, on: (number|string)[] }[]}
 */
export function extractConditions(text, resolution = "save") {
  const plain = String(text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const fallback = resolution === "attack" ? ["hit", "crit"] : resolution === "save" ? [0, 1] : ["any"];
  const found = new Map();
  let context = null;
  for (const sentence of plain.split(/(?<=[.;:])\s+|\s+—\s+/)) {
    const d = degreesIn(sentence);
    if (d) context = d;
    for (const m of sentence.matchAll(COND_RE)) {
      const before = sentence.slice(0, m.index);
      if (REQUIRE.test(before)) continue;
      const after = sentence.slice(m.index + m[0].length);
      if (ADJECTIVE.test(after)) continue;
      const late = after.match(AFTER);
      const own = !late ? null
        : late[2].toLowerCase() === "hit" ? [late[1] ? "crit" : "hit"]
        : late[2].toLowerCase() === "success" ? [late[1] ? 3 : 2] : [late[1] ? 0 : 1];
      const key = NAMES[m[1].toLowerCase()];
      const valued = key in VALUED_CONDITIONS;
      const value = valued ? Number(m[2] ?? 1) : 1;
      for (const deg of own ?? context ?? fallback) {
        const id = `${key}@${deg}`;
        if (!found.has(id) || found.get(id).value < value) found.set(id, { key, value, valued, deg });
      }
    }
    // A full stop ends a degree context; a semicolon or comma keeps it.
    if (/[.]\s*$/.test(sentence)) context = null;
  }
  // Group back into one entry per condition with the degrees it applies on.
  const out = new Map();
  for (const { key, value, valued, deg } of found.values()) {
    const id = `${key}:${value}`;
    if (!out.has(id)) out.set(id, { key, value, valued, label: valued ? `${VALUED_CONDITIONS[key]} ${value}` : TOGGLE_CONDITIONS[key], on: [] });
    out.get(id).on.push(deg);
  }
  const list = [...out.values()];
  // A critical failure with nothing of its own gets the failure's conditions (and a crit gets the hit's).
  if (!list.some(c => c.on.includes(0))) for (const c of list) if (c.on.includes(1)) c.on.push(0);
  if (!list.some(c => c.on.includes("crit"))) for (const c of list) if (c.on.includes("hit")) c.on.push("crit");
  // Keep only the worst value of each condition per degree.
  return list;
}

/** The conditions that apply for one result. degree: 0–3 for saves; for attacks pass "hit" or "crit". */
export function conditionsFor(list, degree) {
  const best = new Map();
  for (const c of list) {
    if (!(c.on.includes(degree) || c.on.includes("any"))) continue;
    const cur = best.get(c.key);
    if (!cur || cur.value < c.value) best.set(c.key, c);
  }
  return [...best.values()];
}

/** Apply one condition to an actor (raises valued conditions, never lowers them). */
export async function applyCondition(actor, key, value = 1) {
  if (key in VALUED_CONDITIONS) {
    const now = actor.system.conditions?.[key] ?? 0;
    if (value > now) await actor.update({ [`system.conditions.${key}`]: value });
  } else if (key in TOGGLE_CONDITIONS) await actor.update({ [`system.conditions.${key}`]: true });
}
