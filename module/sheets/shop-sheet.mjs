import { SYSTEM_ID, GRADES, GRADE_ORDER, formatYen, secondsPerDay } from "../config.mjs";
import { stockOf, priceOf, sellPriceOf, isListed, inStock, defaultStock, buy, sell, restockShop, advanceTime, payMission,
  formatWorldTime, formatSpan, restockIn, SELLABLE_TYPES } from "../shop.mjs";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const TextEditorImpl = () => foundry.applications.ux.TextEditor.implementation;
const STOCK_TYPES = ["weapon", "armor", "gear"];

/** The sorcerers this user can buy for: their assigned character first, then anything else they own. */
function buyersFor(user) {
  const list = game.actors.filter(a => a.type === "sorcerer" && (user.isGM ? a.hasPlayerOwner || a.isOwner : a.isOwner));
  const main = user.character;
  return main && list.includes(main) ? [main, ...list.filter(a => a !== main)] : list;
}

export class JJKShopSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["jjk", "sheet", "actor", "shop"],
    position: { width: 720, height: 780 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      buy: JJKShopSheet.#buy,
      sell: JJKShopSheet.#sell,
      viewItem: JJKShopSheet.#viewItem,
      removeStock: JJKShopSheet.#removeStock,
      restock: JJKShopSheet.#restock,
      advance: JJKShopSheet.#advance,
      payMission: () => payMission(),
      toggleOpen: JJKShopSheet.#toggleOpen,
      forget: JJKShopSheet.#forget
    }
  };
  static PARTS = { sheet: { template: `systems/${SYSTEM_ID}/templates/actor/shop-sheet.hbs`, scrollable: [".jjk-tab"] } };

  /** The character buying (per viewer, kept across renders). */
  _buyerId = null;

  get buyer() {
    const list = buyersFor(game.user);
    return list.find(a => a.id === this._buyerId) ?? list[0] ?? null;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const shop = this.document;
    const sys = shop.system;
    const isGM = game.user.isGM;
    const buyer = this.buyer;
    Object.assign(context, { actor: shop, system: sys, source: shop.system._source, isGM, editable: this.isEditable });
    context.kindOptions = { basic: "Basic supplies (always open)", rare: "Rare supplier (found by searching)" };
    context.gradeOptions = Object.fromEntries(GRADE_ORDER.map(k => [k, GRADES[k].label]));
    context.kindLabel = sys.kind === "basic" ? "Supplies" : "Rare";
    context.openToAll = (shop.ownership.default ?? 0) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
    context.discoveredBy = game.users.filter(u => !u.isGM && (shop.ownership[u.id] ?? -1) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER).map(u => u.name);

    // Clock.
    const wait = restockIn(shop);
    context.clock = { now: formatWorldTime(), restock: wait === null ? null : formatSpan(wait), day: secondsPerDay() };

    // Buyer and wallet.
    const buyers = buyersFor(game.user);
    context.buyerOptions = Object.fromEntries(buyers.map(a => [a.id, a.name]));
    context.buyerId = buyer?.id ?? "";
    context.wallet = buyer ? formatYen(buyer.system.yen) : null;
    const yen = buyer?.system.yen ?? 0;

    // Stock.
    const items = shop.items.contents.filter(i => STOCK_TYPES.includes(i.type)).sort((a, b) => a.type.localeCompare(b.type) || (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));
    context.stock = items.filter(i => isGM || isListed(i)).map(i => {
      const st = stockOf(i);
      const price = priceOf(shop, i);
      const available = isListed(i) && inStock(i);
      return {
        id: i.id, name: i.name, img: i.img, type: game.i18n.localize(`TYPES.Item.${i.type}`), isGear: i.type === "gear",
        per: i.type === "gear" && i.system.quantity > 1 ? ` (×${i.system.quantity})` : "",
        price: formatYen(price), basePrice: Math.round((i.system.yen ?? 0) * sys.markup / 100),
        stockText: st.unlimited ? "in stock" : st.qty ? `${st.qty} left` : "sold out",
        available, affordable: price <= yen, offCycle: st.pooled && !st.shown, st
      };
    });

    // What the buyer could sell here.
    context.canSell = sys.sellRate > 0 && !!buyer;
    context.sellable = context.canSell ? buyer.items.filter(i => SELLABLE_TYPES.includes(i.type) && (i.system.yen ?? 0) > 0).map(i => ({
      id: i.id, name: i.name, img: i.img, isGear: i.type === "gear", have: i.type === "gear" ? i.system.quantity : 1, price: formatYen(sellPriceOf(shop, i))
    })) : [];

    context.enrichedDescription = await TextEditorImpl().enrichHTML(sys.description, { relativeTo: shop, secrets: shop.isOwner });
    context.enrichedNotes = isGM ? await TextEditorImpl().enrichHTML(sys.gmNotes, { relativeTo: shop, secrets: true }) : "";
    return context;
  }

  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    this.element.addEventListener("dragover", ev => ev.preventDefault());
    this.element.addEventListener("drop", ev => this.#onDrop(ev), { capture: true });
    // Controls outside the form data: the buyer picker (everyone) and per-item stock fields (GM).
    this.element.addEventListener("change", ev => {
      const el = ev.target;
      if (el.matches?.("select.jjk-buyer")) { this._buyerId = el.value; this.render(); return; }
      const field = el.dataset?.stock;
      if (!field || !game.user.isGM) return;
      const item = this.document.items.get(el.closest("[data-item-id]")?.dataset.itemId);
      if (!item) return;
      let value = el.type === "checkbox" ? el.checked : el.value;
      if (field === "price") value = value === "" ? null : Math.max(0, Math.round(Number(value) || 0));
      else if (el.type !== "checkbox") value = Math.max(0, Math.round(Number(value) || 0));
      item.update({ [`flags.${SYSTEM_ID}.stock.${field}`]: value });
    });
  }

  /** Players only have Observer, which disables every input; turn the shopper's own controls back on. */
  async _onRender(context, options) {
    await super._onRender(context, options);
    for (const el of this.element.querySelectorAll(".jjk-live")) el.disabled = false;
  }

  /** GM: drop items, or a whole folder of items, to stock the shop. */
  async #onDrop(event) {
    const data = TextEditorImpl().getDragEventData(event);
    if (!["Item", "Folder"].includes(data?.type)) return;
    event.preventDefault();
    event.stopPropagation();
    if (!game.user.isGM) return;
    let sources = [];
    if (data.type === "Item") sources = [await Item.implementation.fromDropData(data)];
    else {
      const folder = await fromUuid(data.uuid);
      if (folder?.type !== "Item") return ui.notifications.warn("Drop a folder of items.");
      for (const e of folder.contents ?? []) sources.push(e instanceof foundry.abstract.Document ? e : await fromUuid(e.uuid));
    }
    const shop = this.document;
    const docs = sources.filter(i => i && STOCK_TYPES.includes(i.type) && i.parent !== shop).map(i => {
      const d = i.toObject();
      delete d._id;
      foundry.utils.setProperty(d, `flags.${SYSTEM_ID}.stock`, defaultStock(shop));
      return d;
    });
    const skipped = sources.filter(Boolean).length - docs.length;
    if (docs.length) await shop.createEmbeddedDocuments("Item", docs);
    if (skipped) ui.notifications.info(`${skipped} item(s) skipped: shops stock weapons, armor and gear only.`);
  }

  /* ---------- actions ---------- */

  static #buy(event, target) {
    const row = target.closest("[data-item-id]");
    const item = this.document.items.get(row.dataset.itemId);
    const buyer = this.buyer;
    if (!item) return;
    if (!buyer) return ui.notifications.warn("You need a sorcerer of your own to buy for.");
    const qty = Number(row.querySelector("input.qty")?.value) || 1;
    buy(this.document, item, buyer, qty);
  }

  static async #sell(event, target) {
    const row = target.closest("[data-sell-id]");
    const buyer = this.buyer;
    const item = buyer?.items.get(row.dataset.sellId);
    if (!item) return;
    const qty = Number(row.querySelector("input.qty")?.value) || 1;
    const ok = await DialogV2.confirm({ window: { title: "Sell" }, content: `<p>Sell <strong>${qty > 1 ? `${qty}× ` : ""}${item.name}</strong> to ${this.document.name}?</p>`, rejectClose: false });
    if (ok) sell(this.document, item, buyer, qty);
  }

  static #viewItem(event, target) {
    this.document.items.get(target.closest("[data-item-id]").dataset.itemId)?.sheet.render(true);
  }

  static async #removeStock(event, target) {
    if (!game.user.isGM) return;
    const item = this.document.items.get(target.closest("[data-item-id]").dataset.itemId);
    if (item) await item.delete();
  }

  static #restock() {
    if (game.user.isGM) restockShop(this.document);
  }

  static #advance(event, target) {
    const day = secondsPerDay();
    const span = { hour: 3600, eight: 8 * 3600, day, week: 7 * day }[target.dataset.span] ?? 0;
    advanceTime(span);
  }

  /** GM: open a basic shop to every player, or close it again. */
  static async #toggleOpen() {
    if (!game.user.isGM) return;
    const L = CONST.DOCUMENT_OWNERSHIP_LEVELS;
    const open = (this.document.ownership.default ?? 0) >= L.OBSERVER;
    await this.document.update({ "ownership.default": open ? L.NONE : L.OBSERVER });
  }

  /** GM: hide a rare shop from everyone who found it. */
  static async #forget() {
    if (!game.user.isGM) return;
    const ok = await DialogV2.confirm({ window: { title: "Hide shop" }, content: "<p>Hide this shop from every player again? They'll need to search to find it.</p>", rejectClose: false });
    if (!ok) return;
    const ownership = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };
    for (const [id, level] of Object.entries(this.document.ownership)) if (game.users.get(id)?.isGM) ownership[id] = level;
    await this.document.update({ ownership }, { diff: false, recursive: false });
  }
}
