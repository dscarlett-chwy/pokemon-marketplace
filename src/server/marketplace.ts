import "server-only";
import type { Card } from "@/lib/card";
import * as rules from "@/lib/marketplace-rules";
import { getCard, TcgUnavailableError } from "@/lib/tcg";
import {
  CONDITIONS,
  EXCHANGE_METHODS,
  PAYMENT_METHODS,
  TRADE_STEPS,
  type Condition,
  type Exchange,
  type ExchangeMethod,
  type MarketData,
  type OfferTerms,
  type Result,
  type Side,
  type TradeStep,
} from "@/lib/types";
import { getDb, readMarket, resetMarket, transaction, writeChanges } from "./db";

export { addUser, isUser } from "./db";

const INVALID: Result = { ok: false, error: "That request wasn't valid. Refresh the page and try again." };
const MAX_TEXT = 280;
const MAX_TRADE_CARDS = 50;

const isRef = (v: unknown): v is string => typeof v === "string" && /^[\w.-]{1,64}$/.test(v);
const isNewId = (v: unknown, prefix: string): v is string =>
  typeof v === "string" && new RegExp(`^${prefix}-[a-z0-9]{1,16}$`).test(v);
const isText = (v: unknown): v is string => typeof v === "string" && v.length <= MAX_TEXT;
const isMethod = (v: unknown): v is ExchangeMethod => EXCHANGE_METHODS.includes(v as ExchangeMethod);
const isSide = (v: unknown): v is Side => {
  const s = v as Side;
  return (
    typeof s === "object" &&
    s !== null &&
    typeof s.cash === "number" &&
    Array.isArray(s.itemIds) &&
    s.itemIds.length <= MAX_TRADE_CARDS &&
    s.itemIds.every(isRef)
  );
};
const isTerms = (v: unknown): v is OfferTerms => {
  const t = v as OfferTerms;
  return (
    typeof t === "object" &&
    t !== null &&
    isSide(t.buyer) &&
    isSide(t.seller) &&
    isExchange(t.exchange) &&
    (t.payment === null || PAYMENT_METHODS.includes(t.payment))
  );
};
const cleanTerms = (t: OfferTerms): OfferTerms => ({
  buyer: { cash: t.buyer.cash, itemIds: t.buyer.itemIds },
  seller: { cash: t.seller.cash, itemIds: t.seller.itemIds },
  exchange: t.exchange,
  payment: t.payment,
});
const isExchange = (v: unknown): v is Exchange => {
  const e = v as Exchange;
  if (typeof e !== "object" || e === null || !isMethod(e.method)) return false;
  return e.method === "ship" ? e.paidBy === "buyer" || e.paidBy === "seller" : isText(e.meetup);
};

async function loadMarket(): Promise<MarketData> {
  return readMarket(await getDb());
}

/**
 * The part of the market one visitor may see: their own cards and offers, the cards they could ask
 * a trading partner to add, and every listing. Closed listings stay public so their links still
 * work, but who bought the card doesn't. Rules still run against the full market.
 */
export async function marketFor(viewer: string | null): Promise<MarketData> {
  const full = await loadMarket();
  const { listings } = full;
  const offers = Object.fromEntries(
    Object.entries(full.offers).filter(([, o]) => viewer !== null && (o.buyerId === viewer || o.sellerId === viewer)),
  );

  // Collectors whose tradeable cards the viewer may ask for in an offer or counter.
  const partners = new Set<string>();
  if (viewer) {
    for (const l of Object.values(full.listings)) if (l.status === "active" && l.openToTrades) partners.add(l.sellerId);
    for (const o of Object.values(offers)) {
      if (o.status === "pending" && full.listings[o.listingId]?.openToTrades) partners.add(o.buyerId).add(o.sellerId);
    }
    partners.delete(viewer);
  }

  // Each visible item mapped to whether its owner may be shown.
  const shown = new Map<string, boolean>();
  const show = (id: string, owner: boolean) => {
    if (full.items[id]) shown.set(id, owner || shown.get(id) === true);
  };
  for (const item of Object.values(full.items)) if (item.ownerId === viewer) show(item.id, true);
  // A card someone bought would reveal the buyer through its old listing, so it stays out of their binder.
  const changedHands = new Set(Object.values(listings).flatMap((l) => (full.items[l.itemId]?.ownerId === l.sellerId ? [] : [l.itemId])));
  for (const partner of partners) {
    for (const item of rules.tradeableItems(full, partner)) if (!changedHands.has(item.id)) show(item.id, true);
  }
  for (const l of Object.values(listings)) {
    show(l.itemId, full.items[l.itemId]?.ownerId === l.sellerId && (l.status === "active" || l.status === "trading"));
  }
  for (const o of Object.values(offers)) {
    const parties = [o.buyerId, o.sellerId];
    const ids = [listings[o.listingId]?.itemId, ...o.rounds.flatMap((r) => rules.offeredItemIds(r.terms))];
    for (const id of ids) if (id) show(id, parties.includes(full.items[id]?.ownerId));
  }

  const items: MarketData["items"] = {};
  for (const [id, owner] of shown) items[id] = owner ? full.items[id] : { ...full.items[id], ownerId: "" };

  const cards: MarketData["cards"] = {};
  for (const item of Object.values(items)) if (full.cards[item.cardId]) cards[item.cardId] = full.cards[item.cardId];

  const userIds = new Set([
    ...(viewer ? [viewer] : []),
    ...Object.values(listings).map((l) => l.sellerId),
    ...Object.values(offers).flatMap((o) => [o.buyerId, o.sellerId]),
    ...Object.values(items).map((i) => i.ownerId),
  ]);
  const users: MarketData["users"] = {};
  for (const id of userIds) if (full.users[id]) users[id] = full.users[id];

  return { users, cards, items, listings, offers };
}

