import { DashboardView } from "@/components/DashboardView";
import { SignInGate } from "@/components/SignInGate";

export default function DashboardPage() {
  return (
    <SignInGate title="Sign in to see your dashboard" reason="Your sales and trades are tied to your account, so sign in to see them.">
      <DashboardView />
    </SignInGate>
  );
}
