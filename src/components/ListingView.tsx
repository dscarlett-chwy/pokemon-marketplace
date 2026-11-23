"use client";

import { ListingSkeleton } from "./Skeletons";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ViewTransition } from "react";
import { methodsText } from "@/lib/exchange";
import { formatMoney, formatWhen } from "@/lib/format";
import { useListingRows } from "@/lib/listing-rows";
import { useHydrated } from "@/store/hydration";
import { useMarketplace } from "@/store/marketplace";
import { useNotice } from "@/store/notice";
import { CardImage } from "./CardImage";
import { OfferForm } from "./OfferForm";
import { SignInPrompt } from "./SignInGate";

export function ListingView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const me = useMarketplace((s) => s.currentUserId);
  const offers = useMarketplace((s) => s.offers);
  const users = useMarketplace((s) => s.users);
  const makeOffer = useMarketplace((s) => s.makeOffer);
  const withdrawListing = useMarketplace((s) => s.withdrawListing);
  const show = useNotice((s) => s.show);
  const row = useListingRows().find((r) => r.listing.id === id);

  if (!hydrated) return <ListingSkeleton />;
  if (!row) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-title font-bold">This listing doesn&apos;t exist</h1>
        <Link href="/" className="font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent">
          Back to the marketplace
        </Link>
      </div>
    );
  }

  const { listing, item, card, seller } = row;
  const isMine = listing.sellerId === me;
  const listingOffers = Object.values(offers).filter((o) => o.listingId === listing.id);
  const myOpenOffer = listingOffers.find((o) => o.buyerId === me && o.status === "pending");
  const openOfferCount = listingOffers.filter((o) => o.status === "pending").length;
  const myTrade = listingOffers.find((o) => o.trade?.status === "active" && (o.buyerId === me || o.sellerId === me));

  return (
    <div className="space-y-6">
      <Link href="/" className="-ml-3 inline-block rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink">
        Back to the marketplace
      </Link>

      <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14">
        <div className="mx-auto w-full max-w-sm self-start md:sticky md:top-24 md:max-w-none">
          <ViewTransition name={`card-${listing.id}`} share="card-morph" default="none">
            <div className="rounded-[4.5%/3.2%] shadow-lift">
              <CardImage card={card} large sizes="(min-width: 768px) 420px, 90vw" priority />
            </div>
          </ViewTransition>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="font-display text-display font-bold">{card.name}</h1>
            <p className="mt-3 text-lg text-ink-soft">
              {card.set.name} #{card.number}
              {card.rarity && `, ${card.rarity}`}
            </p>
            <p className="tabular mt-5 text-4xl font-bold tracking-[-0.04em]">
              <span className="sr-only">Asking price </span>
              {formatMoney(listing.askingPrice)}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-rule py-6 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-ink-soft">Condition</dt>
              <dd className="mt-0.5 font-semibold">{item.condition}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Seller</dt>
              <dd className="mt-0.5 font-semibold">
                {isMine || !seller.handle ? (
                  isMine ? "You" : seller.name
                ) : (
                  <Link href={`/u/${seller.handle}`} className="underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                    {seller.name}
                  </Link>
                )}
              </dd>
            </div>
            {card.marketPrice !== null && (
              <div>
                <dt className="text-sm text-ink-soft">Recent market price</dt>
                <dd className="tabular mt-0.5 font-semibold">{formatMoney(card.marketPrice)}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-ink-soft">Payment</dt>
              <dd className="mt-0.5 font-semibold">{listing.openToTrades ? "Cash or trade" : "Cash only"}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Listed</dt>
              <dd className="mt-0.5 font-semibold">{formatWhen(listing.createdAt)}</dd>
            </div>
            <div className="col-span-full">
              <dt className="text-sm text-ink-soft">Handover</dt>
              <dd className="mt-0.5 font-semibold">{methodsText(listing)}</dd>
            </div>
          </dl>

          {listing.note && (
            <blockquote className="border-l-2 border-accent pl-5 text-lg">
              {listing.note}
              <footer className="mt-1 text-sm text-ink-soft">{isMine ? "Your note" : `${seller.name}'s note`}</footer>
            </blockquote>
          )}

          <section aria-labelledby="action-heading" className="rounded-3xl border border-rule bg-surface p-5 shadow-panel sm:p-7">
            {listing.status === "trading" ? (
              <>
                <h2 id="action-heading" className="font-display text-xl font-bold">
                  This card is in a trade
                </h2>
                {myTrade ? (
                  <>
                    <p className="mt-1">
                      You and {isMine ? users[myTrade.buyerId].name : seller.name} agreed on a trade for it. It stays{" "}
                      {isMine ? "yours" : `${seller.name}'s`} until you both confirm you got your side.
                    </p>
                    <Link
                      href={`/offers?offer=${myTrade.id}`}
                      className="mt-2 inline-block font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
                    >
                      View trade
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-1">{seller.name} is trading it with another collector. It comes back on sale if that trade is cancelled.</p>
                    <Link href="/" className="mt-2 inline-block font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent">
                      Find another card
                    </Link>
                  </>
                )}
              </>
            ) : listing.status !== "active" ? (
              <>
                <h2 id="action-heading" className="font-display text-xl font-bold">
                  {listing.status === "sold" ? "This card has been sold" : "This card is no longer for sale"}
                </h2>
                <Link href="/" className="mt-2 inline-block font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent">
                  Find another card
                </Link>
              </>
            ) : isMine ? (
              <>
                <h2 id="action-heading" className="font-display text-xl font-bold">
                  This is your listing
                </h2>
                <p className="mt-1">
                  {openOfferCount === 0
                    ? "No open offers yet."
                    : `${openOfferCount === 1 ? "1 open offer" : `${openOfferCount} open offers`} on this card.`}{" "}
                  {openOfferCount > 0 && (
                    <Link href="/offers" className="font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent">
                      Review offers
                    </Link>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const result = withdrawListing(listing.id);
                    show(result.ok ? "Listing removed" : result.error, result.ok ? "done" : "error");
                  }}
                  className="mt-4 rounded-full border border-decline/50 px-4 py-2 font-semibold text-decline hover:bg-decline hover:text-white"
                >
                  Remove listing
                </button>
              </>
            ) : !me ? (
              <SignInPrompt title="Sign in to make an offer">
                Offers come from your account, so {seller.name} knows who they&apos;re trading with.
              </SignInPrompt>
            ) : myOpenOffer ? (
              <>
                <h2 id="action-heading" className="font-display text-xl font-bold">
                  You have an open offer on this card
                </h2>
                <Link
                  href={`/offers?offer=${myOpenOffer.id}`}
                  className="mt-2 inline-block font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
                >
                  View your offer
                </Link>
              </>
            ) : (
              <>
                <h2 id="action-heading" className="mb-4 font-display text-xl font-bold">
                  Make an offer
                </h2>
                <OfferForm
                  listing={listing}
                  buyerId={me}
                  initial={{ buyer: { cash: listing.askingPrice, itemIds: [] } }}
                  submitLabel="Send offer"
                  names={{ buyer: "You", seller: seller.name }}
                  onSubmit={(terms, message) => {
                    const result = makeOffer(listing.id, terms, message);
                    if (result.ok) {
                      show(`Offer sent to ${seller.name}`);
                      router.push(`/offers?offer=${result.id}`);
                    }
                    return result;
                  }}
                />
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