/** Re-runs a rule against the stored market and saves its changes in one transaction. */
function apply(me: string, rule: (m: MarketData, me: string) => rules.Outcome): Promise<Result> {
  return transaction(async (tx) => {
    const before = await readMarket(tx);
    if (!before.users[me]) return INVALID;
    const { result, market } = rule(before, me);
    if (result.ok) await writeChanges(tx, before, market);
    return result;
  });
}

export async function addCard(me: string, cardId: unknown, condition: unknown, id: unknown): Promise<Result> {
  if (!isRef(cardId) || !CONDITIONS.includes(condition as Condition) || !isNewId(id, "i")) return INVALID;
  const card = (await loadMarket()).cards[cardId] ?? (await lookUpCard(cardId));
  if (typeof card === "string") return { ok: false, error: card };
  return apply(me, (m) => rules.addCard(m, me, card, condition as Condition, id));
}

/** Card details come from the catalog, never from the browser, so prices can't be made up. */
async function lookUpCard(cardId: string): Promise<Card | string> {
  try {
    return await getCard(cardId);
  } catch (error) {
    return error instanceof TcgUnavailableError ? error.message : "Card lookup failed";
  }
}

export async function createListing(me: string, input: unknown, id: unknown): Promise<Result> {
  const i = input as rules.ListingInput;
  if (typeof i !== "object" || i === null || !isNewId(id, "l")) return INVALID;
  if (!isRef(i.itemId) || typeof i.askingPrice !== "number" || typeof i.openToTrades !== "boolean" || !isText(i.note)) {
    return INVALID;
  }
  if (!Array.isArray(i.exchangeMethods) || !i.exchangeMethods.every(isMethod) || !isText(i.area)) return INVALID;
  const clean = {
    itemId: i.itemId,
    askingPrice: i.askingPrice,
    openToTrades: i.openToTrades,
    exchangeMethods: i.exchangeMethods,
    area: i.area,
    note: i.note,
  };
  return apply(me, (m) => rules.createListing(m, me, clean, id));
}

export async function withdrawListing(me: string, listingId: unknown): Promise<Result> {
  if (!isRef(listingId)) return INVALID;
  return apply(me, (m) => rules.withdrawListing(m, me, listingId));
}

export async function makeOffer(me: string, listingId: unknown, terms: unknown, message: unknown, id: unknown): Promise<Result> {
  if (!isRef(listingId) || !isTerms(terms) || !isText(message) || !isNewId(id, "o")) return INVALID;
  return apply(me, (m) => rules.makeOffer(m, me, listingId, cleanTerms(terms), message, id));
}

export async function counterOffer(me: string, offerId: unknown, terms: unknown, message: unknown): Promise<Result> {
  if (!isRef(offerId) || !isTerms(terms) || !isText(message)) return INVALID;
  return apply(me, (m) => rules.counterOffer(m, me, offerId, cleanTerms(terms), message));
}

export async function acceptOffer(me: string, offerId: unknown): Promise<Result> {
  if (!isRef(offerId)) return INVALID;
  return apply(me, (m) => rules.acceptOffer(m, me, offerId));
}

export async function declineOffer(me: string, offerId: unknown): Promise<Result> {
  if (!isRef(offerId)) return INVALID;
  return apply(me, (m) => rules.declineOffer(m, me, offerId));
}

export async function completeStep(me: string, offerId: unknown, step: unknown): Promise<Result> {
  if (!isRef(offerId) || !TRADE_STEPS.includes(step as TradeStep)) return INVALID;
  return apply(me, (m) => rules.completeStep(m, me, offerId, step as TradeStep));
}

export async function cancelTrade(me: string, offerId: unknown): Promise<Result> {
  if (!isRef(offerId)) return INVALID;
  return apply(me, (m) => rules.cancelTrade(m, me, offerId));
}

/** Accounts survive a reset; their cards, listings and offers don't. */
export function resetDemo() {
  return resetMarket();
}
