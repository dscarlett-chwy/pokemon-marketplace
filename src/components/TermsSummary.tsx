"use client";

import { formatMoney } from "@/lib/format";
import type { OfferTerms } from "@/lib/types";
import { useMarketplace } from "@/store/marketplace";
import { CardImage } from "./CardImage";

export function termsText(terms: OfferTerms) {
  const cards = terms.itemIds.length === 1 ? "1 card" : `${terms.itemIds.length} cards`;
  if (terms.itemIds.length === 0) return formatMoney(terms.cash);
  if (terms.cash === 0) return cards;
  return `${formatMoney(terms.cash)} + ${cards}`;
}

export function TermsSummary({ terms }: { terms: OfferTerms }) {
  const items = useMarketplace((s) => s.items);
  const cards = useMarketplace((s) => s.cards);

  return (
    <div className="space-y-2">
      <p className="tabular font-display text-xl font-bold">{termsText(terms)}</p>
      {terms.itemIds.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {terms.itemIds.map((id) => {
            const item = items[id];
            const card = item && cards[item.cardId];
            if (!card) return null;
            return (
              <li key={id} className="w-20">
                <CardImage card={card} sizes="80px" />
                <span className="mt-1 block truncate text-xs font-semibold">{card.name}</span>
                <span className="block truncate text-xs text-ink-soft">{item.condition}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
