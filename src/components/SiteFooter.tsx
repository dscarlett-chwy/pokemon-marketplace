"use client";

import { useMarketplace } from "@/store/marketplace";
import { useNotice } from "@/store/notice";

export function SiteFooter() {
  const resetDemo = useMarketplace((s) => s.resetDemo);
  const signedIn = useMarketplace((s) => s.currentUserId !== null);
  const show = useNotice((s) => s.show);
  const canReset = signedIn && process.env.NODE_ENV !== "production";

  return (
    <footer className="mt-20 border-t border-rule pb-20 md:pb-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-ink-soft sm:px-6">
        <p>Card data and images from the Pokemon TCG API. Listings and offers are shared with everyone on this site.</p>
        {canReset && (
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("Reset the demo for everyone? All cards, listings and offers go back to the starting set.")) return;
              resetDemo();
              show("Demo data reset");
            }}
            className="rounded-full px-2 py-1 font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
          >
            Reset demo data
          </button>
        )}
      </div>
    </footer>
  );
}
