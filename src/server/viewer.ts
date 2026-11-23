import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { addUser, isUser } from "./marketplace";

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

const fromEmail = (email: string | undefined) => {
  const local = email?.split("@")[0].split("+")[0];
  return local ? local[0].toUpperCase() + local.slice(1) : null;
};

const displayName = (user: ClerkUser | null) =>
  (user?.firstName ?? user?.username ?? fromEmail(user?.primaryEmailAddress?.emailAddress) ?? "Collector").slice(0, 40);

/** The signed-in Clerk user, added to the marketplace the first time they show up. Null when signed out. */
export async function getViewer(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  if (!(await isUser(userId))) await addUser(userId, displayName(await currentUser()));
  return userId;
}
