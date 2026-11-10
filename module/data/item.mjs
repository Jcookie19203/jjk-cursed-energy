import { GRADES, ACTIONS, RESOLUTION, LADDERS, SAVES, ABILITIES, parsePrice } from "../config.mjs";

const { NumberField, StringField, BooleanField, HTMLField, SchemaField } = foundry.data.fields;
const int = (initial = 0, opts = {}) => new NumberField({ required: true, nullable: false, integer: true, initial, ...opts });
const optInt = () => new NumberField({ required: false, nullable: true, integer: true, initial: null });
const str = (initial = "", opts = {}) => new StringField({ required: true, blank: true, initial, ...opts });
const bool = (initial = false) => new BooleanField({ required: true, initial });
const html = () => new HTMLField({ required: true, blank: true, initial: "" });

/** Weapons, armor and gear carry a yen price. Older items had a free-text "price"; convert it once. */
function migratePrice(source) {
  if (source.yen === undefined && typeof source.price === "string" && source.price.trim()) source.yen = parsePrice(source.price);
  return source;
}
const yen = () => int(0, { min: 0 });

/**
 * What a Domain does each pulse, read from the card or stat block by the pack builder and editable by the GM.
 * damage: "" (none), "output" (Grade Rank × technique die + key mod) or a formula such as "8d6+4".
 * conditions: "stunned 1, off-guard, slowed 1". rounds: extra rounds after the slam (null = by Grade).
 */
export function domainSchema() {
  return new SchemaField({
    radius: int(20, { min: 5 }),
    damage: str(""),
    damageType: str(""),
    conditions: str(""),
    effect: str(""),
    amplify: str("half", { choices: ["half", "minus1", "card"], blank: false }),
    rounds: optInt(),
    hardness: optInt(),
    barrierHP: optInt()
  });
}

/** A technique or path card. */
export class AbilityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      technique: str(""),
      tier: str("fledgling", { choices: Object.keys(GRADES), blank: false }),
      slot: int(1, { min: 1, max: 3 }),
      ladder: str("technique", { choices: Object.keys(LADDERS), blank: false }),
      universal: bool(false),
      granted: bool(false),
      costText: str(""),
      ce: optInt(),
      allPool: bool(false),
      actions: str("2", { choices: Object.keys(ACTIONS), blank: false }),
      traits: str(""),
      range: str(""),
      resolution: str("none", { choices: Object.keys(RESOLUTION), blank: false }),
      save: str("reflex", { choices: Object.keys(SAVES), blank: false }),
      basicSave: bool(false),
      usesOutput: bool(false),
      isDomain: bool(false),
      domain: domainSchema(),
      pressure: int(0, { min: 0, max: 10 }),
      description: html()
    };
  }

  get traitList() {
    return this.traits.split(",").map(t => t.trim()).filter(Boolean);
  }
}

/** Weapons and cursed tools. Damage dice count follows your Grade's Reinforced Strike. */
export class WeaponData extends foundry.abstract.TypeDataModel {
  static migrateData(source) { return super.migrateData(migratePrice(source)); }
  static defineSchema() {
    return {
      dieSize: str("d8", { choices: ["d4", "d6", "d8", "d10", "d12"], blank: false }),
      attackOverride: optInt(),
      formula: str(""),
      damageType: str("slashing"),
      traits: str(""),
      range: str("melee"),
      cursedTool: bool(false),
      charge: int(0, { min: 0 }),
      bonus: int(0),
      equipped: bool(true),
      quantity: int(1, { min: 0 }),
      bulk: str("1"),
      price: str(""),
      yen: yen(),
      description: html()
    };
  }
}

export class ArmorData extends foundry.abstract.TypeDataModel {
  static migrateData(source) { return super.migrateData(migratePrice(source)); }
  static defineSchema() {
    return {
      category: str("light", { choices: ["unarmored", "light", "medium", "heavy"], blank: false }),
      acBonus: int(1),
      dexCap: int(4),
      checkPenalty: int(0),
      speedPenalty: int(0),
      strength: int(0),
      traits: str(""),
      equipped: bool(false),
      bulk: str("1"),
      price: str(""),
      yen: yen(),
      description: html()
    };
  }
}

export class GearData extends foundry.abstract.TypeDataModel {
  static migrateData(source) { return super.migrateData(migratePrice(source)); }
  static defineSchema() {
    return {
      quantity: int(1, { min: 0 }),
      bulk: str("L"),
      price: str(""),
      yen: yen(),
      traits: str(""),
      description: html()
    };
  }
}

export class VowData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      kind: str("self", { choices: ["self", "mutual"], blank: false }),
      weight: str("minor", { choices: ["minor", "moderate", "major", "severe"], blank: false }),
      restriction: str(""),
      benefit: str(""),
      party: str(""),
      broken: bool(false),
      description: html()
    };
  }
}

export class AncestryData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      hp: int(8, { min: 0 }),
      size: str("medium", { choices: ["tiny", "small", "medium", "large"], blank: false }),
      speed: int(25, { min: 0 }),
      boosts: str(""),
      flaw: str(""),
      languages: str(""),
      senses: str(""),
      traits: str(""),
      description: html()
    };
  }
}

export class BackgroundData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      boosts: str(""),
      trainedSkill: str(""),
      lore: str(""),
      feat: str(""),
      description: html()
    };
  }
}

export const KEY_ABILITY_CHOICES = ABILITIES;
