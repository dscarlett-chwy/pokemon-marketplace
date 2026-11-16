import Link from "next/link";
import { ViewTransition } from "react";
import { formatMoney } from "@/lib/format";
import type { ListingRow } from "@/lib/listing-rows";
import { CardImage } from "./CardImage";

export function CardTile({ row, isMine, priority }: { row: ListingRow; isMine: boolean; priority?: boolean }) {
  const { listing, item, card } = row;
  return (
    <li>
      <Link href={`/listings/${listing.id}`} className="group block rounded-xl outline-offset-8">
        {/* Same name as the big card on the listing page, so the card itself travels there. */}
        <ViewTransition name={`card-${listing.id}`} share="card-morph" default="none">
          <div className="card-foil">
            <CardImage
              card={card}
              large
              sizes="(min-width: 1024px) 270px, (min-width: 640px) 30vw, 45vw"
              priority={priority}
            />
          </div>
        </ViewTransition>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <h2 className="truncate text-[0.9375rem] font-semibold tracking-normal group-hover:text-accent">{card.name}</h2>
          <p className="tabular shrink-0 text-[0.9375rem] font-semibold">{formatMoney(listing.askingPrice)}</p>
        </div>
        <p className="mt-0.5 truncate text-sm text-ink-soft">
          {card.set.name} #{card.number}
        </p>
        <p className="truncate text-sm text-ink-soft">
          {item.condition}
          {listing.openToTrades && ", takes trades"}
          {isMine && <span className="font-medium text-accent">, your listing</span>}
        </p>
      </Link>
    </li>
  );
}
