"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { needsAction, useMarketplace } from "@/store/marketplace";
import { useHydrated } from "@/store/hydration";
import { AccountMenu } from "./AccountMenu";

const icon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const NAV: { href: string; label: string; glyph: ReactNode }[] = [
  {
    href: "/",
    label: "Marketplace",
    glyph: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
  },
  {
    href: "/inventory",
    label: "My cards",
    glyph: (
      <>
        <rect x="4" y="6" width="11" height="15" rx="2" />
        <path d="M8.5 3.2 18 5a2 2 0 0 1 1.6 2.3L18 17" />
      </>
    ),
  },
  {
    href: "/offers",
    label: "Offers",
    glyph: (
      <>
        <path d="M4 8h14l-3.5-3.5" />
        <path d="M20 16H6l3.5 3.5" />
      </>
    ),
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    glyph: (
      <>
        <path d="M5 20v-7" />
        <path d="M12 20V4" />
        <path d="M19 20v-10" />
      </>
    ),
  },
];

function useWaitingOnMe() {
  const hydrated = useHydrated();
  const offers = useMarketplace((s) => s.offers);
  const me = useMarketplace((s) => s.currentUserId);
  if (!hydrated || !me) return 0;
  return Object.values(offers).filter((o) => needsAction(o, me)).length;
}

function isCurrent(active: string | null, href: string) {
  if (active === null) return false;
  return href === "/" ? active === "/" || active.startsWith("/listings") : active.startsWith(href);
}

function Waiting({ count, className }: { count: number; className: string }) {
  if (count === 0) return null;
  return (
    <span className={`tabular rounded-full bg-accent text-center font-semibold text-white ${className}`}>
      {count}
      <span className="sr-only"> waiting on you</span>
    </span>
  );
}

/** Desktop: quiet text links in the top bar. The current page gets a violet rule under it. */
function BarLinks({ active }: { active: string | null }) {
  const waiting = useWaitingOnMe();
  return (
    <ul className="flex items-center gap-1">
      {NAV.map(({ href, label }) => {
        const current = isCurrent(active, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={`relative flex items-center gap-2 rounded-full px-3.5 py-2 text-[0.9375rem] font-medium ${
                current ? "text-ink" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
              }`}
            >
              {label}
              {href === "/offers" && <Waiting count={waiting} className="min-w-5 px-1.5 text-xs leading-5" />}
              <span
                aria-hidden
                className={`absolute inset-x-3.5 -bottom-[0.8125rem] h-0.5 rounded-full bg-accent transition-transform duration-300 ease-out-soft ${
                  current ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Phones: the four places live in a thumb-reach tab bar instead of a scrolling row of links. */
function TabLinks({ active }: { active: string | null }) {
  const waiting = useWaitingOnMe();
  return (
    <ul className="mx-auto grid max-w-md grid-cols-4">
      {NAV.map(({ href, label, glyph }) => {
        const current = isCurrent(active, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-xs font-medium ${
                current ? "text-accent" : "text-ink-soft active:text-ink"
              }`}
            >
              <span className="relative">
                <svg viewBox="0 0 24 24" aria-hidden className="size-6" {...icon}>
                  {glyph}
                </svg>
                {href === "/offers" && (
                  <Waiting count={waiting} className="absolute -right-3 -top-1.5 min-w-4.5 px-1 text-[0.6875rem] leading-[1.125rem]" />
                )}
              </span>
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveBarLinks() {
  return <BarLinks active={usePathname()} />;
}

function ActiveTabLinks() {
  return <TabLinks active={usePathname()} />;
}

export function SiteHeader() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-rule/80 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 rounded-full text-lg font-bold tracking-[-0.04em] text-ink">
            <svg viewBox="0 0 28 28" aria-hidden className="size-7">
              <rect x="4" y="5" width="13" height="18" rx="2.5" transform="rotate(-10 10.5 14)" className="fill-ink" />
              <rect x="11" y="5" width="13" height="18" rx="2.5" transform="rotate(10 17.5 14)" className="fill-accent stroke-paper" strokeWidth="1.5" />
            </svg>
            Trade Binder
          </Link>
          <nav aria-label="Main" className="hidden md:block">
            <Suspense fallback={<BarLinks active={null} />}>
              <ActiveBarLinks />
            </Suspense>
          </nav>
          <AccountMenu />
        </div>
      </header>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-rule/80 bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <Suspense fallback={<TabLinks active={null} />}>
          <ActiveTabLinks />
        </Suspense>
      </nav>
    </>
  );
}
