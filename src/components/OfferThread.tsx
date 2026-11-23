"use client";

import Link from "next/link";
import { useState } from "react";
import { exchangePhrase } from "@/lib/exchange";
import { formatMoney, formatWhen } from "@/lib/format";
import type { Offer } from "@/lib/types";
import { dealOf, latestTerms, leadItemId, partyOf, useMarketplace, useMe, whoseTurn } from "@/store/marketplace";
import { useNotice } from "@/store/notice";
import { CardImage } from "./CardImage";
import { OfferForm } from "./OfferForm";
import { TradeChecklist } from "./TradeChecklist";
import { paymentText, sellerGivesText, sideText, termsText, TermsSummary } from "./TermsSummary";

type Mode = "idle" | "confirm-accept" | "confirm-decline" | "counter";

const linkStyle = "text-sm font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent";

export function OfferThread({ offer }: { offer: Offer }) {
  const me = useMe();
  const users = useMarketplace((s) => s.users);
  const listings = useMarketplace((s) => s.listings);
  const items = useMarketplace((s) => s.items);
  const cards = useMarketplace((s) => s.cards);
  const acceptOffer = useMarketplace((s) => s.acceptOffer);
  const declineOffer = useMarketplace((s) => s.declineOffer);
  const counterOffer = useMarketplace((s) => s.counterOffer);
  const show = useNotice((s) => s.show);
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);

  const myParty = partyOf(offer, me);
  const otherId = myParty === "buyer" ? offer.sellerId : offer.buyerId;
  const other = users[otherId];
  const myTurn = offer.status === "pending" && myParty === whoseTurn(offer);
  const terms = latestTerms(offer);
  const deal = dealOf(listings, offer);
  const { listing } = deal;
  const leadItem = items[leadItemId(deal, terms) ?? ""];
  const leadCard = leadItem && cards[leadItem.cardId];
  const card = listing ? leadCard : null;
  const nameFor = (by: "buyer" | "seller") => {
    const id = by === "buyer" ? offer.buyerId : offer.sellerId;
    return id === me ? "You" : users[id].name;
  };
  const handover = exchangePhrase(terms.exchange, deal.area, nameFor);
  const payment = paymentText(terms, nameFor);
  const summary = termsText(terms, nameFor, !listing);
  const sellerGives = card ? sellerGivesText(card.name, terms.seller) : sideText(terms.seller);

  const run = (action: () => { ok: boolean; error?: string }, done: string) => {
    const result = action();
    if (!result.ok) return setError(result.error ?? "Something went wrong");
    setError(null);
    setMode("idle");
    show(done);
  };

  return (
    <article aria-labelledby="thread-heading" className="space-y-6">
      {listing && card ? (
        <header className="flex gap-4">
          <Link href={`/listings/${listing.id}`} className="w-24 shrink-0">
            <CardImage card={card} sizes="96px" />
          </Link>
          <div className="min-w-0">
            <h2 id="thread-heading" className="font-display text-title font-bold">
              {card.name}
            </h2>
            <p className="text-ink-soft">
              {card.set.name} #{card.number}, {leadItem.condition}
            </p>
            <p className="tabular mt-1">
              Asking {formatMoney(listing.askingPrice)}
              {myParty === "buyer" ? `, sold by ${other.name}` : `, offer from ${other.name}`}
            </p>
            <Link href={`/listings/${listing.id}`} className={linkStyle}>
              View listing
            </Link>
          </div>
        </header>
      ) : (
        <header className="flex gap-4">
          {leadCard && (
            <span className="w-24 shrink-0">
              <CardImage card={leadCard} sizes="96px" />
            </span>
          )}
          <div className="min-w-0">
            <h2 id="thread-heading" className="font-display text-title font-bold">
              Trade with {other.name}
            </h2>
            <p className="text-ink-soft">
              {myParty === "buyer" ? `A direct offer you sent ${other.name}` : `A direct offer from ${other.name}`}, not tied to a
              listing.
            </p>
            {other.handle && (
              <Link href={`/u/${other.handle}`} className={linkStyle}>
                View {other.name}&apos;s profile
              </Link>
            )}
          </div>
        </header>
      )}

      <ol className="space-y-3" aria-label="Offer history">
        {offer.rounds.map((round, i) => {
          const mine = nameFor(round.by) === "You";
          return (
            <li
              key={i}
              className={`rounded-2xl border p-4 sm:p-5 ${mine ? "border-accent/20 bg-accent-tint/60 sm:ml-10" : "border-rule bg-white sm:mr-10"}`}
            >
              <p className="text-sm text-ink-soft">
                <span className="font-semibold text-ink">
                  {nameFor(round.by)} {i === 0 ? "offered" : "countered"}
                </span>
                , {formatWhen(round.at)}
              </p>
              <div className="mt-2">
                <TermsSummary terms={round.terms} deal={deal} nameFor={nameFor} />
              </div>
              {round.message && <p className="mt-2 text-base">&ldquo;{round.message}&rdquo;</p>}
            </li>
          );
        })}
      </ol>

      <section aria-live="polite" className="rounded-3xl border border-rule bg-surface p-5 shadow-panel sm:p-7">
        {offer.trade ? (
          <TradeChecklist offer={{ ...offer, trade: offer.trade }} deal={deal} card={card} nameFor={nameFor} />
        ) : offer.status === "declined" ? (
          <p className="font-display text-xl font-bold text-decline">
            {nameFor(whoseTurn(offer))} declined this offer.
          </p>
        ) : offer.status === "closed" ? (
          <p className="font-display text-xl font-bold">
            Offer closed. <span className="font-sans text-base font-normal">{offer.closedReason}</span>
          </p>
        ) : !myTurn ? (
          <p className="text-lg">
            Waiting on {other.name} to accept, decline, or counter{listing ? " " : ": "}
            {summary}, {handover}.
          </p>
        ) : mode === "counter" ? (
          <>
            <h3 className="mb-4 font-display text-xl font-bold">Counter with new terms</h3>
            <OfferForm
              deal={deal}
              buyerId={offer.buyerId}
              initial={terms}
              submitLabel="Send counter"
              names={{ buyer: nameFor("buyer"), seller: nameFor("seller") }}
              onCancel={() => setMode("idle")}
              onSubmit={(next, message) => {
                const result = counterOffer(offer.id, next, message);
                if (result.ok) {
                  setMode("idle");
                  show(`Counter sent to ${other.name}`);
                }
                return result;
              }}
            />
          </>
        ) : mode === "confirm-accept" ? (
          <div className="space-y-3">
            <p className="text-lg">
              {myParty === "seller"
                ? `Give ${sellerGives} to ${other.name} for ${sideText(terms.buyer)}, ${handover}?`
                : `Give ${sideText(terms.buyer)} for ${sellerGives}, ${handover}?`}{" "}
              {payment && `${payment}.`}{" "}
              You&apos;ll both get a checklist, and cards change owners once each of you confirms you got your side.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  run(() => acceptOffer(offer.id), "Offer accepted. Work through the checklist to finish the trade")
                }
                className="rounded-full bg-accept px-5 py-3 font-semibold text-white hover:brightness-95"
              >
                Yes, accept
              </button>
              <button type="button" onClick={() => setMode("idle")} className="rounded-full px-4 py-3 font-medium text-ink-soft hover:bg-ink/5 hover:text-ink">
                Not yet
              </button>
            </div>
          </div>
        ) : mode === "confirm-decline" ? (
          <div className="space-y-3">
            <p className="text-lg">Decline this offer? {other.name} can make a new one later.</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => run(() => declineOffer(offer.id), "Offer declined")}
                className="rounded-full bg-decline px-5 py-3 font-semibold text-white hover:brightness-95"
              >
                Yes, decline
              </button>
              <button type="button" onClick={() => setMode("idle")} className="rounded-full px-4 py-3 font-medium text-ink-soft hover:bg-ink/5 hover:text-ink">
                Not yet
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-lg">
              Your turn. {other.name} {offer.rounds.length === 1 ? "offered" : "countered with"}
              {listing ? " " : " a trade: "}
              {summary}, {handover}.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setMode("confirm-accept")}
                className="rounded-full bg-accept px-5 py-3 font-semibold text-white hover:brightness-95"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => setMode("counter")}
                className="rounded-full bg-accent px-5 py-3 font-semibold text-white hover:bg-accent-deep"
              >
                Counter
              </button>
              <button
                type="button"
                onClick={() => setMode("confirm-decline")}
                className="rounded-full border border-decline/50 px-5 py-2.5 font-bold text-decline hover:bg-decline hover:text-white"
              >
                Decline
              </button>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 font-semibold text-decline">
            {error}
          </p>
        )}
      </section>
    </article>
  );
}
