import { SYSTEM_ID, GRADES, GRADE_ORDER, SAVES, SKILLS, VALUED_CONDITIONS, TOGGLE_CONDITIONS, DEFAULT_IMG } from "../config.mjs";
import { rollCheck, rollDamage, promptDamage, rollFlat } from "../dice.mjs";

const { DialogV2 } = foundry.applications.api;

export class JJKActor extends Actor {
  get isSorcerer() { return this.type === "sorcerer"; }

  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;
    if (!data.img) this.updateSource({ img: DEFAULT_IMG[this.type] ?? DEFAULT_IMG.sorcerer });
    if (this.type === "sorcerer") {
      this.updateSource({ "prototypeToken.actorLink": true, "prototypeToken.disposition": 1 });
      // Start at full HP and CE unless the creator set them explicitly.
      const s = this.system;
      const g = GRADES[s.grade] ?? GRADES.fledgling;
      if (foundry.utils.getProperty(data, "system.attributes.hp.value") === undefined) {
        this.updateSource({ "system.attributes.hp.value": g.hp + s.details.ancestryHP + s.attributes.hp.bonus });
      }
    }
    else this.updateSource({ "prototypeToken.disposition": -1 });
  }

  /* ---------- keep derived stats fresh when items change ---------- */
  // On v14 a create/update/delete of an embedded item doesn't re-run the actor's derived data, so the
  // tier counter, Cursed Attack/DC band, AC and the Promote button would go stale. Recompute first.

  _onCreateDescendantDocuments(...args) {
    this.prepareData();
    super._onCreateDescendantDocuments(...args);
  }

  _onUpdateDescendantDocuments(...args) {
    this.prepareData();
    super._onUpdateDescendantDocuments(...args);
  }

  _onDeleteDescendantDocuments(...args) {
    this.prepareData();
    super._onDeleteDescendantDocuments(...args);
  }

  /* ---------- modifiers ---------- */

  getSaveMod(key) {
    return this.isSorcerer ? this.system.saves[key].mod : this.system.saveMods[key].mod;
  }
  getPerceptionMod() { return this.system.attributes.perception.mod; }

  /* ---------- rolls ---------- */

  rollSave(key, { dc = null, prompt = true, dcLabel = "" } = {}) {
    return rollCheck({ actor: this, label: `${SAVES[key].label} Save`, modifier: this.getSaveMod(key), dc, prompt, dcLabel });
  }
  rollSkill(key, { prompt = true } = {}) {
    const label = key === "lore" ? (this.system.loreName || "Lore") : SKILLS[key].label;
    return rollCheck({ actor: this, label, modifier: this.system.skillMods[key].mod, prompt });
  }
  rollPerception({ prompt = true } = {}) {
    return rollCheck({ actor: this, label: "Perception", modifier: this.getPerceptionMod(), prompt });
  }

  /** A cursed strike / Strike using Cursed Attack. */
  rollCursedAttack(label = "Cursed Strike", { bonus = 0, prompt = true, flags = {} } = {}) {
    return rollCheck({ actor: this, label, modifier: this.system.cursedAttack.value + bonus, isAttack: true, prompt, flags });
  }

  /** Output damage: CE spent × technique die + key mod. */
  async rollOutputDamage(label = "Output Damage", { defaultCE = 1, damageType = "" } = {}) {
    const o = await promptDamage({ title: label, defaultCE });
    if (!o) return;
    return rollDamage({ actor: this, label, dice: o.ce + o.extra, die: this.system.techniqueDie, mod: this.system.keyMod, crit: o.crit, blackFlash: o.bf, damageType });
  }

  /** Reinforced Strike damage (Grade dice + key mod), optionally with a weapon's die size and stored charge. */
  async rollStrikeDamage(weapon = null) {
    const s = this.system;
    const o = await promptDamage({ title: weapon ? `${weapon.name} damage` : "Reinforced Strike damage", askCE: false });
    if (!o) return;
    if (weapon?.system?.formula) {
      const extra = o.extra ? ` + ${o.extra}${weapon.system.dieSize}` : "";
      return rollDamage({ actor: this, label: weapon.name, formula: `${weapon.system.formula}${extra}`, crit: o.crit, blackFlash: o.bf, damageType: weapon.system.damageType });
    }
    const count = (s.strike?.count || 2) + o.extra;
    const die = weapon?.system?.dieSize ?? s.strike?.die ?? "d6";
    const mod = (s.keyMod ?? 0) + (weapon?.system?.bonus ?? 0);
    const result = await rollDamage({ actor: this, label: weapon ? `${weapon.name}` : "Reinforced Strike", dice: count, die, mod, crit: o.crit, blackFlash: o.bf, damageType: weapon?.system?.damageType ?? "bludgeoning" });
    const charge = weapon?.system?.charge ?? 0;
    if (charge > 0) {
      await rollDamage({ actor: this, label: `${weapon.name}: stored charge`, dice: charge, die: s.techniqueDie, mod: 0, crit: o.crit, blackFlash: o.bf });
      await weapon.update({ "system.charge": 0 });
    }
    return result;
  }

  /* ---------- cursed energy ---------- */

  async spendCE(n, { reason = "" } = {}) {
    const ce = this.system.attributes.ce;
    if (n > ce.value) {
      ui.notifications.warn(`${this.name} has only ${ce.value} CE${reason ? ` for ${reason}` : ""}.`);
      return false;
    }
    await this.update({ "system.attributes.ce.value": ce.value - n });
    return true;
  }

  async gainCE(n) {
    const ce = this.system.attributes.ce;
    const max = ce.max ?? ce.value + n;
    await this.update({ "system.attributes.ce.value": Math.min(max, ce.value + n) });
  }

  async focusedFlow() {
    await this.gainCE(2);
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<div class="jjk-chat"><strong>Focused Flow</strong>: regains 2 CE.</div>` });
  }

  /** Full rest / 10-minute meditation: refill CE, clear composure and Pressure. */
  async reset() {
    const up = { "system.attributes.ce.value": this.system.attributes.ce.max, "system.attributes.domainActive": false };
    if (this.isSorcerer) Object.assign(up, { "system.attributes.composure": 0, "system.attributes.pressure": 0 });
    await this.update(up);
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<div class="jjk-chat"><strong>Reset</strong>: CE restored${this.isSorcerer ? ", composure and Pressure cleared" : ""}.</div>` });
  }

  /* ---------- damage ---------- */

  async applyDamage(amount, { reinforce = false } = {}) {
    const a = this.system.attributes;
    let dmg = Math.max(0, amount);
    let ce = a.ce.value;
    let note = "";
    if (reinforce && ce >= 1 && this.system.reinforcement > 0) {
      const cut = Math.min(dmg, this.system.reinforcement);
      dmg -= cut; ce -= 1;
      note = ` (Reinforcement −${cut}, 1 CE)`;
    }
    let temp = a.hp.temp;
    const fromTemp = Math.min(temp, dmg);
    temp -= fromTemp;
    const hp = Math.max(0, a.hp.value - (dmg - fromTemp));
    await this.update({ "system.attributes.hp.value": hp, "system.attributes.hp.temp": temp, "system.attributes.ce.value": ce });
    const drop = hp === 0 ? " — <strong>drops to 0 HP</strong>" : "";
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), whisper: game.users.filter(u => u.isGM).map(u => u.id), content: `<div class="jjk-chat">${this.name} takes <strong>${dmg}</strong> damage${note}${drop}.</div>` });
    if (hp === 0 && this.isSorcerer && this.system.hasPassenger) await this.adjustPressure(1, "dropped to 0 HP");
  }

  async applyHealing(amount) {
    const hp = this.system.attributes.hp;
    await this.update({ "system.attributes.hp.value": Math.min(hp.max, hp.value + Math.max(0, amount)) });
  }

  /* ---------- signature mechanics ---------- */

  async attemptBlackFlash() {
    if (!this.isSorcerer) return rollFlat({ actor: this, label: "Black Flash", dc: 8 });
    const comp = this.system.attributes.composure;
    const dc = Math.max(3, 8 - comp);
    const ok = await rollFlat({ actor: this, label: "Black Flash", dc });
    if (!ok) return;
    const gain = this.system.gradeRank;
    await this.update({ "system.attributes.composure": Math.min(6, comp + 1) });
    await this.gainCE(gain);
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="jjk-chat jjk-blackflash"><h3>⚫ BLACK FLASH</h3><p>Maximize the hit's damage dice, then double them for the critical (use the Black Flash box when rolling damage). ${this.name} regains <strong>${gain} CE</strong> and gains <strong>1 composure</strong>.</p></div>`
    });
  }

  async openDomain() {
    const ce = this.system.attributes.ce;
    if (ce.value < Math.ceil(ce.max / 2)) return ui.notifications.warn(`Opening a Domain needs at least half your CE pool (${Math.ceil(ce.max / 2)}).`);
    await this.update({ "system.attributes.ce.value": 0, "system.attributes.domainActive": true });
    const rank = this.system.gradeRank;
    const rounds = rank >= 7 ? 2 : 1;
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="jjk-chat jjk-domain"><h3>DOMAIN EXPANSION</h3><p>Spent ${ce.value} CE. The sure-hit lands on the slam and again at the start of each of ${this.name}'s turns for <strong>${rounds} more round${rounds > 1 ? "s" : ""}</strong>. Sure-hit damage uses <strong>${rank}${this.system.techniqueDie}</strong> + key mod. Higher-Grade foes take half and conditions −1.</p></div>`
    });
  }

  async endDomain() {
    await this.update({ "system.attributes.domainActive": false, "system.attributes.ce.value": 0, "system.conditions.fatigued": true });
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<div class="jjk-chat"><strong>Domain collapses.</strong> ${this.name} is fatigued at 0 CE until they Reset.</div>` });
  }

  async promote() {
    const idx = GRADE_ORDER.indexOf(this.system.grade);
    if (idx < 0 || idx >= GRADE_ORDER.length - 1) return ui.notifications.info("Already Special Grade.");
    const next = GRADE_ORDER[idx + 1];
    const ok = await DialogV2.confirm({ window: { title: "Promotion" }, content: `<p>Promote ${this.name} to <strong>${GRADES[next].label}</strong>? Their whole Grade Table row changes.</p>`, rejectClose: false });
    if (!ok) return;
    await this.update({ "system.grade": next });
    const max = this.system.attributes.hp.max;
    await this.update({ "system.attributes.hp.value": max, "system.attributes.ce.value": this.system.attributes.ce.max });
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<div class="jjk-chat jjk-promote"><h3>Promoted to ${GRADES[next].label}</h3><p>New Grade Table row applied. Cursed Attack and Technique DC reset to the bottom of the new band.</p></div>` });
  }

  async adjustPressure(delta, reason = "") {
    const p = Math.max(0, Math.min(10, this.system.attributes.pressure + delta));
    await this.update({ "system.attributes.pressure": p });
    if (delta > 0) {
      const warn = p >= 10 ? " <strong>The passenger takes control for the rest of the encounter.</strong>" : p >= 5 ? ` Takeover saves begin (Will DC ${this.system.takeoverDC}).` : "";
      ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<div class="jjk-chat jjk-pressure">Pressure +${delta} → <strong>${p}</strong>${reason ? ` (${reason})` : ""}.${warn}</div>` });
    }
  }

  async rollTakeover() {
    const result = await this.rollSave("will", { dc: this.system.takeoverDC, prompt: false, dcLabel: "Passenger" });
    if (result && result.degree <= 1) {
      ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<div class="jjk-chat jjk-pressure"><strong>The passenger takes control</strong> until the end of this turn. The GM runs ${this.name}.</div>` });
    }
  }

  /* ---------- conditions → token status icons ---------- */

  async _onUpdate(changed, options, userId) {
    await super._onUpdate(changed, options, userId);
    if (userId !== game.user.id) return;
    const cond = changed.system?.conditions;
    if (!cond) return;
    for (const [key, value] of Object.entries(cond)) {
      if (!(key in VALUED_CONDITIONS) && !(key in TOGGLE_CONDITIONS)) continue;
      const active = typeof value === "boolean" ? value : value > 0;
      try { await this.toggleStatusEffect(key, { active }); } catch (err) { console.warn(`${SYSTEM_ID} | status sync failed for ${key}`, err); }
    }
  }
}
