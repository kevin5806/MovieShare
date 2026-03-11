"use client";

import { Globe, LaptopMinimal, LogOut, ShieldCheck } from "lucide-react";
import { useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  revokeOtherProfileSessionsAction,
  revokeProfileSessionAction,
} from "@/features/profile/actions";
import { RelativeTime } from "@/components/time/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AccessSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  isCurrent: boolean;
  isActive: boolean;
};

type AccessSessionsCardProps = {
  activeSessionCount: number;
  sessions: AccessSession[];
};

function summarizeSession(session: AccessSession) {
  const userAgent = session.userAgent?.trim();

  if (!userAgent) {
    return "Browser session";
  }

  if (userAgent.includes("Mobile")) {
    return "Mobile browser";
  }

  if (userAgent.includes("Firefox")) {
    return "Firefox browser";
  }

  if (userAgent.includes("Edg/")) {
    return "Edge browser";
  }

  if (userAgent.includes("Chrome/")) {
    return "Chrome browser";
  }

  if (userAgent.includes("Safari/")) {
    return "Safari browser";
  }

  return "Browser session";
}

function formatAbsolute(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAbsoluteFallback(value: string) {
  return value.slice(0, 16).replace("T", " ") + " UTC";
}

function AbsoluteTime({ value }: { value: string }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <time dateTime={value} suppressHydrationWarning>
      {mounted ? formatAbsolute(value) : formatAbsoluteFallback(value)}
    </time>
  );
}

export function AccessSessionsCard({
  activeSessionCount,
  sessions,
}: AccessSessionsCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const activeSessions = sessions.filter((session) => session.isActive);

  function handleRevokeSession(sessionId: string, isCurrent: boolean) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("sessionId", sessionId);

      const result = await revokeProfileSessionAction(formData);

      if (!result) {
        return;
      }

      if (!result?.ok) {
        toast.error(result?.error ?? "Unable to end this session.");
        return;
      }

      toast.success(isCurrent ? "Signed out from this device." : "Session ended.");
      router.refresh();
    });
  }

  function handleRevokeOthers() {
    startTransition(async () => {
      const result = await revokeOtherProfileSessionsAction();

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Other active devices signed out.");
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Sessions and access</h2>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Review where your account is open, keep the current device, and close the ones
          you no longer use.
        </p>
      </div>

      <Card className="border-border/70 bg-card/85">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle>Active devices</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              You currently have {activeSessionCount} active{" "}
              {activeSessionCount === 1 ? "session" : "sessions"}.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleRevokeOthers}
            disabled={isPending || activeSessionCount <= 1}
          >
            <ShieldCheck className="size-4" />
            Sign out other devices
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeSessions.length ? (
            activeSessions.map((session) => (
              <div
                key={session.id}
                className="space-y-4 rounded-[28px] border border-border/70 bg-background p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{summarizeSession(session)}</p>
                      <Badge variant={session.isCurrent ? "secondary" : "outline"}>
                        {session.isCurrent ? "This device" : "Active"}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <LaptopMinimal className="size-4" />
                        <span className="line-clamp-1">
                          {session.userAgent?.trim() || "Browser details unavailable"}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Globe className="size-4" />
                        <span>{session.ipAddress?.trim() || "IP unavailable"}</span>
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={session.isCurrent ? "destructive" : "outline"}
                    onClick={() => handleRevokeSession(session.id, session.isCurrent)}
                    disabled={isPending}
                  >
                    <LogOut className="size-4" />
                    {session.isCurrent ? "Sign out here" : "End session"}
                  </Button>
                </div>

                <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-card px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                      Opened
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      <RelativeTime value={session.createdAt} />
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                      Last activity
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      <RelativeTime value={session.updatedAt} />
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                      Expires
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      <RelativeTime value={session.expiresAt} />
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
              No active sessions found for this account.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/85">
        <CardHeader>
          <CardTitle>Recent access history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length ? (
            sessions.map((session) => (
              <div
                key={`${session.id}:history`}
                className="flex flex-col gap-3 rounded-[28px] border border-border/70 bg-background p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{summarizeSession(session)}</p>
                    {session.isCurrent ? (
                      <Badge variant="secondary">This device</Badge>
                    ) : session.isActive ? (
                      <Badge variant="outline">Active</Badge>
                    ) : (
                      <Badge variant="outline">Closed</Badge>
                    )}
                  </div>
                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {session.userAgent?.trim() || "Browser details unavailable"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {session.ipAddress?.trim() || "IP unavailable"}
                  </p>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground sm:text-right">
                  <p>Last activity <RelativeTime value={session.updatedAt} /></p>
                  <p>
                    <AbsoluteTime value={session.updatedAt} />
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
              Your access history will appear here after the first sign-in.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
