import { SYSTEM_ID, GRADES, GRADE_ORDER, ACTIONS, RESOLUTION, LADDERS, SAVES } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
const TextEditorImpl = () => foundry.applications.ux.TextEditor.implementation;

export const DOMAIN_AMPLIFY = { half: "Default: costs halved, die +1 step", minus1: "Costs 1 less CE", card: "Card's own rule (no automatic change)" };

export class JJKItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["jjk", "sheet", "item"],
    position: { width: 560, height: 640 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: { use: JJKItemSheet.#use }
  };
  static PARTS = { sheet: { template: `systems/${SYSTEM_ID}/templates/item/item-sheet.hbs`, scrollable: [".jjk-item-body"] } };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.document;
    context.item = item;
    context.system = item.system;
    context.source = item.system._source ?? item._source.system;
    context.editable = this.isEditable;
    context.isType = Object.fromEntries(["ability", "weapon", "armor", "gear", "vow", "ancestry", "background"].map(t => [t, item.type === t]));
    context.gradeOptions = Object.fromEntries(GRADE_ORDER.map(k => [k, GRADES[k].label]));
    context.actionOptions = ACTIONS;
    context.resolutionOptions = RESOLUTION;
    context.ladderOptions = LADDERS;
    context.saveOptions = Object.fromEntries(Object.entries(SAVES).map(([k, v]) => [k, v.label]));
    context.domainAmplifyOptions = DOMAIN_AMPLIFY;
    context.dieOptions = { d4: "d4", d6: "d6", d8: "d8", d10: "d10", d12: "d12" };
    context.armorOptions = { unarmored: "Unarmored", light: "Light", medium: "Medium", heavy: "Heavy" };
    context.sizeOptions = { tiny: "Tiny", small: "Small", medium: "Medium", large: "Large" };
    context.vowKindOptions = { self: "Self-vow", mutual: "Mutual vow" };
    context.vowWeightOptions = { minor: "Minor", moderate: "Moderate", major: "Major", severe: "Severe / Permanent" };
    context.typeLabel = game.i18n.localize(`TYPES.Item.${item.type}`);
    context.enrichedDescription = await TextEditorImpl().enrichHTML(item.system.description ?? "", { relativeTo: item, secrets: item.isOwner });
    return context;
  }

  static #use() { this.document.use(); }
}
