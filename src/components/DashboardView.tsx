"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BUCKETS, type Bucket, dashboardStats, dealRows, type DealRow, sellerAdds, sideText } from "@/lib/dashboard";
import { formatMoney, formatWhen } from "@/lib/format";
import type { Party } from "@/lib/types";
import { useHydrated } from "@/store/hydration";
import { useMarketplace } from "@/store/marketplace";
import { CardImage } from "./CardImage";

const SIDES: { party: Party; label: string }[] = [
  { party: "seller", label: "On your cards" },
  { party: "buyer", label: "Your offers" },
];

const EMPTY: Record<Party, Record<Bucket, string>> = {
  seller: {
    pending: "No open offers on your cards. List a card from My cards to get offers.",
    "in-progress": "No trades in progress. Accepted offers show up here until both of you confirm.",
    completed: "You haven't sold a card yet.",
    declined: "You haven't declined any offers.",
    closed: "No closed offers or cancelled trades.",
  },
  buyer: {
    pending: "You have no open offers. Find a card in the marketplace and make one.",
    "in-progress": "No trades in progress on cards you're buying.",
    completed: "You haven't bought a card yet.",
    declined: "None of your offers were declined.",
    closed: "No closed offers.",
  },
};

function statusLabel(row: DealRow) {
  if (row.bucket === "pending") return row.myTurn ? "Your turn" : `Waiting on ${row.other.name}`;
  if (row.bucket === "in-progress") return row.myTurn ? "Your step" : `Waiting on ${row.other.name}`;
  if (row.offer.trade?.status === "cancelled") return "Cancelled";
  return BUCKETS.find((b) => b.bucket === row.bucket)!.label;
}

const STATUS_STYLE: Record<Bucket, string> = {
  pending: "text-ink-soft",
  "in-progress": "text-cardback",
  completed: "text-accept",
  declined: "text-decline",
  closed: "text-ink-soft",
};

