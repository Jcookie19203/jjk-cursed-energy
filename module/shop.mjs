/**
 * Shops: buying, selling, searching for rare suppliers, the restock clock and mission pay.
 *
 * Players can't edit a GM-owned shop or see hidden ones, so every purchase, sale and search runs on the
 * active GM's client over the system socket. The requesting client only rolls and asks.
 */
import { SYSTEM_ID, GRADES, SKILLS, MISSION_PAY, formatYen, secondsPerDay, degreeOfSuccess } from "./config.mjs";
import { rollCheck } from "./dice.mjs";

const { DialogV2 } = foundry.applications.api;
const SOCKET = `system.${SYSTEM_ID}`;
const LEVELS = () => CONST.DOCUMENT_OWNERSHIP_LEVELS;
const esc = s => foundry.utils.escapeHTML?.(String(s)) ?? String(s);

export const SELLABLE_TYPES = ["weapon", "armor", "gear"];

/* ---------- stock helpers ---------- */

/** A shop item's stock entry, with defaults filled in. */
export function stockOf(item) {
  const s = item.flags?.[SYSTEM_ID]?.stock ?? {};
  const price = s.price === null || s.price === undefined || s.price === "" ? null : Number(s.price);
  return {
    unlimited: !!s.unlimited, qty: Math.max(0, Number(s.qty) || 0), max: Math.max(0, Number(s.max) || 0),
    pooled: !!s.pooled, shown: s.shown !== false, price: Number.isFinite(price) ? price : null
  };
}
/** What the shop charges for one of this item. */
export const priceOf = (shop, item) => stockOf(item).price ?? Math.round((item.system.yen ?? 0) * shop.system.markup / 100);
/** What the shop pays for one of this item. */
export const sellPriceOf = (shop, item) => Math.floor((item.system.yen ?? 0) * shop.system.sellRate / 100);
/** Visible to players (rotating stock that isn't out this cycle is hidden). */
export const isListed = item => { const s = stockOf(item); return !s.pooled || s.shown; };
export const inStock = item => { const s = stockOf(item); return s.unlimited || s.qty > 0; };
/** Default stock entry for an item newly dragged into a shop. */
export function defaultStock(shop) {
  const basic = shop.system.kind === "basic";
  return { unlimited: basic, qty: basic ? 0 : 1, max: basic ? 0 : 1, pooled: !basic && shop.system.rotate > 0, shown: true, price: null };
}

/* ---------- time ---------- */

