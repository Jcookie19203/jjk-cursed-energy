import { SYSTEM_ID } from "./config.mjs";

const { DialogV2 } = foundry.applications.api;

/** Actors the clicking user is acting on: controlled tokens, else their assigned character. */
function chosenActors() {
  const fromTokens = canvas?.tokens?.controlled?.map(t => t.actor).filter(Boolean) ?? [];
  if (fromTokens.length) return fromTokens;
  return game.user.character ? [game.user.character] : [];
}

async function onAction(event, message) {
  const button = event.currentTarget;
  const action = button.dataset.jjkAction;
  const flags = message.flags?.[SYSTEM_ID] ?? {};
  const actor = flags.actorUuid ? await fromUuid(flags.actorUuid) : null;
  const item = flags.itemUuid ? await fromUuid(flags.itemUuid) : null;

  // Domain buttons anyone can press (the GM's client checks and applies them).
  const domain = game.jjk.domain;
  switch (action) {
    case "domainBarrier": return actor && domain.hitBarrier(actor);
    case "domainReinforce": {
      const doc = await fromUuid(button.dataset.targetUuid);
      return domain.reinforceAfter(doc?.actor ?? doc, Number(button.dataset.amount), message.id);
    }
  }

  // Actions that act on whoever clicked (saves, applying damage) don't need to own the source actor.
  switch (action) {
    case "applyTo": return game.jjk.actions.applyTo(button.dataset.targetUuid, Number(button.dataset.amount));
    case "applyCond": {
      await game.jjk.actions.applyCondTo(button.dataset.targetUuid, button.dataset.key, button.dataset.value);
      button.classList.add("applied");
      return;
    }
    case "resource": return game.jjk.resources.chatAction(button.dataset, message);
    case "requestSave": {
      const targets = chosenActors();
      if (!targets.length) return ui.notifications.warn("Select a token (or assign a character) to roll the save.");
      const basic = button.dataset.basic === "1";
      const BASIC = ["takes <strong>double</strong> damage", "takes <strong>full</strong> damage", "takes <strong>half</strong> damage", "takes <strong>no</strong> damage"];
      for (const a of targets) {
        const r = await a.rollSave(button.dataset.save, { dc: Number(button.dataset.dc), prompt: false, dcLabel: item?.name ?? "DC" });
        if (basic && r?.degree != null) {
          ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: a }), content: `<div class="jjk-chat">Basic save: ${a.name} ${BASIC[r.degree]}.</div>` });
        }
      }
      return;
    }
    case "applyDamage":
    case "applyHealing": {
      const targets = chosenActors().filter(a => a.isOwner);
      if (!targets.length) return ui.notifications.warn("Select tokens you own to apply this.");
      const amount = Number(button.dataset.amount);
      if (action === "applyHealing") { for (const a of targets) await a.applyHealing(amount); return; }
      const canReinforce = targets.some(a => (a.system.attributes?.ce?.value ?? 0) > 0 && a.system.reinforcement > 0);
      let reinforce = false;
      if (canReinforce) {
        reinforce = await DialogV2.confirm({ window: { title: "Reinforcement" }, content: `<p>Spend 1 CE to reduce the damage by Reinforcement?</p>`, rejectClose: false }) ?? false;
      }
      for (const a of targets) await a.applyDamage(amount, { reinforce });
      return;
    }
  }

  if (!actor) return ui.notifications.warn("That card isn't linked to an actor.");
  if (!actor.isOwner) return ui.notifications.warn(`You don't control ${actor.name}.`);

  switch (action) {
    case "payCE": {
      const n = Number(button.dataset.ce);
      if (n < 0) return actor.spendCE(actor.system.attributes.ce.value, { reason: item?.name });
      const cost = domain.amplifiedCost(actor, item, n);
      if (cost !== n) ui.notifications.info(`Amplified inside the Domain: ${item.name} costs ${cost} CE instead of ${n}.`);
      return actor.spendCE(cost, { reason: item?.name });
    }
    case "openDomain": return actor.openDomain(item?.type === "ability" ? item : null);
    case "domainEnd": return actor.endDomain();
    case "attack": {
      if (item?.type === "weapon") {
        const ov = item.system.attackOverride;
        if (Number.isFinite(ov)) {
          const { rollCheck } = await import("./dice.mjs");
          return rollCheck({ actor, label: item.name, modifier: ov, isAttack: true });
        }
        return actor.rollCursedAttack(item.name, { bonus: item.system.bonus });
      }
      return actor.rollCursedAttack(item?.name ?? "Cursed Strike");
    }
    case "outputDamage": return actor.rollOutputDamage(item?.name ?? "Output Damage", { defaultCE: Number(button.dataset.ce) || 1 });
    case "strikeDamage": return actor.rollStrikeDamage(item);
    case "chargeTool": {
      if (!item) return;
      const cap = actor.system.gradeRank * (actor.system.heavenlyRestriction ? 2 : 1);
      if (item.system.charge >= cap) return ui.notifications.warn(`${item.name} is fully charged (${cap}).`);
      if (await actor.spendCE(1, { reason: "charging" })) await item.update({ "system.charge": item.system.charge + 1 });
      return;
    }
    case "pressure": return actor.adjustPressure(Number(button.dataset.amount), item?.name);
    case "blackFlash": return actor.attemptBlackFlash();
    case "blackFlashFocus": if (await actor.spendCE(2, { reason: "Black Flash Focus" })) return actor.attemptBlackFlash({ baseDC: 10 }); return;
    case "takeover": return actor.rollTakeover();
    case "heroReroll": { const { heroReroll } = await import("./dice.mjs"); return heroReroll(actor, message); }
    case "heroicRecovery": return actor.heroicRecovery();
    case "recoveryCheck": return actor.rollRecovery();
  }
}

