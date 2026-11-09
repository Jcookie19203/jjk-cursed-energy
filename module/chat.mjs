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

  // Actions that act on whoever clicked (saves, applying damage) don't need to own the source actor.
  switch (action) {
    case "requestSave": {
      const targets = chosenActors();
      if (!targets.length) return ui.notifications.warn("Select a token (or assign a character) to roll the save.");
      for (const a of targets) await a.rollSave(button.dataset.save, { dc: Number(button.dataset.dc), prompt: false, dcLabel: item?.name ?? "DC" });
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
      return actor.spendCE(n < 0 ? actor.system.attributes.ce.value : n, { reason: item?.name });
    }
    case "openDomain": return actor.openDomain();
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
    case "takeover": return actor.rollTakeover();
  }
}

export function registerChatHooks() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    for (const el of html.querySelectorAll("[data-jjk-action]")) {
      el.addEventListener("click", ev => { ev.preventDefault(); onAction(ev, message); });
    }
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
      if (ce && ce.value < ce.max) await actor.update({ "system.attributes.ce.value": ce.value + 1 });
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
