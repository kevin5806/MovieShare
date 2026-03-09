import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_420px]">
        <section className="space-y-8">
          <BrandMark />
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Create account
            </p>
            <h1 className="max-w-xl text-5xl font-semibold tracking-tight">
              Start a clean, collaborative movie planning space.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Create lists, invite friends, collect feedback and scaffold watch sessions
              without leaving your own stack.
            </p>
          </div>
        </section>

        <Card className="border-border/70 bg-background/95 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle>Create your workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <SignUpForm />
            <p className="text-sm text-muted-foreground">
              Already registered?{" "}
              <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
