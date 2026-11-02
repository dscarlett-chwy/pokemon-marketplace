import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  if (await currentUser()) redirect("/trades");
  const { mode, error } = await searchParams;
  const signup = mode === "signup";
  const errors: Record<string, string> = {
    invalid: "Enter a valid email and a password with at least 10 characters.",
    name: "Use a display name between 2 and 60 characters.",
    exists: "That email already has an account. Sign in instead.",
    credentials: "Email or password didn't match.",
  };
  return (
    <main className="form-page shell">
      <div className="form-intro">
        <span className="eyebrow blue">YOUR COLLECTOR ACCOUNT</span>
        <h1>{signup ? "Join the circuit." : "Welcome back."}</h1>
        <p>
          {signup
            ? "Create an account to list cards and make trade offers."
            : "Sign in to manage listings, offers, and matches."}
        </p>
        <div className="form-art">
          <img
            src="https://assets.tcgdex.net/en/base/base1/2/high.webp"
            alt="Blastoise Base Set card"
          />
          <span>
            THE GOOD CARDS
            <br />
            FIND EACH OTHER.
          </span>
        </div>
      </div>
      <div className="form-panel">
        <div className="account-switch">
          <Link className={!signup ? "active" : ""} href="/account?mode=login">
            Sign in
          </Link>
          <Link className={signup ? "active" : ""} href="/account?mode=signup">
            Create account
          </Link>
        </div>
        <h2>{signup ? "Create your account" : "Sign in"}</h2>
        {error && (
          <p className="form-error" role="alert">
            {errors[error] ?? "Please try again."}
          </p>
        )}
        <form action="/api/auth" method="post">
          <input
            type="hidden"
            name="mode"
            value={signup ? "signup" : "login"}
          />
          {signup && (
            <div className="field">
              <label htmlFor="name">Display name</label>
              <input
                id="name"
                name="name"
                minLength={2}
                maxLength={60}
                required
                placeholder="How collectors will see you"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              minLength={10}
              maxLength={200}
              required
              placeholder="At least 10 characters"
            />
          </div>
          <button className="button primary full" type="submit">
            {signup ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="form-footnote">
          By trading, you arrange the exchange directly with the other
          collector. Card Circuit does not handle payments or shipping.
        </p>
      </div>
    </main>
  );
}
