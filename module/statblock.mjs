/**
 * Reads a curse's stat block (its description HTML) into one-click actions:
 *   **Melee** `[1]` raking arms +13 (reach 10 ft, agile), **2d8+6 slashing** plus …   → a weapon (Strike)
 *   - **Drink Hesitation** (1 CE, `[1]`, *emotion, mental*): … must save (Will DC 20) … → an ability
 * Items it makes are flagged `fromStatBlock`, so re-reading replaces them instead of duplicating.
 */
import { SYSTEM_ID } from "./config.mjs";

const SAVE_KEY = { fortitude: "fortitude", fort: "fortitude", reflex: "reflex", ref: "reflex", will: "will" };
const ACTION_KEY = { "[1]": "1", "[2]": "2", "[3]": "3", reaction: "reaction", free: "free" };
const DICE = /^(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*([a-z][a-z ]*)?$/i;

const clean = s => String(s ?? "").replace(/\s+/g, " ").trim();

/** Parse one Strike line's text. */
export function parseStrike(text) {
  const m = clean(text).match(/^(Melee|Ranged)\s*(?:\[\d\]|◆)?\s*(.+?)\s+\+(\d+)\s*(?:\(([^)]*)\))?\s*,\s*(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*([a-z]+(?: [a-z]+)?)?/i);
  if (!m) return null;
  const [, kind, name, bonus, paren = "", formula, dtype = ""] = m;
  const traits = paren.split(",").map(s => s.trim()).filter(s => s && !/^(reach|range)\b/i.test(s));
  const reach = paren.match(/(?:reach|range)\s*([\d]+\s*ft)/i)?.[1];
  const rest = clean(text).slice(m.index + m[0].length).replace(/^[,;\s]+/, "");
  return {
    rest,
    name: clean(name).replace(/^\w/, c => c.toUpperCase()), bonus: Number(bonus), formula: formula.replace(/\s+/g, ""),
    damageType: /^(plus|and|on|the)$/i.test(dtype.split(" ")[0]) ? "" : dtype.split(" ")[0].toLowerCase(),
    traits: traits.join(", "), range: kind.toLowerCase() === "ranged" ? `ranged${reach ? ` ${reach}` : ""}` : `melee${reach ? ` (reach ${reach})` : ""}`
  };
}

/** Parse one technique bullet: name, the parenthesised header, the rules text, and the bold bits in it. */
export function parseTechnique(name, header, body, bolds = []) {
  const parts = header.split(",").map(s => s.trim());
  const ceM = header.match(/(\d+)\s*CE/i);
  const actTok = parts.find(p => ACTION_KEY[p.toLowerCase()]) ?? (header.match(/\[(\d)\]/) ? `[${header.match(/\[(\d)\]/)[1]}]` : null);
  const actions = ACTION_KEY[actTok?.toLowerCase()] ?? "1";
  const traits = parts.filter(p => !/CE$/i.test(p) && !ACTION_KEY[p.toLowerCase()] && !/^trigger:/i.test(p) && !/^once/i.test(p) && !/\[\d\]/.test(p)).join(", ");
  const trigger = header.match(/trigger:\s*([^)]*)/i)?.[1] ?? "";
  const full = clean(body);
  const saveM = full.match(/(basic\s+)?(Fortitude|Fort|Reflex|Ref|Will)\b[^()]*?DC\s*(\d+)/i) ?? full.match(/DC\s*(\d+)\s*(basic\s+)?(Fortitude|Fort|Reflex|Ref|Will)/i);
  let save = null, dc = null, basic = false;
  if (saveM) {
    if (/^\d+$/.test(saveM[1] ?? "")) { dc = Number(saveM[1]); basic = !!saveM[2]; save = SAVE_KEY[saveM[3].toLowerCase()]; }
    else { basic = !!saveM[1] || /basic/i.test(full.slice(Math.max(0, saveM.index - 10), saveM.index + saveM[0].length)); save = SAVE_KEY[saveM[2].toLowerCase()]; dc = Number(saveM[3]); }
  }
  if (/for half/i.test(full)) basic = true;
  const dmg = bolds.map(b => clean(b).match(DICE)).find(Boolean);
  const isStrike = /makes? an? .*Strike|Strike with/i.test(full);
  // "takes 2d6 negative and must save…": the damage comes first, so it lands whatever the save.
  const dmgAt = dmg ? full.indexOf(dmg[0].split(" ")[0]) : -1;
  const damageAlways = !!dmg && !basic && saveM && dmgAt >= 0 && dmgAt < saveM.index;
  return {
    damageAlways,
    name: clean(name), ce: ceM ? Number(ceM[1]) : 0, actions, traits, trigger,
    resolution: save ? "save" : "none", save: save ?? "reflex", dc, basicSave: basic,
    damage: dmg ? dmg[1].replace(/\s+/g, "") : "", damageType: dmg?.[2]?.split(" ")[0]?.toLowerCase() ?? "",
    isStrike, text: full
  };
}

