import { SYSTEM_ID, degreeOfSuccess, DEGREE_LABELS } from "./config.mjs";

const { DialogV2 } = foundry.applications.api;

const esc = s => foundry.utils.escapeHTML?.(String(s)) ?? String(s);
const signed = n => (n >= 0 ? `+${n}` : `${n}`);

/** The DC for an attack roll: the AC of the user's single target, if it has one. */
function targetAC() {
  const targets = [...game.user.targets];
  if (targets.length !== 1) return null;
  const ac = targets[0].actor?.system?.attributes?.ac?.value;
  return Number.isFinite(ac) ? { value: ac, name: targets[0].name } : null;
}

/** Ask for situational modifiers (and MAP for attacks). Returns null if cancelled. */
async function promptCheck({ title, isAttack }) {
  const map = isAttack ? `
    <div class="form-group"><label>Multiple attack penalty</label>
      <select name="map"><option value="0">First attack (0)</option><option value="1">Second (−5 / agile −4)</option><option value="2">Third+ (−10 / agile −8)</option></select></div>
    <div class="form-group"><label>Agile</label><input type="checkbox" name="agile"></div>` : "";
  try {
    return await DialogV2.prompt({
      window: { title },
      content: `<div class="jjk-dialog">${map}
        <div class="form-group"><label>Situational modifier</label><input type="number" name="bonus" value="0"></div>
        <div class="form-group"><label>DC (blank = none / target AC)</label><input type="number" name="dc" placeholder="—"></div></div>`,
      ok: {
        label: "Roll",
        callback: (event, button) => {
          const f = button.form.elements;
          return { map: Number(f.map?.value ?? 0), agile: !!f.agile?.checked, bonus: Number(f.bonus.value) || 0, dc: f.dc.value === "" ? null : Number(f.dc.value) };
        }
      },
      rejectClose: false
    });
  } catch { return null; }
}

/**
 * Roll a d20 check and post it to chat.
 * @param {object} o
 * @param {Actor} o.actor
 * @param {string} o.label     Chat title.
 * @param {number} o.modifier  Total modifier before situational bonuses.
 * @param {boolean} [o.isAttack]
 * @param {number|null} [o.dc]
 * @param {boolean} [o.prompt] Show the modifier dialog (shift-click skips it).
 * @param {object} [o.flags]   Extra message flags.
 */
