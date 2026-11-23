import { Suspense } from "react";
import { CollectorView } from "@/components/CollectorView";
import { CardGridSkeleton } from "@/components/Skeletons";
import { isHandle } from "@/lib/handle";
import { userByHandle } from "@/server/marketplace";

export default function CollectorPage({ params }: { params: Promise<{ handle: string }> }) {
  return (
    <Suspense fallback={<CardGridSkeleton label="Loading collector" />}>
      {params.then(({ handle }) => (
        <Collector handle={handle.toLowerCase()} />
      ))}
    </Suspense>
  );
}

async function Collector({ handle }: { handle: string }) {
  const user = isHandle(handle) ? await userByHandle(handle) : null;
  return <CollectorView user={user} />;
}
