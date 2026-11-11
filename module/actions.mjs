/**
 * One-click actions (the Attacks tab, card buttons and hotbar macros all come through here).
 *
 * Clicking an action does the bookkeeping for you:
 *  - works out the CE cost (asking only when the card lets you choose how much), pays it, adds Pressure;
 *  - rolls the attack with the right multiple attack penalty, or rolls every target's save against your DC;
 *  - on a hit rolls the damage (doubled on a crit), tries a Black Flash on a crit from Grade 4 up and, if it
 *    sparks, maximizes the damage, refunds CE and adds composure;
 *  - gives each target its own Apply button (players' clicks on enemies are applied by the GM);
 *  - updates the technique's own resources (Debt, Strain, charges…) through module/resources.mjs.
 */
import { SYSTEM_ID, SAVES, degreeOfSuccess, DEGREE_LABELS } from "./config.mjs";
import { rollCheck, rollFlat } from "./dice.mjs";
import { request, gmHandlers, refusal } from "./shop.mjs";
import { resourceHooks } from "./resources.mjs";

const { DialogV2 } = foundry.applications.api;
const esc = s => foundry.utils.escapeHTML?.(String(s)) ?? String(s);
const signed = n => (n >= 0 ? `+${n}` : `${n}`);

/* ---------- cost ---------- */

/** Evaluate "Grade Rank + 2", "your key modifier", "3" … against an actor. Returns null if it can't. */
function evalCostExpr(expr, actor) {
  const s = actor.system;
  let e = String(expr).toLowerCase()
    .replace(/\(|\)/g, m => m)
    .replace(/your\s+/g, "")
    .replace(/grade rank|grade number/g, String(s.gradeRank ?? 1))
    .replace(/key (ability )?(modifier|mod)/g, String(s.keyMod ?? 0))
    .replace(/technique die/g, "0");
  e = e.replace(/[^0-9+\-*/(). ]/g, "").trim();
  if (!e) return null;
  try { const v = Function(`"use strict"; return (${e});`)(); return Number.isFinite(v) ? Math.floor(v) : null; } catch { return null; }
}

/** { min, max, fixed } CE for a card. */
export function costRange(actor, item) {
  const s = item.system;
  const pool = actor.system.attributes?.ce?.max ?? 0;
  const text = s.costText ?? "";
  const range = text.match(/^(\d+)\s*(?:to|–|-)\s*(.+?)\s*CE\b/i);
  if (range) return { min: Number(range[1]), max: evalCostExpr(range[2], actor) ?? pool, fixed: false };
  const plus = text.match(/^(\d+)\+\s*CE\b/i);
  if (plus) return { min: Number(plus[1]), max: pool, fixed: false };
  if (Number.isFinite(s.ce)) return { min: s.ce, max: s.ce, fixed: true };
  return { min: 0, max: 0, fixed: true };
}

async function askCE({ title, min, max, extra = "" }) {
  try {
    return await DialogV2.prompt({
      window: { title },
      content: `<div class="jjk-dialog"><div class="form-group"><label>CE to spend (${min}–${max})</label>
        <input type="number" name="ce" value="${min}" min="${min}" max="${max}" autofocus></div>${extra}</div>`,
      ok: { label: "Go", callback: (e, b) => Object.fromEntries([...new FormData(b.form)].map(([k, v]) => [k, v])) },
      rejectClose: false
    });
  } catch { return null; }
}

/* ---------- targets ---------- */

const userTargets = () => [...game.user.targets].map(t => t.actor).filter(Boolean);

/* ---------- damage ---------- */

