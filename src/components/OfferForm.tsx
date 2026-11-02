"use client";

import { useMemo, useState } from "react";
import { exchangeLabel, METHOD_LABELS } from "@/lib/exchange";
import { formatMoney } from "@/lib/format";
import { defaultPayment, MAX_MEETUP } from "@/lib/marketplace-rules";
import {
  PAYMENT_METHODS,
  type Exchange,
  type ExchangeMethod,
  type Listing,
  type OfferTerms,
  type Party,
  type PaymentMethod,
  type Result,
  type Side,
} from "@/lib/types";
import { tradeableItems, useMarketplace } from "@/store/marketplace";
import { CardImage } from "./CardImage";
import { givesLabel, marketValue, paymentText } from "./TermsSummary";

function CashInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">Cash</span>
      <span className="mt-1 flex items-center rounded-md border border-rule bg-white focus-within:outline-3 focus-within:outline-frame">
        <span aria-hidden className="pl-3 text-lg text-ink-soft">
          $
        </span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="tabular w-full rounded-md bg-transparent px-2 py-2 text-lg focus-visible:shadow-none focus-visible:outline-none"
        />
      </span>
    </label>
  );
}

function CardPicker({ ownerId, picked, onToggle }: { ownerId: string; picked: string[]; onToggle: (id: string) => void }) {
  const items = useMarketplace((s) => s.items);
  const listings = useMarketplace((s) => s.listings);
  const cards = useMarketplace((s) => s.cards);
  const tradeable = useMemo(() => tradeableItems({ items, listings }, ownerId), [items, listings, ownerId]);

  return (
    <fieldset>
      <legend className="text-sm font-semibold">Cards</legend>
      {tradeable.length === 0 ? (
        <p className="mt-1 text-ink-soft">No cards available to trade. Cards that are listed for sale can&apos;t be traded.</p>
      ) : (
        <ul className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-4">
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
                  <input type="checkbox" checked={on} onChange={() => onToggle(item.id)} className="sr-only" />
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
  );
}

const toCash = (value: string) => (value === "" ? 0 : Number(value));
const toField = (cash: number) => (cash > 0 ? String(cash) : "");

export function OfferForm({
  listing,
  buyerId,
  initial,
  submitLabel,
  names,
  onSubmit,
  onCancel,
}: {
  listing: Listing;
  buyerId: string;
  initial: { buyer: Side; seller?: Side; exchange?: Exchange; payment?: PaymentMethod | null };
  submitLabel: string;
  /** "You" for the viewer, otherwise the collector's name. */
  names: Record<Party, string>;
  onSubmit: (terms: OfferTerms, message: string) => Result;
  onCancel?: () => void;
}) {
  const items = useMarketplace((s) => s.items);
  const cards = useMarketplace((s) => s.cards);
  const listedItem = items[listing.itemId];
  const listedCard = cards[listedItem.cardId];
  const initialSeller = initial.seller ?? { cash: 0, itemIds: [] };
  const [buyerCash, setBuyerCash] = useState(toField(initial.buyer.cash));
  const [buyerPicked, setBuyerPicked] = useState<string[]>(initial.buyer.itemIds);
  const [sellerCash, setSellerCash] = useState(toField(initialSeller.cash));
  const [sellerPicked, setSellerPicked] = useState<string[]>(initialSeller.itemIds);
  const [sellerOpen, setSellerOpen] = useState(initialSeller.cash > 0 || initialSeller.itemIds.length > 0);
  const [method, setMethod] = useState<ExchangeMethod>(initial.exchange?.method ?? listing.exchangeMethods[0]);
  const [meetup, setMeetup] = useState(initial.exchange?.method === "ship" ? "" : (initial.exchange?.meetup ?? ""));
  const [paidBy, setPaidBy] = useState<Party>(initial.exchange?.method === "ship" ? initial.exchange.paidBy : "buyer");
  const [payment, setPayment] = useState<PaymentMethod>(initial.payment ?? defaultPayment(method));
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const trades = listing.openToTrades;
  const buyer: Side = { cash: toCash(buyerCash), itemIds: trades ? buyerPicked : [] };
  const seller: Side =
    trades && sellerOpen ? { cash: toCash(sellerCash), itemIds: sellerPicked } : { cash: 0, itemIds: [] };
  const exchange: Exchange = method === "ship" ? { method, paidBy } : { method, meetup };
  const cashFrom = buyer.cash > 0 ? "buyer" : seller.cash > 0 ? "seller" : null;
  const terms: OfferTerms = {
    buyer,
    seller,
    exchange,
    payment: cashFrom ? (method === "ship" ? "online" : payment) : null,
  };
  const nameFor = (p: Party) => names[p];
  const paymentLine = paymentText(terms, nameFor);
  const buyerValue = marketValue(buyer.cash || 0, buyer.itemIds, { items, cards });
  const sellerValue = marketValue(seller.cash || 0, [listing.itemId, ...seller.itemIds], { items, cards });

  const toggle = (set: typeof setBuyerPicked) => (id: string) =>
    set((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onSubmit(terms, message);
    if (!result.ok) setError(result.error);
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <fieldset className="space-y-3">
        <legend className="mb-2 font-display text-lg font-bold">{givesLabel(names.buyer)}</legend>
        <CashInput value={buyerCash} onChange={setBuyerCash} />
        {trades ? (
          <CardPicker ownerId={buyerId} picked={buyerPicked} onToggle={toggle(setBuyerPicked)} />
        ) : (
          <p className="text-ink-soft">The seller only takes cash for this card.</p>
        )}
      </fieldset>

      <fieldset className="space-y-3 border-t border-rule pt-4">
        <legend className="float-left mb-2 w-full font-display text-lg font-bold">{givesLabel(names.seller)}</legend>
        <div className="clear-left flex items-center gap-3">
          <span className="w-12 shrink-0">
            <CardImage card={listedCard} sizes="48px" />
          </span>
          <span>
            <span className="block font-semibold">{listedCard.name}</span>
            <span className="block text-sm text-ink-soft">The listed card, {listedItem.condition}</span>
          </span>
        </div>
        {trades &&
          (sellerOpen ? (
            <>
              <CashInput value={sellerCash} onChange={setSellerCash} />
              <CardPicker ownerId={listing.sellerId} picked={sellerPicked} onToggle={toggle(setSellerPicked)} />
              <button
                type="button"
                onClick={() => setSellerOpen(false)}
                className="text-sm font-semibold text-cardback underline underline-offset-4"
              >
                Remove {names.seller === "You" ? "your" : `${names.seller}'s`} extras
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSellerOpen(true)}
              className="rounded-md border-2 border-dashed border-cardback/50 px-3 py-2 text-sm font-semibold text-cardback hover:border-cardback hover:bg-white"
            >
              {names.seller === "You" ? "Add your cash or cards" : `Ask ${names.seller} to add cash or cards`}
            </button>
          ))}
      </fieldset>

      <fieldset className="border-t border-rule pt-4">
        <legend className="float-left w-full font-semibold">Handover</legend>
        <div className="clear-left flex flex-wrap gap-2 pt-2">
          {listing.exchangeMethods.map((m) => (
            <label
              key={m}
              className={`cursor-pointer rounded-md border-2 px-3 py-2 has-focus-visible:outline-3 has-focus-visible:outline-frame ${
                method === m ? "border-cardback bg-cardback/10 font-semibold" : "border-rule bg-white hover:border-cardback/50"
              }`}
            >
              <input
                type="radio"
                name="exchange-method"
                checked={method === m}
                onChange={() => {
                  setMethod(m);
                  setPayment(defaultPayment(m));
                }}
                className="sr-only"
              />
              {METHOD_LABELS[m]}
              {m !== "ship" && listing.area && ` in ${listing.area}`}
            </label>
          ))}
        </div>
        {method === "ship" ? (
          <div className="mt-3">
            <p className="text-sm font-semibold">Who pays postage</p>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
              {(["buyer", "seller"] as const).map((p) => (
                <label key={p} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="exchange-paid-by"
                    checked={paidBy === p}
                    onChange={() => setPaidBy(p)}
                    className="size-5 accent-cardback"
                  />
                  {names[p]}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <label className="mt-3 block">
            <span className="text-sm font-semibold">Meetup spot and time</span>
            <span className="text-sm text-ink-soft"> (optional)</span>
            <input
              value={meetup}
              onChange={(e) => setMeetup(e.target.value)}
              maxLength={MAX_MEETUP}
              placeholder="Library steps, Saturday morning"
              className="mt-1 w-full rounded-md border border-rule bg-white px-3 py-2"
            />
          </label>
        )}
      </fieldset>

      {cashFrom && (
        <fieldset className="border-t border-rule pt-4">
          <legend className="float-left w-full font-semibold">Payment</legend>
          <div className="clear-left space-y-2 pt-2">
            {PAYMENT_METHODS.filter((p) => p === "online" || method !== "ship").map((p) => (
              <label key={p} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="payment-method"
                  checked={terms.payment === p}
                  onChange={() => setPayment(p)}
                  className="mt-1 size-5 accent-cardback"
                />
                <span>
                  <span className="font-semibold">{p === "online" ? "Online through Trade Binder" : "In person"}</span>
                  <span className="block text-sm text-ink-soft">
                    {p === "online"
                      ? `${names[cashFrom]} ${names[cashFrom] === "You" ? "pay" : "pays"} into a hold. Trade Binder releases it once both of you confirm, or refunds it if the trade is cancelled.`
                      : "Cash changes hands at the meetup."}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
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

      <div className="tabular rounded-md bg-white/70 p-3 text-base">
        <p>
          <span className="font-semibold">{givesLabel(names.buyer)}</span> about {formatMoney(Math.round(buyerValue))}.{" "}
          <span className="font-semibold">{givesLabel(names.seller)}</span> about {formatMoney(Math.round(sellerValue))}.
        </p>
        <p className="text-sm">{exchangeLabel(exchange, listing.area, nameFor)}</p>
        {paymentLine && <p className="text-sm">{paymentLine}</p>}
        <p className="text-sm text-ink-soft">Asking price {formatMoney(listing.askingPrice)}. Card values use recent market prices.</p>
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
