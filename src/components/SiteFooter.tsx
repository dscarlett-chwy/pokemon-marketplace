"use client";

import { useMarketplace } from "@/store/marketplace";
import { useNotice } from "@/store/notice";

export function SiteFooter() {
  const resetDemo = useMarketplace((s) => s.resetDemo);
  const show = useNotice((s) => s.show);

  return (
    <footer className="mt-16 border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-soft sm:px-6">
        <p>Card data and images from the Pokemon TCG API. Listings and offers are saved in this browser only.</p>
        <button
          type="button"
          onClick={() => {
            resetDemo();
            show("Demo data reset");
          }}
          className="rounded-md px-2 py-1 font-semibold text-cardback underline underline-offset-4 hover:text-cardback-deep"
        >
          Reset demo data
        </button>
      </div>
    </footer>
  );
}
