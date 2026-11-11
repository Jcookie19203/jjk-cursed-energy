import { SYSTEM_ID, GRADES, ACTION_GLYPH, SAVES, DEFAULT_IMG } from "../config.mjs";

const esc = s => foundry.utils.escapeHTML?.(String(s)) ?? String(s);
const TextEditorImpl = () => foundry.applications.ux.TextEditor.implementation;

export class JJKItem extends Item {
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;
    if (!data.img) this.updateSource({ img: DEFAULT_IMG[this.type] ?? "icons/svg/item-bag.svg" });
  }

  /** Ancestry/background dropped on a sorcerer fill in their details. */
  async _onCreate(data, options, userId) {
    await super._onCreate(data, options, userId);
    if (userId !== game.user.id || this.parent?.type !== "sorcerer") return;
    if (this.type === "ancestry") {
      // Shift current HP by the change in ancestry HP so a full-HP character stays full.
      const a = this.parent.system;
      const delta = (this.system.hp ?? 0) - a.details.ancestryHP;
      const hp = Math.max(0, (this.parent._source.system.attributes.hp.value ?? a.attributes.hp.value) + delta);
      await this.parent.update({ "system.details.ancestry": this.name, "system.details.ancestryHP": this.system.hp, "system.attributes.speed": this.system.speed, "system.attributes.hp.value": hp });
    } else if (this.type === "background") {
      await this.parent.update({ "system.details.background": this.name });
    }
  }

  /** Post this item to chat with roll buttons. */
  /**
   * @param {object} [o]
   * @param {number} [o.spent]  Set when an automated action already paid: the card then shows what was paid
   *                            and drops the manual Pay / roll buttons (the action rolls those itself).
   */
  async use({ spent = null, borrowed = 0 } = {}) {
    const actor = this.actor;
    const s = this.system;
    const auto = spent !== null;
    const enriched = await TextEditorImpl().enrichHTML(s.description ?? "", { relativeTo: this, secrets: this.isOwner });
    const buttons = [];
    let meta = "";

    if (this.type === "ability" && auto) {
      const glyph = ACTION_GLYPH[s.actions] ?? "";
      const paid = `${spent} CE${borrowed ? ` (${borrowed} borrowed)` : ""}`;
      meta = [glyph, paid, s.range, s.pressure ? `Pressure +${s.pressure}` : ""].filter(Boolean).map(esc).join(" · ");
    } else if (this.type === "ability") {
      const glyph = ACTION_GLYPH[s.actions] ?? "";
      meta = [glyph, s.costText || (s.ce !== null ? `${s.ce} CE` : ""), s.range, s.pressure ? `Pressure +${s.pressure}` : ""].filter(Boolean).map(esc).join(" · ");
      if (s.ce || s.allPool) buttons.push(`<button type="button" data-jjk-action="payCE" data-ce="${s.allPool ? -1 : s.ce}">${s.allPool ? "Spend all CE" : `Pay ${s.ce} CE`}</button>`);
      if (s.isDomain) buttons.push(`<button type="button" data-jjk-action="openDomain">Open Domain</button>`);
      if (s.resolution === "attack") buttons.push(`<button type="button" data-jjk-action="attack">Cursed Strike</button>`);
      if (s.resolution === "save" && actor) {
        const dc = s.dc ?? actor.system.techniqueDC?.value;
        buttons.push(`<button type="button" data-jjk-action="requestSave" data-save="${s.save}" data-dc="${dc}" data-basic="${s.basicSave ? 1 : 0}">${SAVES[s.save].label} DC ${dc}${s.basicSave ? " (basic)" : ""}</button>`);
      }
      if (s.usesOutput) buttons.push(`<button type="button" data-jjk-action="outputDamage" data-ce="${s.ce ?? 1}">Output Damage</button>`);
      if (s.pressure) buttons.push(`<button type="button" data-jjk-action="pressure" data-amount="${s.pressure}">Add ${s.pressure} Pressure</button>`);
    } else if (this.type === "weapon") {
      meta = [s.range, s.damageType, s.traits, s.cursedTool ? `charge ${s.charge}` : ""].filter(Boolean).map(esc).join(" · ");
      buttons.push(`<button type="button" data-jjk-action="attack">Strike</button>`);
      buttons.push(`<button type="button" data-jjk-action="strikeDamage">Damage</button>`);
      if (s.cursedTool) buttons.push(`<button type="button" data-jjk-action="chargeTool">Charge (1 CE)</button>`);
    } else if (this.type === "vow") {
      meta = `${esc(s.kind)} vow · ${esc(s.weight)}${s.broken ? " · <strong>BROKEN</strong>" : ""}`;
    }

    const tier = this.type === "ability" ? `<div class="jjk-tier">${esc(s.technique)} · ${esc(GRADES[s.tier]?.label ?? "")}${s.universal ? " · Universal" : ""}</div>` : "";
    const traits = (s.traitList ?? String(s.traits ?? "").split(",").map(t => t.trim()).filter(Boolean)).map(t => `<span class="jjk-trait">${esc(t)}</span>`).join("");
    const content = `<div class="jjk-chat jjk-card">
      <header><img src="${this.img}" alt=""><h3>${esc(this.name)}</h3></header>
      ${tier}${meta ? `<div class="jjk-sub">${meta}</div>` : ""}
      ${traits ? `<div class="jjk-traits">${traits}</div>` : ""}
      <div class="jjk-desc">${enriched}</div>
      ${buttons.length ? `<div class="jjk-buttons">${buttons.join("")}</div>` : ""}</div>`;

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      flags: { [SYSTEM_ID]: { actorUuid: actor?.uuid, itemUuid: this.uuid } }
    });
  }
}
