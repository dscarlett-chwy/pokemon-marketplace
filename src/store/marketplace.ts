"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Card } from "@/lib/card";
import * as rules from "@/lib/marketplace-rules";
import { seedMarket } from "@/lib/seed";
import type { Condition, MarketData, OfferTerms, Result } from "@/lib/types";

export { activeListingForItem, latestTerms, partyOf, tradeableItems, whoseTurn } from "@/lib/marketplace-rules";

type Data = MarketData & { currentUserId: string };

type Actions = {
  setCurrentUser: (userId: string) => void;
  addCard: (card: Card, condition: Condition) => Result;
  createListing: (input: rules.ListingInput) => Result;
  withdrawListing: (listingId: string) => Result;
  makeOffer: (listingId: string, terms: OfferTerms, message: string) => Result;
  counterOffer: (offerId: string, terms: OfferTerms, message: string) => Result;
  acceptOffer: (offerId: string) => Result;
  declineOffer: (offerId: string) => Result;
  resetDemo: () => void;
};

export type MarketplaceState = Data & Actions;

const seedData = (): Data => ({ currentUserId: "ash", ...seedMarket() });

export const useMarketplace = create<MarketplaceState>()(
  persist(
    (set, get) => {
      const run = (rule: (m: MarketData, me: string) => rules.Outcome): Result => {
        const s = get();
        const { result, market } = rule(s, s.currentUserId);
        if (result.ok) set(market);
        return result;
      };

      return {
        ...seedData(),

        setCurrentUser: (userId) => set({ currentUserId: userId }),
        addCard: (card, condition) => run((m, me) => rules.addCard(m, me, card, condition, rules.newId("i"))),
        createListing: (input) => run((m, me) => rules.createListing(m, me, input, rules.newId("l"))),
        withdrawListing: (listingId) => run((m, me) => rules.withdrawListing(m, me, listingId)),
        makeOffer: (listingId, terms, message) =>
          run((m, me) => rules.makeOffer(m, me, listingId, terms, message, rules.newId("o"))),
        counterOffer: (offerId, terms, message) => run((m, me) => rules.counterOffer(m, me, offerId, terms, message)),
        acceptOffer: (offerId) => run((m, me) => rules.acceptOffer(m, me, offerId)),
        declineOffer: (offerId) => run((m, me) => rules.declineOffer(m, me, offerId)),
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
