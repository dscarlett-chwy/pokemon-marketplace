"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useListingRows } from "@/lib/listing-rows";
import type { User } from "@/lib/types";
import { useHydrated } from "@/store/hydration";
import { tradeableItems, useMarketplace } from "@/store/marketplace";
import { CardImage } from "./CardImage";
import { CardTile } from "./CardTile";
import { CopyLinkButton } from "./CopyLinkButton";
import { SignInPrompt } from "./SignInGate";
import { CardGridSkeleton } from "./Skeletons";

const linkStyle = "font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent";

export function CollectorView({ user }: { user: User | null }) {
  const hydrated = useHydrated();
  const me = useMarketplace((s) => s.currentUserId);
  const items = useMarketplace((s) => s.items);
  const listings = useMarketplace((s) => s.listings);
  const offers = useMarketplace((s) => s.offers);
  const cards = useMarketplace((s) => s.cards);
  const rows = useListingRows();
  const forSale = rows.filter((r) => r.listing.sellerId === user?.id && r.listing.status === "active");
  const open = useMemo(
    () => (user ? tradeableItems({ items, listings, offers }, user.id).reverse() : []),
    [items, listings, offers, user],
  );

  if (!user) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-title font-bold">No collector goes by that handle</h1>
        <p className="text-ink-soft">Check the link with whoever shared it. Handles can change.</p>
        <Link href="/" className={linkStyle}>
          Back to the marketplace
        </Link>
      </div>
    );
  }
  if (!hydrated) return <CardGridSkeleton label="Loading collector" />;

  const isMe = user.id === me;
  const path = `/u/${user.handle}`;

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display font-bold">{isMe ? "Your profile" : user.name}</h1>
          <p className="mt-3 text-lg text-ink-soft">
            {isMe ? `${user.name}, ` : ""}@{user.handle}
          </p>
          {isMe && (
            <p className="mt-1 text-ink-soft">
              This is what other collectors see.{" "}
              <Link href="/profile" className={linkStyle}>
                Edit your profile
              </Link>
            </p>
          )}
        </div>
        <CopyLinkButton path={path} />
      </div>

      <section aria-labelledby="for-sale-heading" className="space-y-4">
        <h2 id="for-sale-heading" className="font-display text-title font-bold">
          For sale
        </h2>
        {forSale.length === 0 ? (
          <p className="text-ink-soft">{isMe ? "You have" : `${user.name} has`} no cards for sale right now.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-7 sm:gap-y-12 lg:grid-cols-4">
            {forSale.map((row) => (
              <CardTile key={row.listing.id} row={row} isMine={isMe} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="open-heading" className="space-y-4">
        <h2 id="open-heading" className="font-display text-title font-bold">
          Open to trade
        </h2>
        {!me ? (
          <div className="max-w-xl rounded-3xl border border-rule bg-surface p-6 shadow-panel sm:p-8">
            <SignInPrompt title={`Sign in to trade with ${user.name}`}>
              Signed-in collectors can see the cards {user.name} is open to trading and propose a trade.
            </SignInPrompt>
          </div>
        ) : open.length === 0 ? (
          <p className="text-ink-soft">
            {isMe ? (
              <>
                None of your cards are open to trade.{" "}
                <Link href="/inventory" className={linkStyle}>
                  Go to My cards
                </Link>
              </>
            ) : (
              `${user.name} has no cards open to trade right now.`
            )}
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
            {open.map((item) => {
              const card = cards[item.cardId];
              return (
                <li key={item.id}>
                  <CardImage card={card} sizes="(min-width: 1024px) 170px, (min-width: 640px) 22vw, 30vw" />
                  <p className="mt-2 truncate text-sm font-semibold">{card.name}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {card.set.name}, {item.condition}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
