import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Listing } from "@/lib/marketplace";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link className="listing-card" href={`/listing/${listing.id}`}>
      <div className="listing-art">
        <img src={listing.card_image} alt={`${listing.card_name} card`} />
        <span className="condition-pill">{listing.card_condition}</span>
      </div>
      <div className="listing-copy">
        <div className="listing-topline">
          <span>{listing.card_set}</span>
          <ArrowUpRight size={18} />
        </div>
        <h3>{listing.card_name}</h3>
        <p>
          Looking for <strong>{listing.looking_for}</strong>
        </p>
        <span className="listing-owner">
          Listed by {listing.owner_name ?? "a collector"}
        </span>
      </div>
    </Link>
  );
}
