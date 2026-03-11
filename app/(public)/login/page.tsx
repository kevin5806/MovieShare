import { BrandMark } from "@/components/brand-mark";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirectIfAuthenticated } from "@/server/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  await redirectIfAuthenticated();
  const params = await searchParams;
  const defaultEmail = typeof params.email === "string" ? params.email : "";

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
              One access form, whether you are returning or joining for the first time.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Start with your email and password. If the address is new, movieshare asks
              only for your name and finishes the account setup in the same place.
            </p>
          </div>
        </section>

        <Card className="border-border/70 bg-background/95 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle>Continue</CardTitle>
          </CardHeader>
          <CardContent>
            <AuthForm defaultEmail={defaultEmail} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
