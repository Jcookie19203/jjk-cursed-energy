import { GRADES, SAVES, SKILLS, ABILITIES, VALUED_CONDITIONS, TOGGLE_CONDITIONS, profBonus } from "../config.mjs";

const { NumberField, StringField, BooleanField, SchemaField, HTMLField } = foundry.data.fields;

const int = (initial = 0, opts = {}) => new NumberField({ required: true, nullable: false, integer: true, initial, ...opts });
const str = (initial = "", opts = {}) => new StringField({ required: true, blank: true, initial, ...opts });
const bool = (initial = false) => new BooleanField({ required: true, initial });

function conditionSchema() {
  const fields = {};
  for (const key of Object.keys(VALUED_CONDITIONS)) fields[key] = int(0, { min: 0, max: 10 });
  for (const key of Object.keys(TOGGLE_CONDITIONS)) fields[key] = bool(false);
  return new SchemaField(fields);
}

/** Status penalty that applies to a check keyed off an ability (PF2e: status penalties don't stack). */
export function statusPenalty(conditions, ability = null) {
  const c = conditions;
  const byAbility = { dex: c.clumsy, str: c.enfeebled, con: c.drained, int: c.stupefied, wis: c.stupefied, cha: c.stupefied };
  return Math.max(c.frightened, c.sickened, ability ? (byAbility[ability] ?? 0) : 0);
}

/** Shared derived numbers for every actor type. */
function deriveConditionalMods(system) {
  const c = system.conditions;
  system.mods = {
    status: Math.max(c.frightened, c.sickened),
    attackCircumstance: c.prone ? 2 : 0,
    acCircumstance: (c.offGuard || c.prone || c.grabbed || c.restrained || c.paralyzed || c.unconscious) ? 2 : 0
  };
}

/* -------------------------------------------- */
/*  Sorcerer (player character)                 */
/* -------------------------------------------- */

export class SorcererData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const abilities = {};
    for (const key of Object.keys(ABILITIES)) abilities[key] = new SchemaField({ mod: int(0, { min: -5, max: 10 }) });
    const skills = {};
    for (const key of Object.keys(SKILLS)) skills[key] = new SchemaField({ rank: int(0, { min: 0, max: 4 }) });

    return {
      grade: str("fledgling", { choices: Object.keys(GRADES), blank: false }),
      keyAbility: str("cha", { choices: Object.keys(ABILITIES), blank: false }),
      bestSave: str("will", { choices: Object.keys(SAVES), blank: false }),
      heavenlyRestriction: bool(false),
      techniqueName: str(""),
      pathName: str(""),
      hasPassenger: bool(false),
      abilities: new SchemaField(abilities),
      skills: new SchemaField(skills),
      loreName: str("Lore"),
      attributes: new SchemaField({
        hp: new SchemaField({ value: int(20, { min: 0 }), temp: int(0, { min: 0 }), bonus: int(0) }),
        ce: new SchemaField({ value: int(4, { min: 0 }), bonus: int(0) }),
        ac: new SchemaField({ item: int(0), dexCap: int(99), bonus: int(0) }),
        speed: int(25, { min: 0 }),
        composure: int(0, { min: 0, max: 6 }),
        pressure: int(0, { min: 0, max: 10 }),
        heroPoints: int(1, { min: 0, max: 3 }),
        domainActive: bool(false)
      }),
      details: new SchemaField({
        ancestry: str(""), background: str(""), ancestryHP: int(8, { min: 0 }),
        concept: str(""), notes: new HTMLField({ required: true, blank: true, initial: "" })
      }),
      conditions: conditionSchema()
    };
  }

  prepareDerivedData() {
    const g = GRADES[this.grade] ?? GRADES.fledgling;
    const hr = this.heavenlyRestriction;
    const level = g.level;
    deriveConditionalMods(this);
    const status = this.mods.status;

    this.gradeData = g;
    this.level = level;
    this.gradeRank = g.rank;
    this.techniqueDie = g.die;
    this.keyMod = this.abilities[this.keyAbility]?.mod ?? 0;

    // Band: +1 per card earned this tier (cards that gate promotion, excluding the granted starter).
    const tierCards = this.parent?.items?.filter(i => i.type === "ability" && i.system.tier === this.grade && i.system.ladder !== "layer") ?? [];
    const earned = tierCards.filter(i => !i.system.granted).length;
    this.tierProgress = { owned: tierCards.length, needed: 3, ready: tierCards.length >= 3 && this.grade !== "special" };
    this.band = earned;

    const attackBase = Math.min(g.attack[0] + earned, g.attack[1]);
    const dcBase = Math.min(g.dc[0] + earned, g.dc[1]);
    // Composure: +1 status bonus to attack rolls and Will saves per point (Core Rules III).
    const composure = this.attributes.composure;
    this.hasBlackFlashFocus = !!this.parent?.items?.some(i => i.type === "ability" && /black flash focus/i.test(i.name));
    this.composureMax = this.hasBlackFlashFocus ? 6 : 4;
    this.cursedAttack = { base: attackBase, value: attackBase - status - this.mods.attackCircumstance + composure };
    this.techniqueDC = { base: dcBase, value: dcBase - status };

    // Resources.
    const ceMax = Math.max(0, (hr ? Math.ceil((g.ce + this.keyMod) / 2) : g.ce + this.keyMod) + this.attributes.ce.bonus);
    this.attributes.ce.max = ceMax;
    this.attributes.ce.value = Math.min(this.attributes.ce.value, ceMax);
    const drainedLoss = this.conditions.drained * level;
    this.attributes.hp.max = Math.max(1, g.hp + this.details.ancestryHP + this.attributes.hp.bonus - drainedLoss);
    this.attributes.hp.value = Math.min(this.attributes.hp.value, this.attributes.hp.max);
    this.reinforcement = g.reinforcement * (hr ? 2 : 1);
    this.strike = { count: g.strike[0] + (hr ? 1 : 0), die: `d${g.strike[1]}` };
    this.strike.formula = `${this.strike.count}${this.strike.die} + ${this.keyMod}`;
    this.takeoverDC = 15 + 4 * g.rank;

    // Saves, perception, AC, skills.
    this.saves = {};
    for (const [key, cfg] of Object.entries(SAVES)) {
      const rank = key === this.bestSave ? g.bestSave : g.worstSave;
      const abil = this.abilities[cfg.ability].mod;
      this.saves[key] = { rank, mod: abil + profBonus(rank, level) - statusPenalty(this.conditions, cfg.ability) + (key === "will" ? composure : 0) };
    }
    const percRank = g.keyProf;
    this.attributes.perception = { rank: percRank, mod: this.abilities.wis.mod + profBonus(percRank, level) - status };
    const acRank = Math.max(1, g.keyProf - 1);
    const armor = this.parent?.items?.find(i => i.type === "armor" && i.system.equipped);
    const itemBonus = armor ? armor.system.acBonus : this.attributes.ac.item;
    const dexCap = armor ? armor.system.dexCap : this.attributes.ac.dexCap;
    const dex = Math.min(this.abilities.dex.mod, dexCap);
    const clumsy = Math.max(status, this.conditions.clumsy);
    this.attributes.ac.rank = acRank;
    this.attributes.ac.armorName = armor?.name ?? "";
    this.attributes.ac.value = 10 + dex + profBonus(acRank, level) + itemBonus + this.attributes.ac.bonus - clumsy - this.mods.acCircumstance;
    this.skillMods = {};
    for (const [key, cfg] of Object.entries(SKILLS)) {
      const rank = this.skills[key].rank;
      this.skillMods[key] = { rank, mod: this.abilities[cfg.ability].mod + profBonus(rank, level) - statusPenalty(this.conditions, cfg.ability) };
    }
    this.domainReady = this.attributes.ce.value >= Math.ceil(ceMax / 2);
  }
}

