"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { Listing, OfferTerms, Result } from "@/lib/types";
import { tradeableItems, useMarketplace } from "@/store/marketplace";
import { CardImage } from "./CardImage";

export function OfferForm({
  listing,
  buyerId,
  initial,
  pickerLabel,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  listing: Listing;
  buyerId: string;
  initial?: OfferTerms;
  pickerLabel: string;
  submitLabel: string;
  onSubmit: (terms: OfferTerms, message: string) => Result;
  onCancel?: () => void;
}) {
  const items = useMarketplace((s) => s.items);
  const listings = useMarketplace((s) => s.listings);
  const cards = useMarketplace((s) => s.cards);
  const [cash, setCash] = useState(initial && initial.cash > 0 ? String(initial.cash) : "");
  const [picked, setPicked] = useState<string[]>(initial?.itemIds ?? []);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tradeable = useMemo(() => tradeableItems({ items, listings }, buyerId), [items, listings, buyerId]);
  const cashValue = cash === "" ? 0 : Number(cash);
  const cardValue = picked.reduce((sum, id) => sum + (cards[items[id]?.cardId]?.marketPrice ?? 0), 0);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onSubmit({ cash: cashValue, itemIds: picked }, message);
    if (!result.ok) setError(result.error);
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <label className="block">
        <span className="font-semibold">Cash</span>
        <span className="mt-1 flex items-center rounded-md border border-rule bg-white focus-within:outline-3 focus-within:outline-frame">
          <span aria-hidden className="pl-3 text-lg text-ink-soft">
            $
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            placeholder="0"
            className="tabular w-full rounded-md bg-transparent px-2 py-2 text-lg focus-visible:shadow-none focus-visible:outline-none"
          />
        </span>
      </label>

      {listing.openToTrades ? (
        <fieldset>
          <legend className="font-semibold">{pickerLabel}</legend>
          {tradeable.length === 0 ? (
            <p className="mt-1 text-ink-soft">No cards available to trade. Cards that are listed for sale can&apos;t be traded.</p>
          ) : (
            <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {tradeable.map((item) => {
                const card = cards[item.cardId];
                const on = picked.includes(item.id);
                return (
                  <li key={item.id}>
                    <label
                      className={`block cursor-pointer rounded-md border-2 p-1.5 has-focus-visible:outline-3 has-focus-visible:outline-frame ${
                        on ? "border-cardback bg-cardback/10" : "border-transparent hover:border-rule"
                      }`}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggle(item.id)} className="sr-only" />
                      <CardImage card={card} sizes="120px" />
                      <span className="mt-1 block truncate text-sm font-semibold">{card.name}</span>
                      <span className="block truncate text-xs text-ink-soft">{item.condition}</span>
                      {on && <span className="block text-xs font-semibold text-cardback">Added</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>
      ) : (
        <p className="text-ink-soft">The seller only takes cash for this card.</p>
      )}

      <label className="block">
        <span className="font-semibold">Message</span>
        <span className="text-ink-soft"> (optional)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={280}
          className="mt-1 w-full rounded-md border border-rule bg-white px-3 py-2"
        />
      </label>

      <div className="rounded-md bg-white/70 p-3 text-base">
        <p className="tabular font-semibold">
          {formatMoney(cashValue || 0)} cash
          {picked.length > 0 && ` + ${picked.length === 1 ? "1 card" : `${picked.length} cards`}`}
        </p>
        <p className="tabular text-sm text-ink-soft">
          Asking price {formatMoney(listing.askingPrice)}
          {picked.length > 0 && cardValue > 0 && `. Cards in this offer sell for about ${formatMoney(Math.round(cardValue))}.`}
        </p>
      </div>

      {error && (
        <p role="alert" className="font-semibold text-decline">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-md bg-cardback px-5 py-3 text-base font-bold text-white shadow-[0_3px_0_var(--color-cardback-deep)] hover:bg-cardback-deep"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md px-4 py-3 font-semibold text-cardback hover:bg-white">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
