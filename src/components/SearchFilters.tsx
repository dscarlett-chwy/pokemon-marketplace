"use client";

import { useState } from "react";
import { METHOD_LABELS } from "@/lib/exchange";
import { EXCHANGE_METHODS, type ExchangeMethod } from "@/lib/types";

export type Filters = {
  query: string;
  type: string;
  rarity: string;
  maxPrice: string;
  handover: ExchangeMethod | "";
  tradesOnly: boolean;
  sort: "newest" | "price-asc" | "price-desc";
};

export const EMPTY_FILTERS: Filters = {
  query: "",
  type: "",
  rarity: "",
  maxPrice: "",
  handover: "",
  tradesOnly: false,
  sort: "newest",
};

const chip = "shrink-0 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap";
const chipOff = "border-rule bg-white text-ink hover:border-ink/40";
const chipOn = "border-ink bg-ink text-paper";
const setTint = "border-accent bg-accent-tint text-accent-deep";

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
  const [open, setOpen] = useState(false);
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  const narrowed = [filters.rarity, filters.maxPrice, filters.handover, filters.tradesOnly].filter(Boolean).length;

  return (
    <form role="search" onSubmit={(e) => e.preventDefault()} className="space-y-4">
      <div className="flex gap-2">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search by card or set name</span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-ink-soft"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => update("query", e.target.value)}
            placeholder="Charizard, Evolving Skies…"
            className="w-full rounded-full border border-rule bg-white py-3.5 pl-13 pr-5 text-base text-ink shadow-panel placeholder:text-ink-soft/70 hover:border-ink/30 focus-visible:border-accent focus-visible:outline-offset-0 sm:text-lg"
          />
        </label>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="more-filters"
          onClick={() => setOpen((o) => !o)}
          className={`${chip} px-5 sm:hidden ${open || narrowed > 0 ? chipOn : chipOff}`}
        >
          Filters{narrowed > 0 && <span className="tabular"> ({narrowed})</span>}
        </button>
      </div>

      <div role="group" aria-label="Type" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {["", ...types].map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={filters.type === t}
            onClick={() => update("type", t)}
            className={`${chip} active:scale-95 ${filters.type === t ? chipOn : chipOff}`}
          >
            {t || "All types"}
          </button>
        ))}
      </div>

      <div id="more-filters" className={`${open ? "flex" : "hidden"} flex-wrap items-center gap-2 sm:flex`}>
        <label>
          <span className="sr-only">Rarity</span>
          <select
            value={filters.rarity}
            onChange={(e) => update("rarity", e.target.value)}
            className={`pill-select ${chip} ${filters.rarity ? setTint : chipOff}`}
          >
            <option value="">Any rarity</option>
            {rarities.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Handover</span>
          <select
            value={filters.handover}
            onChange={(e) => update("handover", e.target.value as Filters["handover"])}
            className={`pill-select ${chip} ${filters.handover ? setTint : chipOff}`}
          >
            <option value="">Any handover</option>
            {EXCHANGE_METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label
          className={`${chip} flex items-center gap-1 pr-2 focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-accent ${
            filters.maxPrice ? setTint : chipOff
          }`}
        >
          Under $<span className="sr-only"> (max price)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={filters.maxPrice}
            onChange={(e) => update("maxPrice", e.target.value)}
            placeholder="any"
            className="tabular w-14 bg-transparent focus-visible:outline-none"
          />
        </label>
        <label
          className={`${chip} cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-accent ${
            filters.tradesOnly ? setTint : chipOff
          }`}
        >
          <input
            type="checkbox"
            checked={filters.tradesOnly}
            onChange={(e) => update("tradesOnly", e.target.checked)}
            className="sr-only"
          />
          Takes trades
        </label>
        <label className="sm:ml-auto">
          <span className="sr-only">Sort by</span>
          <select
            value={filters.sort}
            onChange={(e) => update("sort", e.target.value as Filters["sort"])}
            className={`pill-select ${chip} ${chipOff}`}
          >
            <option value="newest">Newest listed</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
          </select>
        </label>
      </div>
    </form>
  );
}
