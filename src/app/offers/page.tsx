import { RowsSkeleton } from "@/components/Skeletons";
import { Suspense } from "react";
import { OffersView } from "@/components/OffersView";
import { SignInGate } from "@/components/SignInGate";

export default function OffersPage() {
  return (
    <SignInGate title="Sign in to see your offers" reason="Offers and trades belong to your account, so sign in to see and answer them.">
      <Suspense fallback={<RowsSkeleton label="Loading offers" />}>
        <OffersView />
      </Suspense>
    </SignInGate>
  );
}
