"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import { useHydrated } from "@/store/hydration";
import { activeListingForItem, latestTerms, useMarketplace } from "@/store/marketplace";
import { AddCardPanel } from "./AddCardPanel";
import { CardImage } from "./CardImage";
import { ListCardDialog } from "./ListCardDialog";

export function InventoryView() {
  const hydrated = useHydrated();
  const me = useMarketplace((s) => s.currentUserId);
  const user = useMarketplace((s) => s.users[s.currentUserId]);
  const items = useMarketplace((s) => s.items);
  const cards = useMarketplace((s) => s.cards);
  const listings = useMarketplace((s) => s.listings);
  const offers = useMarketplace((s) => s.offers);
  const [adding, setAdding] = useState(false);
  const [listingItemId, setListingItemId] = useState<string | null>(null);

  const mine = useMemo(() => Object.values(items).filter((i) => i.ownerId === me).reverse(), [items, me]);
  const inOffers = useMemo(
    () => new Set(Object.values(offers).filter((o) => o.status === "pending").flatMap((o) => latestTerms(o).itemIds)),
    [offers],
  );
  const listingItem = listingItemId ? items[listingItemId] : null;

  if (!hydrated) return <p className="text-ink-soft">Opening the binder…</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display font-extrabold tracking-tight">My cards</h1>
          <p className="tabular mt-1 text-lg text-ink-soft">
            {user.name}&apos;s collection, {mine.length === 1 ? "1 card" : `${mine.length} cards`}
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-md bg-cardback px-5 py-3 font-bold text-white shadow-[0_3px_0_var(--color-cardback-deep)] hover:bg-cardback-deep"
          >
            Add a card
          </button>
        )}
      </div>

      {adding && <AddCardPanel onClose={() => setAdding(false)} />}

      <div className="binder-sheet">
        {mine.length === 0 ? (
          <p className="py-12 text-center text-lg">Your binder is empty. Add a card to start selling or trading.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {mine.map((item) => {
              const card = cards[item.cardId];
              const listing = activeListingForItem(listings, item.id);
              return (
                <li key={item.id} className="pocket flex flex-col p-3 sm:p-4">
                  <div className="mx-auto w-full max-w-[245px]">
                    <CardImage card={card} sizes="(min-width: 768px) 245px, 45vw" />
                  </div>
                  <h2 className="mt-3 truncate font-display text-lg font-bold leading-tight">{card.name}</h2>
                  <p className="truncate text-sm text-ink-soft">
                    {card.set.name} #{card.number}, {item.condition}
                  </p>
                  <div className="mt-3 flex-1 content-end">
                    {listing ? (
                      <Link
                        href={`/listings/${listing.id}`}
                        className="tabular font-semibold text-cardback underline underline-offset-4"
                      >
                        Listed at {formatMoney(listing.askingPrice)}
                      </Link>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <button
                          type="button"
                          onClick={() => setListingItemId(item.id)}
                          className="rounded-md border-2 border-cardback px-3 py-1.5 text-sm font-bold text-cardback hover:bg-cardback hover:text-white"
                        >
                          List for sale<span className="sr-only">: {card.name}</span>
                        </button>
                        {inOffers.has(item.id) && <span className="text-sm text-ink-soft">In an open offer</span>}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {listingItem && (
        <ListCardDialog item={listingItem} card={cards[listingItem.cardId]} onClose={() => setListingItemId(null)} />
      )}
    </div>
  );
}
