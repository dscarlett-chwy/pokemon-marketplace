import "server-only";
import { cookies } from "next/headers";
import { USERS } from "@/lib/seed";
import { isUser } from "./marketplace";

const COOKIE = "viewing-as";

/** The demo has no sign-in: whoever opens the app picks which collector they act as. */
export async function getViewer() {
  const id = (await cookies()).get(COOKIE)?.value;
  return id && isUser(id) ? id : USERS[0].id;
}

export async function setViewer(userId: string) {
  (await cookies()).set(COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