/* -------------------------------------------- */
/*  Curse / NPC                                 */
/* -------------------------------------------- */

export class CurseData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      grade: str("grade4", { choices: Object.keys(GRADES), blank: false }),
      level: int(4, { min: -1, max: 30 }),
      role: str(""),
      attributes: new SchemaField({
        hp: new SchemaField({ value: int(50, { min: 0 }), max: int(50, { min: 1 }), temp: int(0, { min: 0 }) }),
        ce: new SchemaField({ value: int(6, { min: 0 }), max: int(6, { min: 0 }) }),
        ac: new SchemaField({ base: int(20) }),
        perception: new SchemaField({ base: int(10) }),
        speed: str("30 ft"),
        reinforcement: int(4, { min: 0 }),
        domainActive: bool(false)
      }),
      saves: new SchemaField({ fortitude: int(10), reflex: int(10), will: int(10) }),
      cursedAttack: new SchemaField({ base: int(13) }),
      techniqueDC: new SchemaField({ base: int(20) }),
      keyMod: int(4),
      immunities: str(""), weaknesses: str(""), resistances: str(""), languages: str(""),
      description: new HTMLField({ required: true, blank: true, initial: "" }),
      conditions: conditionSchema()
    };
  }

  prepareDerivedData() {
    const g = GRADES[this.grade] ?? GRADES.grade4;
    deriveConditionalMods(this);
    const status = this.mods.status;
    this.gradeData = g;
    this.gradeRank = g.rank;
    this.techniqueDie = g.die;
    this.reinforcement = this.attributes.reinforcement;
    this.takeoverDC = 15 + 4 * g.rank;
    this.attributes.ac.value = this.attributes.ac.base - Math.max(status, this.conditions.clumsy) - this.mods.acCircumstance;
    this.attributes.perception.mod = this.attributes.perception.base - status;
    this.cursedAttack.value = this.cursedAttack.base - status - this.mods.attackCircumstance;
    this.techniqueDC.value = this.techniqueDC.base - status;
    const abilityOf = { fortitude: "con", reflex: "dex", will: "wis" };
    this.saveMods = {};
    for (const key of Object.keys(SAVES)) this.saveMods[key] = { mod: this.saves[key] - statusPenalty(this.conditions, abilityOf[key]) };
    this.strike = { count: 0, die: g.die, formula: "" };
    this.attributes.hp.value = Math.min(this.attributes.hp.value, this.attributes.hp.max);
    this.attributes.ce.value = Math.min(this.attributes.ce.value, this.attributes.ce.max);
  }
}
