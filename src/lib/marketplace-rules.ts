import type { Card } from "./card";
import { METHOD_LABELS } from "./exchange";
import { HANDLE_MAX, isHandle } from "./handle";
import {
  EXCHANGE_METHODS,
  type Condition,
  type ExchangeMethod,
  type Listing,
  type ListingStatus,
  type MarketData,
  type Offer,
  type OfferTerms,
  type Party,
  type PaymentMethod,
  type Result,
  type Side,
  type Trade,
  type TradeStep,
} from "./types";

/**
 * Pure marketplace rules shared by the browser (instant feedback) and the server (source of truth).
 * Each rule returns the next market; changed rows are new objects, untouched rows keep their identity.
 */
export type Outcome = { result: Result; market: MarketData };

const fail = (market: MarketData, error: string): Outcome => ({ result: { ok: false, error }, market });
const done = (market: MarketData, id: string): Outcome => ({ result: { ok: true, id }, market });
const TAKEN = "Something went wrong. Please try again.";

export const newId = (prefix: "i" | "l" | "o") => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export function whoseTurn(offer: Offer): Party {
  return offer.rounds[offer.rounds.length - 1].by === "buyer" ? "seller" : "buyer";
}

export function latestTerms(offer: Offer): OfferTerms {
  return offer.rounds[offer.rounds.length - 1].terms;
}

export function partyOf(offer: Offer, userId: string): Party | null {
  if (offer.buyerId === userId) return "buyer";
  if (offer.sellerId === userId) return "seller";
  return null;
}

/** Cards either side adds on top of the listed card. */
export const offeredItemIds = (terms: OfferTerms) => [...terms.buyer.itemIds, ...terms.seller.itemIds];

/**
 * What an offer's terms are checked against. An offer on a listing takes the listing's card, trade
 * and handover options. A direct offer has no listed card and allows any handover.
 */
export type Deal = {
  listing: Listing | null;
  sellerId: string;
  openToTrades: boolean;
  exchangeMethods: ExchangeMethod[];
  area: string;
};

export const listingDeal = (listing: Listing): Deal => ({
  listing,
  sellerId: listing.sellerId,
  openToTrades: listing.openToTrades,
  exchangeMethods: listing.exchangeMethods,
  area: listing.area,
});

export function dealOf(listings: Record<string, Listing>, offer: Pick<Offer, "listingId" | "sellerId">): Deal {
  const listing = listings[offer.listingId];
  if (listing) return listingDeal(listing);
  return { listing: null, sellerId: offer.sellerId, openToTrades: true, exchangeMethods: [...EXCHANGE_METHODS], area: "" };
}

/** The card that stands for an offer in lists: the listed card, or else the first card either side adds. */
export const leadItemId = (deal: Deal, terms: OfferTerms): string | undefined =>
  deal.listing?.itemId ?? terms.seller.itemIds[0] ?? terms.buyer.itemIds[0];

/** Every card that changes owners if the deal goes through. */
export const tradedItemIds = (deal: Deal, terms: OfferTerms) => [
  ...(deal.listing ? [deal.listing.itemId] : []),
  ...offeredItemIds(terms),
];

export function activeListingForItem(listings: Record<string, Listing>, itemId: string) {
  return Object.values(listings).find((l) => l.itemId === itemId && l.status === "active");
}

/** Cards held by trades in progress, mapped to the offer that holds them. */
export function lockedItems(data: Pick<MarketData, "listings" | "offers">) {
  const locked = new Map<string, string>();
  for (const o of Object.values(data.offers)) {
    if (o.trade?.status !== "active") continue;
    for (const id of tradedItemIds(dealOf(data.listings, o), latestTerms(o))) locked.set(id, o.id);
  }
  return locked;
}

/** Cards a collector could put into an offer: owned, open to trade, not up for sale, and not in a trade. */
export function tradeableItems(data: Pick<MarketData, "items" | "listings" | "offers">, userId: string) {
  const locked = lockedItems(data);
  return Object.values(data.items).filter(
    (i) => i.ownerId === userId && i.openToTrade && !activeListingForItem(data.listings, i.id) && !locked.has(i.id),
  );
}

const other = (party: Party): Party => (party === "buyer" ? "seller" : "buyer");

