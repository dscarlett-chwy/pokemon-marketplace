"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { useMarketplace } from "@/store/marketplace";

export function AccountMenu() {
  const { isLoaded, isSignedIn } = useAuth();
  const name = useMarketplace((s) => (s.currentUserId ? s.users[s.currentUserId]?.name : undefined));

  if (!isLoaded) return <div aria-hidden className="h-9 w-20" />;

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          className="rounded-md bg-frame px-4 py-2 font-bold text-ink shadow-[0_3px_0_#b8961c] hover:bg-white"
        >
          Sign in
        </button>
      </SignInButton>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {name && <span className="text-sm font-semibold text-white/85">{name}</span>}
      <UserButton />
    </div>
  );
}
