"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Card } from "@/lib/card";
import { formatMoney } from "@/lib/format";
import type { OwnedCard } from "@/lib/types";
import { useMarketplace } from "@/store/marketplace";
import { useNotice } from "@/store/notice";
import { CardImage } from "./CardImage";

export function ListCardDialog({ item, card, onClose }: { item: OwnedCard; card: Card; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const createListing = useMarketplace((s) => s.createListing);
  const show = useNotice((s) => s.show);
  const [price, setPrice] = useState(card.marketPrice ? String(Math.round(card.marketPrice)) : "");
  const [openToTrades, setOpenToTrades] = useState(true);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = createListing({ itemId: item.id, askingPrice: Number(price), openToTrades, note });
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
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-lg bg-sheet p-0 text-ink backdrop:bg-ink/60"
    >
      <form onSubmit={submit} className="space-y-4 p-5" noValidate>
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
          <span className="mt-1 flex items-center rounded-md border border-rule bg-white focus-within:outline-3 focus-within:outline-frame">
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
              className="tabular w-full rounded-md bg-transparent px-2 py-2 text-lg focus-visible:shadow-none focus-visible:outline-none"
            />
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={openToTrades}
            onChange={(e) => setOpenToTrades(e.target.checked)}
            className="mt-1 size-5 accent-cardback"
          />
          <span>
            <span className="font-semibold">Open to trades</span>
            <span className="block text-sm text-ink-soft">Buyers can offer their own cards, with or without cash.</span>
          </span>
        </label>

        <label className="block">
          <span className="font-semibold">Note for buyers</span>
          <span className="text-ink-soft"> (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="Centering, whitening, how it was stored"
            className="mt-1 w-full rounded-md border border-rule bg-white px-3 py-2"
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
            className="rounded-md bg-cardback px-5 py-3 font-bold text-white shadow-[0_3px_0_var(--color-cardback-deep)] hover:bg-cardback-deep"
          >
            List for sale
          </button>
          <button type="button" onClick={() => ref.current?.close()} className="rounded-md px-4 py-3 font-semibold text-cardback hover:bg-white">
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
