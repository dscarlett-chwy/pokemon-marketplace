"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { needsAction, useMarketplace } from "@/store/marketplace";
import { useHydrated } from "@/store/hydration";
import { UserSwitcher } from "./UserSwitcher";

const NAV = [
  { href: "/", label: "Marketplace" },
  { href: "/inventory", label: "My cards" },
  { href: "/offers", label: "Offers" },
  { href: "/dashboard", label: "Dashboard" },
];

function useWaitingOnMe() {
  const hydrated = useHydrated();
  const offers = useMarketplace((s) => s.offers);
  const me = useMarketplace((s) => s.currentUserId);
  if (!hydrated) return 0;
  return Object.values(offers).filter((o) => needsAction(o, me)).length;
}

function NavLinks({ active }: { active: string | null }) {
  const waiting = useWaitingOnMe();
  return (
    <ul className="flex gap-1 sm:gap-2">
      {NAV.map(({ href, label }) => {
        const current = active !== null && (href === "/" ? active === "/" || active.startsWith("/listings") : active.startsWith(href));
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-base font-semibold ${
                current ? "bg-white/15 text-frame" : "text-white/85 hover:bg-white/10 hover:text-white"
              }`}
            >
              {label}
              {href === "/offers" && waiting > 0 && (
                <span className="tabular rounded-full bg-frame px-2 text-sm leading-6 text-ink">
                  {waiting}
                  <span className="sr-only"> waiting on you</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveNav() {
  return <NavLinks active={usePathname()} />;
}

export function SiteHeader() {
  return (
    <header className="bg-cardback text-white">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6"
      >
        <Link href="/" className="font-display text-2xl font-extrabold tracking-tight text-white">
          Trade Binder
        </Link>
        <div className="order-3 w-full overflow-x-auto sm:order-none sm:w-auto">
          <Suspense fallback={<NavLinks active={null} />}>
            <ActiveNav />
          </Suspense>
        </div>
        <UserSwitcher />
      </nav>
    </header>
  );
}