export type StepState = { party: Party; step: TradeStep; done: boolean; ready: boolean };

/**
 * The checklist for an accepted offer. Whoever pays online pays first, and the other side sends
 * only once the money is held. Each side confirms receipt after the other side has sent.
 */
export function tradeSteps(offer: Offer): StepState[] {
  const { trade } = offer;
  if (!trade) return [];
  const terms = latestTerms(offer);
  const pays = payer(terms);
  const plan: Record<Party, TradeStep[]> = { buyer: [], seller: [] };
  for (const party of ["buyer", "seller"] as const) {
    const paying = pays?.party === party;
    if (paying && terms.payment === "online") plan[party].push("pay");
    if (party === "seller" || terms.buyer.itemIds.length > 0 || (paying && terms.payment === "in_person")) {
      plan[party].push("send");
    }
  }
  for (const party of ["buyer", "seller"] as const) {
    if (plan[other(party)].includes("send")) plan[party].push("receive");
  }
  const isDone = (party: Party, step: TradeStep) => trade.status === "complete" || trade.done[party].includes(step);
  const isReady = (party: Party, step: TradeStep) => {
    const them = other(party);
    if (step === "send") return !plan[them].includes("pay") || isDone(them, "pay");
    if (step === "receive") return isDone(them, "send");
    return true;
  };
  return (["buyer", "seller"] as const).flatMap((party) =>
    plan[party].map((step) => ({ party, step, done: isDone(party, step), ready: isReady(party, step) })),
  );
}

/** True when the collector has to reply to an offer or has a trade step they can do now. */
export function needsAction(offer: Offer, userId: string) {
  const party = partyOf(offer, userId);
  if (!party) return false;
  if (offer.status === "pending") return whoseTurn(offer) === party;
  if (offer.trade?.status !== "active") return false;
  return tradeSteps(offer).some((s) => s.party === party && s.ready && !s.done);
}

function checkSide(m: MarketData, userId: string, side: Side): string | null {
  const tradeable = new Set(tradeableItems(m, userId).map((i) => i.id));
  const missing = side.itemIds.find((id) => !tradeable.has(id));
  if (!missing) return null;
  const card = m.cards[m.items[missing]?.cardId];
  return `${card?.name ?? "A card"} is no longer available to trade.`;
}

function checkTerms(m: MarketData, deal: Deal, buyerId: string, terms: OfferTerms): string | null {
  const { buyer, seller, exchange } = terms;
  if (![buyer.cash, seller.cash].every((c) => Number.isFinite(c) && c >= 0)) return "Cash must be zero or more.";
  if (buyer.cash === 0 && buyer.itemIds.length === 0) return "The buyer has to give cash, cards, or both.";
  if (buyer.cash > 0 && seller.cash > 0) return "Only one side can add cash. Lower the other side's cash to $0.";
  if (!deal.openToTrades && buyer.itemIds.length + seller.itemIds.length > 0) {
    return "This seller only takes cash for this card.";
  }
  if (!deal.exchangeMethods.includes(exchange.method)) {
    const allowed = deal.exchangeMethods.map((x) => METHOD_LABELS[x].toLowerCase()).join(" or ");
    return `${METHOD_LABELS[exchange.method]} isn't an option for this card. Choose ${allowed}.`;
  }
  if (exchange.method === "ship" && exchange.paidBy !== "buyer" && exchange.paidBy !== "seller") {
    return "Choose who pays for shipping.";
  }
  if (exchange.method !== "ship" && exchange.meetup.length > MAX_MEETUP) {
    return `Keep the meetup details under ${MAX_MEETUP} characters.`;
  }
  if (buyer.cash + seller.cash > 0) {
    if (terms.payment === null) return "Choose how the cash gets paid.";
    if (terms.payment === "in_person" && exchange.method === "ship") {
      return "Paying in person only works for pickup or drop-off. Choose online payment.";
    }
  }
  return checkSide(m, buyerId, buyer) ?? checkSide(m, deal.sellerId, seller);
}

export const defaultPayment = (method: ExchangeMethod): PaymentMethod => (method === "ship" ? "online" : "in_person");

