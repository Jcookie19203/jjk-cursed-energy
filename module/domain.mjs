/**
 * Domain Expansion, automated (Core Rules IV).
 *
 * Opening a Domain spends the whole CE pool, draws the barrier on the map, settles any Domain Clash, and lands
 * the sure hit on every enemy inside: on the slam and again at the start of each of the caster's turns, for
 * the slam + 1 round (Grade 1) or + 2 rounds (Special Grade). Then it collapses and the caster is fatigued at
 * 0 CE until they Reset. Simple Domain and Domain Amplification counters, the incapacitation rule, barrier
 * damage and the amplified costs inside are all handled here.
 *
 * Everything that touches other people's tokens runs on the active GM's client (via the shop socket).
 */
import { SYSTEM_ID, GRADES, VALUED_CONDITIONS, TOGGLE_CONDITIONS } from "./config.mjs";
import { request, refusal, gmHandlers } from "./shop.mjs";

const { DialogV2 } = foundry.applications.api;
const esc = s => foundry.utils.escapeHTML?.(String(s)) ?? String(s);
const DIE_STEPS = ["d4", "d6", "d8", "d10", "d12"];
const isActiveGM = () => (game.users.activeGM ? game.users.activeGM.isSelf : game.user.isGM);
const rankOf = actor => actor?.system?.gradeRank ?? GRADES[actor?.system?.grade]?.rank ?? 0;

/* ---------- reading a Domain ---------- */

/** "stunned 1, off-guard" → [{ key, value, valued }]. Unknown words are ignored. */
export function parseConditions(text) {
  const out = [];
  for (const part of String(text ?? "").split(",")) {
    const m = part.trim().toLowerCase().match(/^([a-z-]+)\s*(\d+)?$/);
    if (!m) continue;
    const key = m[1] === "off-guard" ? "offGuard" : m[1];
    if (key in VALUED_CONDITIONS) out.push({ key, value: Number(m[2] ?? 1), valued: true });
    else if (key in TOGGLE_CONDITIONS) out.push({ key, value: 1, valued: false });
  }
  return out;
}

/** The Domain an actor would open: its own Domain card (sorcerers) or its stat block (curses). */
export function domainSource(actor, itemId = null) {
  if (actor.type === "curse") return { name: actor.system.domainName || `${actor.name}'s Domain`, cfg: actor.system.domain, item: null };
  const item = (itemId && actor.items.get(itemId)) || actor.items.find(i => i.type === "ability" && i.system.isDomain);
  return { name: item?.name ?? "Domain Expansion", cfg: item?.system.domain ?? null, item };
}

/** The sure-hit damage formula for this caster, or "" for none. */
export function sureHitFormula(actor, cfg) {
  const d = String(cfg?.damage ?? "").trim();
  if (!d) return "";
  if (d === "output") {
    const s = actor.system;
    return `${rankOf(actor)}${s.techniqueDie} + ${s.keyMod ?? 0}`;
  }
  return d;
}

export const activeDomain = actor => actor?.getFlag?.(SYSTEM_ID, "domain") ?? null;

/* ---------- amplified technique inside your own Domain ---------- */

/** CE cost of a card while its user's Domain is up (Core Rules IV §2: halved, unless the card says otherwise). */
export function amplifiedCost(actor, item, n) {
  const st = activeDomain(actor);
  if (!st || !item || item.type !== "ability" || item.system.isDomain || !(n > 0)) return n;
  if (st.technique && item.system.technique && item.system.technique !== st.technique) return n;
  if (st.amplify === "half") return Math.max(1, Math.ceil(n / 2));
  if (st.amplify === "minus1") return Math.max(1, n - 1);
  return n;
}

