import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CardPicker } from "@/components/card-picker";
import { currentUser } from "@/lib/auth";
import { conditions } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export default async function NewListing({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await currentUser())) redirect("/account?mode=signup");
  const { error } = await searchParams;
  return (
    <main className="interior-page shell">
      <Link href="/" className="back-link">
        <ArrowLeft size={17} /> Back to listings
      </Link>
      <div className="interior-heading">
        <span className="eyebrow blue">ADD TO THE EXCHANGE</span>
        <h1>List a card</h1>
        <p>
          Start with the exact card, then tell other collectors what you&apos;d
          love in return.
        </p>
      </div>
      <div className="form-layout">
        <form
          className="form-panel listing-form"
          action="/api/listings"
          method="post"
        >
          {error && (
            <p className="form-error" role="alert">
              Choose a card, condition, and what you&apos;re looking for.
            </p>
          )}
          <h2>Card details</h2>
          <CardPicker label="Your card" />
          <div className="field">
            <label htmlFor="condition">Condition</label>
            <select id="condition" name="condition" required defaultValue="">
              <option value="" disabled>
                Select condition
              </option>
              {conditions.map((condition) => (
                <option key={condition}>{condition}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lookingFor">What would you trade for?</label>
            <input
              id="lookingFor"
              name="lookingFor"
              maxLength={160}
              required
              placeholder="e.g. Eevee cards or a Base Set Venusaur"
            />
          </div>
          <div className="field">
            <label htmlFor="description">
              Extra details <span>optional</span>
            </label>
            <textarea
              id="description"
              name="description"
              maxLength={800}
              rows={5}
              placeholder="Mention surface wear, corners, holo condition, or anything useful to another collector."
            />
          </div>
          <button className="button primary full" type="submit">
            Publish listing
          </button>
        </form>
        <aside className="tip-panel">
          <span className="tip-symbol">✦</span>
          <h3>A better listing gets a better trade.</h3>
          <p>
            Choose the right printing and be honest about condition. You can
            review every offer before deciding to swap.
          </p>
          <div className="tip-divider" />
          <small>Trade tip</small>
          <p>
            Use the extra details field to mention scratches, whitening, or
            other wear.
          </p>
        </aside>
      </div>
    </main>
  );
}
