"use client";

import { useEffect } from "react";
import { useMarketplace } from "./marketplace";

/** Marketplace data comes from the server, so it only exists after the first load finishes. */
export function useHydrated() {
  return useMarketplace((s) => s.loaded);
}

/** Loads the shared data, and reloads it when the tab comes back so other collectors' changes show up. */
export function StoreHydrator() {
  useEffect(() => {
    const { refresh } = useMarketplace.getState();
    void refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  return null;
}
