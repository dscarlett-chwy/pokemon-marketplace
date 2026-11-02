"use client";

import { create } from "zustand";
import * as server from "@/app/actions";
import type { Card } from "@/lib/card";
import * as rules from "@/lib/marketplace-rules";
import { seedMarket, USERS } from "@/lib/seed";
import type { Condition, MarketData, OfferTerms, Result } from "@/lib/types";
import { useNotice } from "./notice";

export {
  activeListingForItem,
  latestTerms,
  offeredItemIds,
  partyOf,
  tradeableItems,
  whoseTurn,
} from "@/lib/marketplace-rules";

type Data = MarketData & { currentUserId: string; loaded: boolean };

type Actions = {
  refresh: () => Promise<void>;
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

const empty: Data = {
  currentUserId: USERS[0].id,
  loaded: false,
  users: Object.fromEntries(USERS.map((u) => [u.id, u])),
  cards: {},
  items: {},
  listings: {},
  offers: {},
};

const showError = (text: string) => useNotice.getState().show(text, "error");

/**
 * Changes apply here first so the page responds instantly, then the server re-checks them
 * against the database. Its answer is the truth: if it disagrees, the page snaps back to it.
 */
export const useMarketplace = create<MarketplaceState>()((set, get) => {
  let latest = 0;
  let inFlight = 0;

  const save = (send: () => Promise<server.Synced>) => {
    const call = ++latest;
    inFlight++;
    send()
      .then(({ result, market }) => {
        if (!result.ok) showError(result.error);
        if (call === latest) set({ ...market, loaded: true });
      })
      .catch(() => {
        showError("That change didn't save. Showing the latest data.");
        if (call === latest) void get().refresh();
      })
      .finally(() => inFlight--);
  };

  const run = (rule: (m: MarketData, me: string) => rules.Outcome, send: () => Promise<server.Synced>): Result => {
    const s = get();
    const { result, market } = rule(s, s.currentUserId);
    if (result.ok) {
      set(market);
      save(send);
    }
    return result;
  };

  return {
    ...empty,

    refresh: async () => {
      const started = latest;
      try {
        const res = await fetch("/api/marketplace", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { currentUserId: string; market: MarketData };
        // A change made while this was loading would be wiped out by the older snapshot.
        if (inFlight === 0 && started === latest) set({ ...body.market, currentUserId: body.currentUserId, loaded: true });
      } catch {
        showError("Couldn't load the marketplace. Check your connection and try again.");
      }
    },

    setCurrentUser: (userId) => {
      set({ currentUserId: userId });
      save(() => server.viewAs(userId));
    },

    addCard: (card, condition) => {
      const id = rules.newId("i");
      return run(
        (m, me) => rules.addCard(m, me, card, condition, id),
        () => server.addCard(card.id, condition, id),
      );
    },

    createListing: (input) => {
      const id = rules.newId("l");
      return run(
        (m, me) => rules.createListing(m, me, input, id),
        () => server.createListing(input, id),
      );
    },

    withdrawListing: (listingId) =>
      run(
        (m, me) => rules.withdrawListing(m, me, listingId),
        () => server.withdrawListing(listingId),
      ),

    makeOffer: (listingId, terms, message) => {
      const id = rules.newId("o");
      return run(
        (m, me) => rules.makeOffer(m, me, listingId, terms, message, id),
        () => server.makeOffer(listingId, terms, message, id),
      );
    },

    counterOffer: (offerId, terms, message) =>
      run(
        (m, me) => rules.counterOffer(m, me, offerId, terms, message),
        () => server.counterOffer(offerId, terms, message),
      ),

    acceptOffer: (offerId) =>
      run(
        (m, me) => rules.acceptOffer(m, me, offerId),
        () => server.acceptOffer(offerId),
      ),

    declineOffer: (offerId) =>
      run(
        (m, me) => rules.declineOffer(m, me, offerId),
        () => server.declineOffer(offerId),
      ),

    resetDemo: () => {
      set({ ...seedMarket(), currentUserId: USERS[0].id });
      save(server.resetDemo);
    },
  };
});