/** "Day 12, 14:30" for a world time in seconds. */
export function formatWorldTime(t = game.time.worldTime) {
  const day = secondsPerDay();
  const d = Math.floor(t / day) + 1;
  const rem = ((t % day) + day) % day;
  const h = Math.floor(rem / 3600), m = Math.floor((rem % 3600) / 60);
  return `Day ${d}, ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
/** "3d 4h" for a span of seconds. */
export function formatSpan(sec) {
  const day = secondsPerDay();
  if (sec <= 0) return "now";
  const d = Math.floor(sec / day), h = Math.ceil((sec % day) / 3600);
  if (d && h) return `${d}d ${h}h`;
  return d ? `${d}d` : `${h}h`;
}
/** Seconds until this shop restocks, or null if it never does. */
export function restockIn(shop) {
  const s = shop.system;
  if (!s.restockDays || s.lastRestock === null) return null;
  return s.lastRestock + s.restockDays * secondsPerDay() - game.time.worldTime;
}
/** Seconds until this actor may search again (0 = now). */
export function searchCooldown(actor) {
  const last = actor.getFlag(SYSTEM_ID, "lastSearch");
  if (last === undefined || last === null) return 0;
  return Math.max(0, last + secondsPerDay() - game.time.worldTime);
}

/** GM: move the world clock forward. Shops restock when it passes their next restock time. */
export async function advanceTime(seconds) {
  if (!game.user.isGM) return;
  await game.time.advance(seconds);
}

/* ---------- socket plumbing ---------- */

const isActiveGM = () => (game.users.activeGM ? game.users.activeGM.isSelf : game.user.isGM);

/** Other modules (Domains) add GM-side actions here: { action: async msg => … }. */
export const gmHandlers = {};

/** Run an action on the active GM's client (directly, if that's us). */
export async function request(action, data) {
  const msg = { action, userId: game.user.id, ...data };
  if (isActiveGM()) return handle(msg);
  if (!game.users.activeGM) return ui.notifications.warn("A GM has to be logged in for this.");
  game.socket.emit(SOCKET, msg);
}

export function reply(userId, message, type = "info") {
  if (userId === game.user.id) return ui.notifications[type](message);
  game.socket.emit(SOCKET, { action: "notify", userId, message, type });
}

export function registerShops() {
  game.socket.on(SOCKET, msg => {
    if (msg?.action === "notify") {
      if (msg.userId === game.user.id) ui.notifications[msg.type ?? "info"](msg.message);
      return;
    }
    if (isActiveGM()) handle(msg);
  });

  // The restock clock: check whenever world time moves, and once on load.
  let pending = null;
  Hooks.on("updateWorldTime", () => {
    clearTimeout(pending);
    pending = setTimeout(checkRestocks, 250);
    rerenderShops();
  });
  Hooks.once("ready", () => checkRestocks());
}

function rerenderShops() {
  for (const app of foundry.applications.instances.values()) {
    const doc = app.document;
    if (doc?.documentName === "Actor" && (doc.type === "shop" || doc.type === "sorcerer") && app.rendered) app.render();
  }
}

async function handle(msg) {
  try {
    if (msg.action === "buy") return await doBuy(msg);
    if (msg.action === "sell") return await doSell(msg);
    if (msg.action === "search") return await doSearch(msg);
    if (gmHandlers[msg.action]) return await gmHandlers[msg.action](msg);
  } catch (err) {
    if (err.refusal) return reply(msg.userId, err.message, "warn");
    console.error(`${SYSTEM_ID} | shop`, err);
    reply(msg.userId, `Error: ${err.message}`, "error");
  }
}

/** An expected "no" (not a bug): shown to the player as a warning. */
export const refusal = message => Object.assign(new Error(message), { refusal: true });
export const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
async function shopMessage(shop, html, userIds) {
  await ChatMessage.create({
    speaker: { alias: shop?.name ?? "Shop" },
    content: `<div class="jjk-chat jjk-shop-msg">${html}</div>`,
    whisper: [...new Set([...userIds, ...gmIds()])]
  });
}

/** Shared checks: the user owns the actor and can see the shop. */
function resolve(msg) {
  const user = game.users.get(msg.userId);
  const shop = game.actors.get(msg.shopId);
  const actor = game.actors.get(msg.actorId);
  if (!user || !shop || shop.type !== "shop" || !actor) throw refusal("That shop or character no longer exists.");
  if (!actor.testUserPermission(user, "OWNER")) throw refusal(`You don't own ${actor.name}.`);
  if (!shop.testUserPermission(user, "OBSERVER")) throw refusal("You haven't found that shop.");
  return { user, shop, actor };
}

/* ---------- buy ---------- */

export function buy(shop, item, actor, qty = 1) {
  return request("buy", { shopId: shop.id, itemId: item.id, actorId: actor.id, qty });
}

async function doBuy(msg) {
  const { user, shop, actor } = resolve(msg);
  const item = shop.items.get(msg.itemId);
  if (!item || !isListed(item)) return reply(user.id, "That item isn't for sale any more.", "warn");
  const st = stockOf(item);
  const qty = item.type === "gear" ? Math.max(1, Math.floor(Number(msg.qty) || 1)) : 1;
  if (!st.unlimited && st.qty < qty) return reply(user.id, st.qty ? `Only ${st.qty} left.` : `${item.name} is sold out.`, "warn");
  const cost = priceOf(shop, item) * qty;
  if ((actor.system.yen ?? 0) < cost) return reply(user.id, `${actor.name} can't afford that (${formatYen(cost)}; has ${formatYen(actor.system.yen)}).`, "warn");

  // Hand over the goods: gear stacks onto a matching item, anything else arrives as a new item.
  const per = item.type === "gear" ? (item.system.quantity || 1) : 1;
  const existing = item.type === "gear" ? actor.items.find(i => i.type === "gear" && i.name === item.name) : null;
  await actor.update({ "system.yen": actor.system.yen - cost });
  if (existing) await existing.update({ "system.quantity": existing.system.quantity + per * qty });
  else {
    const data = item.toObject();
    delete data._id;
    if (data.flags?.[SYSTEM_ID]) delete data.flags[SYSTEM_ID].stock;
    if (item.type === "gear") data.system.quantity = per * qty;
    await actor.createEmbeddedDocuments("Item", [data]);
  }
  if (!st.unlimited) await item.update({ [`flags.${SYSTEM_ID}.stock.qty`]: st.qty - qty });

  await shopMessage(shop, `<header><h3>Purchase</h3></header>
    <p><strong>${esc(actor.name)}</strong> bought <strong>${qty > 1 ? `${qty}× ` : ""}${esc(item.name)}</strong> for <strong>${formatYen(cost)}</strong>.</p>
    <p class="jjk-sub">Wallet: ${formatYen(actor.system.yen)}</p>`, [user.id]);
}

