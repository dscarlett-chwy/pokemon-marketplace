import { CardGridSkeleton } from "@/components/Skeletons";
import { InventoryView } from "@/components/InventoryView";
import { SignInGate } from "@/components/SignInGate";

export default function InventoryPage() {
  return (
    <SignInGate
      title="Sign in to see your cards"
      reason="Your collection is tied to your account, so sign in to add cards and list them for sale."
      skeleton={<CardGridSkeleton label="Loading your cards" />}
    >
      <InventoryView />
    </SignInGate>
  );
}
