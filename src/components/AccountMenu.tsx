"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useMarketplace } from "@/store/marketplace";

export function AccountMenu() {
  const { isLoaded, isSignedIn } = useAuth();
  const name = useMarketplace((s) => (s.currentUserId ? s.users[s.currentUserId]?.name : undefined));

  if (!isLoaded) return <div aria-hidden className="skeleton h-9 w-20 rounded-full" />;

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-accent"
        >
          Sign in
        </button>
      </SignInButton>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {name && (
        <Link href="/profile" className="hidden rounded-full px-2 py-1 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink sm:inline">
          {name}
          <span className="sr-only">, edit your profile</span>
        </Link>
      )}
      <UserButton />
    </div>
  );
}