/** Everything actionable in a stat block's HTML. */
export function readStatBlock(html) {
  const doc = new DOMParser().parseFromString(`<div>${html ?? ""}</div>`, "text/html");
  const strikes = [];
  const techniques = [];
  for (const el of doc.querySelectorAll("p, li")) {
    const first = el.querySelector("strong");
    if (!first) continue;
    const lead = clean(first.textContent);
    const text = clean(el.textContent);
    if (/^(Melee|Ranged)$/i.test(lead) && text.startsWith(lead)) {
      const s = parseStrike(text);
      if (s) strikes.push(s);
      continue;
    }
    if (el.tagName === "LI" && text.startsWith(lead)) {
      const rest = text.slice(lead.length).trim();
      const m = rest.match(/^\(([^)]*\bCE\b[^)]*)\)\s*:?\s*(.*)$/s);
      if (!m) continue;
      const bolds = [...el.querySelectorAll("strong")].slice(1).map(b => b.textContent);
      techniques.push(parseTechnique(lead, m[1], m[2], bolds));
    }
  }
  return { strikes, techniques };
}

/** Replace the actor's stat-block actions with freshly read ones. Returns { strikes, techniques } counts. */
export async function importStatBlock(actor, { notify = true } = {}) {
  const { strikes, techniques } = readStatBlock(actor.system.description);
  const flag = { [SYSTEM_ID]: { fromStatBlock: true } };
  const strikeNames = new Set(strikes.map(s => s.name.toLowerCase()));
  const old = actor.items.filter(i => i.getFlag(SYSTEM_ID, "fromStatBlock")
    || (i.type === "weapon" && strikeNames.has(i.name.toLowerCase())));
  if (old.length) await actor.deleteEmbeddedDocuments("Item", old.map(i => i.id));
  const docs = [
    ...strikes.map(s => ({
      name: s.name, type: "weapon", img: s.range.startsWith("ranged") ? "icons/svg/target.svg" : "icons/svg/sword.svg", flags: flag,
      system: { attackOverride: s.bonus, formula: s.formula, damageType: s.damageType, traits: s.traits, range: s.range, dieSize: "d8", equipped: true,
        description: s.rest ? `<p>${foundry.utils.escapeHTML(s.rest)}</p>` : "" }
    })),
    ...techniques.map(t => ({
      name: t.name, type: "ability", img: "icons/svg/aura.svg", flags: flag,
      system: {
        technique: actor.name, tier: actor.system.grade, ce: t.ce, costText: t.ce ? `${t.ce} CE` : "", actions: t.actions, traits: t.traits,
        resolution: t.resolution, save: t.save, basicSave: t.basicSave, dc: t.dc, damage: t.damage, damageType: t.damageType, damageAlways: t.damageAlways,
        description: `<p>${t.trigger ? `<strong>Trigger</strong> ${foundry.utils.escapeHTML(t.trigger)}. ` : ""}${foundry.utils.escapeHTML(t.text)}</p>`
      }
    }))
  ];
  if (docs.length) await actor.createEmbeddedDocuments("Item", docs);
  await actor.setFlag(SYSTEM_ID, "statBlockRead", 2);   // 2 = Strike text kept for condition buttons (v0.6.0)
  if (notify) ui.notifications.info(`${actor.name}: read ${strikes.length} Strike(s) and ${techniques.length} technique(s) from the stat block.`);
  return { strikes: strikes.length, techniques: techniques.length };
}
