import { SYSTEM_ID, GRADES, GRADE_ORDER, ABILITIES, SAVES, SKILLS, PROFICIENCY, VALUED_CONDITIONS, TOGGLE_CONDITIONS, ACTION_GLYPH } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const TextEditorImpl = () => foundry.applications.ux.TextEditor.implementation;
const signed = n => (n >= 0 ? `+${n}` : `${n}`);

/** Shared behaviour for both actor sheets. */
class JJKBaseActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["jjk", "sheet", "actor"],
    position: { width: 780, height: 840 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      rollSave: JJKBaseActorSheet.#rollSave,
      rollSkill: JJKBaseActorSheet.#rollSkill,
      rollPerception: JJKBaseActorSheet.#rollPerception,
      rollAttack: JJKBaseActorSheet.#rollAttack,
      rollStrikeDamage: JJKBaseActorSheet.#rollStrikeDamage,
      rollOutput: JJKBaseActorSheet.#rollOutput,
      itemUse: JJKBaseActorSheet.#itemUse,
      itemEdit: JJKBaseActorSheet.#itemEdit,
      itemDelete: JJKBaseActorSheet.#itemDelete,
      itemCreate: JJKBaseActorSheet.#itemCreate,
      itemToggleEquip: JJKBaseActorSheet.#itemToggleEquip,
      condStep: JJKBaseActorSheet.#condStep,
      reset: JJKBaseActorSheet.#reset,
      focusedFlow: JJKBaseActorSheet.#focusedFlow,
      openDomain: JJKBaseActorSheet.#openDomain,
      endDomain: JJKBaseActorSheet.#endDomain,
      blackFlash: JJKBaseActorSheet.#blackFlash,
      promote: JJKBaseActorSheet.#promote,
      pressure: JJKBaseActorSheet.#pressure,
      takeover: JJKBaseActorSheet.#takeover,
      // Not named "tab": ApplicationV2 reserves that action for its own tab system and never calls ours.
      jjkTab: JJKBaseActorSheet.#tab
    }
  };

  static #tab(event, target) {
    this.tabGroups[target.dataset.group ?? "primary"] = target.dataset.tab;
    this.render();
  }

  tabGroups = { primary: "main" };

  /** Item drops: handled here once, in the capture phase, so a core handler can't create a duplicate. */
  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    this.element.addEventListener("dragover", ev => ev.preventDefault());
    this.element.addEventListener("drop", ev => this.#onDropItem(ev), { capture: true });
  }

  async #onDropItem(event) {
    const data = TextEditorImpl().getDragEventData(event);
    if (data?.type !== "Item") return;
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable) return;
    const item = await Item.implementation.fromDropData(data);
    if (!item || item.parent === this.document) return;
    await this.document.createEmbeddedDocuments("Item", [item.toObject()]);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const sys = actor.system;
    context.actor = actor;
    context.system = sys;
    context.source = actor.system._source ?? actor._source.system;
    context.editable = this.isEditable;
    context.tab = this.tabGroups.primary;
    context.gradeOptions = Object.fromEntries(GRADE_ORDER.map(k => [k, GRADES[k].label]));
    context.gradeLabel = GRADES[sys.grade]?.label;
    context.conditions = {
      valued: Object.entries(VALUED_CONDITIONS).map(([key, label]) => ({ key, label, value: sys.conditions[key] })),
      toggles: Object.entries(TOGGLE_CONDITIONS).map(([key, label]) => ({ key, label, value: sys.conditions[key], name: `system.conditions.${key}` }))
    };

    const items = actor.items.contents.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const abilities = items.filter(i => i.type === "ability");
    const byTier = GRADE_ORDER.map(key => ({
      key, label: GRADES[key].label,
      cards: abilities.filter(i => i.system.tier === key).sort((a, b) => a.system.slot - b.system.slot).map(i => ({
        id: i.id, name: i.name, img: i.img, slot: i.system.slot, glyph: ACTION_GLYPH[i.system.actions] ?? "",
        cost: i.system.costText || (i.system.ce !== null ? `${i.system.ce} CE` : ""), universal: i.system.universal,
        layer: i.system.ladder === "layer", technique: i.system.technique
      }))
    })).filter(t => t.cards.length);
    context.abilityTiers = byTier;
    context.weapons = items.filter(i => i.type === "weapon");
    context.armor = items.filter(i => i.type === "armor");
    context.gear = items.filter(i => i.type === "gear");
    context.vows = items.filter(i => i.type === "vow");
    context.origins = items.filter(i => i.type === "ancestry" || i.type === "background");
    return context;
  }

  /* ---------- actions (this = sheet) ---------- */
  static #rollSave(event, target) { this.document.rollSave(target.dataset.key, { prompt: !event.shiftKey }); }
  static #rollSkill(event, target) { this.document.rollSkill(target.dataset.key, { prompt: !event.shiftKey }); }
  static #rollPerception(event) { this.document.rollPerception({ prompt: !event.shiftKey }); }
  static #rollAttack(event) { this.document.rollCursedAttack("Reinforced Strike", { prompt: !event.shiftKey }); }
  static #rollStrikeDamage() { this.document.rollStrikeDamage(); }
  static #rollOutput() { this.document.rollOutputDamage(); }
  static #itemUse(event, target) { this.document.items.get(target.closest("[data-item-id]").dataset.itemId)?.use(); }
  static #itemEdit(event, target) { this.document.items.get(target.closest("[data-item-id]").dataset.itemId)?.sheet.render(true); }
  static async #itemDelete(event, target) {
    const item = this.document.items.get(target.closest("[data-item-id]").dataset.itemId);
    if (!item) return;
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Delete" }, content: `<p>Delete <strong>${item.name}</strong>?</p>`, rejectClose: false });
    if (ok) item.delete();
  }
  static #itemCreate(event, target) {
    const type = target.dataset.type;
    this.document.createEmbeddedDocuments("Item", [{ name: `New ${game.i18n.localize(`TYPES.Item.${type}`)}`, type }]);
  }
  static #itemToggleEquip(event, target) {
    const item = this.document.items.get(target.closest("[data-item-id]").dataset.itemId);
    if (item) item.update({ "system.equipped": !item.system.equipped });
  }
  static #condStep(event, target) {
    const key = target.dataset.key;
    const delta = Number(target.dataset.delta);
    const v = Math.max(0, (this.document.system.conditions[key] ?? 0) + delta);
    this.document.update({ [`system.conditions.${key}`]: v });
  }
  static #reset() { this.document.reset(); }
  static #focusedFlow() { this.document.focusedFlow(); }
  static #openDomain() { this.document.openDomain(); }
  static #endDomain() { this.document.endDomain(); }
  static #blackFlash() { this.document.attemptBlackFlash(); }
  static #promote() { this.document.promote(); }
  static #pressure(event, target) { this.document.adjustPressure(Number(target.dataset.delta)); }
  static #takeover() { this.document.rollTakeover(); }
}

