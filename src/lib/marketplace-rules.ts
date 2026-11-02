import type { Card } from "./card";
import type { Condition, Listing, MarketData, Offer, OfferTerms, Party, Result } from "./types";

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

export function activeListingForItem(listings: Record<string, Listing>, itemId: string) {
  return Object.values(listings).find((l) => l.itemId === itemId && l.status === "active");
}

/** Cards the buyer could put into an offer: owned and not up for sale. */
export function tradeableItems(data: Pick<MarketData, "items" | "listings">, userId: string) {
  return Object.values(data.items).filter(
    (i) => i.ownerId === userId && !activeListingForItem(data.listings, i.id),
  );
}

function checkTerms(m: MarketData, listing: Listing, buyerId: string, terms: OfferTerms): string | null {
  if (!Number.isFinite(terms.cash) || terms.cash < 0) return "Cash must be zero or more.";
  if (terms.cash === 0 && terms.itemIds.length === 0) return "Add cash, cards, or both to the offer.";
  if (terms.itemIds.length > 0 && !listing.openToTrades) return "This seller only takes cash for this card.";
  const tradeable = new Set(tradeableItems(m, buyerId).map((i) => i.id));
  const missing = terms.itemIds.find((id) => !tradeable.has(id));
  if (missing) {
    const card = m.cards[m.items[missing]?.cardId];
    return `${card?.name ?? "A card"} is no longer available to trade.`;
  }
  return null;
}

const cleanTerms = (terms: OfferTerms): OfferTerms => ({
  cash: Math.round(terms.cash * 100) / 100,
  itemIds: [...new Set(terms.itemIds)],
});

function respond(m: MarketData, me: string, offerId: string): { offer: Offer; listing: Listing } | string {
  const offer = m.offers[offerId];
  if (!offer) return "That offer no longer exists.";
  if (offer.status !== "pending") return "This offer is already closed.";
  if (partyOf(offer, me) !== whoseTurn(offer)) return "It's the other collector's turn to respond.";
  const listing = m.listings[offer.listingId];
  if (listing.status !== "active") return "This card is no longer for sale.";
  return { offer, listing };
}

export function addCard(m: MarketData, me: string, card: Card, condition: Condition, id: string): Outcome {
  if (m.items[id]) return fail(m, TAKEN);
  return done(
    {
      ...m,
      cards: { ...m.cards, [card.id]: card },
      items: { ...m.items, [id]: { id, ownerId: me, cardId: card.id, condition } },
    },
    id,
  );
}

export type ListingInput = { itemId: string; askingPrice: number; openToTrades: boolean; note: string };

export function createListing(m: MarketData, me: string, input: ListingInput, id: string): Outcome {
  const { itemId, askingPrice, openToTrades, note } = input;
  const item = m.items[itemId];
  if (!item || item.ownerId !== me) return fail(m, "You can only list cards you own.");
  if (activeListingForItem(m.listings, itemId)) return fail(m, "This card is already listed.");
  if (!Number.isFinite(askingPrice) || askingPrice <= 0) return fail(m, "Set an asking price above $0.");
  if (m.listings[id]) return fail(m, TAKEN);
  const listing: Listing = {
    id,
    itemId,
    sellerId: me,
    askingPrice: Math.round(askingPrice * 100) / 100,
    openToTrades,
    note: note.trim(),
    status: "active",
    createdAt: new Date().toISOString(),
  };
  return done({ ...m, listings: { ...m.listings, [id]: listing } }, id);
}

export function withdrawListing(m: MarketData, me: string, listingId: string): Outcome {
  const listing = m.listings[listingId];
  if (!listing || listing.sellerId !== me) return fail(m, "You can only remove your own listings.");
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
  if (!listing || listing.status !== "active") return fail(m, "This card is no longer for sale.");
  if (listing.sellerId === me) return fail(m, "You can't make an offer on your own listing.");
  const open = Object.values(m.offers).find(
    (o) => o.listingId === listingId && o.buyerId === me && o.status === "pending",
  );
  if (open) return fail(m, "You already have an open offer on this card. Reply to it from Offers.");
  const terms = cleanTerms(rawTerms);
  const problem = checkTerms(m, listing, me, terms);
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
    updatedAt: now,
  };
  return done({ ...m, offers: { ...m.offers, [id]: offer } }, id);
}

export function counterOffer(m: MarketData, me: string, offerId: string, rawTerms: OfferTerms, message: string): Outcome {
  const ctx = respond(m, me, offerId);
  if (typeof ctx === "string") return fail(m, ctx);
  const { offer, listing } = ctx;
  const terms = cleanTerms(rawTerms);
  const problem = checkTerms(m, listing, offer.buyerId, terms);
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
  const { offer, listing } = ctx;
  const terms = latestTerms(offer);
  const problem = checkTerms(m, listing, offer.buyerId, terms);
  if (problem) return fail(m, problem);

  const now = new Date().toISOString();
  const items = { ...m.items };
  items[listing.itemId] = { ...items[listing.itemId], ownerId: offer.buyerId };
  for (const id of terms.itemIds) items[id] = { ...items[id], ownerId: offer.sellerId };

  const moved = new Set([listing.itemId, ...terms.itemIds]);
  const offers = { ...m.offers, [offerId]: { ...offer, status: "accepted" as const, updatedAt: now } };
  for (const o of Object.values(offers)) {
    if (o.id === offerId || o.status !== "pending") continue;
    if (o.listingId === listing.id) {
      offers[o.id] = { ...o, status: "closed", closedReason: "The card was sold to another collector.", updatedAt: now };
    } else if (latestTerms(o).itemIds.some((id) => moved.has(id))) {
      offers[o.id] = { ...o, status: "closed", closedReason: "A card in this offer was traded away.", updatedAt: now };
    }
  }

  return done({ ...m, items, offers, listings: { ...m.listings, [listing.id]: { ...listing, status: "sold" } } }, offerId);
}

export function declineOffer(m: MarketData, me: string, offerId: string): Outcome {
  const ctx = respond(m, me, offerId);
  if (typeof ctx === "string") return fail(m, ctx);
  const now = new Date().toISOString();
  return done({ ...m, offers: { ...m.offers, [offerId]: { ...ctx.offer, status: "declined", updatedAt: now } } }, offerId);
}
