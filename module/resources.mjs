/**
 * Technique resources (Debt, Strain, stored charge, marks, minions…): tracked per sorcerer, shown only to the
 * sheet's owner and the GM, and updated automatically by the one-click actions in module/actions.mjs.
 *
 * Storage: actor flag `res` = { key: number | boolean | string[] | { [targetUuid]: { name, value, start, loan } } }.
 * Values that live "on" other creatures (Debt, marks, afflictions) are stored on the technique user's own actor,
 * so nobody else can see them.
 */
import { SYSTEM_ID, GRADES } from "./config.mjs";

const { DialogV2 } = foundry.applications.api;
const esc = s => foundry.utils.escapeHTML?.(String(s)) ?? String(s);
const isActiveGM = () => (game.users.activeGM ? game.users.activeGM.isSelf : game.user.isGM);

const rank = a => a.system.gradeRank ?? 1;
const mod = (a, k) => a.system.abilities?.[k]?.mod ?? 0;
const DEBT_LIMIT = { fledgling: 3, grade4: 3, grade3: 4, grade2: 4, semi1: 5, grade1: 5, special: 6 };
export const debtLimit = a => DEBT_LIMIT[a.system.grade] ?? Math.ceil(2 + rank(a) / 2);

/**
 * kind: number (on you) · toggle · list (named things) · target (a number on each tracked creature).
 * max(actor) caps numbers; reset: "encounter" | "rest" | "never"; upkeep: CE paid at the start of your turn while on.
 */
const N = (key, label, o = {}) => ({ key, label, kind: "number", reset: "encounter", ...o });
const TG = (key, label, o = {}) => ({ key, label, kind: "toggle", reset: "encounter", ...o });
const L = (key, label, o = {}) => ({ key, label, kind: "list", reset: "encounter", ...o });
const TR = (key, label, o = {}) => ({ key, label, kind: "target", reset: "encounter", ...o });

