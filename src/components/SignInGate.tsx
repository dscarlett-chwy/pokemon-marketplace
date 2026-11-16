"use client";

import { SignInButton } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { useHydrated } from "@/store/hydration";
import { useMarketplace } from "@/store/marketplace";

export function SignInPrompt({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mt-1">{children}</p>
      <SignInButton mode="modal">
        <button
          type="button"
          className="mt-4 rounded-md bg-accent px-5 py-3 font-bold text-white shadow-[0_3px_0_var(--color-accent-deep)] hover:bg-accent-deep"
        >
          Sign in
        </button>
      </SignInButton>
    </>
  );
}

/** Pages about your own cards and trades only make sense once we know who you are. */
export function SignInGate({ title, reason, children }: { title: string; reason: string; children: ReactNode }) {
  const hydrated = useHydrated();
  const me = useMarketplace((s) => s.currentUserId);

  if (!hydrated) return <p className="text-ink-soft">Opening the binder…</p>;
  if (!me) {
    return (
      <section className="binder-sheet max-w-xl">
        <SignInPrompt title={title}>{reason}</SignInPrompt>
      </section>
    );
  }
  return children;
}