/* ---------- sell ---------- */

export function sell(shop, item, actor, qty = 1) {
  return request("sell", { shopId: shop.id, itemId: item.id, actorId: actor.id, qty });
}

async function doSell(msg) {
  const { user, shop, actor } = resolve(msg);
  if (!shop.system.sellRate) return reply(user.id, `${shop.name} doesn't buy.`, "warn");
  const item = actor.items.get(msg.itemId);
  if (!item || !SELLABLE_TYPES.includes(item.type)) return reply(user.id, "You can't sell that here.", "warn");
  const have = item.type === "gear" ? item.system.quantity : 1;
  const qty = Math.min(have, Math.max(1, Math.floor(Number(msg.qty) || 1)));
  const each = sellPriceOf(shop, item);
  if (each <= 0) return reply(user.id, `${shop.name} won't pay anything for ${item.name}.`, "warn");
  const total = each * qty;

  // The shop takes it into stock as a one-off (it's gone again at the next restock once sold).
  const data = item.toObject();
  delete data._id;
  if (item.type === "gear") data.system.quantity = 1;
  if (item.type === "weapon") Object.assign(data.system, { charge: 0, equipped: false });
  if (item.type === "armor") data.system.equipped = false;
  const match = shop.items.find(i => i.name === item.name && i.type === item.type);
  if (match && !stockOf(match).unlimited) await match.update({ [`flags.${SYSTEM_ID}.stock.qty`]: stockOf(match).qty + qty, [`flags.${SYSTEM_ID}.stock.shown`]: true });
  else if (!match) {
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.stock`, { unlimited: false, qty, max: 0, pooled: false, shown: true, price: null });
    await shop.createEmbeddedDocuments("Item", [data]);
  }

  if (item.type === "gear" && have > qty) await item.update({ "system.quantity": have - qty });
  else await item.delete();
  await actor.update({ "system.yen": (actor.system.yen ?? 0) + total });

  await shopMessage(shop, `<header><h3>Sale</h3></header>
    <p><strong>${esc(actor.name)}</strong> sold <strong>${qty > 1 ? `${qty}× ` : ""}${esc(item.name)}</strong> for <strong>${formatYen(total)}</strong>.</p>
    <p class="jjk-sub">Wallet: ${formatYen(actor.system.yen)}</p>`, [user.id]);
}

/* ---------- search for rare suppliers ---------- */

/** Rare shops a character could still find with a search (GM view: used for the hint list). */
function searchable(actor, user, skill = null) {
  const rank = GRADES[actor.system.grade]?.rank ?? 1;
  return game.actors.filter(a => a.type === "shop" && a.system.kind === "rare"
    && !a.testUserPermission(user, "OBSERVER")
    && (GRADES[a.system.search.minGrade]?.rank ?? 1) <= rank
    && (!skill || !a.system.searchSkills.length || a.system.searchSkills.includes(skill)));
}

/** Player side: pick a skill, roll, and ask the GM which suppliers the result turns up. */
export async function startSearch(actor) {
  if (!actor?.isOwner || actor.type !== "sorcerer") return;
  const wait = searchCooldown(actor);
  if (wait > 0 && !game.user.isGM) return ui.notifications.warn(`${actor.name} already asked around today. Try again in ${formatSpan(wait)} of in-world time.`);

  const preferred = ["society", "thievery", "occultism", "diplomacy"];
  const best = preferred.reduce((a, b) => (actor.system.skillMods[b].mod > actor.system.skillMods[a].mod ? b : a));
  const options = Object.entries(SKILLS).map(([k, v]) => {
    const label = k === "lore" ? (actor.system.loreName || "Lore") : v.label;
    const mod = actor.system.skillMods[k].mod;
    return `<option value="${k}" ${k === best ? "selected" : ""}>${esc(label)} (${mod >= 0 ? "+" : ""}${mod})</option>`;
  }).join("");

  let choice;
  try {
    choice = await DialogV2.prompt({
      window: { title: `Look for a supplier — ${actor.name}` },
      content: `<div class="jjk-dialog">
        <p class="hint">Spend a day asking around for somewhere that sells rarer goods. Some places only open up to certain approaches (an underworld fence wants Thievery; a shrine wants Religion), and some won't deal with you until you've proven your Grade.</p>
        <div class="form-group"><label>How you search</label><select name="skill">${options}</select></div>
        <div class="form-group"><label>What you're after</label><input type="text" name="wanted" placeholder="e.g. a Grade 3 cursed blade"></div>
        <div class="form-group"><label>Situational modifier</label><input type="number" name="bonus" value="0"></div></div>`,
      ok: { label: "Search", callback: (e, button) => { const f = button.form.elements; return { skill: f.skill.value, wanted: f.wanted.value.trim(), bonus: Number(f.bonus.value) || 0 }; } },
      rejectClose: false
    });
  } catch { return; }
  if (!choice) return;

  const label = choice.skill === "lore" ? (actor.system.loreName || "Lore") : SKILLS[choice.skill].label;
  const result = await rollCheck({ actor, label: `Search for a supplier (${label})`, modifier: actor.system.skillMods[choice.skill].mod + choice.bonus, prompt: false });
  if (!result) return;
  return request("search", { actorId: actor.id, skill: choice.skill, wanted: choice.wanted, total: result.roll.total, natural: result.roll.dice[0].total });
}

async function doSearch(msg) {
  const user = game.users.get(msg.userId);
  const actor = game.actors.get(msg.actorId);
  if (!user || !actor?.testUserPermission(user, "OWNER")) throw refusal("You don't own that character.");
  const now = game.time.worldTime;
  if (!user.isGM && searchCooldown(actor) > 0) return reply(user.id, `${actor.name} already searched today.`, "warn");
  await actor.setFlag(SYSTEM_ID, "lastSearch", now);
  // A GM rolling for a player's character reveals the shop to that player.
  const finder = user.isGM ? (game.users.find(u => !u.isGM && actor.testUserPermission(u, "OWNER")) ?? user) : user;

  const rolls = searchable(actor, finder, msg.skill).map(shop => ({ shop, degree: degreeOfSuccess(msg.total, msg.natural, shop.system.search.dc) }));
  const found = rolls.filter(r => r.degree >= 2).sort((a, b) => b.degree - a.degree || Math.random() - 0.5);
  const reveal = found.slice(0, found.some(r => r.degree === 3) ? 2 : 1);
  for (const { shop } of reveal) await shop.update({ [`ownership.${finder.id}`]: LEVELS().OBSERVER });
  const trouble = msg.natural === 1 || (rolls.length > 0 && rolls.every(r => r.degree === 0));

  const wanted = msg.wanted ? `<p class="jjk-sub">Looking for: ${esc(msg.wanted)}</p>` : "";
  const body = reveal.length
    ? reveal.map(({ shop }) => `<p>📍 <strong>${esc(shop.name)}</strong>${shop.system.location ? ` · ${esc(shop.system.location)}` : ""}</p>${shop.system.search.hint ? `<p><em>${esc(shop.system.search.hint)}</em></p>` : ""}`).join("")
      + `<p class="jjk-sub">It's now in your Actors list and on your Gear tab.</p>`
    : `<p>A day of asking around turns up nothing useful.</p>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="jjk-chat jjk-shop-msg"><header><h3>Supplier search: ${esc(actor.name)}</h3></header>${wanted}${body}</div>`,
    whisper: [...new Set([user.id, finder.id, ...gmIds()])]
  });

  // GM-only detail: what the roll could have found, and whether it drew attention.
  const gmLines = rolls.length
    ? rolls.map(r => `<li>${esc(r.shop.name)} (DC ${r.shop.system.search.dc}): ${["critical failure", "failure", "success", "critical success"][r.degree]}${reveal.some(x => x.shop === r.shop) ? " · revealed" : ""}</li>`).join("")
    : "<li>No hidden rare shop accepts this skill at this Grade.</li>";
  await ChatMessage.create({
    speaker: { alias: "Supplier search (GM)" },
    content: `<div class="jjk-chat jjk-shop-msg"><header><h3>Search result: ${msg.total}</h3></header><ul>${gmLines}</ul>
      ${trouble ? `<p><strong>Critical failure:</strong> the questions reached the wrong ears. Someone (a curse user, a fence's muscle, the higher-ups) now knows ${esc(actor.name)} is looking.</p>` : ""}</div>`,
    whisper: gmIds()
  });
}

