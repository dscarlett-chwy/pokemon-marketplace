import { ListingSkeleton } from "@/components/Skeletons";
import { Suspense } from "react";
import { ListingView } from "@/components/ListingView";

export default function ListingPage() {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ListingView />
    </Suspense>
  );
}
