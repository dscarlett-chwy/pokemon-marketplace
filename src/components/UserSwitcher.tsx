"use client";

import { useMarketplace } from "@/store/marketplace";
import { useHydrated } from "@/store/hydration";

export function UserSwitcher() {
  const hydrated = useHydrated();
  const users = useMarketplace((s) => s.users);
  const current = useMarketplace((s) => s.currentUserId);
  const setCurrentUser = useMarketplace((s) => s.setCurrentUser);

  return (
    <fieldset className="flex items-center gap-2" disabled={!hydrated}>
      <legend className="sr-only">Viewing as</legend>
      <span aria-hidden className="text-sm text-white/75">
        Viewing as
      </span>
      <div className="flex rounded-md bg-cardback-deep p-1">
        {Object.values(users).map((user) => (
          <label
            key={user.id}
            className={`cursor-pointer rounded px-3 py-1 text-sm font-semibold has-focus-visible:outline-3 has-focus-visible:outline-frame ${
              hydrated && current === user.id ? "bg-frame text-ink" : "text-white/85 hover:text-white"
            }`}
          >
            <input
              type="radio"
              name="viewing-as"
              value={user.id}
              checked={hydrated && current === user.id}
              onChange={() => setCurrentUser(user.id)}
              className="sr-only"
            />
            {user.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