export const RESOURCES = {
  "Beast Tamer": [L("bondBeast", "Bonded Beast", { reset: "never", max: () => 1, hint: "Persistent minion; if slain, needs downtime before you can call it again." }), L("pack", "Pack", { max: () => 1, hint: "One pack (two expendable minions) at a time; lasts the scene." })],
  "Black Bird Manipulation": [N("crows", "Crows", { max: () => 3, hint: "Up to 3 per Send Crows; Gathering Flock re-forms destroyed birds for 1 CE." }), L("crowShikigami", "Crow Shikigami", { max: () => 1 })],
  "Blood Manipulation": [L("bloodSamples", "Blood samples held", { reset: "never", hint: "You sense the direction and health of whoever's blood you hold." }), L("bloodPuppet", "Blood Puppet", { max: () => 1 })],
  "Comedian": [N("runningGag", "Running Gag", { max: () => 3, hint: "The third use in a row ends the gag for the scene unless you Callback." }), TR("setupMark", "The Setup", { max: () => 1, hint: "−2 to saves against you until the end of your next turn." }), N("encoreFreeBits", "Encore free Bits", { max: a => rank(a) })],
  "Construction": [L("constructs", "Constructs", { hint: "One per type (puppet / swarm / cannon); Int + 2 total with Mass Production." }), TG("perpetualEngine", "Perpetual Engine", { reset: "never" })],
  "Contract Re-Creation": [L("ledger", "Ledger", { reset: "never", max: a => 2 * rank(a), hint: "Registered objects. Past the cap, the oldest is overwritten." }), L("summonedCopies", "Summoned copies"), N("toolStoredCE", "Conjured tool CE", { max: a => rank(a) })],
  "Copy (Mimicry)": [L("storedCopies", "Stored copies", { hint: "Copied applications usable for the scene." }), L("rikas", "Rika", { max: () => 3 })],
  "Cursed Speech": [N("strain", "Throat Strain", { reset: "rest", max: () => 10, gain: /\+(\d+)\s*Strain/i, hint: "3+: sickened and words cost more. 5+: Light Words only. Focused Flow clears 2, Reset clears all." })],
  "Cursed Spirit Manipulation": [L("capturedCurses", "Captured curses", { reset: "never", max: a => mod(a, "cha") + rank(a) }), L("summonedCurses", "Summoned curses")],
  "Cursed Tool Master": [L("toolCharge", "Charged tools", { hint: "Charge on each tool is also shown on the Gear tab." })],
  "Cursed Womb": [L("spawn", "Spawn", { max: a => rank(a) }), N("empowerStacks", "Devour stacks", { max: a => rank(a) })],
  "Deadly Sentencing": [TR("testimony", "Testimony", { max: a => rank(a), hint: "Seal of Confession needs 3+ on the record." }), L("imposedRules", "Imposed rules")],
  "Decay (Rot)": [TR("rot", "Rot stacks", { hint: "Persistent cursed poison; halves healing." })],
  "Detonation": [L("placedCharges", "Placed charges", { hint: "Sticky Charge, Delayed Fuse, Pressure Cooker, mines. Daisy-Chain sets them all off." })],
  "Disaster Flames": [N("disasterCharge", "Disaster Charge", { max: () => 3, hint: "+1 output die and a persistent fire die each. Lost if you're damaged before spending it." }), TG("heatHaze", "Heat Haze", { upkeep: 1, hint: "10-ft aura; 1 CE at the start of each of your turns." })],
  "Disaster Plants": [TR("cursedBuds", "Cursed Buds", { max: () => 1, hint: "You regain HP each turn while a seed grows." }), L("woodenBeast", "Wooden Beast", { reset: "never" })],
  "Disaster Tides": [TG("waterBody", "Water Body", { upkeep: 1 }), L("tideShikigami", "Water shikigami", { max: () => 1 })],
  "Flight Dominion": [TG("levitate", "Levitate", { upkeep: 1, hint: "1 CE at the start of each of your turns; you drift down at 0 CE." })],
  "Foresight": [TR("studySubject", "Study bonus", { max: () => 2, single: true, hint: "One subject: +1, rising to +2 while you keep watching." })],
  "Granite Blast": [N("storedCharge", "Stored charge", { max: a => rank(a), fuel: "add", hint: "Each point released counts as 1 CE spent toward the shot's output damage." })],
  "Heavenly Restriction - Assassin": [TR("huntersMark", "Hunter's mark", { max: () => 1 }), L("toolCharge", "Charged tools")],
  "Idle Death Gamble": [L("spinResult", "Spin result", { reset: "encounter", max: () => 1, hint: "Bust / Blank / Line / Jackpot — spent by Payout." }), TG("feverMode", "Fever Mode", { reset: "rest" })],
  "Idle Transfiguration": [TR("transfigurations", "Transfigurations", { reset: "never" }), L("transfiguredMinions", "Transfigured minions")],
  "Ink Calligraphy": [TR("inkMark", "Ink mark", { max: () => 1, hint: "+1 to your next attack or DC against it." }), L("talismans", "Talismans")],
  "Limitless": [TG("infinity", "Infinity", { upkeep: 1, hint: "1 CE at the start of each of your turns; drops at 0 CE." })],
  "Loan Shark": [
    TR("debt", "Debt", { max: a => debtLimit(a), hint: "Leverage: +1 technique die per 2 Debt (max half your Debt Limit). Returns to starting Debt at the end of the encounter." }),
    N("tab", "Tab", { hint: "+1 per CE borrowed. End of encounter: lose Tab × technique die HP, then it clears. Over your Debt Limit = Overdrawn." }),
    N("borrowedThisRound", "Borrowed this round", { max: a => rank(a), reset: "turn" }),
    L("whoIOwe", "Who I owe", { reset: "never", hint: "Your technique can't touch a creature you owe." })
  ],
  "Love Rendezvous": [TR("starMarks", "Star marks", { hint: "Paired marks; consumed by convergences." })],
  "Lucky Streak": [N("hotStreak", "Hot Streak", { max: () => 5, hint: "Spend as CE on fortune applications. Resets if you're crit or drop below half HP." })],
  "Mind's Eye": [L("mindLink", "Mind Link", { max: a => rank(a) })],
  "Mythical Beast Amber": [N("storedCharge", "Stored charge", { max: a => rank(a), fuel: "pay", hint: "+5 ft Speed and +1 attack while charged. Spend it instead of CE." }), TG("thunderousAssault", "Thunderous Assault")],
  "Plague Bearer": [TR("cursedPlague", "Plague stage", { max: () => 4 }), TG("contagion", "Contagion")],
  "Possession": [TG("currentHost", "In a host", { reset: "never" }), L("controlledBodies", "Controlled bodies", { max: a => mod(a, "int") }), L("dormantSeeds", "Dormant Seeds", { reset: "never" })],
  "Prism": [N("focusedBeam", "Focused Beam CE", { max: a => rank(a) })],
  "Ratio Technique": [TR("ratioMark", "Ratio Mark", { max: () => 1, single: true, hint: "Crit when you beat its AC by 8+." })],
  "Reflection": [L("mirrorStorage", "Stored in mirror", { reset: "never" }), L("clone", "Mirror clone", { max: () => 1 })],
  "Sand Manipulation": [TG("sandskin", "Sandskin"), L("sandConstruct", "Sand Construct", { max: () => 1 })],
  "Six Eyes Discipline": [TR("pressurePoint", "Pressure Point", { max: () => 1, hint: "Off-guard to your allies; their crit range −1." })],
  "Spirit Channeling": [N("offerings", "Offerings", { reset: "rest", max: a => Math.max(1, mod(a, "wis")), refill: true }), L("channels", "Channeled dead")],
  "Star Rage": [N("momentum", "Momentum", { reset: "encounter" }), L("garuda", "Garuda", { reset: "rest", max: () => 1 })],
  "Straw Doll Technique": [L("samples", "Samples", { reset: "never" }), L("plantedDolls", "Planted dolls")],
  "Temporal Stasis": [N("temporalStrain", "Temporal strain", { max: () => 10, gain: /\+(\d+)\s*(temporal\s+)?strain/i, hint: "3: clumsy 1 · 5: slowed 1 · 7: stunned 1." }), L("temporalEcho", "Stored echo", { max: () => 1 })],
  "Ten Shadows Technique": [L("shikigami", "Shikigami out", { reset: "rest", max: a => Math.ceil(rank(a) / 2) }), L("destroyedShikigami", "Destroyed shikigami", { reset: "rest" })],
  "Terraform": [L("earthConstruct", "Colossus / Golem", { max: () => 1 }), L("earthWalls", "Earth walls", { reset: "never" })],
  "Thread Manipulation": [TG("catsCradle", "Cat's Cradle"), L("threadPuppet", "Puppet", { max: () => 1 })],
  "Venom Weaving": [TR("cursedVenom", "Venom stage", { max: () => 4 })],
  // Cursed Paths.
  "Cursed Corpse": [L("cores", "Cores", { reset: "never", hint: "Main / Gorilla / Pangolin; each has its own HP." }), L("activeCore", "Active core", { reset: "never", max: () => 1 })],
  "Death Painting": [N("cursedWoundTally", "Cursed-wound tally", { reset: "rest", hint: "Healing can't go past max HP minus this." }), TR("bloodDebt", "Blood Debt", { reset: "never" })],
  "Vessel": [TG("contestedMode", "Contested Vessel")]
};

