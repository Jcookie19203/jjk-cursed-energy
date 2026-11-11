import { SYSTEM_ID, GRADES, GRADE_ORDER, ABILITIES, SAVES, SKILLS, PROFICIENCY, VALUED_CONDITIONS, TOGGLE_CONDITIONS, ACTION_GLYPH, formatYen } from "../config.mjs";
import { DOMAIN_AMPLIFY } from "./item-sheet.mjs";
import { startSearch, searchCooldown, formatSpan, payMission } from "../shop.mjs";
import { performStrike, performAbility, costRange } from "../actions.mjs";
import * as resources from "../resources.mjs";
import { importStatBlock } from "../statblock.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const TextEditorImpl = () => foundry.applications.ux.TextEditor.implementation;
const signed = n => (n >= 0 ? `+${n}` : `${n}`);

const CARD_PACKS = [`${SYSTEM_ID}.techniques`, `${SYSTEM_ID}.cursed-paths`];
const MASTER_PACK = `${SYSTEM_ID}.gm-master-sheets`;

/** The actor's copy of a compendium card: matched by source uuid, else by name + technique. */
function findOwnedCard(actor, uuid, name, technique) {
  return actor.items.find(i => i.type === "ability" && i.flags?.[SYSTEM_ID]?.sourceId === uuid)
    ?? actor.items.find(i => i.type === "ability" && !i.flags?.[SYSTEM_ID]?.sourceId && i.name === name && i.system.technique === technique);
}