/** Who sends money, if anyone. Only one side can add cash. */
export function payer(terms: OfferTerms): { party: Party; cash: number } | null {
  if (terms.buyer.cash > 0) return { party: "buyer", cash: terms.buyer.cash };
  if (terms.seller.cash > 0) return { party: "seller", cash: terms.seller.cash };
  return null;
}

const cleanSide = ({ cash, itemIds }: Side): Side => ({
  cash: Math.round(cash * 100) / 100,
  itemIds: [...new Set(itemIds)],
});

const cleanTerms = ({ buyer, seller, exchange, payment }: OfferTerms): OfferTerms => ({
  buyer: cleanSide(buyer),
  seller: cleanSide(seller),
  payment: buyer.cash + seller.cash > 0 ? payment : null,
  exchange:
    exchange.method === "ship"
      ? { method: "ship", paidBy: exchange.paidBy }
      : { method: exchange.method, meetup: exchange.meetup.trim() },
});

function respond(m: MarketData, me: string, offerId: string): { offer: Offer; deal: Deal } | string {
  const offer = m.offers[offerId];
  if (!offer) return "That offer no longer exists.";
  if (offer.status !== "pending") return "This offer is already closed.";
  if (partyOf(offer, me) !== whoseTurn(offer)) return "It's the other collector's turn to respond.";
  const deal = dealOf(m.listings, offer);
  if (deal.listing && deal.listing.status !== "active") return "This card is no longer for sale.";
  return { offer, deal };
}

export function addCard(m: MarketData, me: string, card: Card, condition: Condition, id: string): Outcome {
  if (m.items[id]) return fail(m, TAKEN);
  return done(
    {
      ...m,
      cards: { ...m.cards, [card.id]: card },
      items: { ...m.items, [id]: { id, ownerId: me, cardId: card.id, condition, openToTrade: true } },
    },
    id,
  );
}

/** Cards switched off stay out of new offers, and pending offers that hold them can no longer be accepted. */
export function setOpenToTrade(m: MarketData, me: string, itemId: string, open: boolean): Outcome {
  const item = m.items[itemId];
  if (!item || item.ownerId !== me) return fail(m, "You can only change your own cards.");
  if (item.openToTrade === open) return done(m, itemId);
  return done({ ...m, items: { ...m.items, [itemId]: { ...item, openToTrade: open } } }, itemId);
}

export const MAX_NAME = 40;

export type ProfileInput = { name: string; handle: string };

export function setProfile(m: MarketData, me: string, input: ProfileInput): Outcome {
  const user = m.users[me];
  const name = input.name.trim();
  const handle = input.handle.trim().toLowerCase();
  if (!user) return fail(m, TAKEN);
  if (!name) return fail(m, "Add a name so other collectors know who they're trading with.");
  if (name.length > MAX_NAME) return fail(m, `Keep your name under ${MAX_NAME} characters.`);
  if (!isHandle(handle)) {
    return fail(m, `Use 3 to ${HANDLE_MAX} letters, numbers, or single hyphens for your handle, starting and ending with a letter or number.`);
  }
  if (Object.values(m.users).some((u) => u.id !== me && u.handle === handle)) return fail(m, "That handle is taken. Try another.");
  return done({ ...m, users: { ...m.users, [me]: { ...user, name, handle } } }, me);
}

export type ListingInput = {
  itemId: string;
  askingPrice: number;
  openToTrades: boolean;
  exchangeMethods: ExchangeMethod[];
  area: string;
  note: string;
};

export const MAX_AREA = 60;
export const MAX_MEETUP = 120;

export const meetsInPerson = (methods: ExchangeMethod[]) => methods.some((x) => x !== "ship");