/* ---------- restocking ---------- */

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Refill stock to its restock level, rotate pooled items, and drop sold-out one-offs. */
export async function restockShop(shop, { at = game.time.worldTime, announce = true } = {}) {
  const f = `flags.${SYSTEM_ID}.stock`;
  const pooled = shop.items.filter(i => stockOf(i).pooled);
  const out = new Set(shop.system.rotate > 0 ? shuffle(pooled).slice(0, shop.system.rotate) : pooled);
  const updates = [], deletes = [];
  for (const item of shop.items) {
    const st = stockOf(item);
    if (st.pooled) {
      const on = out.has(item);
      const up = { _id: item.id, [`${f}.shown`]: on };
      if (!st.unlimited) up[`${f}.qty`] = on ? Math.max(1, st.max) : 0;
      updates.push(up);
    } else if (st.unlimited) continue;
    else if (st.max > 0) updates.push({ _id: item.id, [`${f}.qty`]: st.max });
    else if (st.qty <= 0) deletes.push(item.id);
  }
  if (updates.length) await shop.updateEmbeddedDocuments("Item", updates);
  if (deletes.length) await shop.deleteEmbeddedDocuments("Item", deletes);
  await shop.update({ "system.lastRestock": at });
  if (announce) {
    await ChatMessage.create({
      speaker: { alias: shop.name },
      content: `<div class="jjk-chat jjk-shop-msg"><p><strong>${esc(shop.name)}</strong> restocked (${formatWorldTime(at)}).</p></div>`,
      whisper: gmIds()
    });
  }
}