/**
 * Card automation: what using a card does to the resources.
 * on: "use" (always) · "hit" (attack hit; crit uses critAmount) · "fail" (target failed its save; crit failure uses critAmount).
 * op: "add" | "set" | "max" (raise to at least) · target: true = applies to the targeted creature(s).
 */
const RULES = {
  "Granite Blast": [{ card: /^Charge$/i, res: "storedCharge", op: "add", amount: 1, on: "use" }],
  "Mythical Beast Amber": [{ card: /^Charge Body$/i, res: "storedCharge", op: "add", amount: 1, on: "use" }],
  "Disaster Flames": [{ card: /^Disaster Charge$/i, res: "disasterCharge", op: "add", amount: 1, on: "use" }, { card: /^Heat Haze$/i, res: "heatHaze", op: "set", amount: true, on: "use" }],
  "Limitless": [{ card: /^Infinity$/i, res: "infinity", op: "set", amount: true, on: "use" }],
  "Flight Dominion": [{ card: /^Levitate$/i, res: "levitate", op: "set", amount: true, on: "use" }],
  "Disaster Tides": [{ card: /^Water Body$/i, res: "waterBody", op: "set", amount: true, on: "use" }],
  "Sand Manipulation": [{ card: /^Sandskin$/i, res: "sandskin", op: "set", amount: true, on: "use" }],
  "Thread Manipulation": [{ card: /^Cat's Cradle$/i, res: "catsCradle", op: "set", amount: true, on: "use" }],
  "Venom Weaving": [{ card: /^Venom Strike$/i, res: "cursedVenom", op: "max", amount: 1, critAmount: 2, on: "hit", target: true }],
  "Plague Bearer": [{ card: /^Infect$/i, res: "cursedPlague", op: "max", amount: 1, critAmount: 2, on: "fail", target: true }, { card: /^Contagion$/i, res: "contagion", op: "set", amount: true, on: "use" }],
  "Ratio Technique": [{ card: /^Ratio Mark$/i, res: "ratioMark", op: "set", amount: 1, on: "use", target: true }],
  "Ink Calligraphy": [{ card: /^Ink Splash$/i, res: "inkMark", op: "set", amount: 1, on: "hit", target: true }],
  "Decay (Rot)": [{ card: /^Rotting Touch$/i, res: "rot", op: "add", amount: 1, on: "hit", target: true }],
  "Love Rendezvous": [{ card: /^Star Mark$/i, res: "starMarks", op: "add", amount: 1, on: "use", target: true }],
  "Six Eyes Discipline": [{ card: /^Pressure Point$/i, res: "pressurePoint", op: "set", amount: 1, on: "use", target: true }],
  "Foresight": [{ card: /^Study the Opponent$/i, res: "studySubject", op: "set", amount: 1, on: "use", target: true }],
  "Disaster Plants": [{ card: /^Cursed Buds$/i, res: "cursedBuds", op: "set", amount: 1, on: "hit", target: true }],
  "Comedian": [{ card: /^The Setup$/i, res: "setupMark", op: "set", amount: 1, on: "use", target: true }, { card: /^Running Gag$/i, res: "runningGag", op: "add", amount: 1, on: "use" }],
  "Deadly Sentencing": [{ card: /^Interrogate$/i, res: "testimony", op: "add", amount: 1, on: "fail", target: true }],
  "Heavenly Restriction - Assassin": [{ card: /^Hunter's Patience$/i, res: "huntersMark", op: "set", amount: 1, on: "use", target: true }],
  "Loan Shark": [{ card: /^Predatory Loan$/i, res: "debt", op: "add", amount: 2, on: "use", target: true, loan: true }]
};

/* ---------- reading / writing ---------- */

/** The resource definitions that apply to this actor (technique + layer path). */
export function definitionsFor(actor) {
  if (actor?.type !== "sorcerer") return [];
  const s = actor.system;
  return [...(RESOURCES[s.techniqueName] ?? []), ...(RESOURCES[s.pathName] ?? [])];
}
const defOf = (actor, key) => definitionsFor(actor).find(d => d.key === key);
/** Flag keys can't contain dots (Foundry would nest them), so per-target entries are keyed by an escaped UUID. */
export const tk = uuid => String(uuid).replaceAll(".", "~");
const store = actor => foundry.utils.deepClone(actor.getFlag(SYSTEM_ID, "res") ?? {});
const maxOf = (actor, d) => (d.max ? d.max(actor) : null);

function clampNum(actor, d, v) {
  const max = maxOf(actor, d);
  v = Math.max(0, Math.round(Number(v) || 0));
  return max !== null && max !== undefined ? Math.min(v, Math.max(0, max)) : v;
}

async function save(actor, res) {
  // "==" replaces the whole object, so cleared entries really disappear.
  await actor.update({ [`flags.${SYSTEM_ID}.==res`]: res });
  await applyThresholds(actor, res);
}

/** Thresholds the system can apply itself (Strain sickens, Tab overdraws, temporal strain…). */
async function applyThresholds(actor, res) {
  const s = actor.system;
  const up = {};
  if (s.techniqueName === "Cursed Speech" && (res.strain ?? 0) >= 3 && s.conditions.sickened < 1) up["system.conditions.sickened"] = 1;
  if (s.techniqueName === "Temporal Stasis") {
    const t = res.temporalStrain ?? 0;
    if (t >= 3 && s.conditions.clumsy < 1) up["system.conditions.clumsy"] = 1;
    if (t >= 5 && s.conditions.slowed < 1) up["system.conditions.slowed"] = 1;
    if (t >= 7 && s.conditions.stunned < 1) up["system.conditions.stunned"] = 1;
  }
  if (Object.keys(up).length) await actor.update(up);
}

export async function setValue(actor, key, value, targetUuid = null) {
  const d = defOf(actor, key);
  if (!d) return;
  const res = store(actor);
  if (d.kind === "target") {
    const map = res[key] ?? {};
    if (!targetUuid || !map[tk(targetUuid)]) return;
    map[tk(targetUuid)].value = clampNum(actor, d, value);
    res[key] = map;
  } else if (d.kind === "number") res[key] = clampNum(actor, d, value);
  else if (d.kind === "toggle") res[key] = !!value;
  else if (d.kind === "list") res[key] = value;
  await save(actor, res);
}

export async function step(actor, key, delta, targetUuid = null) {
  const res = actor.getFlag(SYSTEM_ID, "res") ?? {};
  const cur = targetUuid ? res[key]?.[tk(targetUuid)]?.value ?? 0 : res[key] ?? 0;
  return setValue(actor, key, cur + delta, targetUuid);
}

/** Start tracking creatures for a per-target resource. */
export async function trackTargets(actor, key, docs, { value = 0, loan = false, single = false } = {}) {
  const d = defOf(actor, key);
  if (!d || d.kind !== "target") return;
  const res = store(actor);
  const map = single || d.single ? {} : (res[key] ?? {});
  for (const t of docs) {
    if (!t?.uuid) continue;
    const k = tk(t.uuid);
    map[k] ??= { uuid: t.uuid, name: t.name, value: 0, start: 0 };
    if (value) map[k].value = clampNum(actor, d, value);
    if (loan) map[k].loan = true;
  }
  res[key] = map;
  await save(actor, res);
}

export async function removeTarget(actor, key, uuid) {
  const res = store(actor);
  delete res[key]?.[tk(uuid)];
  await save(actor, res);
}

/* ---------- sheet context ---------- */

/** What the sheet shows: only for the owner (players with Observer on someone else's PC see nothing). */
export function sheetContext(actor) {
  if (!actor?.isOwner) return null;
  const defs = definitionsFor(actor);
  if (!defs.length) return null;
  const res = actor.getFlag(SYSTEM_ID, "res") ?? {};
  const label = [actor.system.techniqueName, RESOURCES[actor.system.pathName] ? actor.system.pathName : ""].filter(Boolean).join(" · ");
  const items = defs.map(d => {
    const max = maxOf(actor, d);
    const base = { key: d.key, label: d.label, kind: d.kind, hint: d.hint ?? "", max };
    if (d.kind === "number") { const v = res[d.key] ?? 0; return { ...base, value: v, pct: max ? Math.min(100, (v / max) * 100) : 0 }; }
    if (d.kind === "toggle") return { ...base, value: !!res[d.key], hint: `${d.hint ?? ""}${d.upkeep ? ` (upkeep ${d.upkeep} CE / turn, paid automatically)` : ""}` };
    if (d.kind === "list") return { ...base, entries: res[d.key] ?? [] };
    const map = res[d.key] ?? {};
    return { ...base, entries: Object.values(map) };
  });
  if (actor.system.techniqueName === "Loan Shark") {
    const tab = res.tab ?? 0;
    items.unshift({ key: "_limit", label: "Debt Limit", kind: "info", value: `${debtLimit(actor)}${tab > debtLimit(actor) ? " · OVERDRAWN (+1 CE, can't Borrow)" : ""}` });
  }
  return { technique: label, items };
}

/* ---------- action hooks (called by module/actions.mjs) ---------- */

function leverageDice(actor, targets) {
  const map = actor.getFlag(SYSTEM_ID, "res")?.debt ?? {};
  const t = targets[0];
  if (!t) return 0;
  const debt = map[tk(t.uuid)]?.value ?? 0;
  return Math.min(Math.floor(debt / 2), Math.floor(debtLimit(actor) / 2));
}

export const resourceHooks = {
  /** Per-card hooks for performAbility, or null. */
  forCard(actor, item) {
    if (actor?.type !== "sorcerer") return null;
    const defs = definitionsFor(actor);
    if (!defs.length) return null;
    const tech = actor.system.techniqueName;
    const path = actor.system.pathName;
    const rules = [...(RULES[tech] ?? []), ...(RULES[path] ?? [])].filter(r => r.card.test(item.name));
    const res = () => actor.getFlag(SYSTEM_ID, "res") ?? {};
    const fuel = defs.find(d => d.fuel);
    const isLoanShark = tech === "Loan Shark" && item.system.technique === "Loan Shark";
    const isFrontMoney = isLoanShark && /^Front Money$/i.test(item.name);
    const usesLeverage = isLoanShark && /leverage/i.test(item.system.description ?? "");
    const gains = defs.filter(d => d.gain);
    const usesFuel = fuel && item.system.usesOutput && !/^charge/i.test(item.name) && (res()[fuel.key] ?? 0) > 0;

    return {
      ask(actor) {
        let html = "";
        const r = res();
        if (isLoanShark) {
          const over = (r.tab ?? 0) > debtLimit(actor);
          const left = Math.max(0, rank(actor) - (r.borrowedThisRound ?? 0));
          html += over ? `<p class="hint">Overdrawn: +1 CE, and you can't Borrow.</p>`
            : `<div class="form-group"><label>Borrow (adds to your Tab; up to ${left} this round)</label><input type="number" name="borrow" value="0" min="0" max="${left}"></div>`;
        }
        if (isFrontMoney) html += `<div class="form-group"><label>Loan</label><select name="loan"><option value="cash">Cash: +2 CE, 2 Debt</option><option value="cover">Cover: temp HP, 1 Debt</option><option value="credit">Credit line: reroll, 2 Debt</option></select></div>`;
        if (usesFuel) html += `<div class="form-group"><label>Use stored charge (have ${r[fuel.key]})</label><input type="number" name="fuel" value="0" min="0" max="${r[fuel.key]}"></div>`;
        return html;
      },
      // Only ask when there's something to ask (otherwise fixed-cost cards stay one-click).
      get wantsAsk() { return isLoanShark || usesFuel; },
      async beforePay(actor, item, { spend, form }) {
        const r = store(actor);
        let borrowed = 0, extraCost = 0, extraDice = 0;
        if (isLoanShark) {
          if ((r.tab ?? 0) > debtLimit(actor)) extraCost = 1;
          else {
            const left = Math.max(0, rank(actor) - (r.borrowedThisRound ?? 0));
            borrowed = Math.max(0, Math.min(Number(form.borrow) || 0, left, spend));
            if (borrowed) { r.tab = (r.tab ?? 0) + borrowed; r.borrowedThisRound = (r.borrowedThisRound ?? 0) + borrowed; }
          }
        }
        if (usesFuel) {
          const n = Math.max(0, Math.min(Number(form.fuel) || 0, r[fuel.key] ?? 0));
          if (n) {
            r[fuel.key] -= n;
            if (fuel.fuel === "add") extraDice += n;          // Granite Blast: charge adds to the shot
            else borrowed += Math.min(n, spend - borrowed);    // Amber: charge pays instead of CE
          }
        }
        if (borrowed || extraDice || usesFuel || isLoanShark) await save(actor, r);
        this._extraDice = extraDice;
        return { borrowed, extraCost };
      },
      extraDice(actor, item, targets) {
        return (this._extraDice ?? 0) + (usesLeverage ? leverageDice(actor, targets) : 0);
      },
      async after(actor, item, { form, targets, degree, degrees, hit }) {
        // "+N Strain" style gains written on the card.
        for (const d of gains) {
          const m = (item.system.description ?? "").replace(/<[^>]+>/g, " ").match(d.gain);
          if (m) await step(actor, d.key, Number(m[1]) || 1);
        }
        if (isFrontMoney && targets.length) {
          const amt = form.loan === "cover" ? 1 : 2;
          await trackTargets(actor, "debt", targets);
          for (const t of targets) await step(actor, "debt", amt, t.uuid);
          if (form.loan === "cash") for (const t of targets) { try { if (t.isOwner) await t.gainCE?.(2); else ui.notifications.info(`${t.name} regains 2 CE (their owner updates it).`); } catch {} }
        }
        for (const rule of rules) {
          const trig = rule.on === "use" ? true
            : rule.on === "hit" ? (hit ?? false)
            : rule.on === "fail" ? null : true;
          if (rule.target) {
            for (const t of targets) {
              let amount = rule.amount;
              if (rule.on === "hit") { if (!hit) continue; if (degree === 3 && rule.critAmount) amount = rule.critAmount; }
              if (rule.on === "fail") { const dg = degrees?.get(t.uuid) ?? 1; if (dg >= 2) continue; if (dg === 0 && rule.critAmount) amount = rule.critAmount; }
              await trackTargets(actor, rule.res, [t], { loan: rule.loan, single: defOf(actor, rule.res)?.single });
              const cur = actor.getFlag(SYSTEM_ID, "res")?.[rule.res]?.[tk(t.uuid)]?.value ?? 0;
              const v = rule.op === "add" ? cur + amount : rule.op === "max" ? Math.max(cur, amount) : amount;
              await setValue(actor, rule.res, v, t.uuid);
            }
            if (!targets.length) ui.notifications.info(`${item.name}: target a token to track ${defOf(actor, rule.res)?.label ?? rule.res} automatically.`);
          } else if (trig) {
            const d = defOf(actor, rule.res);
            if (d?.kind === "toggle") await setValue(actor, rule.res, rule.amount);
            else if (d) await step(actor, rule.res, rule.op === "add" ? rule.amount : 0);
          }
        }
      }
    };
  }
};

/* ---------- turn, encounter and rest bookkeeping (active GM) ---------- */

async function startOfTurn(actor) {
  const defs = definitionsFor(actor);
  if (!defs.length) return;
  const res = store(actor);
  const notes = [];
  for (const d of defs) {
    if (d.reset === "turn" && d.kind === "number") res[d.key] = 0;
    if (d.kind === "toggle" && d.upkeep && res[d.key]) {
      const ce = actor.system.attributes.ce.value;
      if (ce >= d.upkeep) { await actor.update({ "system.attributes.ce.value": ce - d.upkeep }); notes.push(`${d.label}: paid ${d.upkeep} CE upkeep`); }
      else { res[d.key] = false; notes.push(`${d.label} drops (out of CE)`); }
    }
  }
  // Predatory Loan interest: +1 Debt at the start of your turn on each creature carrying your loan.
  const debt = res.debt;
  if (debt) {
    const lim = debtLimit(actor);
    for (const e of Object.values(debt)) if (e.loan && e.value < lim) { e.value += 1; notes.push(`interest: ${e.name} +1 Debt`); }
  }
  await save(actor, res);
  if (notes.length) whisper(actor, notes.join(" · "));
}

async function endOfEncounter(actor) {
  const defs = definitionsFor(actor);
  if (!defs.length) return;
  const res = store(actor);
  // The Lender's cut.
  if (actor.system.techniqueName === "Loan Shark" && (res.tab ?? 0) > 0) {
    const roll = await new Roll(`${res.tab}${actor.system.techniqueDie}`).evaluate();
    const hp = actor.system.attributes.hp.value;
    const left = Math.max(1, hp - roll.total);
    const up = { "system.attributes.hp.value": left };
    if (hp - roll.total < 1) up["system.conditions.drained"] = Math.max(1, actor.system.conditions.drained);
    await actor.update(up);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }), whisper: whisperIds(actor), rolls: [roll],
      content: `<div class="jjk-chat"><strong>The Lender's cut.</strong> Tab ${res.tab} × ${actor.system.techniqueDie}: ${esc(actor.name)} loses <strong>${roll.total} HP</strong> (cursed wounds)${hp - roll.total < 1 ? ", stops at 1 HP and is drained 1" : ""}. The Tab clears.</div>`
    });
  }
  for (const d of defs) {
    if (!["encounter", "turn"].includes(d.reset)) continue;
    if (d.kind === "target") {
      const map = res[d.key] ?? {};
      if (d.key === "debt") for (const e of Object.values(map)) { e.value = e.start ?? 0; delete e.loan; }
      else res[d.key] = {};
    } else res[d.key] = d.kind === "list" ? [] : d.kind === "toggle" ? false : 0;
  }
  await save(actor, res);
}