/** Output die while the Domain is up: one step larger with the default amplify. */
export function amplifiedDie(actor) {
  const die = actor.system.techniqueDie;
  const st = activeDomain(actor);
  if (!st || st.amplify !== "half") return die;
  const i = DIE_STEPS.indexOf(die);
  return i >= 0 ? DIE_STEPS[Math.min(i + 1, DIE_STEPS.length - 1)] : die;
}

/* ---------- geometry ---------- */

function casterToken(actor) {
  if (actor.token) return actor.token;
  const viewed = actor.getActiveTokens?.(false, true)?.[0];
  if (viewed) return viewed;
  for (const scene of [game.scenes.active, ...game.scenes]) {
    const t = scene?.tokens.find(t => t.actorId === actor.id && t.actorLink);
    if (t) return t;
  }
  return null;
}
function centerOf(token) {
  const size = token.parent.grid.size;
  return { x: token.x + (token.width * size) / 2, y: token.y + (token.height * size) / 2 };
}
/** Distance in scene units (ft) between two pixel points. */
function distance(scene, a, b) {
  return (Math.hypot(a.x - b.x, a.y - b.y) / scene.grid.size) * scene.grid.distance;
}
function isEnemy(casterDisp, disp) {
  if (casterDisp === 1) return disp === -1;
  if (casterDisp === -1) return disp === 1;
  return disp === 1 || disp === -1;
}

/** Every enemy creature inside the barrier (by token position), or the saved targets if there's no map. */
async function enemiesInside(actor, st) {
  if (!st.sceneId) return (await Promise.all((st.targetUuids ?? []).map(u => fromUuid(u)))).map(t => t?.actor ?? t).filter(Boolean);
  const scene = game.scenes.get(st.sceneId);
  if (!scene) return [];
  const out = [];
  for (const t of scene.tokens) {
    const a = t.actor;
    if (!a || a.uuid === actor.uuid) continue;
    if (!isEnemy(st.disposition, t.disposition)) continue;
    if ((a.system.attributes?.hp?.value ?? 0) <= 0) continue;
    const reach = st.radius + Math.max(0, (t.width - 1) * scene.grid.distance) / 2;
    if (distance(scene, centerOf(t), st.center) <= reach + 0.01) out.push(a);
  }
  return out;
}

async function drawBarrier(scene, st, color) {
  try {
    const radius = (st.radius / scene.grid.distance) * scene.grid.size;
    const [region] = await scene.createEmbeddedDocuments("Region", [{
      name: st.name, color,
      shapes: [{ type: "circle", x: st.center.x, y: st.center.y, radius, hole: false }],
      visibility: CONST.REGION_VISIBILITY?.ALWAYS ?? 2
    }]);
    return region?.id ?? null;
  } catch (err) {
    console.warn(`${SYSTEM_ID} | couldn't draw the Domain barrier`, err);
    return null;
  }
}

/* ---------- client entry points ---------- */

/** Open a Domain (from the sheet or a Domain card). Runs on the GM's client. */
export async function openDomain(actor, item = null) {
  if (!actor?.isOwner) return ui.notifications.warn(`You don't control ${actor?.name}.`);
  if (activeDomain(actor)) return ui.notifications.warn(`${actor.name}'s Domain is already open.`);
  const ce = actor.system.attributes.ce;
  const min = Math.ceil(ce.max / 2);
  if (ce.value < min) return ui.notifications.warn(`Opening a Domain needs at least half your CE pool (${min}); ${actor.name} has ${ce.value}.`);
  if (actor.type === "sorcerer" && rankOf(actor) < 6 && !game.user.isGM) return ui.notifications.warn("Domain Expansion opens at Grade 1.");
  const targetUuids = [...game.user.targets].map(t => t.document.uuid);
  return request("domainOpen", { actorUuid: actor.uuid, itemId: item?.id ?? null, targetUuids });
}

export const collapseDomain = actor => request("domainEnd", { actorUuid: actor.uuid });
export const pulseNow = actor => request("domainPulse", { actorUuid: actor.uuid });

