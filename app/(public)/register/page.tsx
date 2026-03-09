import { redirect } from "next/navigation";

import { redirectIfAuthenticated } from "@/server/session";

export default async function RegisterPage() {
  await redirectIfAuthenticated();
  redirect("/login");
}
