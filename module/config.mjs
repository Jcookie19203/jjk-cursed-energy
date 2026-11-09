// Static rules data for the Cursed Energy system. Mirrors the Grade Table in Core Rules I.

export const SYSTEM_ID = "jjk-cursed-energy";

/** Grade Table. Attack/DC are absolute bands (they already include the key ability). */
export const GRADES = {
  fledgling: { rank: 1, label: "Fledgling",     level: 2,  ce: 4,  attack: [7, 9],   dc: [17, 18], reinforcement: 2,  hp: 20,  keyProf: 1, bestSave: 2, worstSave: 1, die: "d4",  strike: [2, 6] },
  grade4:    { rank: 2, label: "Grade 4",       level: 4,  ce: 6,  attack: [11, 13], dc: [20, 21], reinforcement: 4,  hp: 36,  keyProf: 2, bestSave: 2, worstSave: 1, die: "d6",  strike: [2, 8] },
  grade3:    { rank: 3, label: "Grade 3",       level: 7,  ce: 9,  attack: [15, 17], dc: [23, 25], reinforcement: 6,  hp: 56,  keyProf: 2, bestSave: 3, worstSave: 2, die: "d6",  strike: [3, 8] },
  grade2:    { rank: 4, label: "Grade 2",       level: 10, ce: 12, attack: [19, 21], dc: [27, 28], reinforcement: 9,  hp: 84,  keyProf: 3, bestSave: 3, worstSave: 2, die: "d8",  strike: [3, 10] },
  semi1:     { rank: 5, label: "Semi-Grade 1",  level: 13, ce: 15, attack: [23, 25], dc: [30, 31], reinforcement: 12, hp: 110, keyProf: 3, bestSave: 3, worstSave: 2, die: "d8",  strike: [4, 10] },
  grade1:    { rank: 6, label: "Grade 1",       level: 16, ce: 18, attack: [27, 29], dc: [34, 35], reinforcement: 15, hp: 140, keyProf: 4, bestSave: 4, worstSave: 3, die: "d10", strike: [4, 12] },
  special:   { rank: 7, label: "Special Grade", level: 20, ce: 24, attack: [31, 35], dc: [38, 40], reinforcement: 20, hp: 180, keyProf: 4, bestSave: 4, worstSave: 3, die: "d12", strike: [5, 12] }
};
export const GRADE_ORDER = ["fledgling", "grade4", "grade3", "grade2", "semi1", "grade1", "special"];

/** Card-file tier prefixes → grade keys (used by the pack builder and ability cards). */
export const TIER_FROM_LABEL = {
  "Fledgling": "fledgling", "Grade 4": "grade4", "Grade 3": "grade3", "Grade 2": "grade2",
  "Semi-Grade 1": "semi1", "Grade 1": "grade1", "Special Grade": "special"
};

export const ABILITIES = {
  str: "Strength", dex: "Dexterity", con: "Constitution",
  int: "Intelligence", wis: "Wisdom", cha: "Charisma"
};

export const SAVES = {
  fortitude: { label: "Fortitude", ability: "con" },
  reflex:    { label: "Reflex",    ability: "dex" },
  will:      { label: "Will",      ability: "wis" }
};

export const SKILLS = {
  acrobatics: { label: "Acrobatics", ability: "dex" },
  arcana: { label: "Arcana", ability: "int" },
  athletics: { label: "Athletics", ability: "str" },
  crafting: { label: "Crafting", ability: "int" },
  deception: { label: "Deception", ability: "cha" },
  diplomacy: { label: "Diplomacy", ability: "cha" },
  intimidation: { label: "Intimidation", ability: "cha" },
  medicine: { label: "Medicine", ability: "wis" },
  nature: { label: "Nature", ability: "wis" },
  occultism: { label: "Occultism", ability: "int" },
  performance: { label: "Performance", ability: "cha" },
  religion: { label: "Religion", ability: "wis" },
  society: { label: "Society", ability: "int" },
  stealth: { label: "Stealth", ability: "dex" },
  survival: { label: "Survival", ability: "wis" },
  thievery: { label: "Thievery", ability: "dex" },
  lore: { label: "Lore", ability: "int" }
};

