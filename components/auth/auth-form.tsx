"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  KeyRound,
  Link2,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  discoverAuthSchema,
  requestEmailCodeSchema,
  requestMagicLinkSchema,
  signInSchema,
  signUpSchema,
  verifyBackupCodeSchema,
  verifyEmailCodeSchema,
  verifyTwoFactorSchema,
} from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";
import { Field, FieldDescription, FieldLabel } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RuntimeMethod = {
  key: "EMAIL_PASSWORD" | "EMAIL_CODE" | "MAGIC_LINK" | "PASSKEY";
  label: string;
  description: string;
  isEnabled: boolean;
  availability: "live" | "config-only" | "blocked";
  requirement: string;
};

type AuthFormProps = {
  defaultEmail?: string;
  methods: RuntimeMethod[];
};

type PasswordStage = "credentials" | "profile";
type LoginMethod = "password" | "email-code" | "magic-link" | "passkey" | "two-factor";

function getTwoFactorRedirect(result: unknown) {
  if (!result || typeof result !== "object" || !("data" in result)) {
    return false;
  }

  const data = (result as { data?: { twoFactorRedirect?: boolean } | null }).data;
  return Boolean(data?.twoFactorRedirect);
}

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

export function AuthForm({ defaultEmail = "", methods }: AuthFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [method, setMethod] = useState<LoginMethod>("password");
  const [passwordStage, setPasswordStage] = useState<PasswordStage>("credentials");
  const [identityMode, setIdentityMode] = useState<"sign-in" | "sign-up" | null>(null);
  const [emailCodeRequested, setEmailCodeRequested] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [backupCode, setBackupCode] = useState("");

  const enabledLiveMethods = useMemo(
    () =>
      methods.filter((candidate) => candidate.isEnabled && candidate.availability === "live"),
    [methods],
  );
  const supportsEmailCode = enabledLiveMethods.some((candidate) => candidate.key === "EMAIL_CODE");
  const supportsMagicLink = enabledLiveMethods.some((candidate) => candidate.key === "MAGIC_LINK");
  const supportsPasskeys = enabledLiveMethods.some((candidate) => candidate.key === "PASSKEY");

  function resetTransientState(nextMethod: LoginMethod) {
    setMethod(nextMethod);
    setPasswordStage("credentials");
    setIdentityMode(null);
    setEmailCodeRequested(false);
    setEmailCode("");
    setTwoFactorCode("");
    setBackupCode("");
  }

  function navigateToDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  async function handlePasswordSubmit() {
    if (passwordStage === "credentials") {
      const parsed = signInSchema.safeParse({
        email,
        password,
      });

      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Check the form fields and try again.");
        return;
      }

      const mode = await discoverAccessMode(parsed.data.email);
      setIdentityMode(mode);

      if (mode === "sign-up") {
        setPasswordStage("profile");
        return;
      }

      const result = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
        callbackURL: "/dashboard",
      });

      if (result.error) {
        toast.error(result.error.message ?? "Unable to sign in.");
        return;
      }

      if (getTwoFactorRedirect(result)) {
        resetTransientState("two-factor");
        toast.message("Enter the code from your authenticator app to finish signing in.");
        return;
      }

      navigateToDashboard();
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

    const result = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      callbackURL: "/dashboard",
    });

    if (result.error) {
      toast.error(result.error.message ?? "Unable to create your account.");
      return;
    }

    navigateToDashboard();
  }

  async function handleEmailCodeRequest() {
    const parsed = requestEmailCodeSchema.safeParse({
      email,
      name,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }

    const mode = await discoverAccessMode(parsed.data.email);
    setIdentityMode(mode);

    if (mode === "sign-up" && !parsed.data.name.trim()) {
      toast.error("Add your name so the new account can be finished in one step.");
      return;
    }

    const result = await authClient.emailOtp.sendVerificationOtp({
      email: parsed.data.email,
      type: "sign-in",
    });

    if (result.error) {
      toast.error(result.error.message ?? "Unable to send a sign-in code.");
      return;
    }

    setEmailCodeRequested(true);
    toast.success("Check your inbox for the sign-in code.");
  }

  async function handleEmailCodeVerify() {
    const parsed = verifyEmailCodeSchema.safeParse({
      email,
      otp: emailCode,
      name,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter the code from your email.");
      return;
    }

    if (identityMode === "sign-up" && !parsed.data.name.trim()) {
      toast.error("Add your name before finishing the first sign-in.");
      return;
    }

    const result = await authClient.signIn.emailOtp({
      email: parsed.data.email,
      otp: parsed.data.otp,
      name: identityMode === "sign-up" ? parsed.data.name : undefined,
    });

    if (result.error) {
      toast.error(result.error.message ?? "Unable to sign in with the code.");
      return;
    }

    navigateToDashboard();
  }

  async function handleMagicLink() {
    const parsed = requestMagicLinkSchema.safeParse({
      email,
      name,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }

    const mode = await discoverAccessMode(parsed.data.email);
    setIdentityMode(mode);

    if (mode === "sign-up" && !parsed.data.name.trim()) {
      toast.error("Add your name so the account can be created from the email link.");
      return;
    }

    const result = await authClient.signIn.magicLink({
      email: parsed.data.email,
      name: mode === "sign-up" ? parsed.data.name : undefined,
      callbackURL: "/dashboard",
      newUserCallbackURL: "/dashboard",
      errorCallbackURL: "/login",
    });

    if (result.error) {
      toast.error(result.error.message ?? "Unable to send the sign-in link.");
      return;
    }

    toast.success("Check your inbox for the sign-in link.");
  }

  async function handlePasskey() {
    const result = await authClient.signIn.passkey();

    if (result.error) {
      if ("code" in result.error && result.error.code === "AUTH_CANCELLED") {
        return;
      }

      toast.error(result.error.message ?? "Unable to sign in with a passkey.");
      return;
    }

    navigateToDashboard();
  }

  async function handleTwoFactorVerification(kind: "totp" | "backup") {
    if (kind === "totp") {
      const parsed = verifyTwoFactorSchema.safeParse({
        code: twoFactorCode,
      });

      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Enter the code from your authenticator app.");
        return;
      }

      const result = await authClient.twoFactor.verifyTotp({
        code: parsed.data.code,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Unable to verify the authenticator code.");
        return;
      }

      navigateToDashboard();
      return;
    }

    const parsed = verifyBackupCodeSchema.safeParse({
      code: backupCode,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a valid backup code.");
      return;
    }

    const result = await authClient.twoFactor.verifyBackupCode({
      code: parsed.data.code,
    });

    if (result.error) {
      toast.error(result.error.message ?? "Unable to verify the backup code.");
      return;
    }

    navigateToDashboard();
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        if (method === "password") {
          await handlePasswordSubmit();
          return;
        }

        if (method === "email-code") {
          if (emailCodeRequested) {
            await handleEmailCodeVerify();
            return;
          }

          await handleEmailCodeRequest();
          return;
        }

        if (method === "magic-link") {
          await handleMagicLink();
          return;
        }

        if (method === "passkey") {
          await handlePasskey();
          return;
        }

        await handleTwoFactorVerification("totp");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to continue right now.");
      }
    });
  }

  const methodCopy = {
    password: {
      eyebrow: passwordStage === "profile" ? "Finish setup" : "Password",
      title:
        passwordStage === "profile"
          ? "This address is new here"
          : "Continue with your email",
      description:
        passwordStage === "profile"
          ? "Add your name once and movieshare creates the account straight away."
          : "Use the same form whether you are coming back or opening the app for the first time.",
      submitLabel:
        passwordStage === "profile" ? "Create account and continue" : "Continue",
    },
    "email-code": {
      eyebrow: "Email code",
      title: emailCodeRequested ? "Enter the code" : "Get a short sign-in code",
      description: emailCodeRequested
        ? "Paste the code from your inbox to finish entering the app."
        : "We will send a short code to your inbox and you can finish from this page.",
      submitLabel: emailCodeRequested ? "Sign in with code" : "Send code",
    },
    "magic-link": {
      eyebrow: "Magic link",
      title: "Send a link to this inbox",
      description: "Open the email on this device and continue without typing a password.",
      submitLabel: "Email me a sign-in link",
    },
    passkey: {
      eyebrow: "Passkey",
      title: "Use a saved passkey",
      description: "Best on a device where you already saved a passkey for this account.",
      submitLabel: "Continue with passkey",
    },
    "two-factor": {
      eyebrow: "Security check",
      title: "Enter your authenticator code",
      description: "One more short step before entering movieshare on this device.",
      submitLabel: "Verify code",
    },
  } as const;

  const copy = methodCopy[method];

  const methodButtons = [
    {
      key: "password" as const,
      label: "Password",
      icon: KeyRound,
      description: "Email and password",
    },
    ...(supportsEmailCode
      ? [
          {
            key: "email-code" as const,
            label: "Code",
            icon: Sparkles,
            description: "Short code by email",
          },
        ]
      : []),
    ...(supportsMagicLink
      ? [
          {
            key: "magic-link" as const,
            label: "Magic link",
            icon: Link2,
            description: "Email sign-in link",
          },
        ]
      : []),
    ...(supportsPasskeys
      ? [
          {
            key: "passkey" as const,
            label: "Passkey",
            icon: ShieldCheck,
            description: "Saved browser/device key",
          },
        ]
      : []),
  ];

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="space-y-3 rounded-[28px] border border-border/70 bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="secondary">{copy.eyebrow}</Badge>
          {method === "two-factor" || passwordStage === "profile" || emailCodeRequested ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-3"
              onClick={() => {
                if (method === "two-factor") {
                  resetTransientState("password");
                  return;
                }

                if (passwordStage === "profile") {
                  setPasswordStage("credentials");
                  return;
                }

                setEmailCodeRequested(false);
                setEmailCode("");
              }}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="size-3.5" />
              Choose the easiest way in
            </span>
          )}
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{copy.title}</h2>
          <FieldDescription>{copy.description}</FieldDescription>
        </div>
      </div>

      {method !== "two-factor" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {methodButtons.map((option) => {
            const Icon = option.icon;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => resetTransientState(option.key)}
                className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
                  method === option.key
                    ? "border-foreground/20 bg-muted text-foreground"
                    : "border-border/70 bg-background text-muted-foreground hover:bg-muted/35"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Icon className="size-4" />
                  {option.label}
                </div>
                <p className="mt-1 text-xs leading-5">{option.description}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      {method === "password" || method === "email-code" || method === "magic-link" ? (
        <>
          {(passwordStage === "profile" ||
            (identityMode === "sign-up" && (method === "email-code" || method === "magic-link"))) ? (
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                placeholder="Kevin Rossi"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                required={passwordStage === "profile"}
              />
              {method !== "password" ? (
                <FieldDescription>
                  This is only needed the first time this email enters movieshare.
                </FieldDescription>
              ) : null}
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
        </>
      ) : null}

      {method === "password" ? (
        <>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={passwordStage === "profile" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
            />
          </Field>

          {passwordStage === "credentials" ? (
            <FieldDescription>
              If this email is new, movieshare asks only for your name before creating the
              account.
            </FieldDescription>
          ) : null}
        </>
      ) : null}

      {method === "email-code" && emailCodeRequested ? (
        <Field>
          <FieldLabel htmlFor="email-code">Code</FieldLabel>
          <Input
            id="email-code"
            name="email-code"
            inputMode="numeric"
            placeholder="123456"
            value={emailCode}
            onChange={(event) => setEmailCode(event.currentTarget.value)}
            required
          />
        </Field>
      ) : null}

      {method === "passkey" ? (
        <div className="rounded-[28px] border border-border/70 bg-background p-4 text-sm leading-6 text-muted-foreground">
          Use this on a device where you already saved a passkey from your profile settings.
        </div>
      ) : null}

      {method === "two-factor" ? (
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="two-factor-code">Authenticator code</FieldLabel>
            <Input
              id="two-factor-code"
              name="two-factor-code"
              inputMode="numeric"
              placeholder="123456"
              value={twoFactorCode}
              onChange={(event) => setTwoFactorCode(event.currentTarget.value)}
              required
            />
          </Field>

          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {copy.submitLabel}
          </Button>

          <div className="space-y-3 rounded-[28px] border border-border/70 bg-background p-4">
            <p className="text-sm font-medium">Or use a backup code</p>
            <Input
              id="backup-code"
              name="backup-code"
              placeholder="ABCDE-12345"
              value={backupCode}
              onChange={(event) => setBackupCode(event.currentTarget.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await handleTwoFactorVerification("backup");
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Unable to use the backup code.",
                    );
                  }
                })
              }
            >
              Use backup code
            </Button>
          </div>
        </div>
      ) : (
        <Button className="w-full" type="submit" disabled={isPending}>
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {copy.submitLabel}
        </Button>
      )}
    </form>
  );
}