/** Brute force: damage the barrier (Hardness = caster's Reinforcement ×2, HP = max CE ×3). */
export async function hitBarrier(actor) {
  let amount;
  try {
    amount = await DialogV2.prompt({
      window: { title: `Attack the barrier: ${activeDomain(actor)?.name ?? "Domain"}` },
      content: `<div class="jjk-dialog"><p class="hint">Spend your whole turn ([3]) striking the barrier itself. Roll your damage, then enter the total here; the barrier's Hardness is taken off.</p>
        <div class="form-group"><label>Damage dealt</label><input type="number" name="amount" value="0" min="0"></div></div>`,
      ok: { label: "Hit it", callback: (e, b) => Number(b.form.elements.amount.value) || 0 },
      rejectClose: false
    });
  } catch { return; }
  if (amount > 0) return request("domainBarrier", { actorUuid: actor.uuid, amount });
}

/** Simple Domain / Falling Blossom (sustained) and Domain Amplification (until your next turn). */
export async function setCounter(actor, key, on) {
  if (!actor?.isOwner) return;
  await actor.setFlag(SYSTEM_ID, `counters.${key}`, !!on);
}

/** After a sure hit: a PC may spend 1 CE to cut the damage by their Reinforcement. */
export async function reinforceAfter(actor, amount, messageId) {
  if (!actor?.isOwner) return ui.notifications.warn(`You don't control ${actor?.name}.`);
  if (actor.getFlag(SYSTEM_ID, "reinforcedPulse") === messageId) return ui.notifications.warn(`${actor.name} already reinforced against this pulse.`);
  if ((actor.system.attributes.ce.value ?? 0) < 1) return ui.notifications.warn(`${actor.name} has no CE to reinforce with.`);
  const cut = Math.min(amount, actor.system.reinforcement ?? 0);
  if (cut <= 0) return;
  await actor.update({ "system.attributes.ce.value": actor.system.attributes.ce.value - 1, [`flags.${SYSTEM_ID}.reinforcedPulse`]: messageId });
  await actor.applyHealing(cut);
  ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="jjk-chat">${esc(actor.name)} reinforces against the sure hit: <strong>−${cut}</strong> damage (1 CE).</div>` });
}

/* ---------- GM side ---------- */

async function resolveCaster(msg, { owner = true } = {}) {
  const user = game.users.get(msg.userId);
  const doc = await fromUuid(msg.actorUuid);
  const actor = doc?.actor ?? doc;
  if (!user || !actor) throw refusal("That caster no longer exists.");
  if (owner && !actor.testUserPermission(user, "OWNER")) throw refusal(`You don't control ${actor.name}.`);
  return { user, actor };
}

