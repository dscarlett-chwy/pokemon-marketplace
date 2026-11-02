"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMarketplace } from "./marketplace";

const subscribe = (onChange: () => void) => useMarketplace.persist.onFinishHydration(onChange);

/** Saved data lives in localStorage, so it only exists after the first client render. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => useMarketplace.persist.hasHydrated(),
    () => false,
  );
}

export function StoreHydrator() {
  useEffect(() => {
    useMarketplace.persist.rehydrate();
  }, []);
  return null;
}