export async function rollCheck({ actor, label, modifier, isAttack = false, dc = null, prompt = true, flags = {}, dcLabel = "", map = 0, agile = false }) {
  let opts = { map, agile, bonus: 0, dc: null };
  if (prompt) {
    const r = await promptCheck({ title: label, isAttack });
    if (!r) return null;
    opts = r;
  }
  const mapPenalty = isAttack ? [0, opts.agile ? 4 : 5, opts.agile ? 8 : 10][opts.map] : 0;
  const total = modifier + opts.bonus - mapPenalty;
  const roll = await new Roll(`1d20 + ${total}`).evaluate();
  const natural = roll.dice[0].total;

  let target = null;
  if (opts.dc !== null) target = { value: opts.dc, name: dcLabel || "DC" };
  else if (dc !== null) target = { value: dc, name: dcLabel || "DC" };
  else if (isAttack) target = targetAC();

  const degree = target ? degreeOfSuccess(roll.total, natural, target.value) : null;
  const parts = [`${esc(label)} ${signed(total)}`];
  if (mapPenalty) parts.push(`MAP −${mapPenalty}`);
  let degreeHtml = "";
  if (degree !== null) {
    degreeHtml = `<div class="jjk-degree degree-${degree}">${DEGREE_LABELS[degree]}<span> vs ${esc(target.name)} ${target.value}</span></div>`;
  }
  let extra = "";
  if (isAttack && degree === 3) {
    extra = `<div class="jjk-buttons"><button type="button" data-jjk-action="blackFlash">Attempt Black Flash</button></div>`;
  } else if (isAttack && degree === 2 && actor?.system?.hasBlackFlashFocus) {
    extra = `<div class="jjk-buttons"><button type="button" data-jjk-action="blackFlashFocus">Black Flash Focus (2 CE, flat DC 10)</button></div>`;
  }

  const content = `<div class="jjk-chat jjk-check"><header><h3>${esc(label)}</h3></header>
    <div class="jjk-sub">${parts.join(" · ")}</div>
    ${await roll.render()}
    ${degreeHtml}${extra}</div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
    flags: { [SYSTEM_ID]: { actorUuid: actor?.uuid, degree, isAttack, ...flags } }
  });
  return { roll, degree };
}

/** Ask how much CE goes into an output-damage roll, plus crit / Black Flash options. */
export async function promptDamage({ title, defaultCE = 1, askCE = true }) {
  const ceField = askCE ? `<div class="form-group"><label>CE spent (dice)</label><input type="number" name="ce" value="${defaultCE}" min="0"></div>` : "";
  try {
    return await DialogV2.prompt({
      window: { title },
      content: `<div class="jjk-dialog">${ceField}
        <div class="form-group"><label>Extra dice</label><input type="number" name="extra" value="0"></div>
        <div class="form-group"><label>Critical hit (double)</label><input type="checkbox" name="crit"></div>
        <div class="form-group"><label>Black Flash (maximize, then double)</label><input type="checkbox" name="bf"></div></div>`,
      ok: {
        label: "Roll damage",
        callback: (event, button) => {
          const f = button.form.elements;
          return { ce: askCE ? Math.max(0, Number(f.ce.value) || 0) : 0, extra: Number(f.extra.value) || 0, crit: f.crit.checked, bf: f.bf.checked };
        }
      },
      rejectClose: false
    });
  } catch { return null; }
}

/** Roll damage and post it with Apply buttons. */
export async function rollDamage({ actor, label, dice = 0, die = "d6", mod = 0, crit = false, blackFlash = false, damageType = "", formula: fixed = "" }) {
  if (!fixed && dice <= 0 && !mod) return ui.notifications.warn("No damage dice to roll.");
  const formula = fixed || `${Math.max(0, dice)}${die} + ${mod}`;
  const roll = await new Roll(formula).evaluate({ maximize: blackFlash });
  const doubled = crit || blackFlash;
  const total = doubled ? roll.total * 2 : roll.total;
  const tag = blackFlash ? "Black Flash — maximized and doubled" : crit ? "Critical — doubled" : "";
  const content = `<div class="jjk-chat jjk-damage"><header><h3>${esc(label)}</h3></header>
    <div class="jjk-sub">${formula}${damageType ? ` ${esc(damageType)}` : ""}${tag ? ` · <strong>${tag}</strong>` : ""}</div>
    ${await roll.render()}
    <div class="jjk-total">Total damage: <strong>${total}</strong></div>
    <div class="jjk-buttons">
      <button type="button" data-jjk-action="applyDamage" data-amount="${total}">Apply</button>
      <button type="button" data-jjk-action="applyDamage" data-amount="${Math.floor(total / 2)}">Half</button>
      <button type="button" data-jjk-action="applyDamage" data-amount="${total * 2}">Double</button>
      <button type="button" data-jjk-action="applyHealing" data-amount="${total}">Heal</button>
    </div></div>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
    flags: { [SYSTEM_ID]: { actorUuid: actor?.uuid, damage: total } }
  });
  return { roll, total };
}

/** A flat check (no modifier) against a DC. */
export async function rollFlat({ actor, label, dc }) {
  const roll = await new Roll("1d20").evaluate();
  const success = roll.total >= dc;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="jjk-chat jjk-check"><header><h3>${esc(label)}</h3></header><div class="jjk-sub">Flat check DC ${dc}</div>
      ${await roll.render()}<div class="jjk-degree degree-${success ? 2 : 1}">${success ? "Success" : "Failure"}</div></div>`,
    rolls: [roll]
  });
  return success;
}
