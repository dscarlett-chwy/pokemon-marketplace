import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { ListingRow } from "@/lib/listing-rows";
import { CardImage } from "./CardImage";

export function CardTile({ row, isMine, priority }: { row: ListingRow; isMine: boolean; priority?: boolean }) {
  const { listing, item, card, seller } = row;
  return (
    <li className="pocket">
      <Link href={`/listings/${listing.id}`} className="group block p-3 sm:p-4">
        <div className="mx-auto max-w-[245px]">
          <CardImage card={card} sizes="(min-width: 768px) 245px, 45vw" priority={priority} />
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold leading-tight group-hover:underline">{card.name}</h2>
            <p className="truncate text-sm text-ink-soft">
              {card.set.name} #{card.number}
            </p>
          </div>
          <p className="tabular shrink-0 font-display text-lg font-bold">{formatMoney(listing.askingPrice)}</p>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {item.condition}
          {listing.openToTrades ? ", takes trades" : ", cash only"}
        </p>
        <p className="mt-2 text-sm font-semibold text-cardback">{isMine ? "Your listing" : `Sold by ${seller.name}`}</p>
      </Link>
    </li>
  );
}