export function createListing(m: MarketData, me: string, input: ListingInput, id: string): Outcome {
  const { itemId, askingPrice, openToTrades, note } = input;
  const exchangeMethods = EXCHANGE_METHODS.filter((x) => input.exchangeMethods.includes(x));
  const area = meetsInPerson(exchangeMethods) ? input.area.trim() : "";
  const item = m.items[itemId];
  if (!item || item.ownerId !== me) return fail(m, "You can only list cards you own.");
  if (activeListingForItem(m.listings, itemId)) return fail(m, "This card is already listed.");
  if (lockedItems(m).has(itemId)) return fail(m, "This card is in a trade. You can list it if the trade is cancelled.");
  if (!Number.isFinite(askingPrice) || askingPrice <= 0) return fail(m, "Set an asking price above $0.");
  if (exchangeMethods.length === 0) return fail(m, "Pick at least one way to hand over the card.");
  if (meetsInPerson(exchangeMethods) && !area) return fail(m, "Add your area so buyers know where to meet.");
  if (area.length > MAX_AREA) return fail(m, `Keep your area under ${MAX_AREA} characters.`);
  if (m.listings[id]) return fail(m, TAKEN);
  const listing: Listing = {
    id,
    itemId,
    sellerId: me,
    askingPrice: Math.round(askingPrice * 100) / 100,
    openToTrades,
    exchangeMethods,
    area,
    note: note.trim(),
    status: "active",
    createdAt: new Date().toISOString(),
  };
  return done({ ...m, listings: { ...m.listings, [id]: listing } }, id);
}

export function withdrawListing(m: MarketData, me: string, listingId: string): Outcome {
  const listing = m.listings[listingId];
  if (!listing || listing.sellerId !== me) return fail(m, "You can only remove your own listings.");
  if (listing.status === "trading") return fail(m, "This card is in a trade. Cancel the trade first to remove the listing.");
  if (listing.status !== "active") return fail(m, "This listing is already closed.");
  const now = new Date().toISOString();
  const offers = { ...m.offers };
  for (const o of Object.values(offers)) {
    if (o.listingId === listingId && o.status === "pending") {
      offers[o.id] = { ...o, status: "closed", closedReason: "The seller removed this listing.", updatedAt: now };
    }
  }
  return done({ ...m, listings: { ...m.listings, [listingId]: { ...listing, status: "withdrawn" } }, offers }, listingId);
}

export function makeOffer(
  m: MarketData,
  me: string,
  listingId: string,
  rawTerms: OfferTerms,
  message: string,
  id: string,
): Outcome {
  const listing = m.listings[listingId];
  if (listing?.status === "trading") return fail(m, "This card is in a trade with another collector.");
  if (!listing || listing.status !== "active") return fail(m, "This card is no longer for sale.");
  if (listing.sellerId === me) return fail(m, "You can't make an offer on your own listing.");
  const open = Object.values(m.offers).find(
    (o) => o.listingId === listingId && o.buyerId === me && o.status === "pending",
  );
  if (open) return fail(m, "You already have an open offer on this card. Reply to it from Offers.");
  const terms = cleanTerms(rawTerms);
  const problem = checkTerms(m, listingDeal(listing), me, terms);
  if (problem) return fail(m, problem);
  if (m.offers[id]) return fail(m, TAKEN);
  const now = new Date().toISOString();
  const offer: Offer = {
    id,
    listingId,
    buyerId: me,
    sellerId: listing.sellerId,
    rounds: [{ by: "buyer", terms, message: message.trim(), at: now }],
    status: "pending",
    closedReason: null,
    trade: null,
    updatedAt: now,
  };
  return done({ ...m, offers: { ...m.offers, [id]: offer } }, id);
}

export function counterOffer(m: MarketData, me: string, offerId: string, rawTerms: OfferTerms, message: string): Outcome {
  const ctx = respond(m, me, offerId);
  if (typeof ctx === "string") return fail(m, ctx);
  const { offer, deal } = ctx;
  const terms = cleanTerms(rawTerms);
  const problem = checkTerms(m, deal, offer.buyerId, terms);
  if (problem) return fail(m, problem);
  const now = new Date().toISOString();
  const updated: Offer = {
    ...offer,
    rounds: [...offer.rounds, { by: whoseTurn(offer), terms, message: message.trim(), at: now }],
    updatedAt: now,
  };
  return done({ ...m, offers: { ...m.offers, [offerId]: updated } }, offerId);
}

