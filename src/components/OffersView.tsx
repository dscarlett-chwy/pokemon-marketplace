"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Offer, Party } from "@/lib/types";
import { useHydrated } from "@/store/hydration";
import { latestTerms, partyOf, useMarketplace, whoseTurn } from "@/store/marketplace";
import { CardImage } from "./CardImage";
import { OfferThread } from "./OfferThread";
import { termsText } from "./TermsSummary";

const TABS: { party: Party; label: string }[] = [
  { party: "seller", label: "Received" },
  { party: "buyer", label: "Sent" },
];

function rank(offer: Offer, me: string) {
  if (offer.status !== "pending") return 2;
  return partyOf(offer, me) === whoseTurn(offer) ? 0 : 1;
}

export function OffersView() {
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const selectedId = useSearchParams().get("offer");
  const me = useMarketplace((s) => s.currentUserId);
  const offers = useMarketplace((s) => s.offers);
  const listings = useMarketplace((s) => s.listings);
  const items = useMarketplace((s) => s.items);
  const cards = useMarketplace((s) => s.cards);
  const users = useMarketplace((s) => s.users);
  const [tabChoice, setTabChoice] = useState<Party>("seller");

  const mine = useMemo(
    () =>
      Object.values(offers)
        .filter((o) => partyOf(o, me))
        .sort((a, b) => rank(a, me) - rank(b, me) || b.updatedAt.localeCompare(a.updatedAt)),
    [offers, me],
  );

  const selectedOffer = mine.find((o) => o.id === selectedId) ?? null;
  const tab = selectedOffer ? partyOf(selectedOffer, me)! : tabChoice;
  const shown = mine.filter((o) => partyOf(o, me) === tab);
  const active = selectedOffer ?? shown[0] ?? null;

  const select = (id: string) => router.replace(`${pathname}?offer=${id}`, { scroll: false });

  if (!hydrated) return <p className="text-ink-soft">Opening the binder…</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-display font-extrabold tracking-tight">Offers</h1>

      <div role="tablist" aria-label="Offers" className="flex gap-2 border-b border-rule">
        {TABS.map(({ party, label }) => {
          const waiting = mine.filter((o) => partyOf(o, me) === party && rank(o, me) === 0).length;
          const selected = tab === party;
          return (
            <button
              key={party}
              role="tab"
              id={`tab-${party}`}
              aria-selected={selected}
              aria-controls="offers-panel"
              onClick={() => {
                setTabChoice(party);
                router.replace(pathname, { scroll: false });
              }}
              className={`-mb-px flex items-center gap-2 border-b-4 px-4 py-2 text-lg font-semibold ${
                selected ? "border-cardback text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {label}
              {waiting > 0 && (
                <span className="tabular rounded-full bg-frame px-2 text-sm leading-6 text-ink">
                  {waiting}
                  <span className="sr-only"> waiting on you</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div id="offers-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {shown.length === 0 ? (
          <p className="py-8 text-lg">
            {tab === "seller"
              ? "No offers on your cards yet. Buyers' offers will show up here."
              : "You haven't made any offers. Find a card in the marketplace and make one."}
          </p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <ul className="space-y-2" aria-label={tab === "seller" ? "Offers on your cards" : "Offers you made"}>
              {shown.map((offer) => {
                const listing = listings[offer.listingId];
                const item = items[listing.itemId];
                const card = cards[item.cardId];
                const other = users[tab === "seller" ? offer.buyerId : offer.sellerId];
                const r = rank(offer, me);
                const status =
                  offer.status === "accepted"
                    ? "Accepted"
                    : offer.status === "declined"
                      ? "Declined"
                      : offer.status === "closed"
                        ? "Closed"
                        : r === 0
                          ? "Your turn"
                          : `Waiting on ${other.name}`;
                const current = active?.id === offer.id;
                return (
                  <li key={offer.id}>
                    <button
                      type="button"
                      onClick={() => select(offer.id)}
                      aria-current={current ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left ${
                        current ? "border-cardback bg-white" : "border-transparent bg-white/60 hover:bg-white"
                      }`}
                    >
                      <span className="w-12 shrink-0">
                        <CardImage card={card} sizes="48px" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display font-bold">{card.name}</span>
                        <span className="block truncate text-sm text-ink-soft">
                          {tab === "seller" ? `From ${other.name}` : `To ${other.name}`}, {termsText(latestTerms(offer))}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                          r === 0
                            ? "bg-frame text-ink"
                            : offer.status === "accepted"
                              ? "text-accept"
                              : offer.status === "declined"
                                ? "text-decline"
                                : "text-ink-soft"
                        }`}
                      >
                        {status}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {active && <OfferThread key={active.id} offer={active} />}
          </div>
        )}
      </div>
    </div>
  );
}