/* -------------------------------------------- */

export class JJKSorcererSheet extends JJKBaseActorSheet {
  static DEFAULT_OPTIONS = { classes: ["sorcerer"] };
  static PARTS = { sheet: { template: `systems/${SYSTEM_ID}/templates/actor/sorcerer-sheet.hbs`, scrollable: [".jjk-tab"] } };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.document.system;
    context.abilities = Object.entries(ABILITIES).map(([key, label]) => ({ key, label, mod: sys.abilities[key].mod, isKey: key === sys.keyAbility }));
    context.abilityOptions = ABILITIES;
    context.saveOptions = Object.fromEntries(Object.entries(SAVES).map(([k, v]) => [k, v.label]));
    context.saves = Object.entries(SAVES).map(([key, cfg]) => ({ key, label: cfg.label, mod: signed(sys.saves[key].mod), rank: PROFICIENCY[sys.saves[key].rank] }));
    context.skills = Object.entries(SKILLS).map(([key, cfg]) => ({
      key, label: key === "lore" ? sys.loreName : cfg.label, ability: cfg.ability.toUpperCase(),
      rank: sys.skills[key].rank, mod: signed(sys.skillMods[key].mod), name: `system.skills.${key}.rank`
    }));
    context.profOptions = PROFICIENCY;
    context.perception = signed(sys.attributes.perception.mod);
    context.cursedAttack = signed(sys.cursedAttack.value);
    context.bandRange = `${sys.gradeData.attack[0]}–${sys.gradeData.attack[1]}`;
    context.pressurePct = sys.attributes.pressure * 10;
    context.enrichedNotes = await TextEditorImpl().enrichHTML(sys.details.notes, { relativeTo: this.document, secrets: this.document.isOwner });
    return context;
  }
}

/* -------------------------------------------- */

export class JJKCurseSheet extends JJKBaseActorSheet {
  static DEFAULT_OPTIONS = { classes: ["curse"], position: { width: 720, height: 800 } };
  static PARTS = { sheet: { template: `systems/${SYSTEM_ID}/templates/actor/curse-sheet.hbs`, scrollable: [".jjk-tab"] } };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.document.system;
    context.saves = Object.entries(SAVES).map(([key, cfg]) => ({ key, label: cfg.label, base: sys.saves[key], mod: signed(sys.saveMods[key].mod) }));
    context.perception = signed(sys.attributes.perception.mod);
    context.cursedAttack = signed(sys.cursedAttack.value);
    context.enrichedDescription = await TextEditorImpl().enrichHTML(sys.description, { relativeTo: this.document, secrets: this.document.isOwner });
    return context;
  }
}
