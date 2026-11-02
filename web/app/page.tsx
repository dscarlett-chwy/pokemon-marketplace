import Link from "next/link";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { browseListings, conditions } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; condition?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 60);
  const condition = conditions.includes(
    params.condition as (typeof conditions)[number],
  )
    ? params.condition!
    : "";
  const listings = await browseListings(q, condition);
  return (
    <main>
      <section className="hero shell">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={15} /> THE COLLECTOR EXCHANGE
          </span>
          <h1>Your next favorite card is in someone else&apos;s binder.</h1>
          <p>
            Find a trade that feels as good as the pull. List what you have,
            tell collectors what you&apos;re after, and make the swap together.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/new">
              List a card <ArrowRight size={18} />
            </Link>
            <a className="button secondary" href="#browse">
              Explore listings
            </a>
          </div>
          <div className="hero-note">
            <span className="note-dot" /> Made for card-for-card trades
          </div>
        </div>
        <div
          className="hero-display"
          aria-label="Pokémon card artwork from the Base Set"
        >
          <div className="binder-spine">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="hero-card card-back">
            <img
              src="https://assets.tcgdex.net/en/base/base1/2/high.webp"
              alt="Blastoise Base Set card"
            />
          </div>
          <div className="hero-card card-middle">
            <img
              src="https://assets.tcgdex.net/en/base/base1/15/high.webp"
              alt="Venusaur Base Set card"
            />
          </div>
          <div className="hero-card card-front">
            <img
              src="https://assets.tcgdex.net/en/base/base1/4/high.webp"
              alt="Charizard Base Set card"
            />
          </div>
          <span className="hero-sticker">
            TRADE
            <br />
            YOUR
            <br />
            WAY ↗
          </span>
        </div>
      </section>
      <section id="browse" className="browse-section shell">
        <div className="section-heading">
          <div>
            <span className="eyebrow blue">THE EXCHANGE</span>
            <h2>Cards up for trade</h2>
            <p>
              Browse collector listings, then propose a card from your own
              binder.
            </p>
          </div>
          <Link href="/new" className="text-link">
            Have a card to trade? <ArrowRight size={17} />
          </Link>
        </div>
        <form className="filters" action="/" method="get">
          <div className="filter-search">
            <Search size={20} />
            <input
              name="q"
              placeholder="Search cards, sets, or trade wants"
              defaultValue={q}
              aria-label="Search listings"
            />
          </div>
          <select
            name="condition"
            defaultValue={condition}
            aria-label="Filter by condition"
          >
            <option value="">Any condition</option>
            {conditions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button className="button filter-button" type="submit">
            Search
          </button>
        </form>
        {listings.length ? (
          <div className="listing-grid">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <h3>
              {q || condition
                ? "No cards match that search yet"
                : "The first binder slot is yours"}
            </h3>
            <p>
              {q || condition
                ? "Try a broader search or come back as new cards are listed."
                : "Be the first collector to list a card and start a trade."}
            </p>
            <Link href="/new" className="button primary">
              List a card <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </section>
      <section className="how-section">
        <div className="shell how-inner">
          <div>
            <span className="eyebrow">HOW IT WORKS</span>
            <h2>Good trades start with a great card.</h2>
          </div>
          <div className="steps">
            <div>
              <strong>01</strong>
              <h3>Show your card</h3>
              <p>Find the exact printing and describe its condition.</p>
            </div>
            <div>
              <strong>02</strong>
              <h3>Get an offer</h3>
              <p>Collectors offer a card and a note for your review.</p>
            </div>
            <div>
              <strong>03</strong>
              <h3>Make the swap</h3>
              <p>
                Accept an offer, then connect directly to arrange the exchange.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
