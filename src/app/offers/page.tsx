import { Suspense } from "react";
import { OffersView } from "@/components/OffersView";

export default function OffersPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Opening the binder…</p>}>
      <OffersView />
    </Suspense>
  );
}
