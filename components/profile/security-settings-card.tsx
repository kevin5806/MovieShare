"use client";

import Image from "next/image";
import { KeyRound, LoaderCircle, ShieldCheck, ShieldOff } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as QRCode from "qrcode";

import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SecurityMethod = {
  key: "PASSKEY" | "TWO_FACTOR";
  label: string;
  isEnabled: boolean;
  availability: "live" | "config-only" | "blocked";
  requirement: string;
};

type SecuritySettingsCardProps = {
  hasPasswordAccount: boolean;
  initialTwoFactorEnabled: boolean;
  passkeyMethod: SecurityMethod | null;
  twoFactorMethod: SecurityMethod | null;
};

export function SecuritySettingsCard({
  hasPasswordAccount,
  initialTwoFactorEnabled,
  passkeyMethod,
  twoFactorMethod,
}: SecuritySettingsCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const passkeysQuery = authClient.useListPasskeys();
  const passkeys = passkeysQuery.data ?? [];
  const [passkeyName, setPasskeyName] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [totpSetup, setTotpSetup] = useState<{
    totpURI: string;
    backupCodes: string[];
  } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!totpSetup?.totpURI) {
      return;
    }

    QRCode.toDataURL(totpSetup.totpURI, {
      margin: 0,
      width: 220,
    })
      .then((url) => {
        if (!cancelled) {
          setQrCodeUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrCodeUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [totpSetup]);

  const passkeysAvailable = passkeyMethod?.availability === "live" && passkeyMethod.isEnabled;
  const twoFactorAvailable =
    twoFactorMethod?.availability === "live" && twoFactorMethod.isEnabled && hasPasswordAccount;
  const twoFactorBlockedReason = useMemo(() => {
    if (!twoFactorMethod) {
      return "This deployment does not expose two-factor controls yet.";
    }

    if (!twoFactorMethod.isEnabled) {
      return twoFactorMethod.requirement;
    }

    if (twoFactorMethod.availability !== "live") {
      return twoFactorMethod.requirement;
    }

    if (!hasPasswordAccount) {
      return "This account does not have a password login yet, so authenticator protection cannot be turned on here.";
    }

    return null;
  }, [hasPasswordAccount, twoFactorMethod]);

  function refreshAfterSecurityChange() {
    router.refresh();
  }

  function handleAddPasskey() {
    if (!passkeysAvailable) {
      toast.error(passkeyMethod?.requirement ?? "Passkeys are not available here.");
      return;
    }

    startTransition(async () => {
      const result = await authClient.passkey.addPasskey({
        name: passkeyName.trim() || undefined,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Unable to save a new passkey.");
        return;
      }

      setPasskeyName("");
      refreshAfterSecurityChange();
      toast.success("Passkey saved for this account.");
    });
  }

  function handleDeletePasskey(passkeyId: string) {
    startTransition(async () => {
      const result = await authClient.passkey.deletePasskey({
        id: passkeyId,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Unable to remove this passkey.");
        return;
      }

      refreshAfterSecurityChange();
      toast.success("Passkey removed.");
    });
  }

  function handlePrepareTwoFactor() {
    if (!twoFactorAvailable || !twoFactorMethod) {
      toast.error(twoFactorBlockedReason ?? "Two-factor is not available.");
      return;
    }

    if (!twoFactorPassword.trim()) {
      toast.error("Enter your current password first.");
      return;
    }

    startTransition(async () => {
      const result = await authClient.twoFactor.enable({
        password: twoFactorPassword,
        issuer: "movieshare",
      });

      if (result.error) {
        toast.error(result.error.message ?? "Unable to prepare authenticator setup.");
        return;
      }

      const data = result.data as
        | {
            totpURI?: string;
            backupCodes?: string[];
          }
        | null;

      if (!data?.totpURI) {
        toast.error("Authenticator setup did not return a QR payload.");
        return;
      }

      setTotpSetup({
        totpURI: data.totpURI,
        backupCodes: data.backupCodes ?? [],
      });
      toast.success("Authenticator setup is ready. Scan the QR code and confirm with a code.");
    });
  }

  function handleVerifyTwoFactor() {
    if (!verificationCode.trim()) {
      toast.error("Enter the code from your authenticator app.");
      return;
    }

    startTransition(async () => {
      const result = await authClient.twoFactor.verifyTotp({
        code: verificationCode.trim(),
      });

      if (result.error) {
        toast.error(result.error.message ?? "Unable to verify the authenticator code.");
        return;
      }

      setVerificationCode("");
      setTwoFactorPassword("");
      refreshAfterSecurityChange();
      toast.success("Two-factor protection enabled.");
    });
  }

  function handleDisableTwoFactor() {
    if (!disablePassword.trim()) {
      toast.error("Enter your current password to turn this off.");
      return;
    }

    startTransition(async () => {
      const result = await authClient.twoFactor.disable({
        password: disablePassword,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Unable to disable two-factor.");
        return;
      }

      setDisablePassword("");
      setTotpSetup(null);
      refreshAfterSecurityChange();
      toast.success("Two-factor protection disabled.");
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border-border/70 bg-card/85">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Passkeys</CardTitle>
            <Badge variant={passkeysAvailable ? "secondary" : "outline"}>
              {passkeysAvailable ? "Available" : "Unavailable"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Save a passkey on the devices you trust so you can come back faster without
            typing your password each time.
          </p>

          <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
            {passkeyMethod?.requirement ??
              "Passkeys are not exposed in this deployment yet."}
          </div>

          <div className="flex gap-3">
            <Input
              value={passkeyName}
              onChange={(event) => setPasskeyName(event.currentTarget.value)}
              placeholder="Name this device"
              disabled={!passkeysAvailable || isPending}
            />
            <Button
              type="button"
              onClick={handleAddPasskey}
              disabled={!passkeysAvailable || isPending}
            >
              {isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Add passkey
            </Button>
          </div>

          <div className="space-y-3">
            {passkeysQuery.isPending ? (
              <div className="rounded-2xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
                Loading saved passkeys...
              </div>
            ) : passkeys.length ? (
              passkeys.map((entry) => {
                const passkey = entry as {
                  id: string;
                  name?: string | null;
                  deviceType?: string | null;
                };

                return (
                  <div
                    key={passkey.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        {passkey.name?.trim() || "Saved passkey"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {passkey.deviceType || "Trusted device"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDeletePasskey(passkey.id)}
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
                No passkeys saved yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/85">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Authenticator protection</CardTitle>
            <Badge variant={initialTwoFactorEnabled ? "secondary" : "outline"}>
              {initialTwoFactorEnabled ? "On" : "Off"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Add an authenticator app for password sign-ins when you want an extra check
            before entering the app.
          </p>

          {twoFactorBlockedReason ? (
            <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
              {twoFactorBlockedReason}
            </div>
          ) : null}

          {!initialTwoFactorEnabled ? (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={twoFactorPassword}
                  onChange={(event) => setTwoFactorPassword(event.currentTarget.value)}
                  placeholder="Current password"
                  disabled={!twoFactorAvailable || isPending}
                />
                <Button
                  type="button"
                  onClick={handlePrepareTwoFactor}
                  disabled={!twoFactorAvailable || isPending}
                >
                  {isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  Prepare app
                </Button>
              </div>

              {totpSetup ? (
                <div className="space-y-4 rounded-[28px] border border-border/70 bg-background p-5">
                  <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card p-4">
                      {qrCodeUrl ? (
                        <Image
                          src={qrCodeUrl}
                          alt="Authenticator QR code"
                          width={220}
                          height={220}
                          unoptimized
                          className="h-full w-full rounded-2xl object-contain"
                        />
                      ) : (
                        <div className="flex aspect-square items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
                          QR unavailable
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <p className="font-medium">Scan the code in your authenticator app</p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        After scanning, enter the 6-digit code below once to finish setup.
                      </p>
                      {totpSetup.backupCodes.length ? (
                        <div className="rounded-2xl border border-dashed border-border bg-card p-4">
                          <p className="mb-2 text-sm font-medium text-foreground">
                            Backup codes
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {totpSetup.backupCodes.map((code) => (
                              <div
                                key={code}
                                className="rounded-xl border border-border/70 bg-background px-3 py-2 font-mono text-sm"
                              >
                                {code}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Input
                      inputMode="numeric"
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.currentTarget.value)}
                      placeholder="6-digit code"
                      disabled={isPending}
                    />
                    <Button type="button" onClick={handleVerifyTwoFactor} disabled={isPending}>
                      Verify
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4 rounded-[28px] border border-border/70 bg-background p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-foreground" />
                <p className="font-medium">Authenticator protection is active</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Password sign-ins now ask for a code from your authenticator app before
                entering the app.
              </p>
              <div className="flex gap-3">
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={disablePassword}
                  onChange={(event) => setDisablePassword(event.currentTarget.value)}
                  placeholder="Current password"
                  disabled={isPending}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDisableTwoFactor}
                  disabled={isPending}
                >
                  <ShieldOff className="size-4" />
                  Turn off
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
            Passkeys and authenticator apps solve different needs: passkeys remove friction,
            while authenticator protection adds an extra check to password sign-ins.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
