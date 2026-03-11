import type { Metadata } from "next";

import { BrandMark } from "@/components/brand-mark";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirectIfAuthenticated } from "@/server/session";
import { getPublicAuthState } from "@/server/services/system-config";

export const metadata: Metadata = {
  title: "Access",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  await redirectIfAuthenticated();
  const params = await searchParams;
  const defaultEmail = typeof params.email === "string" ? params.email : "";
  const authState = await getPublicAuthState();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_420px]">
        <section className="space-y-8">
          <BrandMark />
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Access movieshare
            </p>
            <h1 className="max-w-xl text-5xl font-semibold tracking-tight">
              Welcome back, or start fresh without leaving this page.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Choose the sign-in method that feels simplest on this device. If the address
              is new, movieshare collects only the missing basics and keeps the flow short.
            </p>
          </div>
        </section>

        <Card className="border-border/70 bg-background/95 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle>Continue</CardTitle>
          </CardHeader>
          <CardContent>
            <AuthForm defaultEmail={defaultEmail} methods={authState.methods} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