export function acceptOffer(m: MarketData, me: string, offerId: string): Outcome {
  const ctx = respond(m, me, offerId);
  if (typeof ctx === "string") return fail(m, ctx);
  const { offer, deal } = ctx;
  const terms = latestTerms(offer);
  const problem = checkTerms(m, deal, offer.buyerId, terms);
  if (problem) return fail(m, problem);

  const now = new Date().toISOString();
  const trade: Trade = { status: "active", done: { buyer: [], seller: [] }, cancelledBy: null, startedAt: now };
  const held = new Set(tradedItemIds(deal, terms));
  const offers = { ...m.offers, [offerId]: { ...offer, status: "accepted" as const, trade, updatedAt: now } };
  for (const o of Object.values(offers)) {
    if (o.id === offerId || o.status !== "pending") continue;
    if (deal.listing && o.listingId === deal.listing.id) {
      offers[o.id] = { ...o, status: "closed", closedReason: "The card went into a trade with another collector.", updatedAt: now };
    } else if (tradedItemIds(dealOf(m.listings, o), latestTerms(o)).some((id) => held.has(id))) {
      offers[o.id] = { ...o, status: "closed", closedReason: "A card in this offer went into another trade.", updatedAt: now };
    }
  }

  return done({ ...m, offers, listings: withStatus(m.listings, deal.listing, "trading") }, offerId);
}

/** The listings with this deal's listing moved to `status`. Direct offers have no listing to move. */
function withStatus(listings: MarketData["listings"], listing: Listing | null, status: ListingStatus) {
  return listing ? { ...listings, [listing.id]: { ...listing, status } } : listings;
}

function inTrade(m: MarketData, me: string, offerId: string): { offer: Offer & { trade: Trade }; party: Party } | string {
  const offer = m.offers[offerId];
  const party = offer && partyOf(offer, me);
  if (!offer?.trade || !party) return "That trade no longer exists.";
  if (offer.trade.status !== "active") return "This trade is already finished.";
  return { offer: offer as Offer & { trade: Trade }, party };
}

/** Ticks off one of my steps. The last step completes the trade: cards change owners and the listing is sold. */
export function completeStep(m: MarketData, me: string, offerId: string, step: TradeStep): Outcome {
  const ctx = inTrade(m, me, offerId);
  if (typeof ctx === "string") return fail(m, ctx);
  const { offer, party } = ctx;
  const state = tradeSteps(offer).find((s) => s.party === party && s.step === step);
  if (!state) return fail(m, "That step isn't part of this trade.");
  if (state.done) return fail(m, "You already did this step.");
  if (!state.ready) return fail(m, "The other collector has a step to finish first.");

  const now = new Date().toISOString();
  const trade: Trade = { ...offer.trade, done: { ...offer.trade.done, [party]: [...offer.trade.done[party], step] } };
  const updated: Offer = { ...offer, trade, updatedAt: now };
  if (!tradeSteps(updated).every((s) => s.done)) return done({ ...m, offers: { ...m.offers, [offerId]: updated } }, offerId);

  const { listing } = dealOf(m.listings, offer);
  const terms = latestTerms(offer);
  const items = { ...m.items };
  for (const id of [...(listing ? [listing.itemId] : []), ...terms.seller.itemIds]) items[id] = { ...items[id], ownerId: offer.buyerId };
  for (const id of terms.buyer.itemIds) items[id] = { ...items[id], ownerId: offer.sellerId };
  return done(
    {
      ...m,
      items,
      offers: { ...m.offers, [offerId]: { ...updated, trade: { ...trade, status: "complete" } } },
      listings: withStatus(m.listings, listing, "sold"),
    },
    offerId,
  );
}

/** Either side can back out before the end. Held money is refunded, cards stay put, and the listing reopens. */
export function cancelTrade(m: MarketData, me: string, offerId: string): Outcome {
  const ctx = inTrade(m, me, offerId);
  if (typeof ctx === "string") return fail(m, ctx);
  const { offer, party } = ctx;
  const trade: Trade = { ...offer.trade, status: "cancelled", cancelledBy: party };
  return done(
    {
      ...m,
      offers: { ...m.offers, [offerId]: { ...offer, trade, updatedAt: new Date().toISOString() } },
      listings: withStatus(m.listings, dealOf(m.listings, offer).listing, "active"),
    },
    offerId,
  );
}

export function declineOffer(m: MarketData, me: string, offerId: string): Outcome {
  const ctx = respond(m, me, offerId);
  if (typeof ctx === "string") return fail(m, ctx);
  const now = new Date().toISOString();
  return done({ ...m, offers: { ...m.offers, [offerId]: { ...ctx.offer, status: "declined", updatedAt: now } } }, offerId);
}
