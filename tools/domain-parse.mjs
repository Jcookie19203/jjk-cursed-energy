// Reads a Domain's automation settings out of its markdown (a technique's Domain card, or a curse's "## Domain" section).

const CONDITIONS = ["stunned", "slowed", "frightened", "sickened", "clumsy", "enfeebled", "stupefied", "drained", "doomed",
  "off-guard", "prone", "immobilized", "grabbed", "restrained", "paralyzed", "blinded", "deafened", "dazzled", "fleeing", "fatigued"];
const DAMAGE_TYPES = "acid|bludgeoning|cold|electricity|fire|force|mental|piercing|poison|slashing|sonic|spirit|void|vitality";
const plain = t => t.replace(/\*\*|\*|`/g, "").replace(/\s+/g, " ").trim();

/**
 * @param {string} text            The card body or Domain section.
 * @param {object} [o]
 * @param {"pc"|"curse"} [o.caster] PCs scale sure-hit damage with Grade Rank ("output"); curses use printed dice.
 * @returns {{radius, damage, damageType, conditions, effect, amplify, rounds, hardness, barrierHP}}
 */
export function parseDomain(text, { caster = "pc" } = {}) {
  const lines = text.split("\n");
  const sureLine = lines.find(l => /^\s*-\s*\*\*[^*]*(sure[ -]hit|enclosed effect)/i.test(l)) ?? "";
  const sure = plain(sureLine.replace(/^\s*-\s*\*\*[^*]*\*\*:?/, ""));
  const domain = { radius: 20, damage: "", damageType: "", conditions: "", effect: "", amplify: "half", rounds: null, hardness: null, barrierHP: null };

  const radius = text.match(/\*\*Radius\*\*\s*(\d+)/i) ?? text.match(/(\d+)[- ]ft\.?\**\s*burst/i) ?? text.match(/radius\s*\**\s*(\d+)\s*ft/i);
  if (radius) domain.radius = Number(radius[1]);

  // Damage: the output rule (Grade Rank × technique die) for PCs, or a printed formula ("8d6 fire", "6d10+7 fire").
  // The first dice formula that's damage (not "loses 1d6 CE"). Persistent damage counts: it lands each pulse.
  const explicit = [...sure.matchAll(new RegExp(`(\\d+d\\d+(?:\\s*[+-]\\s*\\d+)?)\\s*(persistent\\s+)?(?:(${DAMAGE_TYPES})\\b)?`, "gi"))]
    .find(m => !/^\s*CE\b/i.test(sure.slice(m.index + m[1].length)));
  const typed = sure.match(new RegExp(`\\b(${DAMAGE_TYPES})\\s+damage`, "i"));
  if (caster === "pc" && /grade rank|output damage|technique dic?e/i.test(sure) && /damage/i.test(sure)) domain.damage = "output";
  else if (explicit) domain.damage = explicit[1].replace(/\s+/g, "");
  if (domain.damage) domain.damageType = (explicit?.[3] ?? typed?.[1] ?? "").toLowerCase();

  // Conditions named in the sure-hit line ("stunned 1", "off-guard"), skipping ones it says it prevents.
  const found = [];
  for (const m of sure.matchAll(new RegExp(`\\b(${CONDITIONS.join("|")})\\b(?:\\s*(\\d+))?`, "gi"))) {
    const before = sure.slice(Math.max(0, m.index - 16), m.index).toLowerCase();
    if (/\b(not|no|isn't|aren't|without|immune to|ends?|removes?|removed)\s*$/.test(before)) continue;
    const key = m[1].toLowerCase();
    if (key === "drained" && /^\s*\d*\s*at 0 ce/i.test(sure.slice(m.index + m[0].length, m.index + m[0].length + 12))) continue;
    if (!found.some(c => c.split(" ")[0] === key)) found.push(m[2] ? `${key} ${m[2]}` : key);
  }
  domain.conditions = found.join(", ");
  domain.effect = sure.length > 360 ? `${sure.slice(0, 357).trimEnd()}…` : sure;

  // Amplify clause: "1 less CE" or a card rule that replaces the default halving.
  const amp = plain(lines.find(l => /^\s*-\s*\*\*\s*amplif/i.test(l)) ?? "");
  if (/1 less CE/i.test(amp)) domain.amplify = "minus1";
  else if (amp && /replaces the default/i.test(amp) && !/halved|½/.test(amp)) domain.amplify = "card";

  // Curses print their own duration and barrier; PCs follow Core Rules IV by Grade.
  if (caster === "curse") {
    const rounds = text.match(/Lasts\s*\**\s*(\d+)\s*rounds?/i) ?? text.match(/slam plus\s*\**\s*(\d+)\s*(?:more\s*)?rounds?/i);
    if (rounds) domain.rounds = Number(rounds[1]);
  }
  const barrier = text.match(/Hardness\s*\**\s*(\d+)\**\s*,\s*\**\s*HP\s*\**\s*(\d+)/i);
  if (barrier) { domain.hardness = Number(barrier[1]); domain.barrierHP = Number(barrier[2]); }
  return domain;
}

/** A curse's "## Domain — **Name**" section → curse system fields. */
export function curseDomain(md) {
  const m = md.match(/^## Domain\b[^\n]*$/m);
  if (!m) return { hasDomain: false };
  if (/^\s*\**None\b/i.test(md.slice(m.index + m[0].length))) return { hasDomain: false };
  const rest = md.slice(m.index + m[0].length);
  const end = rest.search(/^## /m);
  const section = end >= 0 ? rest.slice(0, end) : rest;
  const name = m[0].replace(/^## Domain\s*[—–-]?\s*/, "").replace(/\*\*/g, "").trim();
  return { hasDomain: true, domainName: name ? `Domain Expansion: ${name}` : "", domain: parseDomain(section, { caster: "curse" }) };
}