function DealItem({ row }: { row: DealRow }) {
  const { offer, card, other, party, terms, steps } = row;
  const extra = sellerAdds(terms) ? sideText(terms.seller) : null;
  const summary =
    party === "seller"
      ? `From ${other.name}, ${sideText(terms.buyer)}${extra ? `, you add ${extra}` : ""}`
      : `To ${other.name}, you give ${sideText(terms.buyer)}${extra ? ` and get ${extra} extra` : ""}`;
  const when = row.bucket === "in-progress" ? `${steps.done} of ${steps.total} steps done` : formatWhen(offer.updatedAt);
  return (
    <li>
      <Link
        href={`/offers?offer=${offer.id}`}
        className="flex items-center gap-3 rounded-lg border-2 border-transparent bg-white/60 p-3 hover:border-cardback/30 hover:bg-white"
      >
        <span className="w-12 shrink-0">
          <CardImage card={card} sizes="48px" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display font-bold">{card.name}</span>
          <span className="block text-sm text-ink-soft sm:truncate">{summary}</span>
          <span className="tabular block text-sm text-ink-soft sm:hidden">{when}</span>
        </span>
        <span className="tabular hidden shrink-0 text-sm text-ink-soft sm:block">{when}</span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold ${
            row.myTurn ? "bg-frame text-ink" : STATUS_STYLE[row.bucket]
          }`}
        >
          {statusLabel(row)}
        </span>
      </Link>
    </li>
  );
}

function SaleItem({ row }: { row: DealRow }) {
  const items = useMarketplace((s) => s.items);
  const cards = useMarketplace((s) => s.cards);
  const { offer, card, other, terms } = row;
  const got = terms.buyer.itemIds.flatMap((id) => {
    const c = items[id] && cards[items[id].cardId];
    return c ? [{ id, card: c }] : [];
  });
  return (
    <li className="flex gap-4 border-b border-rule py-4 last:border-b-0">
      <Link href={`/offers?offer=${offer.id}`} className="w-16 shrink-0 sm:w-20">
        <CardImage card={card} sizes="80px" />
      </Link>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <Link href={`/offers?offer=${offer.id}`} className="font-display text-lg font-bold hover:underline">
            {card.name}
          </Link>
          <span className="tabular text-sm text-ink-soft">{formatWhen(offer.updatedAt)}</span>
        </div>
        <p className="text-ink-soft">
          Sold to {other.name} for <span className="tabular font-semibold text-ink">{sideText(terms.buyer)}</span>
          {sellerAdds(terms) && <>, you added {sideText(terms.seller)}</>}
        </p>
        {got.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Cards you received">
            {got.map(({ id, card: c }) => (
              <li key={id} className="w-12">
                <CardImage card={c} sizes="48px" />
                <span className="sr-only">{c.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function DashboardView() {
  const hydrated = useHydrated();
  const me = useMarketplace((s) => s.currentUserId);
  const users = useMarketplace((s) => s.users);
  const items = useMarketplace((s) => s.items);
  const cards = useMarketplace((s) => s.cards);
  const listings = useMarketplace((s) => s.listings);
  const offers = useMarketplace((s) => s.offers);
  const [side, setSide] = useState<Party>("seller");
  const [bucket, setBucket] = useState<Bucket>("pending");

  const rows = useMemo(
    () => dealRows({ users, items, cards, listings, offers }, me),
    [users, items, cards, listings, offers, me],
  );
  const stats = useMemo(() => dashboardStats(listings, me, rows), [listings, me, rows]);

  if (!hydrated) return <p className="text-ink-soft">Opening the binder…</p>;

  const sideRows = rows.filter((r) => r.party === side);
  const shown = sideRows.filter((r) => r.bucket === bucket);
  const user = users[me];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-display font-extrabold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-lg text-ink-soft">{user.name}&apos;s sales and trades</p>
      </div>

      <dl className="binder-sheet grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-4 sm:border-b sm:border-rule sm:pb-5">
          <dt className="text-ink-soft">Cash from sales</dt>
          <dd className="tabular font-display text-5xl font-extrabold tracking-tight text-cardback sm:text-6xl">
            {formatMoney(stats.cashFromSales)}
          </dd>
        </div>
        <Stat label="Cards sold" value={stats.cardsSold} />
        <Stat label="Cards received in trades" value={stats.cardsReceived} />
        <Stat label="Active listings" value={stats.activeListings} href="/inventory" />
        <div className={stats.waitingOnMe > 0 ? "-m-2 rounded-md bg-frame p-2" : undefined}>
          <dt className={stats.waitingOnMe > 0 ? "text-ink" : "text-ink-soft"}>Waiting on you</dt>
          <dd className="tabular font-display text-3xl font-bold">
            {stats.waitingOnMe > 0 ? (
              <Link href="/offers" className="underline underline-offset-4">
                {stats.waitingOnMe}
              </Link>
            ) : (
              0
            )}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="deals-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="deals-heading" className="font-display text-title font-bold">
            Offers and trades
          </h2>
          <div role="tablist" aria-label="Whose offers" className="flex gap-2 border-b border-rule">
            {SIDES.map(({ party, label }) => (
              <button
                key={party}
                type="button"
                role="tab"
                aria-selected={side === party}
                onClick={() => setSide(party)}
                className={`-mb-px border-b-4 px-3 py-1.5 font-semibold ${
                  side === party ? "border-cardback text-ink" : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Filter by status" role="group">
          {BUCKETS.map(({ bucket: b, label }) => {
            const count = sideRows.filter((r) => r.bucket === b).length;
            const selected = bucket === b;
            return (
              <button
                key={b}
                type="button"
                aria-pressed={selected}
                onClick={() => setBucket(b)}
                className={`tabular rounded-full border-2 px-3 py-1 text-sm font-semibold ${
                  selected ? "border-cardback bg-cardback text-white" : "border-rule bg-white/60 text-ink hover:border-cardback/40"
                }`}
              >
                {label} {count}
              </button>
            );
          })}
        </div>

        {shown.length === 0 ? (
          <p className="rounded-lg border border-dashed border-rule px-4 py-8 text-center text-lg">{EMPTY[side][bucket]}</p>
        ) : (
          <ul className="space-y-2">
            {shown.map((row) => (
              <DealItem key={row.offer.id} row={row} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="sales-heading" className="space-y-2">
        <h2 id="sales-heading" className="font-display text-title font-bold">
          Sales
        </h2>
        {stats.sales.length === 0 ? (
          <p className="py-4 text-lg">
            No sales yet. When a trade on one of your cards is completed, it&apos;s recorded here.{" "}
            <Link href="/inventory" className="font-semibold text-cardback underline underline-offset-4">
              List a card
            </Link>
          </p>
        ) : (
          <ul>
            {stats.sales.map((row) => (
              <SaleItem key={row.offer.id} row={row} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  return (
    <div>
      <dt className="text-ink-soft">{label}</dt>
      <dd className="tabular font-display text-3xl font-bold">
        {href ? (
          <Link href={href} className="hover:underline">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
