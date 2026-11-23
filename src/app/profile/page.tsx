import { ProfileSettings } from "@/components/ProfileSettings";
import { SignInGate } from "@/components/SignInGate";

export default function ProfilePage() {
  return (
    <SignInGate title="Sign in to edit your profile" reason="Your profile belongs to your account, so sign in to change your name and handle.">
      <ProfileSettings />
    </SignInGate>
  );
}