async function doOpen(msg) {
  const { actor } = await resolveCaster(msg);
  if (activeDomain(actor)) throw refusal(`${actor.name}'s Domain is already open.`);
  const ce = actor.system.attributes.ce;
  if (ce.value < Math.ceil(ce.max / 2)) throw refusal(`${actor.name} needs at least half their CE pool to open a Domain.`);

  const src = domainSource(actor, msg.itemId);
  const cfg = src.cfg ?? { radius: 20, damage: "output", damageType: "", conditions: "", effect: "", amplify: "half", rounds: null, hardness: null, barrierHP: null };
  const rank = rankOf(actor);
  const token = casterToken(actor);
  const radius = rank >= 7 && (cfg.radius ?? 20) <= 20 ? 30 : (cfg.radius || 20);
  const barrierMax = cfg.barrierHP ?? ce.max * 3;
  const st = {
    name: src.name, itemId: src.item?.id ?? null, technique: src.item?.system.technique ?? "",
    sceneId: token?.parent?.id ?? null, center: token ? centerOf(token) : null, radius,
    disposition: token?.disposition ?? (actor.hasPlayerOwner ? 1 : -1),
    targetUuids: token ? [] : msg.targetUuids ?? [],
    pulsesLeft: cfg.rounds ?? (rank >= 7 ? 2 : 1),
    barrierHP: barrierMax, barrierMax, hardness: cfg.hardness ?? (actor.system.reinforcement ?? 0) * 2,
    damage: sureHitFormula(actor, cfg), damageType: cfg.damageType ?? "", conditions: cfg.conditions ?? "",
    effect: cfg.effect ?? "", amplify: cfg.amplify ?? "half", dc: actor.system.techniqueDC?.value ?? 20, rank,
    regionId: null, spent: ce.value
  };
  await actor.update({ "system.attributes.ce.value": 0, "system.attributes.domainActive": true });
  if (st.sceneId) st.regionId = await drawBarrier(game.scenes.get(st.sceneId), st, actor.hasPlayerOwner ? "#5b2a86" : "#8a1c1c");
  await actor.setFlag(SYSTEM_ID, "domain", st);

  const where = st.sceneId ? `a ${radius}-ft burst` : `${st.targetUuids.length} targeted creature(s) (no token on the map)`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="jjk-chat jjk-domain"><h3>DOMAIN EXPANSION: ${esc(st.name.replace(/^Domain Expansion:\s*/i, ""))}</h3>
      <p>${esc(actor.name)} pours <strong>${st.spent} CE</strong> into ${where}. The barrier is sealed: nobody leaves by normal movement.</p>
      <p class="jjk-sub">Sure hit on the slam and at the start of each of ${esc(actor.name)}'s turns for ${st.pulsesLeft} more round${st.pulsesLeft === 1 ? "" : "s"}.
      ${st.damage ? `Damage ${esc(st.damage)}${st.damageType ? ` ${esc(st.damageType)}` : ""}.` : ""} ${st.conditions ? `Conditions: ${esc(st.conditions)}.` : ""}
      Barrier: Hardness ${st.hardness}, HP ${st.barrierMax}.</p>
      <div class="jjk-buttons"><button type="button" data-jjk-action="domainBarrier">Attack the barrier</button><button type="button" data-jjk-action="domainEnd">Collapse</button></div></div>`,
    flags: { [SYSTEM_ID]: { actorUuid: actor.uuid } }
  });

  // Domain Clash: another open Domain overlapping this one.
  const rivals = [];
  for (const other of openCasters()) {
    if (other.uuid === actor.uuid) continue;
    const os = activeDomain(other);
    if (!os || !st.sceneId || os.sceneId !== st.sceneId) continue;
    if (distance(game.scenes.get(st.sceneId), os.center, st.center) < os.radius + st.radius) rivals.push(other);
  }
  for (const rival of rivals) {
    const survived = await clash(actor, rival);
    if (survived !== actor) return;
  }
  await pulse(actor, { slam: true });
}

/** Every actor (linked or token) with an open Domain on any scene. */
function openCasters() {
  const seen = new Map();
  for (const a of game.actors) if (activeDomain(a)) seen.set(a.uuid, a);
  for (const scene of game.scenes) for (const t of scene.tokens) if (t.actor && activeDomain(t.actor)) seen.set(t.actor.uuid, t.actor);
  return [...seen.values()];
}

/** Each caster rolls d20 + Technique DC − 10; the higher Domain overwrites the other. Returns the survivor. */
async function clash(a, b) {
  const ra = await new Roll(`1d20 + ${(a.system.techniqueDC?.value ?? 20) - 10}`).evaluate();
  const rb = await new Roll(`1d20 + ${(b.system.techniqueDC?.value ?? 20) - 10}`).evaluate();
  const tie = ra.total === rb.total;
  const winner = tie ? null : ra.total > rb.total ? a : b;
  await ChatMessage.create({
    speaker: { alias: "Domain Clash" },
    content: `<div class="jjk-chat jjk-domain"><h3>DOMAIN CLASH</h3>
      <p>${esc(a.name)}: <strong>${ra.total}</strong> · ${esc(b.name)}: <strong>${rb.total}</strong></p>
      <p>${tie ? "Dead even: <strong>both barriers break</strong> and neither sure hit lands." : `<strong>${esc(winner.name)}</strong>'s Domain overwrites the other.`}</p></div>`,
    rolls: [ra, rb]
  });
  if (tie) { await collapse(a, "broke in the clash"); await collapse(b, "broke in the clash"); return null; }
  await collapse(winner === a ? b : a, "was overwritten in the clash");
  return winner;
}

/** One sure-hit pulse on everyone inside. */
async function pulse(actor, { slam = false } = {}) {
  const st = activeDomain(actor);
  if (!st) return;
  const targets = await enemiesInside(actor, st);
  const conds = parseConditions(st.conditions);
  const roll = st.damage ? await new Roll(st.damage).evaluate() : null;
  const rows = [];
  for (const t of targets) {
    const counters = t.getFlag(SYSTEM_ID, "counters") ?? {};
    if (counters.amplification) { rows.push({ t, dmg: 0, applied: [], note: "Domain Amplification: immune this round" }); continue; }
    let dmg = roll?.total ?? 0;
    let drop = 0;
    const notes = [];
    if (rankOf(t) > st.rank) { dmg = Math.floor(dmg / 2); drop = 1; notes.push("higher Grade: half damage, conditions −1"); }
    let conditionsApply = true;
    if (counters.simpleDomain) {
      const saveKey = st.damage ? "reflex" : "will";
      const r = await t.rollSave(saveKey, { dc: st.dc, prompt: false, dcLabel: st.name });
      const degree = r?.degree ?? 1;
      dmg = [dmg * 2, dmg, Math.floor(dmg / 2), 0][degree];
      conditionsApply = degree <= 1;
      notes.push(`Simple Domain: ${["critical failure", "failure", "success", "critical success"][degree]} on the save`);
    }
    if (dmg > 0) await t.applyDamage(dmg, { reinforce: t.type !== "sorcerer" });
    const applied = [];
    if (conditionsApply && conds.length) {
      const up = {};
      for (const c of conds) {
        const v = c.value - drop;
        if (v <= 0) continue;
        if (c.valued) { const now = t.system.conditions?.[c.key] ?? 0; if (v > now) up[`system.conditions.${c.key}`] = v; applied.push(`${VALUED_CONDITIONS[c.key]} ${v}`); }
        else { up[`system.conditions.${c.key}`] = true; applied.push(TOGGLE_CONDITIONS[c.key]); }
      }
      if (Object.keys(up).length) await t.update(up);
    }
    rows.push({ t, dmg, applied, note: notes.join("; ") });
  }

  const list = rows.length ? rows.map(r => `<li><strong>${esc(r.t.name)}</strong>${r.dmg ? `: ${r.dmg} damage` : ""}${r.applied.length ? ` · ${r.applied.join(", ")}` : ""}${r.note ? ` <em>(${esc(r.note)})</em>` : ""}
      ${r.dmg > 0 && r.t.type === "sorcerer" && (r.t.system.reinforcement ?? 0) > 0 ? `<button type="button" data-jjk-action="domainReinforce" data-target-uuid="${r.t.uuid}" data-amount="${r.dmg}">Reinforce (1 CE)</button>` : ""}</li>`).join("")
    : "<li>No enemies inside the barrier.</li>";
  const left = st.pulsesLeft;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="jjk-chat jjk-domain"><h3>${slam ? "Sure hit: the barrier closes" : "Sure hit"}</h3>
      ${st.effect ? `<p class="jjk-sub">${esc(st.effect)}</p>` : ""}
      ${roll ? await roll.render() : ""}
      <ul class="jjk-domain-hits">${list}</ul>
      <p class="jjk-sub">${left > 0 ? `${left} more pulse${left === 1 ? "" : "s"} (start of ${esc(actor.name)}'s turns), then it collapses.` : `It collapses at the start of ${esc(actor.name)}'s next turn.`}</p></div>`,
    rolls: roll ? [roll] : [],
    flags: { [SYSTEM_ID]: { actorUuid: actor.uuid, domainPulse: true } }
  });
}

