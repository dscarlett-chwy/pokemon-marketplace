"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import type { Card } from "@/lib/cards";

export function CardPicker({
  label,
  name = "cardId",
}: {
  label: string;
  name?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [selected, setSelected] = useState<Card | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (selected || query.trim().length < 2) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setStatus("Searching cards…");
        const response = await fetch(
          `/api/cards?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { cards: Card[] };
        setResults(data.cards);
        setStatus(
          data.cards.length ? "" : "No cards found. Try a different name.",
        );
      } catch {
        if (!controller.signal.aborted)
          setStatus("Card search is unavailable. Try again in a moment.");
      }
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selected]);

  return (
    <div className="field card-picker">
      <label htmlFor={name}>{label}</label>
      <input type="hidden" name={name} value={selected?.id ?? ""} required />
      {selected ? (
        <div className="selected-card">
          <img src={selected.image} alt="" />
          <span>
            <strong>{selected.name}</strong>
            <small>
              Card #{selected.number} · {selected.id}
            </small>
          </span>
          <button
            type="button"
            aria-label="Choose another card"
            onClick={() => {
              setSelected(null);
              setQuery("");
              setResults([]);
            }}
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <>
          <div className="search-input">
            <Search size={18} />
            <input
              id={name}
              type="search"
              placeholder="Search by Pokémon or card name"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setResults([]);
              }}
              autoComplete="off"
            />
          </div>
          {query.length >= 2 && (
            <div
              className="card-results"
              role="listbox"
              aria-label="Matching cards"
            >
              {results.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setSelected(card);
                    setResults([]);
                    setStatus("");
                  }}
                >
                  <img src={card.image} alt="" />
                  <span>
                    <strong>{card.name}</strong>
                    <small>
                      #{card.number} · {card.id}
                    </small>
                  </span>
                </button>
              ))}
              {status && <p role="status">{status}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
