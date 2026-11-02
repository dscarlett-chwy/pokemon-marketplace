"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Card } from "@/lib/card";
import { SEED_CARDS, SEED_ITEMS, SEED_LISTINGS, SEED_OFFERS, USERS } from "@/lib/seed";
import type { Condition, Listing, Offer, OfferTerms, OwnedCard, Party, Result, User } from "@/lib/types";

type Data = {
  currentUserId: string;
  users: Record<string, User>;
  cards: Record<string, Card>;
  items: Record<string, OwnedCard>;
  listings: Record<string, Listing>;
  offers: Record<string, Offer>;
};

type Actions = {
  setCurrentUser: (userId: string) => void;
  addCard: (card: Card, condition: Condition) => Result;
  createListing: (input: { itemId: string; askingPrice: number; openToTrades: boolean; note: string }) => Result;
  withdrawListing: (listingId: string) => Result;
  makeOffer: (listingId: string, terms: OfferTerms, message: string) => Result;
  counterOffer: (offerId: string, terms: OfferTerms, message: string) => Result;
  acceptOffer: (offerId: string) => Result;
  declineOffer: (offerId: string) => Result;
  resetDemo: () => void;
};

export type MarketplaceState = Data & Actions;

const byId = <T extends { id: string }>(rows: T[]) => Object.fromEntries(rows.map((r) => [r.id, r]));

const seedData = (): Data => ({
  currentUserId: "ash",
  users: byId(USERS),
  cards: { ...SEED_CARDS },
  items: byId(SEED_ITEMS),
  listings: byId(SEED_LISTINGS),
  offers: byId(SEED_OFFERS),
});

const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const fail = (error: string): Result => ({ ok: false, error });

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
export function tradeableItems(data: Pick<Data, "items" | "listings">, userId: string) {
  return Object.values(data.items).filter(
    (i) => i.ownerId === userId && !activeListingForItem(data.listings, i.id),
  );
}

function checkTerms(data: Data, listing: Listing, buyerId: string, terms: OfferTerms): string | null {
  if (!Number.isFinite(terms.cash) || terms.cash < 0) return "Cash must be zero or more.";
  if (terms.cash === 0 && terms.itemIds.length === 0) return "Add cash, cards, or both to the offer.";
  if (terms.itemIds.length > 0 && !listing.openToTrades) return "This seller only takes cash for this card.";
  const tradeable = new Set(tradeableItems(data, buyerId).map((i) => i.id));
  const missing = terms.itemIds.find((id) => !tradeable.has(id));
  if (missing) {
    const card = data.cards[data.items[missing]?.cardId];
    return `${card?.name ?? "A card"} is no longer available to trade.`;
  }
  return null;
}

const cleanTerms = (terms: OfferTerms): OfferTerms => ({
  cash: Math.round(terms.cash * 100) / 100,
  itemIds: [...new Set(terms.itemIds)],
});

