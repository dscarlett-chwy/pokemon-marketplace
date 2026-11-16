"use client";

import { SearchResultsSkeleton } from "./Skeletons";
import { useEffect, useState } from "react";
import type { Card } from "@/lib/card";
import { fetchCardSearch } from "@/lib/cards-client";
import { formatMoney } from "@/lib/format";
import { CONDITIONS, type Condition } from "@/lib/types";
import { useMarketplace } from "@/store/marketplace";
import { useNotice } from "@/store/notice";
import { CardImage } from "./CardImage";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; cards: Card[]; total: number }
  | { status: "error"; message: string };

function ResultRow({ card }: { card: Card }) {
  const addCard = useMarketplace((s) => s.addCard);
  const show = useNotice((s) => s.show);
  const [condition, setCondition] = useState<Condition>("Near mint");

  return (
    <li className="flex gap-3 rounded-2xl border border-rule bg-white p-3">
      <div className="w-20 shrink-0">
        <CardImage card={card} sizes="80px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <p className="truncate font-display font-bold">{card.name}</p>
          <p className="truncate text-sm text-ink-soft">
            {card.set.name} #{card.number}
          </p>
          {card.marketPrice !== null && (
            <p className="tabular text-sm text-ink-soft">Sells for about {formatMoney(card.marketPrice)}</p>
          )}
        </div>
        <div className="mt-auto flex flex-wrap items-end gap-2">
          <label className="text-sm font-semibold">
            <span className="sr-only">Condition of {card.name}</span>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              className="pill-select rounded-full border border-rule bg-white py-1.5 pl-3 text-sm"
            >
              {CONDITIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              addCard(card, condition);
              show(`Added ${card.name} to your cards`);
            }}
            className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-deep"
          >
            Add to my cards<span className="sr-only">: {card.name}, {card.set.name} #{card.number}</span>
          </button>
        </div>
      </div>
    </li>
  );
}

export function AddCardPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const term = query.trim();

  useEffect(() => {
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearch({ status: "loading" });
      fetchCardSearch(term, controller.signal)
        .then((r) => setSearch({ status: "done", cards: r.cards, total: r.totalCount }))
        .catch((e: Error) => {
          if (e.name !== "AbortError") setSearch({ status: "error", message: e.message });
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, attempt]);

  return (
    <section aria-labelledby="add-card-heading" className="rounded-3xl border border-rule bg-surface p-5 shadow-panel sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="add-card-heading" className="font-display text-xl font-bold">
            Add a card
          </h2>
          <p className="text-ink-soft">Search the full Pokemon card catalog, then pick the condition of your copy.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 font-medium text-ink-soft hover:bg-ink/5 hover:text-ink">
          Done
        </button>
      </div>

      <label className="mt-4 block">
        <span className="sr-only">Card name</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Card name, like Gengar"
          className="w-full rounded-full border border-rule bg-white px-5 py-3 text-lg hover:border-ink/30 focus-visible:border-accent focus-visible:outline-offset-0"
        />
      </label>

      <div className="mt-4" aria-live="polite">
        {term.length < 2 ? (
          <p className="text-ink-soft">Type at least 2 letters to search.</p>
        ) : search.status === "loading" || search.status === "idle" ? (
          <SearchResultsSkeleton />
        ) : search.status === "error" ? (
          <p className="text-decline">
            {search.message}.{" "}
            <button type="button" onClick={() => setAttempt((a) => a + 1)} className="font-semibold underline underline-offset-4">
              Try again
            </button>
          </p>
        ) : search.cards.length === 0 ? (
          <p>No cards named &ldquo;{term}&rdquo;. Check the spelling, or try just part of the name.</p>
        ) : (
          <>
            <p className="tabular mb-3 text-sm text-ink-soft">
              {search.total > search.cards.length
                ? `Showing the ${search.cards.length} newest of ${search.total} matches`
                : `${search.cards.length} matches`}
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {search.cards.map((card) => (
                <ResultRow key={card.id} card={card} />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
