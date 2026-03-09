"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { type AuthMode, signInSchema, signUpSchema } from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";
import { Field, FieldDescription, FieldLabel } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthFormProps = {
  defaultMode?: AuthMode;
  defaultEmail?: string;
};

const modeCopy: Record<
  AuthMode,
  {
    title: string;
    description: string;
    submitLabel: string;
    pendingLabel: string;
  }
> = {
  "sign-in": {
    title: "Sign in",
    description: "Use your existing account to continue where the group left off.",
    submitLabel: "Continue to dashboard",
    pendingLabel: "Signing in...",
  },
  "sign-up": {
    title: "Create account",
    description: "Create your account here and you will be signed in immediately.",
    submitLabel: "Create account and continue",
    pendingLabel: "Creating account...",
  },
};

export function AuthForm({
  defaultMode = "sign-in",
  defaultEmail = "",
}: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    const rawValues = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    if (mode === "sign-up") {
      const parsed = signUpSchema.safeParse(rawValues);

      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Check the form fields and try again.");
        return;
      }

      setIsPending(true);

      const result = await authClient.signUp.email({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        callbackURL: "/dashboard",
      });

      setIsPending(false);

      if (result.error) {
        toast.error(result.error.message ?? "Unable to create your account.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
      return;
    }

    const parsed = signInSchema.safeParse(rawValues);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form fields and try again.");
      return;
    }

    setIsPending(true);

    const result = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
      callbackURL: "/dashboard",
    });

    setIsPending(false);

    if (result.error) {
      toast.error(result.error.message ?? "Unable to sign in.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const copy = modeCopy[mode];

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-muted/40 p-1">
          {(["sign-in", "sign-up"] as const).map((nextMode) => (
            <Button
              key={nextMode}
              type="button"
              variant={mode === nextMode ? "secondary" : "ghost"}
              className={cn("h-10 rounded-xl", mode !== nextMode && "text-muted-foreground")}
              onClick={() => setMode(nextMode)}
            >
              {modeCopy[nextMode].title}
            </Button>
          ))}
        </div>
        <FieldDescription>{copy.description}</FieldDescription>
      </div>

      {mode === "sign-up" ? (
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            placeholder="Kevin Rossi"
            autoComplete="name"
            required
          />
        </Field>
      ) : null}

      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          defaultValue={defaultEmail}
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          required
        />
      </Field>

      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? copy.pendingLabel : copy.submitLabel}
      </Button>
    </form>
  );
}
