"use client";

export type Filters = {
  query: string;
  type: string;
  rarity: string;
  maxPrice: string;
  tradesOnly: boolean;
  sort: "newest" | "price-asc" | "price-desc";
};

export const EMPTY_FILTERS: Filters = { query: "", type: "", rarity: "", maxPrice: "", tradesOnly: false, sort: "newest" };

const field = "w-full rounded-md border border-rule bg-white px-3 py-2 text-base text-ink";

export function SearchFilters({
  filters,
  onChange,
  types,
  rarities,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  types: string[];
  rarities: string[];
}) {
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });

  return (
    <form role="search" onSubmit={(e) => e.preventDefault()} className="space-y-4">
      <label className="block">
        <span className="sr-only">Search by card or set name</span>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => update("query", e.target.value)}
          placeholder="Search by card or set, like Charizard or Evolving Skies"
          className="w-full rounded-lg border-2 border-cardback bg-white px-4 py-3 text-lg text-ink placeholder:text-ink-soft/70"
        />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <label className="block text-sm font-semibold">
          Type
          <select value={filters.type} onChange={(e) => update("type", e.target.value)} className={`${field} mt-1`}>
            <option value="">Any type</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Rarity
          <select value={filters.rarity} onChange={(e) => update("rarity", e.target.value)} className={`${field} mt-1`}>
            <option value="">Any rarity</option>
            {rarities.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Max price
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={filters.maxPrice}
            onChange={(e) => update("maxPrice", e.target.value)}
            placeholder="No limit"
            className={`${field} tabular mt-1`}
          />
        </label>
        <label className="block text-sm font-semibold">
          Sort by
          <select
            value={filters.sort}
            onChange={(e) => update("sort", e.target.value as Filters["sort"])}
            className={`${field} mt-1`}
          >
            <option value="newest">Newest listed</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
          </select>
        </label>
        <label className="col-span-2 flex items-center gap-2 self-end pb-2 text-base sm:col-span-1">
          <input
            type="checkbox"
            checked={filters.tradesOnly}
            onChange={(e) => update("tradesOnly", e.target.checked)}
            className="size-5 accent-cardback"
          />
          Takes trades
        </label>
      </div>
    </form>
  );
}
