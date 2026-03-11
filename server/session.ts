import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/server/auth";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
    query: {
      disableCookieCache: true,
    },
  });
}

export async function redirectIfAuthenticated(destination = "/dashboard") {
  const session = await getSession();

  if (session) {
    redirect(destination);
  }

  return session;
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireAdminSession() {
  const session = await requireSession();

  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  return session;
}
