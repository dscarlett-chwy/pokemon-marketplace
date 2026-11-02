"use client";

import { useMemo } from "react";
import type { Card } from "./card";
import type { Listing, OwnedCard, User } from "./types";
import { useMarketplace } from "@/store/marketplace";

export type ListingRow = { listing: Listing; item: OwnedCard; card: Card; seller: User };

export function useListingRows(): ListingRow[] {
  const listings = useMarketplace((s) => s.listings);
  const items = useMarketplace((s) => s.items);
  const cards = useMarketplace((s) => s.cards);
  const users = useMarketplace((s) => s.users);

  return useMemo(
    () =>
      Object.values(listings).flatMap((listing) => {
        const item = items[listing.itemId];
        const card = item && cards[item.cardId];
        if (!card) return [];
        return [{ listing, item, card, seller: users[listing.sellerId] }];
      }),
    [listings, items, cards, users],
  );
}
