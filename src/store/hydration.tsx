"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useMarketplace } from "./marketplace";

/** Marketplace data comes from the server, so it only exists after the first load finishes. */
export function useHydrated() {
  return useMarketplace((s) => s.loaded);
}

/**
 * Loads the shared data, reloads it when the tab comes back so other collectors' changes show up,
 * and again when someone signs in or out so the page shows their side of things.
 */
export function StoreHydrator() {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    const { refresh } = useMarketplace.getState();
    void refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  useEffect(() => {
    const { currentUserId, loaded, refresh } = useMarketplace.getState();
    if (isLoaded && loaded && (userId ?? null) !== currentUserId) void refresh();
  }, [isLoaded, userId]);

  return null;
}