export function registerChatHooks() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    for (const el of html.querySelectorAll("[data-jjk-action]")) {
      el.addEventListener("click", ev => { ev.preventDefault(); onAction(ev, message); });
    }
  });
}

/** GM: start of a session. Every player character's Hero Points reset to 1 (PF2e). */
export async function newSessionHeroPoints() {
  const pcs = game.actors.filter(a => a.type === "sorcerer" && a.hasPlayerOwner);
  if (!pcs.length) return ui.notifications.warn("No player characters to reset.");
  const ok = await DialogV2.confirm({ window: { title: "New session" },
    content: `<p>Set every player character's Hero Points to <strong>1</strong>?</p><p class="hint">${pcs.map(a => `${a.name} (${a.system.attributes.heroPoints})`).join(", ")}</p>`, rejectClose: false });
  if (!ok) return;
  for (const a of pcs) await a.update({ "system.attributes.heroPoints": 1 });
  ChatMessage.create({ content: `<div class="jjk-chat jjk-hero"><strong>★ New session.</strong> Everyone starts with 1 Hero Point: ${pcs.map(a => a.name).join(", ")}.</div>` });
}

/** The GM's ★ New session button at the top of the Actors sidebar. */
export function registerHeroPointUI() {
  Hooks.on("renderActorDirectory", (app, html) => {
    if (!game.user.isGM) return;
    const root = html instanceof HTMLElement ? html : html[0];
    if (!root || root.querySelector(".jjk-new-session")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "jjk-new-session";
    btn.innerHTML = "★ New session (Hero Points to 1)";
    btn.addEventListener("click", ev => { ev.preventDefault(); newSessionHeroPoints(); });
    (root.querySelector(".header-actions") ?? root.querySelector(".directory-header") ?? root).append(btn);
  });
}

/**
 * Recovery checks: when a dying PC's turn starts, its player (or the GM, if the player is away) is asked to roll.
 * Runs on every client; only the one who should roll sees the prompt. Closing it leaves a button in chat.
 */
export function registerDyingHooks() {
  Hooks.on("updateCombat", async (combat, changed) => {
    if (!("turn" in changed) && !("round" in changed)) return;
    const actor = combat.combatant?.actor;
    if (actor?.type !== "sorcerer" || !(actor.system.conditions?.dying > 0) || !actor.isOwner) return;
    const playerOn = game.users.some(u => u.active && !u.isGM && actor.testUserPermission(u, "OWNER"));
    if (game.user.isGM ? playerOn || !game.user.isActiveGM : false) return;
    const dc = 10 + actor.system.conditions.dying;
    const roll = await DialogV2.confirm({ window: { title: `${actor.name} is dying` },
      content: `<p><strong>${actor.name}</strong> is dying ${actor.system.conditions.dying}. Roll a recovery check: flat DC ${dc}.</p><p class="hint">Success lowers dying, failure raises it. At dying ${Math.max(1, 4 - (actor.system.conditions.doomed ?? 0))} you die.</p>`,
      yes: { label: "Roll recovery check" }, no: { label: "Later" }, rejectClose: false });
    if (roll) return actor.rollRecovery();
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), flags: { [SYSTEM_ID]: { actorUuid: actor.uuid } },
      whisper: game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id),
      content: `<div class="jjk-chat jjk-hero"><strong>${actor.name}</strong> still needs a recovery check (DC ${dc}).<div class="jjk-buttons"><button type="button" data-jjk-action="recoveryCheck">Roll recovery check</button></div></div>` });
  });
}

/** Steady Flow and takeover prompts at the start of each combatant's turn (run once, by the active GM). */
export function registerCombatHooks() {
  Hooks.on("updateCombat", async (combat, changed) => {
    if (!game.user.isActiveGM) return;
    if (!("turn" in changed) && !("round" in changed)) return;
    const actor = combat.combatant?.actor;
    if (!actor) return;
    if (game.settings.get(SYSTEM_ID, "steadyFlow")) {
      const ce = actor.system.attributes?.ce;
      // After a Domain the pool stays at 0 until the sorcerer Resets (Core Rules IV).
      // …and an open Domain has already spent the pool.
      if (ce && ce.value < ce.max && !actor.getFlag(SYSTEM_ID, "burnedOut") && !actor.system.attributes.domainActive) await actor.update({ "system.attributes.ce.value": ce.value + 1 });
    }
    if (actor.type === "sorcerer" && actor.system.hasPassenger && game.settings.get(SYSTEM_ID, "takeoverPrompts")) {
      const p = actor.system.attributes.pressure;
      if (p >= 10) {
        ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="jjk-chat jjk-pressure"><strong>Pressure 10.</strong> The passenger controls ${actor.name} for the rest of the encounter.</div>` });
      } else if (p >= 5) {
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `<div class="jjk-chat jjk-pressure"><strong>Pressure ${p}.</strong> ${actor.name} must resist the passenger.<div class="jjk-buttons"><button type="button" data-jjk-action="takeover">Will save vs DC ${actor.system.takeoverDC}</button></div></div>`,
          flags: { [SYSTEM_ID]: { actorUuid: actor.uuid } }
        });
      }
    }
  });
}
