"use client";

import Link from "next/link";
import { CardGridSkeleton } from "./Skeletons";
import { useDeferredValue, useMemo, useState, ViewTransition } from "react";
import { useListingRows } from "@/lib/listing-rows";
import { useHydrated } from "@/store/hydration";
import { useMarketplace } from "@/store/marketplace";
import { CardTile } from "./CardTile";
import { EMPTY_FILTERS, SearchFilters, type Filters } from "./SearchFilters";

export function MarketplaceView() {
  const hydrated = useHydrated();
  const me = useMarketplace((s) => s.currentUserId);
  const rows = useListingRows();
  const [controls, setFilters] = useState<Filters>(EMPTY_FILTERS);
  // The controls answer at once; the grid follows a beat later as a transition, which is what lets the cards animate.
  const filters = useDeferredValue(controls);

  const active = useMemo(() => rows.filter((r) => r.listing.status === "active"), [rows]);
  const types = useMemo(() => [...new Set(active.flatMap((r) => r.card.types))].sort(), [active]);
  const rarities = useMemo(
    () => [...new Set(active.map((r) => r.card.rarity).filter((r): r is string => !!r))].sort(),
    [active],
  );

  const results = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const max = filters.maxPrice === "" ? Infinity : Number(filters.maxPrice);
    const found = active.filter(
      ({ card, listing }) =>
        (!q || card.name.toLowerCase().includes(q) || card.set.name.toLowerCase().includes(q)) &&
        (!filters.type || card.types.includes(filters.type)) &&
        (!filters.rarity || card.rarity === filters.rarity) &&
        listing.askingPrice <= max &&
        (!filters.handover || listing.exchangeMethods.includes(filters.handover)) &&
        (!filters.tradesOnly || listing.openToTrades),
    );
    return found.sort((a, b) => {
      if (filters.sort === "price-asc") return a.listing.askingPrice - b.listing.askingPrice;
      if (filters.sort === "price-desc") return b.listing.askingPrice - a.listing.askingPrice;
      return b.listing.createdAt.localeCompare(a.listing.createdAt);
    });
  }, [active, filters]);

  const filtered = JSON.stringify(controls) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-6 sm:space-y-8">
        <h1 className="font-display text-display font-bold">Find your next card</h1>
        <SearchFilters filters={controls} onChange={setFilters} types={types} rarities={rarities} />
      </div>

      {!hydrated ? (
        <div className="pt-13">
          <CardGridSkeleton />
        </div>
      ) : (
        <section aria-labelledby="results-heading" className="space-y-5">
          <div className="flex min-h-8 items-center justify-between gap-4">
            <h2 id="results-heading" className="tabular text-sm font-medium tracking-normal text-ink-soft" aria-live="polite">
              {results.length === 1 ? "1 card for sale" : `${results.length} cards for sale`}
            </h2>
            {filtered && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="rounded-full px-3 py-1 text-sm font-medium text-accent hover:bg-accent-tint"
              >
                Clear filters
              </button>
            )}
          </div>

          {active.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-rule px-6 py-16 text-center">
              <p className="text-lg font-semibold">Nothing for sale yet</p>
              <p className="mx-auto mt-1 max-w-sm text-ink-soft">
                Be the first:{" "}
                <Link href="/inventory" className="font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent">
                  add a card
                </Link>{" "}
                and list it for sale or trade.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-rule px-6 py-16 text-center">
              <p className="text-lg font-semibold">No cards match</p>
              <p className="mx-auto mt-1 max-w-sm text-ink-soft">Try a different name, or clear the filters to see every card for sale.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-7 sm:gap-y-12 lg:grid-cols-4">
              {results.map((row, i) => (
                <ViewTransition key={row.listing.id} default="tile" enter="tile-in" exit="tile-out">
                  <CardTile row={row} isMine={row.listing.sellerId === me} priority={i < 4} />
                </ViewTransition>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
