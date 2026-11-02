import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { CardPicker } from "@/components/card-picker";
import { currentUser } from "@/lib/auth";
import { getListing, conditions } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();
  const user = await currentUser();
  const { error } = await searchParams;
  return (
    <main className="interior-page shell">
      <Link href="/#browse" className="back-link">
        <ArrowLeft size={17} /> Browse listings
      </Link>
      <div className="detail-layout">
        <div className="detail-image">
          <img src={listing.card_image} alt={`${listing.card_name} card`} />
          <span>
            Card image is catalog art. Confirm the physical card before trading.
          </span>
        </div>
        <div className="detail-copy">
          <span className="eyebrow blue">
            {listing.status === "open"
              ? "OPEN FOR TRADES"
              : listing.status.toUpperCase()}
          </span>
          <h1>{listing.card_name}</h1>
          <p className="detail-set">
            {listing.card_set} · #{listing.card_number}
          </p>
          <div className="detail-meta">
            <div>
              <small>CONDITION</small>
              <strong>{listing.card_condition}</strong>
            </div>
            <div>
              <small>COLLECTOR</small>
              <strong>{listing.owner_name}</strong>
            </div>
          </div>
          <div className="looking-for">
            <span>LOOKING FOR</span>
            <h2>{listing.looking_for}</h2>
          </div>
          {listing.description && (
            <div className="detail-description">
              <h3>About this card</h3>
              <p>{listing.description}</p>
            </div>
          )}
          {listing.status === "open" && user?.id === listing.owner_id && (
            <div className="owner-actions">
              <p>This is your listing. Review offers in My trades.</p>
              <Link href="/trades" className="button primary">
                View offers <ArrowRight size={17} />
              </Link>
              <form action={`/api/listings/${id}`} method="post">
                <button className="text-button" type="submit">
                  Close listing
                </button>
              </form>
            </div>
          )}
          {listing.status === "open" && user?.id !== listing.owner_id && (
            <div className="offer-panel">
              <div className="offer-title">
                <ShieldCheck size={21} />
                <div>
                  <h2>Make a trade offer</h2>
                  <p>
                    Choose the card you&apos;ll offer. The collector can accept
                    or decline.
                  </p>
                </div>
              </div>
              {user ? (
                <form action="/api/offers" method="post">
                  <input type="hidden" name="listingId" value={id} />
                  {error && (
                    <p className="form-error" role="alert">
                      Choose a card and condition to send your offer.
                    </p>
                  )}
                  <CardPicker label="Your offer" />
                  <div className="field">
                    <label htmlFor="condition">
                      Your card&apos;s condition
                    </label>
                    <select
                      id="condition"
                      name="condition"
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select condition
                      </option>
                      {conditions.map((condition) => (
                        <option key={condition}>{condition}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="message">
                      Message <span>optional</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      maxLength={800}
                      placeholder="Tell them a little about your card or trade."
                    />
                  </div>
                  <button className="button primary full" type="submit">
                    Send trade offer
                  </button>
                </form>
              ) : (
                <Link
                  className="button primary full"
                  href="/account?mode=signup"
                >
                  Sign in to make an offer <ArrowRight size={17} />
                </Link>
              )}
            </div>
          )}
          {listing.status !== "open" && (
            <div className="closed-notice">
              This listing is no longer accepting offers.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