export const useMarketplace = create<MarketplaceState>()(
  persist(
    (set, get) => {
      const respond = (offerId: string): { offer: Offer; listing: Listing } | string => {
        const { offers, listings, currentUserId } = get();
        const offer = offers[offerId];
        if (!offer) return "That offer no longer exists.";
        if (offer.status !== "pending") return "This offer is already closed.";
        if (partyOf(offer, currentUserId) !== whoseTurn(offer)) return "It's the other collector's turn to respond.";
        const listing = listings[offer.listingId];
        if (listing.status !== "active") return "This card is no longer for sale.";
        return { offer, listing };
      };

      return {
        ...seedData(),

        setCurrentUser: (userId) => set({ currentUserId: userId }),

        addCard: (card, condition) => {
          const id = newId("i");
          set((s) => ({
            cards: { ...s.cards, [card.id]: card },
            items: { ...s.items, [id]: { id, ownerId: s.currentUserId, cardId: card.id, condition } },
          }));
          return { ok: true, id };
        },

        createListing: ({ itemId, askingPrice, openToTrades, note }) => {
          const s = get();
          const item = s.items[itemId];
          if (!item || item.ownerId !== s.currentUserId) return fail("You can only list cards you own.");
          if (activeListingForItem(s.listings, itemId)) return fail("This card is already listed.");
          if (!Number.isFinite(askingPrice) || askingPrice <= 0) return fail("Set an asking price above $0.");
          const id = newId("l");
          const listing: Listing = {
            id,
            itemId,
            sellerId: s.currentUserId,
            askingPrice: Math.round(askingPrice * 100) / 100,
            openToTrades,
            note: note.trim(),
            status: "active",
            createdAt: new Date().toISOString(),
          };
          set({ listings: { ...s.listings, [id]: listing } });
          return { ok: true, id };
        },

        withdrawListing: (listingId) => {
          const s = get();
          const listing = s.listings[listingId];
          if (!listing || listing.sellerId !== s.currentUserId) return fail("You can only remove your own listings.");
          if (listing.status !== "active") return fail("This listing is already closed.");
          const now = new Date().toISOString();
          const offers = { ...s.offers };
          for (const o of Object.values(offers)) {
            if (o.listingId === listingId && o.status === "pending") {
              offers[o.id] = { ...o, status: "closed", closedReason: "The seller removed this listing.", updatedAt: now };
            }
          }
          set({ listings: { ...s.listings, [listingId]: { ...listing, status: "withdrawn" } }, offers });
          return { ok: true, id: listingId };
        },

        makeOffer: (listingId, rawTerms, message) => {
          const s = get();
          const listing = s.listings[listingId];
          if (!listing || listing.status !== "active") return fail("This card is no longer for sale.");
          if (listing.sellerId === s.currentUserId) return fail("You can't make an offer on your own listing.");
          const open = Object.values(s.offers).find(
            (o) => o.listingId === listingId && o.buyerId === s.currentUserId && o.status === "pending",
          );
          if (open) return fail("You already have an open offer on this card. Reply to it from Offers.");
          const terms = cleanTerms(rawTerms);
          const problem = checkTerms(s, listing, s.currentUserId, terms);
          if (problem) return fail(problem);
          const now = new Date().toISOString();
          const id = newId("o");
          const offer: Offer = {
            id,
            listingId,
            buyerId: s.currentUserId,
            sellerId: listing.sellerId,
            rounds: [{ by: "buyer", terms, message: message.trim(), at: now }],
            status: "pending",
            closedReason: null,
            updatedAt: now,
          };
          set({ offers: { ...s.offers, [id]: offer } });
          return { ok: true, id };
        },

        counterOffer: (offerId, rawTerms, message) => {
          const ctx = respond(offerId);
          if (typeof ctx === "string") return fail(ctx);
          const { offer, listing } = ctx;
          const terms = cleanTerms(rawTerms);
          const problem = checkTerms(get(), listing, offer.buyerId, terms);
          if (problem) return fail(problem);
          const now = new Date().toISOString();
          const updated: Offer = {
            ...offer,
            rounds: [...offer.rounds, { by: whoseTurn(offer), terms, message: message.trim(), at: now }],
            updatedAt: now,
          };
          set((s) => ({ offers: { ...s.offers, [offerId]: updated } }));
          return { ok: true, id: offerId };
        },

        acceptOffer: (offerId) => {
          const ctx = respond(offerId);
          if (typeof ctx === "string") return fail(ctx);
          const { offer, listing } = ctx;
          const s = get();
          const terms = latestTerms(offer);
          const problem = checkTerms(s, listing, offer.buyerId, terms);
          if (problem) return fail(problem);

          const now = new Date().toISOString();
          const items = { ...s.items };
          items[listing.itemId] = { ...items[listing.itemId], ownerId: offer.buyerId };
          for (const id of terms.itemIds) items[id] = { ...items[id], ownerId: offer.sellerId };

          const moved = new Set([listing.itemId, ...terms.itemIds]);
          const offers = { ...s.offers, [offerId]: { ...offer, status: "accepted" as const, updatedAt: now } };
          for (const o of Object.values(offers)) {
            if (o.id === offerId || o.status !== "pending") continue;
            if (o.listingId === listing.id) {
              offers[o.id] = { ...o, status: "closed", closedReason: "The card was sold to another collector.", updatedAt: now };
            } else if (latestTerms(o).itemIds.some((id) => moved.has(id))) {
              offers[o.id] = { ...o, status: "closed", closedReason: "A card in this offer was traded away.", updatedAt: now };
            }
          }

          set({ items, offers, listings: { ...s.listings, [listing.id]: { ...listing, status: "sold" } } });
          return { ok: true, id: offerId };
        },

        declineOffer: (offerId) => {
          const ctx = respond(offerId);
          if (typeof ctx === "string") return fail(ctx);
          const now = new Date().toISOString();
          set((s) => ({ offers: { ...s.offers, [offerId]: { ...ctx.offer, status: "declined", updatedAt: now } } }));
          return { ok: true, id: offerId };
        },

        resetDemo: () => set(seedData()),
      };
    },
    {
      name: "trade-binder",
      version: 1,
      skipHydration: true,
      partialize: ({ currentUserId, cards, items, listings, offers }) => ({ currentUserId, cards, items, listings, offers }),
    },
  ),
);
