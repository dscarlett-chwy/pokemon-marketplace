"use client";

import { useState } from "react";
import type { Card } from "@/lib/card";
import { exchangeLabel } from "@/lib/exchange";
import { formatMoney } from "@/lib/format";
import { payer, type StepState } from "@/lib/marketplace-rules";
import type { Listing, Offer, Party, Trade } from "@/lib/types";
import { latestTerms, partyOf, tradeSteps, useMarketplace } from "@/store/marketplace";
import { useNotice } from "@/store/notice";

const list = new Intl.ListFormat("en", { type: "conjunction" });
const other = (p: Party): Party => (p === "buyer" ? "seller" : "buyer");
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function Check({ state }: { state: "done" | "ready" | "waiting" }) {
  if (state === "done") {
    return (
      <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accept text-white">
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 8.5l3.2 3L13 4.5" />
        </svg>
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`mt-0.5 size-6 shrink-0 rounded-full border-2 ${state === "ready" ? "border-frame bg-frame/30" : "border-rule"}`}
    />
  );
}

export function TradeChecklist({
  offer,
  listing,
  card,
  nameFor,
}: {
  offer: Offer & { trade: Trade };
  listing: Listing;
  card: Card;
  nameFor: (party: Party) => string;
}) {
  const me = useMarketplace((s) => s.currentUserId);
  const items = useMarketplace((s) => s.items);
  const cards = useMarketplace((s) => s.cards);
  const completeStep = useMarketplace((s) => s.completeStep);
  const cancelTrade = useMarketplace((s) => s.cancelTrade);
  const show = useNotice((s) => s.show);
  const [confirming, setConfirming] = useState<"receive" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { trade } = offer;
  const myParty = partyOf(offer, me)!;
  const them = other(myParty);
  const terms = latestTerms(offer);
  const steps = tradeSteps(offer);
  const money = payer(terms);
  const online = money && terms.payment === "online";
  const shipping = terms.exchange.method === "ship";
  const paid = steps.some((s) => s.step === "pay" && s.done);
  const name = (p: Party) => nameFor(p);
  const lower = (p: Party) => (nameFor(p) === "You" ? "you" : nameFor(p));

  const sends = (p: Party) => {
    const ids = p === "seller" ? [listing.itemId, ...terms.seller.itemIds] : terms.buyer.itemIds;
    const things = ids.map((id) => cards[items[id]?.cardId]?.name ?? "a card");
    if (money?.party === p && terms.payment === "in_person") things.unshift(`${formatMoney(money.cash)} cash`);
    return list.format(things);
  };

  const todo = (s: StepState) => {
    if (s.step === "pay") return `Pay ${formatMoney(money!.cash)} into the hold`;
    if (s.step === "send") return `${shipping ? "Ship" : "Hand over"} ${sends(s.party)}`;
    return `Confirm ${s.party === myParty ? "you" : "they"} got ${sends(other(s.party))}`;
  };
  const doneText = (s: StepState) => {
    if (s.step === "pay") return `Paid ${formatMoney(money!.cash)} into the hold`;
    if (s.step === "send") return `${shipping ? "Shipped" : "Handed over"} ${sends(s.party)}`;
    return `Got ${sends(other(s.party))}`;
  };
  const waitText = (s: StepState) => {
    const who = lower(other(s.party));
    if (s.step === "send") return `After ${who} ${who === "you" ? "pay" : "pays"}`;
    return `After ${who} ${shipping ? (who === "you" ? "ship" : "ships") : who === "you" ? "hand over" : "hands over"}`;
  };

  const run = (result: { ok: boolean; error?: string }, done: string) => {
    if (!result.ok) return setError(result.error ?? "Something went wrong");
    setError(null);
    setConfirming(null);
    show(done);
  };

  const finishing = (s: StepState) => steps.filter((x) => !x.done).length === 1 && !s.done;
  const completeText =
    myParty === "buyer" ? `Trade complete. ${card.name} is in your cards` : `Trade complete. You traded ${card.name}`;

  const act = (s: StepState) => {
    const result = completeStep(offer.id, s.step);
    if (finishing(s)) return run(result, completeText);
    if (s.step === "pay") return run(result, `Paid ${formatMoney(money!.cash)} into the hold`);
    if (s.step === "send") return run(result, shipping ? "Marked as shipped" : "Marked as handed over");
    run(result, "Confirmed received");
  };

  const mine = steps.filter((s) => s.party === myParty);
  const next = mine.find((s) => s.ready && !s.done);
  const theirNext = steps.find((s) => s.party === them && s.ready && !s.done);

  const headline =
    trade.status === "complete" ? (
      <p className="font-display text-xl font-bold text-accept">
        Trade complete.{" "}
        <span className="font-sans text-base font-normal text-ink">
          {myParty === "buyer" ? `${card.name} is now in your cards.` : `${card.name} went to ${name(them)}.`}
        </span>
      </p>
    ) : trade.status === "cancelled" ? (
      <p className="font-display text-xl font-bold text-decline">
        {name(trade.cancelledBy!)} cancelled this trade.{" "}
        <span className="font-sans text-base font-normal text-ink">
          No cards changed owners{online && paid ? ` and ${formatMoney(money.cash)} went back to ${lower(money.party)}` : ""}.
        </span>
      </p>
    ) : next ? (
      <p className="font-display text-xl font-bold">Your step: {lowerFirst(todo(next))}.</p>
    ) : (
      <p className="font-display text-xl font-bold">
        Waiting on {name(them)}
        {theirNext ? ` to ${lowerFirst(todo(theirNext))}` : ""}.
      </p>
    );

  const meetup = terms.exchange.method === "ship" ? "" : terms.exchange.meetup;

  return (
    <div className="space-y-5">
      <div>
        {headline}
        <p className="mt-1">
          {exchangeLabel(terms.exchange, listing.area, nameFor)}
          {meetup && `. Meetup: ${meetup}`}
        </p>
      </div>

      {online && (
        <p
          className={`tabular rounded-md border-2 border-dashed px-4 py-3 ${
            trade.status === "complete"
              ? "border-accept/40 bg-accept/10"
              : paid && trade.status === "active"
                ? "border-frame bg-frame/15"
                : "border-rule bg-white/60"
          }`}
        >
          <span className="font-semibold">
            {formatMoney(money.cash)} from {lower(money.party)}:{" "}
            {trade.status === "complete"
              ? `released to ${lower(other(money.party))}`
              : trade.status === "cancelled"
                ? paid
                  ? `refunded to ${lower(money.party)}`
                  : "never paid"
                : paid
                  ? "held by Trade Binder"
                  : "not paid yet"}
          </span>
          {trade.status === "active" && (
            <span className="block text-sm text-ink-soft">
              Trade Binder releases it to {lower(other(money.party))} once the trade completes, and refunds it if the trade is
              cancelled.
            </span>
          )}
        </p>
      )}

      <div className={`grid gap-5 sm:grid-cols-2 ${trade.status === "cancelled" ? "hidden" : ""}`}>
        {[myParty, them].map((party) => (
          <section key={party} aria-labelledby={`steps-${party}`}>
            <h4 id={`steps-${party}`} className="font-display text-lg font-bold">
              {party === myParty ? "Your steps" : `${name(party)}'s steps`}
            </h4>
            <ol className="mt-2 space-y-3">
              {steps
                .filter((s) => s.party === party)
                .map((s) => {
                  const state = s.done ? "done" : s.ready ? "ready" : "waiting";
                  const canAct = party === myParty && state === "ready" && trade.status === "active";
                  return (
                    <li key={s.step} className="flex gap-3">
                      <Check state={state} />
                      <div className="min-w-0">
                        <p className={s.done ? "text-ink-soft" : "font-semibold"}>
                          {s.done ? doneText(s) : todo(s)}
                          <span className="sr-only">{s.done ? ", done" : state === "ready" ? ", to do" : ", not yet"}</span>
                        </p>
                        {state === "waiting" && trade.status === "active" && (
                          <p className="text-sm text-ink-soft">{waitText(s)}</p>
                        )}
                        {canAct &&
                          (s.step === "receive" && confirming === "receive" ? (
                            <div className="mt-2 space-y-2">
                              <p>
                                Only confirm once you have {sends(them)}.
                                {finishing(s) && " This finishes the trade and moves the cards."}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => act(s)}
                                  className="rounded-md bg-accept px-4 py-2 font-bold text-white hover:brightness-95"
                                >
                                  Yes, I got it
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirming(null)}
                                  className="rounded-md px-3 py-2 font-semibold text-cardback hover:bg-white"
                                >
                                  Not yet
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => (s.step === "receive" ? setConfirming("receive") : act(s))}
                              className="mt-2 rounded-md bg-cardback px-4 py-2 font-bold text-white shadow-[0_3px_0_var(--color-cardback-deep)] hover:bg-cardback-deep"
                            >
                              {s.step === "pay"
                                ? `Pay ${formatMoney(money!.cash)}`
                                : s.step === "send"
                                  ? shipping
                                    ? "Mark as shipped"
                                    : "Mark as handed over"
                                  : "Confirm received"}
                            </button>
                          ))}
                      </div>
                    </li>
                  );
                })}
            </ol>
          </section>
        ))}
      </div>

      {trade.status === "active" &&
        (confirming === "cancel" ? (
          <div className="space-y-3 border-t border-rule pt-4">
            <p className="text-lg">
              Cancel this trade?{online && paid ? ` ${formatMoney(money.cash)} goes back to ${lower(money.party)}.` : ""} No cards
              change owners and {card.name} goes back on sale. If anything was already sent, sort out returning it with{" "}
              {name(them)}.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => run(cancelTrade(offer.id), "Trade cancelled")}
                className="rounded-md bg-decline px-5 py-3 font-bold text-white hover:brightness-95"
              >
                Yes, cancel trade
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-md px-4 py-3 font-semibold text-cardback hover:bg-white"
              >
                Keep trade
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-rule pt-4">
            <button
              type="button"
              onClick={() => setConfirming("cancel")}
              className="rounded-md border-2 border-decline px-4 py-2 font-semibold text-decline hover:bg-decline hover:text-white"
            >
              Cancel trade
            </button>
          </div>
        ))}

      {error && (
        <p role="alert" className="font-semibold text-decline">
          {error}
        </p>
      )}
    </div>
  );
}
