"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { discoverAuthSchema, signInSchema, signUpSchema } from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";
import { Field, FieldDescription, FieldLabel } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthFormProps = {
  defaultEmail?: string;
};

type AuthStage = "credentials" | "profile";
type PendingAction = "discover" | "sign-in" | "sign-up" | null;

const stageCopy: Record<
  AuthStage,
  {
    eyebrow: string;
    title: string;
    description: string;
    submitLabel: string;
    pendingLabel: string;
  }
> = {
  credentials: {
    eyebrow: "Access",
    title: "Continue with your email",
    description:
      "Use the same form whether you are coming back or entering for the first time.",
    submitLabel: "Continue",
    pendingLabel: "Checking access...",
  },
  profile: {
    eyebrow: "Finish setup",
    title: "This email is new here",
    description:
      "Add the last missing detail and movieshare will create the account and sign you in immediately.",
    submitLabel: "Create account and continue",
    pendingLabel: "Creating account...",
  },
};

async function discoverAccessMode(email: string) {
  const parsed = discoverAuthSchema.safeParse({
    email,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
  }

  const response = await fetch("/api/auth/discover", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parsed.data),
  });

  const payload = (await response.json().catch(() => null)) as
    | { mode?: "sign-in" | "sign-up"; error?: string }
    | null;

  if (!response.ok || !payload?.mode) {
    throw new Error(payload?.error ?? "Unable to prepare the access flow right now.");
  }

  return payload.mode;
}

export function AuthForm({ defaultEmail = "" }: AuthFormProps) {
  const router = useRouter();
  const [stage, setStage] = useState<AuthStage>("credentials");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  async function handleSubmit() {
    if (stage === "credentials") {
      const parsed = signInSchema.safeParse({
        email,
        password,
      });

      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Check the form fields and try again.");
        return;
      }

      try {
        setPendingAction("discover");
        const mode = await discoverAccessMode(parsed.data.email);

        if (mode === "sign-up") {
          setStage("profile");
          setPendingAction(null);
          return;
        }

        setPendingAction("sign-in");

        const result = await authClient.signIn.email({
          email: parsed.data.email,
          password: parsed.data.password,
          callbackURL: "/dashboard",
        });

        setPendingAction(null);

        if (result.error) {
          toast.error(result.error.message ?? "Unable to sign in.");
          return;
        }

        router.push("/dashboard");
        router.refresh();
      } catch (error) {
        setPendingAction(null);
        toast.error(error instanceof Error ? error.message : "Unable to continue right now.");
      }

      return;
    }

    const parsed = signUpSchema.safeParse({
      name,
      email,
      password,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form fields and try again.");
      return;
    }

    setPendingAction("sign-up");

    const result = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      callbackURL: "/dashboard",
    });

    setPendingAction(null);

    if (result.error) {
      toast.error(result.error.message ?? "Unable to create your account.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const copy = stageCopy[stage];
  const submitLabel =
    pendingAction === "discover" || pendingAction === "sign-in" || pendingAction === "sign-up"
      ? copy.pendingLabel
      : copy.submitLabel;

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="space-y-3 rounded-[28px] border border-border/70 bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="secondary">{copy.eyebrow}</Badge>
          {stage === "profile" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-3"
              onClick={() => setStage("credentials")}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="size-3.5" />
              One flow
            </span>
          )}
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{copy.title}</h2>
          <FieldDescription>{copy.description}</FieldDescription>
        </div>
      </div>

      {stage === "profile" ? (
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            placeholder="Kevin Rossi"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
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
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={stage === "profile" ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
        />
      </Field>

      {stage === "credentials" ? (
        <FieldDescription>
          If this email is new, movieshare will ask only for your name before creating the
          account.
        </FieldDescription>
      ) : null}

      <Button className="w-full" type="submit" disabled={pendingAction !== null}>
        {submitLabel}
      </Button>
    </form>
  );
}