/** Reset (rest / meditation): clear rest and encounter resources; refill refilling ones. */
export async function onRest(actor) {
  const defs = definitionsFor(actor);
  if (!defs.length) return;
  const res = store(actor);
  for (const d of defs) {
    if (!["rest", "encounter", "turn"].includes(d.reset)) continue;
    if (d.refill) res[d.key] = maxOf(actor, d) ?? 0;
    else if (d.kind === "target") res[d.key] = {};
    else res[d.key] = d.kind === "list" ? [] : d.kind === "toggle" ? false : 0;
  }
  await save(actor, res);
}

/** Focused Flow clears 2 Throat Strain. */
export async function onFocusedFlow(actor) {
  if (actor.system.techniqueName !== "Cursed Speech") return;
  const res = store(actor);
  if (res.strain) { res.strain = Math.max(0, res.strain - 2); await save(actor, res); }
}

const whisperIds = actor => game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id);
function whisper(actor, text) {
  ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), whisper: whisperIds(actor), content: `<div class="jjk-chat jjk-res-note">${esc(text)}</div>` });
}

export async function chatAction() {}

/* ---------- afflictions (Cursed Venom, Cursed Plague) ---------- */

/** Afflictions tracked on someone's sheet: resource key → label and damage type. */
const AFFLICTIONS = { cursedVenom: { label: "Cursed Venom", type: "poison" }, cursedPlague: { label: "Cursed Plague", type: "disease" } };

