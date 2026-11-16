"use client";

import { RowsSkeleton } from "./Skeletons";
import { SignInButton } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { useHydrated } from "@/store/hydration";
import { useMarketplace } from "@/store/marketplace";

export function SignInPrompt({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h2 className="font-display text-title font-bold">{title}</h2>
      <p className="mt-2 text-ink-soft">{children}</p>
      <SignInButton mode="modal">
        <button
          type="button"
          className="mt-5 rounded-full bg-accent px-5 py-3 font-semibold text-white hover:bg-accent-deep"
        >
          Sign in
        </button>
      </SignInButton>
    </>
  );
}

/** Pages about your own cards and trades only make sense once we know who you are. */
export function SignInGate({
  title,
  reason,
  skeleton,
  children,
}: {
  title: string;
  reason: string;
  /** Shown while we find out who is signed in. Match it to the page behind the gate. */
  skeleton?: ReactNode;
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  const me = useMarketplace((s) => s.currentUserId);

  if (!hydrated) return skeleton ?? <RowsSkeleton />;
  if (!me) {
    return (
      <section className="max-w-xl rounded-3xl border border-rule bg-surface p-6 shadow-panel sm:p-8">
        <SignInPrompt title={title}>{reason}</SignInPrompt>
      </section>
    );
  }
  return children;
}