/** Roll damage and post one card with an Apply row per target (or generic Apply buttons with no targets). */
async function postDamage({ actor, label, formula, crit = false, bf = false, damageType = "", targets = [], perTarget = null, note = "" }) {
  const roll = await new Roll(formula).evaluate({ maximize: bf });
  const doubled = crit || bf;
  const total = doubled ? roll.total * 2 : roll.total;
  const tag = bf ? "Black Flash: maximized and doubled" : crit ? "Critical: doubled" : "";
  let rows = "";
  if (targets.length) {
    rows = targets.map(t => {
      const amt = perTarget ? perTarget(t, total) : total;
      return `<div class="jjk-target-row"><span>${esc(t.name)}${perTarget?.label ? ` <em>${esc(perTarget.label(t))}</em>` : ""}</span>
        <strong>${amt}</strong>
        <button type="button" data-jjk-action="applyTo" data-target-uuid="${t.uuid}" data-amount="${amt}">Apply</button>
        <button type="button" data-jjk-action="applyTo" data-target-uuid="${t.uuid}" data-amount="${Math.floor(amt / 2)}">½</button></div>`;
    }).join("");
  }
  const content = `<div class="jjk-chat jjk-damage"><header><h3>${esc(label)}</h3></header>
    <div class="jjk-sub">${esc(formula)}${damageType ? ` ${esc(damageType)}` : ""}${tag ? ` · <strong>${tag}</strong>` : ""}</div>
    ${await roll.render()}
    <div class="jjk-total">Total damage: <strong>${total}</strong></div>${note ? `<div class="jjk-sub">${note}</div>` : ""}
    ${rows ? `<div class="jjk-targets">${rows}</div>` : `<div class="jjk-buttons">
      <button type="button" data-jjk-action="applyDamage" data-amount="${total}">Apply</button>
      <button type="button" data-jjk-action="applyDamage" data-amount="${Math.floor(total / 2)}">Half</button>
      <button type="button" data-jjk-action="applyDamage" data-amount="${total * 2}">Double</button>
      <button type="button" data-jjk-action="applyHealing" data-amount="${total}">Heal</button></div>`}</div>`;
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls: [roll], flags: { [SYSTEM_ID]: { actorUuid: actor.uuid, damage: total } } });
  return total;
}

/** On a crit from Grade 4 up: roll the Black Flash flat check automatically. Returns true if it sparked. */
async function tryBlackFlash(actor, degree) {
  if (degree !== 3 || actor.type !== "sorcerer" || (actor.system.gradeRank ?? 1) < 2) return false;
  return !!(await actor.attemptBlackFlash());
}

/* ---------- strikes ---------- */

/** Reinforced Strike (weapon = null) or a weapon Strike, fully resolved. */
export async function performStrike(actor, weapon = null, { map = 0, prompt = false } = {}) {
  const targets = userTargets();
  const flags = { auto: true };
  const r = weapon ? await actor.rollWeaponAttack(weapon, { prompt, map, flags }) : await actor.rollCursedAttack("Reinforced Strike", { prompt, map, flags });
  if (!r) return;
  if (r.degree !== null && r.degree < 2) return;   // miss
  const s = actor.system;
  const bf = await tryBlackFlash(actor, r.degree);
  const crit = r.degree === 3;
  let formula;
  if (weapon?.system?.formula) formula = weapon.system.formula;
  else {
    const count = s.strike?.count || 2;
    const die = weapon?.system?.dieSize ?? s.strike?.die ?? "d6";
    formula = `${count}${die} + ${(s.keyMod ?? 0) + (weapon?.system?.bonus ?? 0)}`;
  }
  const name = weapon?.name ?? "Reinforced Strike";
  await postDamage({ actor, label: name, formula, crit, bf, damageType: weapon?.system?.damageType ?? "bludgeoning", targets: targets.slice(0, 1) });
  const charge = weapon?.system?.charge ?? 0;
  if (charge > 0) {
    await postDamage({ actor, label: `${name}: stored charge`, formula: `${charge}${s.techniqueDie}`, crit, bf, targets: targets.slice(0, 1) });
    await weapon.update({ "system.charge": 0 });
  }
  await resourceHooks.afterStrike?.(actor, { weapon, degree: r.degree, targets });
}

/* ---------- technique cards ---------- */