/**
 * Start of an afflicted creature's turn: for each sorcerer tracking an affliction on it, the creature rolls Fortitude
 * vs that sorcerer's Technique DC; failure advances a stage (max 4), success drops one (below 1 it ends). Then it takes
 * the sorcerer's technique die × the stage and is sickened half the stage (min 1). Runs on the active GM.
 */
async function tickAfflictions(target) {
  const key = tk(target.uuid);
  const sources = game.actors.filter(a => a.type === "sorcerer" && Object.keys(AFFLICTIONS).some(k => a.getFlag(SYSTEM_ID, "res")?.[k]?.[key]));
  for (const owner of sources) {
    const res = store(owner);
    for (const [resKey, aff] of Object.entries(AFFLICTIONS)) {
      const entry = res[resKey]?.[key];
      if (!entry || !(entry.value > 0)) continue;
      const dc = owner.system.techniqueDC?.value ?? 15;
      const r = await target.rollSave("fortitude", { dc, prompt: false, dcLabel: `${aff.label} (${owner.name})` });
      const degree = r?.degree ?? 1;
      const before = entry.value;
      entry.value = Math.max(0, Math.min(4, before + (degree >= 2 ? -1 : 1)));
      if (entry.value < 1) {
        delete res[resKey][key];
        await save(owner, res);
        whisper(owner, `${target.name} shakes off ${aff.label}.`);
        continue;
      }
      await save(owner, res);
      const roll = await new Roll(`${entry.value}${owner.system.techniqueDie}`).evaluate();
      await target.applyDamage(roll.total, { reinforce: false });
      const sick = Math.max(1, Math.floor(entry.value / 2));
      if ((target.system.conditions?.sickened ?? 0) < sick) await target.update({ "system.conditions.sickened": sick });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: target }), rolls: [roll], whisper: whisperIds(owner),
        content: `<div class="jjk-chat jjk-res-note"><strong>${esc(aff.label)}</strong>: ${esc(target.name)} ${entry.value > before ? "worsens" : "eases"} to stage <strong>${entry.value}</strong>, takes <strong>${roll.total}</strong> ${aff.type} damage (${entry.value}${owner.system.techniqueDie}) and is sickened ${sick}.</div>`
      });
    }
  }
}

export function registerResources() {
  Hooks.on("updateCombat", async (combat, changed) => {
    if (!isActiveGM() || (!("turn" in changed) && !("round" in changed))) return;
    const actor = combat.combatant?.actor;
    if (!actor) return;
    await startOfTurn(actor);
    await tickAfflictions(actor);
  });
  Hooks.on("deleteCombat", async combat => {
    if (!isActiveGM()) return;
    const seen = new Set();
    for (const c of combat.combatants) {
      const a = c.actor;
      if (!a || seen.has(a.uuid)) continue;
      seen.add(a.uuid);
      await endOfEncounter(a);
    }
  });
}
