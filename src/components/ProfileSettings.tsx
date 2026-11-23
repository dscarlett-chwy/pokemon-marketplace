"use client";

import { useState } from "react";
import { HANDLE_MAX } from "@/lib/handle";
import { MAX_NAME } from "@/lib/marketplace-rules";
import { useMarketplace, useMe } from "@/store/marketplace";
import { useNotice } from "@/store/notice";

export function ProfileSettings() {
  const me = useMe();
  const user = useMarketplace((s) => s.users[me]);
  const setProfile = useMarketplace((s) => s.setProfile);
  const show = useNotice((s) => s.show);
  const [name, setName] = useState(user.name);
  const [handle, setHandle] = useState(user.handle);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = setProfile({ name, handle });
    if (!result.ok) return setError(result.error);
    setError(null);
    setHandle(handle.trim().toLowerCase());
    show("Profile saved");
  };

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="font-display text-display font-bold">Your profile</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Your name and handle are public. Share your handle with collectors you know so they can find you and trade.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5 rounded-3xl border border-rule bg-surface p-6 shadow-panel sm:p-8" noValidate>
        <label className="block">
          <span className="font-semibold">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME}
            autoComplete="nickname"
            className="mt-1 w-full rounded-xl border border-rule bg-white px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="font-semibold">Handle</span>
          <span className="mt-1 flex items-center rounded-xl border border-rule bg-white focus-within:outline-2 focus-within:outline-accent">
            <span aria-hidden className="pl-3 text-ink-soft">
              /u/
            </span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              maxLength={HANDLE_MAX}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby="handle-hint"
              className="w-full rounded-xl bg-transparent px-1 py-2 focus-visible:shadow-none focus-visible:outline-none"
            />
          </span>
          <span id="handle-hint" className="mt-1 block text-sm text-ink-soft">
            Letters, numbers, and hyphens. Changing it breaks links you already shared.
          </span>
        </label>
        {error && (
          <p role="alert" className="font-semibold text-decline">
            {error}
          </p>
        )}
        <button type="submit" className="rounded-full bg-accent px-5 py-3 font-semibold text-white hover:bg-accent-deep">
          Save profile
        </button>
      </form>
    </div>
  );
}
