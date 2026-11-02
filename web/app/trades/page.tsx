import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Inbox } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { incomingOffers, myListings, myOffers } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export default async function Trades({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/account?mode=login");
  const [listings, sentOffers, receivedOffers] = await Promise.all([
    myListings(user.id),
    myOffers(user.id),
    incomingOffers(user.id),
  ]);
  const { sent } = await searchParams;
  return (
    <main className="interior-page shell">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow blue">YOUR CORNER OF THE CIRCUIT</span>
          <h1>My trades</h1>
          <p>Keep track of your cards and every offer.</p>
        </div>
        <form action="/api/auth" method="post">
          <input type="hidden" name="mode" value="logout" />
          <button className="text-button" type="submit">
            Sign out
          </button>
        </form>
      </div>
      {sent && (
        <p className="success-notice" role="status">
          Trade offer sent. You&apos;ll see its status here.
        </p>
      )}
      <section className="dashboard-section">
        <div className="dashboard-section-head">
          <h2>
            Offers to review <span>{receivedOffers.length}</span>
          </h2>
        </div>
        {receivedOffers.length ? (
          <div className="dashboard-list">
            {receivedOffers.map((offer) => (
              <article className="trade-row" key={offer.id}>
                <img src={offer.card_image} alt={`${offer.card_name} card`} />
                <div className="trade-row-main">
                  <span className="status-badge">{offer.status}</span>
                  <h3>
                    {offer.card_name} <span>for your {offer.listing_name}</span>
                  </h3>
                  <p>
                    {offer.card_set} · {offer.card_condition} · from{" "}
                    {offer.sender_name}
                  </p>
                  {offer.message && <blockquote>{offer.message}</blockquote>}
                  {offer.status === "accepted" && (
                    <p className="contact-note">
                      Contact {offer.sender_name}:{" "}
                      <a href={`mailto:${offer.sender_email}`}>
                        {offer.sender_email}
                      </a>
                    </p>
                  )}
                </div>
                {offer.status === "pending" && (
                  <div className="trade-actions">
                    <form action={`/api/offers/${offer.id}`} method="post">
                      <input type="hidden" name="action" value="accept" />
                      <button className="button primary" type="submit">
                        Accept offer
                      </button>
                    </form>
                    <form action={`/api/offers/${offer.id}`} method="post">
                      <input type="hidden" name="action" value="decline" />
                      <button className="button secondary" type="submit">
                        Decline
                      </button>
                    </form>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <Inbox size={28} />
            <p>New offers on your listings will show up here.</p>
          </div>
        )}
      </section>
      <section className="dashboard-section">
        <div className="dashboard-section-head">
          <h2>
            Offers I sent <span>{sentOffers.length}</span>
          </h2>
        </div>
        {sentOffers.length ? (
          <div className="dashboard-list">
            {sentOffers.map((offer) => (
              <article className="trade-row" key={offer.id}>
                <img src={offer.card_image} alt={`${offer.card_name} card`} />
                <div className="trade-row-main">
                  <span className="status-badge">{offer.status}</span>
                  <h3>
                    Your {offer.card_name} <span>for {offer.listing_name}</span>
                  </h3>
                  <p>
                    {offer.card_set} · {offer.card_condition}
                  </p>
                  {offer.status === "accepted" && (
                    <p className="contact-note">
                      Contact the collector:{" "}
                      <a href={`mailto:${offer.owner_email}`}>
                        {offer.owner_email}
                      </a>
                    </p>
                  )}
                </div>
                {offer.status === "pending" && (
                  <form action={`/api/offers/${offer.id}`} method="post">
                    <input type="hidden" name="action" value="withdraw" />
                    <button className="text-button" type="submit">
                      Withdraw
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <p>Find a card you love and offer one from your binder.</p>
            <Link href="/#browse" className="text-link">
              Browse cards <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </section>
      <section className="dashboard-section">
        <div className="dashboard-section-head">
          <h2>
            My listings <span>{listings.length}</span>
          </h2>
          <Link href="/new" className="text-link">
            List a card <ArrowRight size={17} />
          </Link>
        </div>
        {listings.length ? (
          <div className="dashboard-list">
            {listings.map((listing) => (
              <Link
                className="trade-row"
                href={`/listing/${listing.id}`}
                key={listing.id}
              >
                <img
                  src={listing.card_image}
                  alt={`${listing.card_name} card`}
                />
                <div className="trade-row-main">
                  <span className="status-badge">{listing.status}</span>
                  <h3>{listing.card_name}</h3>
                  <p>
                    {listing.card_set} · Looking for {listing.looking_for}
                  </p>
                </div>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <p>Your listings will appear here.</p>
            <Link href="/new" className="text-link">
              List your first card <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
