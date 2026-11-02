import "server-only";
import type { Card } from "@/lib/card";
import * as rules from "@/lib/marketplace-rules";
import { getCard, TcgUnavailableError } from "@/lib/tcg";
import {
  CONDITIONS,
  EXCHANGE_METHODS,
  type Condition,
  type Exchange,
  type ExchangeMethod,
  type MarketData,
  type OfferTerms,
  type Result,
  type Side,
} from "@/lib/types";
import { getDb, readMarket, resetMarket, transaction, writeChanges } from "./db";

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
  return typeof t === "object" && t !== null && isSide(t.buyer) && isSide(t.seller) && isExchange(t.exchange);
};
const cleanTerms = (t: OfferTerms): OfferTerms => ({
  buyer: { cash: t.buyer.cash, itemIds: t.buyer.itemIds },
  seller: { cash: t.seller.cash, itemIds: t.seller.itemIds },
  exchange: t.exchange,
});
const isExchange = (v: unknown): v is Exchange => {
  const e = v as Exchange;
  if (typeof e !== "object" || e === null || !isMethod(e.method)) return false;
  return e.method === "ship" ? e.paidBy === "buyer" || e.paidBy === "seller" : isText(e.meetup);
};

export function loadMarket(): MarketData {
  return readMarket(getDb());
}

export function isUser(userId: string) {
  return userId in loadMarket().users;
}

/** Re-runs a rule against the stored market and saves its changes in one transaction. */
function apply(me: string, rule: (m: MarketData, me: string) => rules.Outcome): Result {
  const db = getDb();
  return transaction(db, () => {
    const before = readMarket(db);
    if (!before.users[me]) return INVALID;
    const { result, market } = rule(before, me);
    if (result.ok) writeChanges(db, before, market);
    return result;
  });
}

export async function addCard(me: string, cardId: unknown, condition: unknown, id: unknown): Promise<Result> {
  if (!isRef(cardId) || !CONDITIONS.includes(condition as Condition) || !isNewId(id, "i")) return INVALID;
  const card = loadMarket().cards[cardId] ?? (await lookUpCard(cardId));
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

export function createListing(me: string, input: unknown, id: unknown): Result {
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

export function withdrawListing(me: string, listingId: unknown): Result {
  if (!isRef(listingId)) return INVALID;
  return apply(me, (m) => rules.withdrawListing(m, me, listingId));
}

export function makeOffer(me: string, listingId: unknown, terms: unknown, message: unknown, id: unknown): Result {
  if (!isRef(listingId) || !isTerms(terms) || !isText(message) || !isNewId(id, "o")) return INVALID;
  return apply(me, (m) => rules.makeOffer(m, me, listingId, cleanTerms(terms), message, id));
}

export function counterOffer(me: string, offerId: unknown, terms: unknown, message: unknown): Result {
  if (!isRef(offerId) || !isTerms(terms) || !isText(message)) return INVALID;
  return apply(me, (m) => rules.counterOffer(m, me, offerId, cleanTerms(terms), message));
}

export function acceptOffer(me: string, offerId: unknown): Result {
  if (!isRef(offerId)) return INVALID;
  return apply(me, (m) => rules.acceptOffer(m, me, offerId));
}

export function declineOffer(me: string, offerId: unknown): Result {
  if (!isRef(offerId)) return INVALID;
  return apply(me, (m) => rules.declineOffer(m, me, offerId));
}

export function resetDemo() {
  resetMarket(getDb());
}
