"use client";

import { CardGridSkeleton } from "./Skeletons";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import { useHydrated } from "@/store/hydration";
import { activeListingForItem, latestTerms, lockedItems, offeredItemIds, useMarketplace, useMe } from "@/store/marketplace";
import { AddCardPanel } from "./AddCardPanel";
import { CardImage } from "./CardImage";
import { ListCardDialog } from "./ListCardDialog";

export function InventoryView() {
  const hydrated = useHydrated();
  const me = useMe();
  const user = useMarketplace((s) => s.users[me]);
  const items = useMarketplace((s) => s.items);
  const cards = useMarketplace((s) => s.cards);
  const listings = useMarketplace((s) => s.listings);
  const offers = useMarketplace((s) => s.offers);
  const [adding, setAdding] = useState(false);
  const [listingItemId, setListingItemId] = useState<string | null>(null);

  const mine = useMemo(() => Object.values(items).filter((i) => i.ownerId === me).reverse(), [items, me]);
  const inOffers = useMemo(
    () => new Set(Object.values(offers).filter((o) => o.status === "pending").flatMap((o) => offeredItemIds(latestTerms(o)))),
    [offers],
  );
  const locked = useMemo(() => lockedItems({ listings, offers }), [listings, offers]);
  const listingItem = listingItemId ? items[listingItemId] : null;

  if (!hydrated) return <CardGridSkeleton label="Loading your cards" />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display font-bold">My cards</h1>
          <p className="tabular mt-3 text-lg text-ink-soft">
            {user.name}&apos;s collection, {mine.length === 1 ? "1 card" : `${mine.length} cards`}
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full bg-accent px-5 py-3 font-semibold text-white hover:bg-accent-deep"
          >
            Add a card
          </button>
        )}
      </div>

      {adding && <AddCardPanel onClose={() => setAdding(false)} />}

      <div>
        {mine.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-rule px-6 py-16 text-center">
            <p className="text-lg font-semibold">No cards yet</p>
            <p className="mx-auto mt-1 max-w-sm text-ink-soft">Add a card to start selling or trading.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-7 sm:gap-y-12 lg:grid-cols-4">
            {mine.map((item) => {
              const card = cards[item.cardId];
              const listing = activeListingForItem(listings, item.id);
              return (
                <li key={item.id} className="flex flex-col">
                  <div className="rounded-[4.5%/3.2%] shadow-card">
                    <CardImage card={card} large sizes="(min-width: 1024px) 270px, (min-width: 640px) 30vw, 45vw" />
                  </div>
                  <h2 className="mt-4 truncate text-[0.9375rem] font-semibold tracking-normal">{card.name}</h2>
                  <p className="truncate text-sm text-ink-soft">
                    {card.set.name} #{card.number}, {item.condition}
                  </p>
                  <div className="mt-3 flex-1 content-end">
                    {locked.has(item.id) ? (
                      <Link
                        href={`/offers?offer=${locked.get(item.id)}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline hover:underline-offset-4"
                      >
                        <span aria-hidden className="size-2.5 rounded-full bg-accent ring-2 ring-accent/25" />
                        In a trade
                      </Link>
                    ) : listing ? (
                      <Link
                        href={`/listings/${listing.id}`}
                        className="tabular text-sm font-medium text-accent hover:underline hover:underline-offset-4"
                      >
                        Listed at {formatMoney(listing.askingPrice)}
                      </Link>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <button
                          type="button"
                          onClick={() => setListingItemId(item.id)}
                          className="rounded-full border border-ink/25 px-3.5 py-1.5 text-sm font-medium text-ink hover:border-ink hover:bg-ink hover:text-paper"
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
