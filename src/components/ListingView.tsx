"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { methodsText } from "@/lib/exchange";
import { formatMoney, formatWhen } from "@/lib/format";
import { useListingRows } from "@/lib/listing-rows";
import { useHydrated } from "@/store/hydration";
import { useMarketplace } from "@/store/marketplace";
import { useNotice } from "@/store/notice";
import { CardImage } from "./CardImage";
import { OfferForm } from "./OfferForm";

export function ListingView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const me = useMarketplace((s) => s.currentUserId);
  const offers = useMarketplace((s) => s.offers);
  const makeOffer = useMarketplace((s) => s.makeOffer);
  const withdrawListing = useMarketplace((s) => s.withdrawListing);
  const show = useNotice((s) => s.show);
  const row = useListingRows().find((r) => r.listing.id === id);

  if (!hydrated) return <p className="text-ink-soft">Opening the binder…</p>;
  if (!row) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-title font-bold">This listing doesn&apos;t exist</h1>
        <Link href="/" className="font-semibold text-cardback underline underline-offset-4">
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

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-block font-semibold text-cardback underline underline-offset-4">
        Back to the marketplace
      </Link>

      <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="pocket self-start p-4">
          <CardImage card={card} large sizes="(min-width: 768px) 420px, 90vw" priority />
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="font-display text-display font-extrabold tracking-tight">{card.name}</h1>
            <p className="mt-1 text-lg text-ink-soft">
              {card.set.name} #{card.number}
              {card.rarity && `, ${card.rarity}`}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-ink-soft">Asking price</dt>
              <dd className="tabular font-display text-title font-bold">{formatMoney(listing.askingPrice)}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Condition</dt>
              <dd className="text-lg font-semibold">{item.condition}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Seller</dt>
              <dd className="text-lg font-semibold">{isMine ? "You" : seller.name}</dd>
            </div>
            {card.marketPrice !== null && (
              <div>
                <dt className="text-sm text-ink-soft">Recent market price</dt>
                <dd className="tabular text-lg font-semibold">{formatMoney(card.marketPrice)}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-ink-soft">Payment</dt>
              <dd className="text-lg font-semibold">{listing.openToTrades ? "Cash or trade" : "Cash only"}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Listed</dt>
              <dd className="text-lg font-semibold">{formatWhen(listing.createdAt)}</dd>
            </div>
            <div className="col-span-full">
              <dt className="text-sm text-ink-soft">Handover</dt>
              <dd className="text-lg font-semibold">{methodsText(listing)}</dd>
            </div>
          </dl>

          {listing.note && (
            <blockquote className="border-l-4 border-frame pl-4 text-lg">
              {listing.note}
              <footer className="mt-1 text-sm text-ink-soft">{isMine ? "Your note" : `${seller.name}'s note`}</footer>
            </blockquote>
          )}

          <section aria-labelledby="action-heading" className="rounded-lg border border-rule bg-sheet p-5">
            {listing.status !== "active" ? (
              <>
                <h2 id="action-heading" className="font-display text-xl font-bold">
                  {listing.status === "sold" ? "This card has been sold" : "This card is no longer for sale"}
                </h2>
                <Link href="/" className="mt-2 inline-block font-semibold text-cardback underline underline-offset-4">
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
                    <Link href="/offers" className="font-semibold text-cardback underline underline-offset-4">
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
                  className="mt-4 rounded-md border-2 border-decline px-4 py-2 font-semibold text-decline hover:bg-decline hover:text-white"
                >
                  Remove listing
                </button>
              </>
            ) : myOpenOffer ? (
              <>
                <h2 id="action-heading" className="font-display text-xl font-bold">
                  You have an open offer on this card
                </h2>
                <Link
                  href={`/offers?offer=${myOpenOffer.id}`}
                  className="mt-2 inline-block font-semibold text-cardback underline underline-offset-4"
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