/** End the Domain: remove the barrier; the caster is fatigued at 0 CE until they Reset. */
export async function collapse(actor, reason = "collapses") {
  const st = activeDomain(actor);
  if (!st) {
    if (actor.system.attributes?.domainActive) await actor.update({ "system.attributes.domainActive": false });
    return;
  }
  if (st.regionId) await game.scenes.get(st.sceneId)?.regions?.get(st.regionId)?.delete().catch(() => null);
  await actor.update({
    "system.attributes.domainActive": false, "system.attributes.ce.value": 0, "system.conditions.fatigued": true,
    [`flags.${SYSTEM_ID}.burnedOut`]: true, [`flags.${SYSTEM_ID}.-=domain`]: null
  });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="jjk-chat jjk-domain"><strong>${esc(st.name)} ${esc(reason)}.</strong> ${esc(actor.name)} is fatigued at 0 CE until they Reset.</div>` });
}

async function doEnd(msg) {
  const { actor } = await resolveCaster(msg);
  return collapse(actor, "collapses");
}

async function doPulse(msg) {
  const { user, actor } = await resolveCaster(msg, { owner: false });
  if (!user.isGM) throw refusal("Only the GM can force a pulse.");
  return advance(actor);
}

async function doBarrier(msg) {
  const { user, actor } = await resolveCaster(msg, { owner: false });
  const st = activeDomain(actor);
  if (!st) throw refusal("That Domain has already fallen.");
  const through = Math.max(0, Math.round(msg.amount) - st.hardness);
  const hp = Math.max(0, st.barrierHP - through);
  await actor.setFlag(SYSTEM_ID, "domain.barrierHP", hp);
  await ChatMessage.create({
    speaker: { alias: game.users.get(user.id)?.name ?? "Barrier" },
    content: `<div class="jjk-chat jjk-domain">The barrier takes <strong>${through}</strong> (${Math.round(msg.amount)} − Hardness ${st.hardness}). Barrier HP <strong>${hp}/${st.barrierMax}</strong>.</div>`
  });
  if (hp <= 0) await collapse(actor, "shatters: the barrier was broken from inside");
}

/** Start of the caster's turn: pulse if any are left, otherwise collapse. */
async function advance(actor) {
  const st = activeDomain(actor);
  if (!st) return;
  if (st.pulsesLeft > 0) {
    await actor.setFlag(SYSTEM_ID, "domain.pulsesLeft", st.pulsesLeft - 1);
    return pulse(actor);
  }
  return collapse(actor, "collapses");
}

/* ---------- wiring ---------- */

export function registerDomains() {
  gmHandlers.domainOpen = doOpen;
  gmHandlers.domainEnd = doEnd;
  gmHandlers.domainPulse = doPulse;
  gmHandlers.domainBarrier = doBarrier;

  Hooks.on("updateCombat", async (combat, changed) => {
    if (!isActiveGM() || (!("turn" in changed) && !("round" in changed))) return;
    const actor = combat.combatant?.actor;
    if (!actor) return;
    // Domain Amplification lasts until the start of your next turn.
    if (actor.getFlag(SYSTEM_ID, "counters")?.amplification) await actor.setFlag(SYSTEM_ID, "counters.amplification", false);
    if (activeDomain(actor)) await advance(actor);
  });
  // A Domain doesn't outlast the fight.
  Hooks.on("deleteCombat", async combat => {
    if (!isActiveGM()) return;
    for (const c of combat.combatants) if (c.actor && activeDomain(c.actor)) await collapse(c.actor, "collapses as the fight ends");
  });
}

