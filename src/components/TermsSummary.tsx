"use client";

import type { Card } from "@/lib/card";
import { exchangeLabel } from "@/lib/exchange";
import { formatMoney } from "@/lib/format";
import { payer, type Deal } from "@/lib/marketplace-rules";
import type { MarketData, OfferTerms, Party, Side } from "@/lib/types";
import { useMarketplace } from "@/store/marketplace";
import { CardImage } from "./CardImage";

type NameFor = (party: Party) => string;

export function sideText(side: Side) {
  const n = side.itemIds.length;
  const cards = n === 1 ? "1 card" : `${n} cards`;
  if (n === 0) return formatMoney(side.cash);
  if (side.cash === 0) return cards;
  return `${formatMoney(side.cash)} + ${cards}`;
}

const hasExtras = (side: Side) => side.cash > 0 || side.itemIds.length > 0;

/** The listed card plus whatever the seller adds, like "Lugia + $70". */
export const sellerGivesText = (cardName: string, seller: Side) =>
  hasExtras(seller) ? `${cardName} + ${sideText(seller)}` : cardName;

const givesText = (name: string, side: Side) => `${name === "You" ? "you give" : `${name} gives`} ${sideText(side)}`;

/**
 * What the buyer gives, plus anything the seller adds, like "$180, Misty adds 1 card". Without a
 * listed card both sides are spelled out, like "you give 1 card, Misty gives $20".
 */
export function termsText(terms: OfferTerms, nameFor: NameFor, direct = false) {
  if (direct) return `${givesText(nameFor("buyer"), terms.buyer)}, ${givesText(nameFor("seller"), terms.seller)}`;
  if (!hasExtras(terms.seller)) return sideText(terms.buyer);
  const who = nameFor("seller");
  return `${sideText(terms.buyer)}, ${who === "You" ? "you add" : `${who} adds`} ${sideText(terms.seller)}`;
}

/** Like "Misty pays $70 online through Trade Binder", or null when no cash changes hands. */
export function paymentText(terms: OfferTerms, nameFor: NameFor) {
  const p = payer(terms);
  if (!p || !terms.payment) return null;
  const who = nameFor(p.party);
  const how = terms.payment === "online" ? "online through Trade Binder" : "in person";
  return `${who} ${who === "You" ? "pay" : "pays"} ${formatMoney(p.cash)} ${how}`;
}

/** Rough worth of cash plus cards at recent market prices. */
export function marketValue(cash: number, itemIds: string[], data: Pick<MarketData, "items" | "cards">) {
  return itemIds.reduce((sum, id) => sum + (data.cards[data.items[id]?.cardId]?.marketPrice ?? 0), cash);
}

export const givesLabel = (name: string) => `${name} ${name === "You" ? "give" : "gives"}`;

function CardList({ entries }: { entries: { id: string; card: Card; condition: string }[] }) {
  if (entries.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {entries.map(({ id, card, condition }) => (
        <li key={id} className="w-20">
          <CardImage card={card} sizes="80px" />
          <span className="mt-1 block truncate text-xs font-semibold">{card.name}</span>
          <span className="block truncate text-xs text-ink-soft">{condition}</span>
        </li>
      ))}
    </ul>
  );
}

export function TermsSummary({ terms, deal, nameFor }: { terms: OfferTerms; deal: Deal; nameFor: NameFor }) {
  const { listing } = deal;
  const items = useMarketplace((s) => s.items);
  const cards = useMarketplace((s) => s.cards);
  const { exchange } = terms;
  const payment = paymentText(terms, nameFor);

  const entries = (ids: string[]) =>
    ids.flatMap((id) => {
      const item = items[id];
      const card = item && cards[item.cardId];
      return card ? [{ id, card, condition: item.condition }] : [];
    });

  const halves = (["buyer", "seller"] as const).map((party) => {
    const side = terms[party];
    const ids = party === "seller" && listing ? [listing.itemId, ...side.itemIds] : side.itemIds;
    const summary =
      party === "seller" && listing
        ? sellerGivesText(cards[items[listing.itemId]?.cardId]?.name ?? "The card", side)
        : sideText(side);
    return { party, ids, summary, value: marketValue(side.cash, ids, { items, cards }) };
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-rule">
        {halves.map(({ party, ids, summary, value }) => (
          <section key={party} className="space-y-2 sm:px-4 sm:first:pl-0 sm:last:pr-0">
            <h4 className="text-sm text-ink-soft">{givesLabel(nameFor(party))}</h4>
            <p className="tabular font-display text-lg leading-snug font-bold">{summary}</p>
            <CardList entries={entries(ids)} />
            <p className="tabular text-sm text-ink-soft">About {formatMoney(Math.round(value))} at market</p>
          </section>
        ))}
      </div>
      <div>
        <p className="font-semibold">{exchangeLabel(exchange, deal.area, nameFor)}</p>
        {exchange.method !== "ship" && exchange.meetup && <p className="text-ink-soft">Meetup: {exchange.meetup}</p>}
        {payment && <p className="tabular font-semibold">{payment}</p>}
      </div>
    </div>
  );
}
