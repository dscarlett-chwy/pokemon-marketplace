"use client";

import { useMemo, useState } from "react";
import { useListingRows } from "@/lib/listing-rows";
import { useHydrated } from "@/store/hydration";
import { useMarketplace } from "@/store/marketplace";
import { CardTile } from "./CardTile";
import { EMPTY_FILTERS, SearchFilters, type Filters } from "./SearchFilters";

export function MarketplaceView() {
  const hydrated = useHydrated();
  const me = useMarketplace((s) => s.currentUserId);
  const rows = useListingRows();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

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
        (!filters.tradesOnly || listing.openToTrades),
    );
    return found.sort((a, b) => {
      if (filters.sort === "price-asc") return a.listing.askingPrice - b.listing.askingPrice;
      if (filters.sort === "price-desc") return b.listing.askingPrice - a.listing.askingPrice;
      return b.listing.createdAt.localeCompare(a.listing.createdAt);
    });
  }, [active, filters]);

  const filtered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-5">
        <h1 className="font-display text-display font-extrabold tracking-tight">Find a card</h1>
        <SearchFilters filters={filters} onChange={setFilters} types={types} rarities={rarities} />
      </div>

      {!hydrated ? (
        <p className="text-ink-soft">Opening the binder…</p>
      ) : (
        <section aria-labelledby="results-heading" className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="results-heading" className="tabular text-base font-semibold" aria-live="polite">
              {results.length === 1 ? "1 card for sale" : `${results.length} cards for sale`}
            </h2>
            {filtered && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="rounded-md px-2 py-1 text-sm font-semibold text-cardback underline underline-offset-4"
              >
                Clear filters
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="binder-sheet">
              <p className="py-12 text-center text-lg">
                No cards match. Try a different name, or clear the filters to see every card for sale.
              </p>
            </div>
          ) : (
            <div className="binder-sheet">
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {results.map((row, i) => (
                  <CardTile key={row.listing.id} row={row} isMine={row.listing.sellerId === me} priority={i < 3} />
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