/** Every technique / path ladder in the card compendiums: { name: { pack, ladder, entries[] } }. */
async function loadLadders() {
  const ladders = {};
  for (const id of CARD_PACKS) {
    const pack = game.packs.get(id);
    if (!pack?.visible) continue; // the card packs are GM-only
    const index = await pack.getIndex({ fields: ["system.technique", "system.tier", "system.slot", "system.ladder"] });
    for (const e of index) {
      const name = e.system?.technique;
      if (!name) continue;
      ladders[name] ??= { pack: id, ladder: e.system.ladder ?? "technique", entries: [] };
      ladders[name].entries.push(e);
    }
  }
  return ladders;
}

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
      jjkTab: JJKBaseActorSheet.#tab,
      cardToggle: JJKBaseActorSheet.#cardToggle,
      trackCard: JJKBaseActorSheet.#trackCard,
      openCompendiumDoc: JJKBaseActorSheet.#openCompendiumDoc,
      searchSupplier: JJKBaseActorSheet.#searchSupplier,
      domainPulse: JJKBaseActorSheet.#domainPulse,
      payActor: JJKBaseActorSheet.#payActor,
      openShop: JJKBaseActorSheet.#openShop,
      strike: JJKBaseActorSheet.#strike,
      technique: JJKBaseActorSheet.#technique,
      resStep: JJKBaseActorSheet.#resStep,
      resToggle: JJKBaseActorSheet.#resToggle,
      resAdd: JJKBaseActorSheet.#resAdd,
      resRemove: JJKBaseActorSheet.#resRemove,
      resAddTargets: JJKBaseActorSheet.#resAddTargets,
      readStatBlock: JJKBaseActorSheet.#readStatBlock
    }
  };

  /** Card ids whose rules text is expanded on the Technique tab (kept across re-renders). */
  _expandedCards = new Set();

  static #cardToggle(event, target) {
    const id = target.closest("[data-item-id]").dataset.itemId;
    if (this._expandedCards.has(id)) this._expandedCards.delete(id);
    else this._expandedCards.add(id);
    this.render();
  }

  /** GM tracker: check a card to grant it from the compendium, uncheck to take it away. */
  static async #trackCard(event, target) {
    if (!game.user.isGM) return;
    const { uuid } = target.dataset;
    const owned = findOwnedCard(this.document, uuid, target.dataset.name, target.dataset.technique);
    if (owned) return owned.delete();
    const doc = await fromUuid(uuid);
    if (!doc) return ui.notifications.error("That card is missing from the compendium.");
    const data = doc.toObject();
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.sourceId`, uuid);
    await this.document.createEmbeddedDocuments("Item", [data]);
  }

  static async #openCompendiumDoc(event, target) {
    const doc = await fromUuid(target.dataset.uuid);
    doc?.sheet.render(true);
  }

  static #searchSupplier() { startSearch(this.document); }
  static #domainPulse() { game.jjk.domain.pulseNow(this.document); }
  static #payActor() { payMission([this.document]); }
  static #openShop(event, target) { game.actors.get(target.dataset.shopId)?.sheet.render(true); }

  /* ---------- Attacks tab ---------- */
  static #strike(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    const weapon = id && id !== "strike" ? this.document.items.get(id) : null;
    performStrike(this.document, weapon, { map: Number(target.dataset.map) || 0, prompt: event.shiftKey });
  }
  static #technique(event, target) {
    const item = this.document.items.get(target.closest("[data-item-id]").dataset.itemId);
    if (item) performAbility(this.document, item, { map: Number(target.dataset.map) || 0, prompt: event.shiftKey });
  }

  /* ---------- technique resources (owner only) ---------- */
  static #resKey(target) { return target.closest("[data-res-key]")?.dataset.resKey; }
  static #resStep(event, target) {
    const key = JJKBaseActorSheet.#resKey(target);
    const uuid = target.closest("[data-target-uuid]")?.dataset.targetUuid ?? null;
    resources.step(this.document, key, Number(target.dataset.delta), uuid);
  }
  static #resToggle(event, target) {
    const key = JJKBaseActorSheet.#resKey(target);
    resources.setValue(this.document, key, !(this.document.getFlag(SYSTEM_ID, "res")?.[key]));
  }
  static async #resAdd(event, target) {
    const key = JJKBaseActorSheet.#resKey(target);
    let name;
    try {
      name = await foundry.applications.api.DialogV2.prompt({
        window: { title: "Add" }, content: '<div class="jjk-dialog"><div class="form-group"><label>Name</label><input type="text" name="n" autofocus></div></div>',
        ok: { label: "Add", callback: (e, b) => b.form.elements.n.value.trim() }, rejectClose: false
      });
    } catch { return; }
    if (!name) return;
    const list = [...(this.document.getFlag(SYSTEM_ID, "res")?.[key] ?? []), name];
    resources.setValue(this.document, key, list);
  }
  static #resRemove(event, target) {
    const key = JJKBaseActorSheet.#resKey(target);
    const res = foundry.utils.deepClone(this.document.getFlag(SYSTEM_ID, "res") ?? {});
    const uuid = target.closest("[data-target-uuid]")?.dataset.targetUuid;
    if (uuid) return resources.removeTarget(this.document, key, uuid);
    const list = [...(res[key] ?? [])];
    list.splice(Number(target.dataset.index), 1);
    resources.setValue(this.document, key, list);
  }
  static #readStatBlock() { if (game.user.isGM) importStatBlock(this.document); }

  static #resAddTargets(event, target) {
    const key = JJKBaseActorSheet.#resKey(target);
    const docs = [...game.user.targets].map(t => t.actor).filter(Boolean);
    if (!docs.length) return ui.notifications.warn("Target one or more tokens first (T).");
    resources.trackTargets(this.document, key, docs);
  }

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
    // Domain counters live in flags (not form fields).
    this.element.addEventListener("change", ev => {
      const key = ev.target.closest?.("input.jjk-counter")?.dataset.counter;
      if (key) game.jjk.domain.setCounter(this.document, key, ev.target.checked);
    });
  }

  async #onDropItem(event) {
    const data = TextEditorImpl().getDragEventData(event);
    if (data?.type !== "Item") return;
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable) return;
    const item = await Item.implementation.fromDropData(data);
    if (!item || item.parent === this.document) return;
    const itemData = item.toObject();
    // Remember which compendium card this came from, so the GM tracker shows it as checked.
    if (item.pack) foundry.utils.setProperty(itemData, `flags.${SYSTEM_ID}.sourceId`, item.uuid);
    await this.document.createEmbeddedDocuments("Item", [itemData]);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const sys = actor.system;
    context.actor = actor;
    context.isGM = game.user.isGM;
    context.domainState = game.jjk.domain.activeDomain(actor);
    context.counters = actor.getFlag(SYSTEM_ID, "counters") ?? {};
    context.domainAmplifyOptions = DOMAIN_AMPLIFY;
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
        layer: i.system.ladder === "layer", technique: i.system.technique,
        expanded: this._expandedCards.has(i.id), item: i
      }))
    })).filter(t => t.cards.length);
    // Only expanded cards need their rules text enriched.
    for (const tier of byTier) for (const c of tier.cards) {
      if (c.expanded) c.description = await TextEditorImpl().enrichHTML(c.item.system.description ?? "", { relativeTo: c.item, secrets: c.item.isOwner });
      delete c.item;
    }
    context.abilityTiers = byTier;
    context.weapons = items.filter(i => i.type === "weapon");
    context.armor = items.filter(i => i.type === "armor");
    context.gear = items.filter(i => i.type === "gear");
    context.vows = items.filter(i => i.type === "vow");
    context.origins = items.filter(i => i.type === "ancestry" || i.type === "background");
    context.resources = resources.sheetContext(actor);
    context.isCurse = actor.type === "curse";
    if (context.tab === "attacks") {
      // A curse's actions are read from its stat block the first time the GM opens this tab.
      if (context.isCurse && game.user.isGM && !actor.getFlag(SYSTEM_ID, "statBlockRead") && !this._readingStatBlock) {
        this._readingStatBlock = true;
        importStatBlock(actor, { notify: false }).finally(() => { this._readingStatBlock = false; });
      }
      context.attacks = this.#prepareAttacks(items, abilities);
    }
    return context;
  }

  /** Attacks tab: Strikes (with MAP buttons), cursed strikes, save effects, other actions. */
  #prepareAttacks(items, abilities) {
    const actor = this.document;
    const s = actor.system;
    const atk = s.cursedAttack.value;
    const maps = (base, agile) => [0, agile ? 4 : 5, agile ? 8 : 10].map((p, i) => ({
      label: signed(base - p), title: ["First attack", "Second attack (MAP)", "Third+ attack (MAP)"][i]
    }));
    const die = s.techniqueDie;
    const strikes = actor.type === "sorcerer"
      ? [{ id: "strike", name: "Reinforced Strike", img: "icons/skills/melee/unarmed-punch-fist.webp", sub: "unarmed", maps: maps(atk, false), damage: s.strike?.formula ?? "" }]
      : [];
    for (const w of items.filter(i => i.type === "weapon")) {
      const agile = /\bagile\b/i.test(w.system.traits ?? "");
      const base = Number.isFinite(w.system.attackOverride) ? w.system.attackOverride : atk + (w.system.bonus ?? 0);
      const dmg = w.system.formula || `${s.strike?.count ?? 2}${w.system.dieSize} + ${(s.keyMod ?? 0) + (w.system.bonus ?? 0)}`;
      strikes.push({ id: w.id, name: w.name, img: w.img, sub: [w.system.range, w.system.traits].filter(Boolean).join(" · "), maps: maps(base, agile),
        damage: `${dmg} ${w.system.damageType}${w.system.charge ? ` + ${w.system.charge}${die} charge` : ""}` });
    }
    const row = i => {
      const r = costRange(actor, i);
      const cost = r.fixed ? (r.min ? `${r.min} CE` : "") : `${r.min}–${r.max} CE`;
      return { id: i.id, name: i.name, img: i.img, sub: [ACTION_GLYPH[i.system.actions] ?? "", cost, i.system.range].filter(Boolean).join(" · "),
        damage: i.system.damage ? `${i.system.damage} ${i.system.damageType}`.trim() : i.system.usesOutput ? `CE × ${die} + ${s.keyMod}` : "" };
    };
    const usable = abilities.filter(i => !/^black flash/i.test(i.name)).filter(i => !["passive", "none"].includes(i.system.actions) || i.system.resolution !== "none" || i.system.isDomain);
    return {
      strikes,
      cursed: usable.filter(i => i.system.resolution === "attack").map(i => ({ ...row(i), maps: maps(atk, /\bagile\b/i.test(i.system.traits)) })),
      saves: usable.filter(i => i.system.resolution === "save").map(i => ({ ...row(i), saveLabel: `${SAVES[i.system.save].label}${i.system.dc ? ` DC ${i.system.dc}` : ""}${i.system.basicSave ? " (basic)" : ""}` })),
      other: usable.filter(i => i.system.resolution === "none").map(row)
    };
  }

  /* ---------- actions (this = sheet) ---------- */
  static #rollSave(event, target) { this.document.rollSave(target.dataset.key, { prompt: !event.shiftKey }); }
  static #rollSkill(event, target) { this.document.rollSkill(target.dataset.key, { prompt: !event.shiftKey }); }
  static #rollPerception(event) { this.document.rollPerception({ prompt: !event.shiftKey }); }
  static #rollAttack(event) { this.document.rollCursedAttack("Reinforced Strike", { prompt: !event.shiftKey }); }
  static #rollStrikeDamage() { this.document.rollStrikeDamage(); }
  static #rollOutput() { this.document.rollOutputDamage(); }
  static #itemUse(event, target) {
    const item = this.document.items.get(target.closest("[data-item-id]").dataset.itemId);
    if (!item) return;
    // Technique cards run the full automated action; shift-click just posts the card.
    if (item.type === "ability" && !event.shiftKey) return performAbility(this.document, item);
    item.use();
  }
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
  static #reset() { this.document.restoreFlow(); }
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
    context.isGM = game.user.isGM;
    // Money and shops (Gear tab).
    context.wallet = formatYen(sys.yen);
    const wait = searchCooldown(this.document);
    context.searchWait = wait > 0 ? formatSpan(wait) : null;
    context.knownShops = game.actors.filter(a => a.type === "shop" && a.testUserPermission(game.user, "OBSERVER"))
      .sort((a, b) => a.system.kind.localeCompare(b.system.kind) || a.name.localeCompare(b.name))
      .map(a => ({ id: a.id, name: a.name, rare: a.system.kind === "rare", location: a.system.location }));
    // Technique / layer-path dropdowns, built from the card compendiums (like PF2e's class picker).
    const ladders = await loadLadders();
    const names = Object.keys(ladders).sort((a, b) => a.localeCompare(b));
    const opts = (list, current) => {
      const o = Object.fromEntries(list.map(n => [n, n]));
      if (current && !(current in o)) o[current] = `${current} (custom)`;
      return o;
    };
    context.techniqueOptions = opts(names.filter(n => ladders[n].ladder !== "layer"), sys.techniqueName);
    context.layerOptions = opts(names.filter(n => ladders[n].ladder === "layer"), sys.pathName);
    if (!context.isGM && context.tab === "track") context.tab = this.tabGroups.primary = "main";
    if (context.isGM && context.tab === "track") context.tracker = await this.#prepareTracker();
    return context;
  }

  /** GM card tracker: every card on the chosen technique ladder and layer path, with owned ones checked. */
  async #prepareTracker() {
    const sys = this.document.system;
    const ladders = await loadLadders();
    const masters = game.packs.get(MASTER_PACK);
    const masterIndex = masters ? await masters.getIndex() : [];

    const build = (name, label) => {
      const lad = ladders[name];
      if (!lad) return name ? { label, name, missing: true } : null;
      const master = masterIndex.find?.(e => e.name.startsWith(`${name} —`) || e.name.startsWith(`${name} -`));
      const tiers = GRADE_ORDER.map(key => ({
        key, label: GRADES[key].label, current: key === sys.grade,
        cards: lad.entries.filter(e => e.system.tier === key).sort((a, b) => a.system.slot - b.system.slot).map(e => ({
          uuid: e.uuid ?? `Compendium.${lad.pack}.Item.${e._id}`, name: e.name, slot: e.system.slot, technique: name,
          owned: !!findOwnedCard(this.document, e.uuid ?? `Compendium.${lad.pack}.Item.${e._id}`, e.name, name)
        }))
      })).filter(t => t.cards.length);
      const total = tiers.reduce((n, t) => n + t.cards.length, 0);
      const owned = tiers.reduce((n, t) => n + t.cards.filter(c => c.owned).length, 0);
      return { label, name, tiers, owned, total, masterUuid: master ? (master.uuid ?? `Compendium.${MASTER_PACK}.JournalEntry.${master._id}`) : null };
    };

    return {
      ladders: [build(sys.techniqueName, "Technique / path"), build(sys.pathName, "Layer path")].filter(Boolean)
    };
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
