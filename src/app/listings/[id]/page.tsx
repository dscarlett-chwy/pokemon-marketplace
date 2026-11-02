import { Suspense } from "react";
import { ListingView } from "@/components/ListingView";

export default function ListingPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Opening the binder…</p>}>
      <ListingView />
    </Suspense>
  );
}