export const PROFICIENCY = { 0: "Untrained", 1: "Trained", 2: "Expert", 3: "Master", 4: "Legendary" };

export const ACTIONS = {
  "1": "[1] One action", "2": "[2] Two actions", "3": "[3] Three actions",
  free: "Free action", reaction: "Reaction", passive: "Passive / modifies", none: "—"
};
export const ACTION_GLYPH = { "1": "◆", "2": "◆◆", "3": "◆◆◆", free: "◇", reaction: "⟲", passive: "", none: "" };

export const RESOLUTION = { none: "No roll", attack: "Cursed strike (attack vs AC)", save: "Save vs Technique DC" };

export const LADDERS = {
  technique: "Technique (gates promotion)",
  replacement: "Replacement path (gates promotion)",
  layer: "Layer path (does not gate promotion)"
};

/** Valued conditions (tracked as numbers). */
export const VALUED_CONDITIONS = {
  frightened: "Frightened", sickened: "Sickened", clumsy: "Clumsy", enfeebled: "Enfeebled",
  stupefied: "Stupefied", drained: "Drained", slowed: "Slowed", stunned: "Stunned",
  dying: "Dying", wounded: "Wounded", doomed: "Doomed"
};
/** On/off conditions. */
export const TOGGLE_CONDITIONS = {
  offGuard: "Off-Guard", prone: "Prone", grabbed: "Grabbed", restrained: "Restrained",
  immobilized: "Immobilized", blinded: "Blinded", dazzled: "Dazzled", deafened: "Deafened",
  fatigued: "Fatigued", fleeing: "Fleeing", paralyzed: "Paralyzed", quickened: "Quickened",
  unconscious: "Unconscious", concealed: "Concealed"
};

/** Token status icons (core SVGs that ship with Foundry). */
export const STATUS_ICONS = {
  frightened: "icons/svg/terror.svg", sickened: "icons/svg/poison.svg", clumsy: "icons/svg/net.svg",
  enfeebled: "icons/svg/downgrade.svg", stupefied: "icons/svg/daze.svg", drained: "icons/svg/blood.svg",
  slowed: "icons/svg/clockwork.svg", stunned: "icons/svg/stoned.svg", dying: "icons/svg/skull.svg",
  wounded: "icons/svg/bones.svg", doomed: "icons/svg/degen.svg",
  offGuard: "icons/svg/target.svg", prone: "icons/svg/falling.svg", grabbed: "icons/svg/net.svg",
  restrained: "icons/svg/padlock.svg", immobilized: "icons/svg/anchor.svg", blinded: "icons/svg/blind.svg",
  dazzled: "icons/svg/sun.svg", deafened: "icons/svg/deaf.svg", fatigued: "icons/svg/sleep.svg",
  fleeing: "icons/svg/wingfoot.svg", paralyzed: "icons/svg/paralysis.svg", quickened: "icons/svg/lightning.svg",
  unconscious: "icons/svg/unconscious.svg", concealed: "icons/svg/invisible.svg"
};

export const DEFAULT_IMG = {
  sorcerer: "icons/svg/mystery-man.svg", curse: "icons/svg/skull.svg",
  ability: "icons/svg/aura.svg", weapon: "icons/svg/sword.svg", gear: "icons/svg/item-bag.svg", vow: "icons/svg/book.svg"
};

/** Proficiency bonus PF2e-style: untrained adds nothing, trained+ adds level + 2×rank. */
export function profBonus(rank, level) {
  return rank > 0 ? level + 2 * rank : 0;
}

/** Degree of success: 0 crit fail, 1 fail, 2 success, 3 crit success. */
export function degreeOfSuccess(total, natural, dc) {
  let degree = total >= dc + 10 ? 3 : total >= dc ? 2 : total <= dc - 10 ? 0 : 1;
  if (natural === 20) degree = Math.min(3, degree + 1);
  else if (natural === 1) degree = Math.max(0, degree - 1);
  return degree;
}
export const DEGREE_LABELS = ["Critical Failure", "Failure", "Success", "Critical Success"];
