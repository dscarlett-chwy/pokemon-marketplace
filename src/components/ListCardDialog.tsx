"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Card } from "@/lib/card";
import { METHOD_LABELS } from "@/lib/exchange";
import { formatMoney } from "@/lib/format";
import { MAX_AREA, meetsInPerson } from "@/lib/marketplace-rules";
import { EXCHANGE_METHODS, type ExchangeMethod, type OwnedCard } from "@/lib/types";
import { useMarketplace } from "@/store/marketplace";
import { useNotice } from "@/store/notice";
import { CardImage } from "./CardImage";

const METHOD_HINTS: Record<ExchangeMethod, string> = {
  pickup: "The buyer collects the card from you.",
  dropoff: "You bring the card to the buyer.",
  ship: "You mail the card. Who pays postage is part of the offer.",
};

export function ListCardDialog({ item, card, onClose }: { item: OwnedCard; card: Card; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const createListing = useMarketplace((s) => s.createListing);
  const show = useNotice((s) => s.show);
  const [price, setPrice] = useState(card.marketPrice ? String(Math.max(1, Math.round(card.marketPrice))) : "");
  const [openToTrades, setOpenToTrades] = useState(true);
  const [methods, setMethods] = useState<ExchangeMethod[]>(["ship"]);
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const toggleMethod = (m: ExchangeMethod) =>
    setMethods((all) => (all.includes(m) ? all.filter((x) => x !== m) : [...all, m]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = createListing({
      itemId: item.id,
      askingPrice: Number(price),
      openToTrades,
      exchangeMethods: methods,
      area,
      note,
    });
    if (!result.ok) return setError(result.error);
    show(`${card.name} is listed for sale`);
    onClose();
    router.push(`/listings/${result.id}`);
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="list-heading"
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-3xl bg-surface p-0 text-ink shadow-lift backdrop:bg-ink/50 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit} className="space-y-5 p-6 sm:p-7" noValidate>
        <div className="flex gap-4">
          <div className="w-24 shrink-0">
            <CardImage card={card} sizes="96px" />
          </div>
          <div>
            <h2 id="list-heading" className="font-display text-xl font-bold">
              List {card.name} for sale
            </h2>
            <p className="text-ink-soft">
              {card.set.name} #{card.number}, {item.condition}
            </p>
            {card.marketPrice !== null && (
              <p className="tabular mt-1 text-sm text-ink-soft">Recent market price {formatMoney(card.marketPrice)}</p>
            )}
          </div>
        </div>

        <label className="block">
          <span className="font-semibold">Asking price</span>
          <span className="mt-1 flex items-center rounded-xl border border-rule bg-white focus-within:outline-2 focus-within:outline-accent">
            <span aria-hidden className="pl-3 text-lg text-ink-soft">
              $
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              step="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="tabular w-full rounded-xl bg-transparent px-2 py-2 text-lg focus-visible:shadow-none focus-visible:outline-none"
            />
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={openToTrades}
            onChange={(e) => setOpenToTrades(e.target.checked)}
            className="mt-1 size-5 accent-accent"
          />
          <span>
            <span className="font-semibold">Open to trades</span>
            <span className="block text-sm text-ink-soft">Buyers can offer their own cards, with or without cash.</span>
          </span>
        </label>

        <fieldset>
          <legend className="font-semibold">Handover</legend>
          <p className="text-sm text-ink-soft">How the card can reach the buyer. Pick every way that works for you.</p>
          <div className="mt-2 space-y-2">
            {EXCHANGE_METHODS.map((m) => (
              <label key={m} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={methods.includes(m)}
                  onChange={() => toggleMethod(m)}
                  className="mt-1 size-5 accent-accent"
                />
                <span>
                  <span className="font-semibold">{METHOD_LABELS[m]}</span>
                  <span className="block text-sm text-ink-soft">{METHOD_HINTS[m]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {meetsInPerson(methods) && (
          <label className="block">
            <span className="font-semibold">Your area</span>
            <span className="block text-sm text-ink-soft">A neighborhood or city. You agree on the exact spot in the offer.</span>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              maxLength={MAX_AREA}
              placeholder="Cerulean City"
              className="mt-1 w-full rounded-xl border border-rule bg-white px-3 py-2"
            />
          </label>
        )}

        <label className="block">
          <span className="font-semibold">Note for buyers</span>
          <span className="text-ink-soft"> (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="Centering, whitening, how it was stored"
            className="mt-1 w-full rounded-xl border border-rule bg-white px-3 py-2"
          />
        </label>

        {error && (
          <p role="alert" className="font-semibold text-decline">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-3 font-semibold text-white hover:bg-accent-deep"
          >
            List for sale
          </button>
          <button type="button" onClick={() => ref.current?.close()} className="rounded-full px-4 py-3 font-medium text-ink-soft hover:bg-ink/5 hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