/** Active GM only: restock every shop whose time has come. */
export async function checkRestocks() {
  if (!isActiveGM()) return;
  const now = game.time.worldTime;
  const day = secondsPerDay();
  for (const shop of game.actors.filter(a => a.type === "shop")) {
    const s = shop.system;
    if (s.lastRestock === null || s.lastRestock > now) { await shop.update({ "system.lastRestock": now }); continue; }
    if (!s.restockDays) continue;
    const period = s.restockDays * day;
    const cycles = Math.floor((now - s.lastRestock) / period);
    if (cycles >= 1) await restockShop(shop, { at: s.lastRestock + cycles * period });
  }
}

/* ---------- mission pay ---------- */

/** GM: pay one or more sorcerers, each prefilled with the suggested pay for their Grade. */
export async function payMission(actors = null) {
  if (!game.user.isGM) return ui.notifications.warn("Only the GM can hand out pay.");
  actors ??= game.actors.filter(a => a.type === "sorcerer" && a.hasPlayerOwner);
  if (!actors.length) return ui.notifications.warn("There are no player-owned sorcerers to pay.");
  const rows = actors.map(a => `<div class="form-group"><label>${esc(a.name)} <span class="hint">(${GRADES[a.system.grade]?.label}, has ${formatYen(a.system.yen)})</span></label>
    <input type="number" name="${a.id}" value="${MISSION_PAY[a.system.grade] ?? 0}" step="1000"></div>`).join("");
  let pay;
  try {
    pay = await DialogV2.prompt({
      window: { title: "Mission pay" },
      content: `<div class="jjk-dialog"><p class="hint">Suggested pay per job for each Grade is prefilled. Use a negative number to take money away.</p>${rows}
        <div class="form-group"><label>Job</label><input type="text" name="job" placeholder="e.g. Sunrise Heights exorcism"></div></div>`,
      ok: { label: "Pay", callback: (e, button) => Object.fromEntries([...button.form.elements].filter(el => el.name).map(el => [el.name, el.value])) },
      rejectClose: false
    });
  } catch { return; }
  if (!pay) return;
  const lines = [];
  for (const a of actors) {
    const amount = Math.round(Number(pay[a.id]) || 0);
    if (!amount) continue;
    await a.update({ "system.yen": Math.max(0, (a.system.yen ?? 0) + amount) });
    lines.push(`<li>${esc(a.name)}: ${amount > 0 ? "+" : ""}${formatYen(amount)} → ${formatYen(a.system.yen)}</li>`);
  }
  if (lines.length) await ChatMessage.create({
    speaker: { alias: "Jujutsu headquarters" },
    content: `<div class="jjk-chat jjk-shop-msg"><header><h3>Mission pay${pay.job ? `: ${esc(pay.job)}` : ""}</h3></header><ul>${lines.join("")}</ul></div>`
  });
}
