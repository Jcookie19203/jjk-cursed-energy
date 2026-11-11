/**
 * Jujutsu Kaisen: Cursed Energy — a standalone Foundry VTT system built on PF2e (Remaster) core mechanics.
 */
import * as JJK from "./config.mjs";
import { SorcererData, CurseData, ShopData } from "./data/actor.mjs";
import { AbilityData, WeaponData, ArmorData, GearData, VowData, AncestryData, BackgroundData } from "./data/item.mjs";
import { JJKActor, syncConditionFromEffect } from "./documents/actor.mjs";
import { JJKItem } from "./documents/item.mjs";
import { JJKSorcererSheet, JJKCurseSheet } from "./sheets/actor-sheets.mjs";
import { JJKItemSheet } from "./sheets/item-sheet.mjs";
import { JJKShopSheet } from "./sheets/shop-sheet.mjs";
import * as shop from "./shop.mjs";
import * as domain from "./domain.mjs";
import { registerChatHooks, registerCombatHooks } from "./chat.mjs";
import * as dice from "./dice.mjs";
import { registerDomainStyle } from "./domain-style.mjs";
import * as actions from "./actions.mjs";
import * as resources from "./resources.mjs";

const { SYSTEM_ID } = JJK;

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | Initializing Cursed Energy`);
  game.jjk = { config: JJK, dice, shop, domain, actions, resources };

  CONFIG.Actor.documentClass = JJKActor;
  CONFIG.Item.documentClass = JJKItem;
  CONFIG.Actor.dataModels = { sorcerer: SorcererData, curse: CurseData, shop: ShopData };
  CONFIG.Item.dataModels = {
    ability: AbilityData, weapon: WeaponData, armor: ArmorData, gear: GearData,
    vow: VowData, ancestry: AncestryData, background: BackgroundData
  };
  CONFIG.Actor.trackableAttributes = {
    sorcerer: { bar: ["attributes.hp", "attributes.ce"], value: ["attributes.pressure", "attributes.composure"] },
    curse: { bar: ["attributes.hp", "attributes.ce"], value: [] },
    shop: { bar: [], value: [] }
  };

  // Initiative uses Perception, as in PF2e.
  CONFIG.Combat.initiative = { formula: "1d20 + @attributes.perception.mod", decimals: 0 };

  // Conditions as token status icons (keep core "dead" for defeated).
  const dead = CONFIG.statusEffects.find(s => s.id === "dead");
  const labels = { ...JJK.VALUED_CONDITIONS, ...JJK.TOGGLE_CONDITIONS };
  CONFIG.statusEffects = [
    ...(dead ? [dead] : []),
    ...Object.entries(labels).map(([id, name]) => ({ id, name, img: JJK.STATUS_ICONS[id] ?? "icons/svg/aura.svg" }))
  ];

  // Sheets.
  const Actors = foundry.documents.collections.Actors;
  const Items = foundry.documents.collections.Items;
  try { Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet); } catch {}
  try { Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet); } catch {}
  Actors.registerSheet(SYSTEM_ID, JJKSorcererSheet, { types: ["sorcerer"], makeDefault: true, label: "Sorcerer Sheet" });
  Actors.registerSheet(SYSTEM_ID, JJKCurseSheet, { types: ["curse"], makeDefault: true, label: "Curse Sheet" });
  Actors.registerSheet(SYSTEM_ID, JJKShopSheet, { types: ["shop"], makeDefault: true, label: "Shop Sheet" });
  Items.registerSheet(SYSTEM_ID, JJKItemSheet, { makeDefault: true, label: "Cursed Energy Item Sheet" });

  // Settings.
  game.settings.register(SYSTEM_ID, "steadyFlow", {
    name: "Steady Flow automation", hint: "At the start of each combatant's turn, they regain 1 CE (up to their max).",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(SYSTEM_ID, "domainAutomation", {
    name: "Automate Domains", hint: "Opening a Domain draws the barrier, settles clashes, and lands the sure hit on every enemy inside on the slam and at the start of the caster's turns, then collapses it.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(SYSTEM_ID, "takeoverPrompts", {
    name: "Takeover prompts", hint: "At the start of a vessel's turn with Pressure 5+, post a takeover Will save to chat.",
    scope: "world", config: true, type: Boolean, default: true
  });

  // Handlebars helpers.
  Handlebars.registerHelper("jjk-eq", (a, b) => a === b);
  Handlebars.registerHelper("jjk-and", (a, b) => !!(a && b));
  Handlebars.registerHelper("jjk-not", a => !a);
  Handlebars.registerHelper("jjk-signed", n => (Number(n) >= 0 ? `+${n}` : `${n}`));

  foundry.applications.handlebars.loadTemplates([
    `systems/${SYSTEM_ID}/templates/actor/sorcerer-sheet.hbs`,
    `systems/${SYSTEM_ID}/templates/actor/curse-sheet.hbs`,
    `systems/${SYSTEM_ID}/templates/actor/shop-sheet.hbs`,
    `systems/${SYSTEM_ID}/templates/item/item-sheet.hbs`,
    `systems/${SYSTEM_ID}/templates/actor/parts/resources.hbs`,
    `systems/${SYSTEM_ID}/templates/actor/parts/attacks.hbs`
  ]);

  registerChatHooks();
  Hooks.on("createActiveEffect", (effect, options, userId) => syncConditionFromEffect(effect, true, userId));
  Hooks.on("deleteActiveEffect", (effect, options, userId) => syncConditionFromEffect(effect, false, userId));
  registerCombatHooks();
  shop.registerShops();
  domain.registerDomains();
  registerDomainStyle();
  actions.registerActions();
  resources.registerResources();
});

Hooks.once("ready", () => console.log(`${SYSTEM_ID} | Ready.`));

/** Drag a technique/path card onto the hotbar to make a "use" macro. */
Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (data.type !== "Item") return;
  (async () => {
    const item = await fromUuid(data.uuid);
    if (!item?.actor) return;
    const command = item.type === "ability"
      ? `const item = await fromUuid("${item.uuid}"); if (item) game.jjk.actions.performAbility(item.actor, item);`
      : `const item = await fromUuid("${item.uuid}"); item?.use();`;
    let macro = game.macros.find(m => m.name === item.name && m.command === command);
    if (!macro) macro = await Macro.create({ name: item.name, type: "script", img: item.img, command });
    game.user.assignHotbarMacro(macro, slot);
  })();
  return false;
});