/** Use a technique / path card: pay, roll, damage, resources. */
export async function performAbility(actor, item, { map = 0, prompt = false } = {}) {
  const s = item.system;
  if (s.isDomain || s.allPool) return actor.openDomain(item);
  const targets = userTargets();
  const hook = resourceHooks.forCard(actor, item);

  // 1. Cost.
  const range = costRange(actor, item);
  let spend = range.min;
  let form = {};
  if (!range.fixed || hook?.wantsAsk) {
    const res = await askCE({ title: item.name, min: range.min, max: Math.max(range.min, range.max), extra: hook?.ask?.(actor, item) ?? "" });
    if (!res) return;
    form = res;
    spend = Math.max(range.min, Math.min(Number(res.ce ?? range.min) || range.min, Math.max(range.min, range.max)));
  }
  const before = await hook?.beforePay?.(actor, item, { spend, form, targets });
  if (before === false) return;
  const borrowed = before?.borrowed ?? 0;
  const pay = game.jjk.domain.amplifiedCost(actor, item, Math.max(0, spend - borrowed)) + (before?.extraCost ?? 0);
  if (pay > 0 && !(await actor.spendCE(pay, { reason: item.name }))) return;

  // 2. The card itself (rules text + manual buttons) and Pressure.
  await item.use({ spent: spend, borrowed });
  if (s.pressure) await actor.adjustPressure(s.pressure, item.name);

  const dice = spend;          // output damage: CE spent (borrowed counts) × technique die
  const die = game.jjk.domain.amplifiedDie(actor);
  const keyMod = actor.system.keyMod ?? 0;
  const extraDice = hook?.extraDice?.(actor, item, targets) ?? 0;
  // Curse stat-block actions carry a fixed damage formula; technique cards use output damage.
  const fixed = s.damage?.trim();
  const hasDamage = !!fixed || (s.usesOutput && dice + extraDice > 0);
  const outputFormula = () => fixed || `${Math.max(0, dice + extraDice)}${die} + ${keyMod}`;
  const damageType = s.damageType ?? "";

  // 3. Resolve.
  if (s.resolution === "attack") {
    const r = await actor.rollCursedAttack(item.name, { prompt, map, agile: /\bagile\b/i.test(s.traits), flags: { auto: true } });
    if (!r) return;
    const hit = r.degree === null || r.degree >= 2;
    if (hit && hasDamage) {
      const bf = await tryBlackFlash(actor, r.degree);
      await postDamage({ actor, label: item.name, formula: outputFormula(), crit: r.degree === 3, bf, damageType, targets: targets.slice(0, 1) });
    }
    await hook?.after?.(actor, item, { spend, borrowed, form, targets, degree: r.degree, hit });
    return;
  }
  if (s.resolution === "save") {
    const dc = s.dc ?? actor.system.techniqueDC?.value ?? 10;
    const degrees = new Map();
    for (const t of targets) {
      const r = await t.rollSave(s.save, { dc, prompt: false, dcLabel: item.name });
      degrees.set(t.uuid, r?.degree ?? 1);
    }
    if (hasDamage) {
      const BASIC = [2, 1, 0.5, 0];
      // Basic save: double / full / half / none. Otherwise the card's damage lands only on a failure.
      const perTarget = Object.assign(
        (t, total) => { const dg = degrees.get(t.uuid) ?? 1; return s.basicSave ? Math.floor(total * BASIC[dg]) : (s.damageAlways || dg <= 1 ? total : 0); },
        { label: t => DEGREE_LABELS[degrees.get(t.uuid) ?? 1] });
      await postDamage({ actor, label: item.name, formula: outputFormula(), damageType, targets, perTarget: targets.length ? perTarget : null,
        note: `${s.basicSave ? "Basic " : ""}${SAVES[s.save].label} save vs DC ${dc}${s.basicSave ? "" : s.damageAlways ? " (damage either way)" : " (damage on a failure)"}.` });
    }
    await hook?.after?.(actor, item, { spend, borrowed, form, targets, degrees });
    return;
  }
  if (hasDamage) await postDamage({ actor, label: item.name, formula: outputFormula(), damageType, targets: targets.slice(0, 1) });
  await hook?.after?.(actor, item, { spend, borrowed, form, targets });
}

/* ---------- applying damage to someone you don't own ---------- */

export async function applyTo(targetUuid, amount) {
  const doc = await fromUuid(targetUuid);
  const target = doc?.actor ?? doc;
  if (!target) return ui.notifications.warn("That target is gone.");
  if (target.isOwner) {
    let reinforce = false;
    if ((target.system.attributes?.ce?.value ?? 0) > 0 && target.system.reinforcement > 0 && target.type === "sorcerer") {
      reinforce = await DialogV2.confirm({ window: { title: "Reinforcement" }, content: `<p>${esc(target.name)}: spend 1 CE to reduce the damage by Reinforcement?</p>`, rejectClose: false }) ?? false;
    }
    // Curses use their Reinforcement automatically, the same as when the GM applies it for a player.
    return target.applyDamage(amount, { reinforce: target.type === "sorcerer" ? reinforce : true });
  }
  return request("applyDamageTo", { targetUuid, amount });
}

export function registerActions() {
  gmHandlers.applyDamageTo = async msg => {
    const doc = await fromUuid(msg.targetUuid);
    const target = doc?.actor ?? doc;
    if (!target) throw refusal("That target is gone.");
    // Curses use their Reinforcement automatically (as with Domain pulses); PCs decide on their own clients.
    await target.applyDamage(Number(msg.amount) || 0, { reinforce: target.type !== "sorcerer" });
  };
}
