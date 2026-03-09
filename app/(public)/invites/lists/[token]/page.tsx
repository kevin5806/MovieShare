import Link from "next/link";

import { respondToListInviteAction } from "@/features/lists/actions";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/server/session";
import { getListInviteByToken } from "@/server/services/list-service";

export default async function ListInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invite, session] = await Promise.all([getListInviteByToken(token), getSession()]);

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-16">
        <Card className="w-full max-w-xl border-border/70 bg-background/95">
          <CardHeader className="space-y-4">
            <BrandMark />
            <CardTitle>Invite not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>This invite does not exist anymore or the token is invalid.</p>
            <Link href="/" className="underline underline-offset-4">
              Back to movieshare
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = invite.expiresAt < new Date();
  const isPending = invite.status === "PENDING";
  const sessionEmail = session?.user.email?.toLowerCase() ?? null;
  const canRespond = sessionEmail === invite.email.toLowerCase();

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-2xl border-border/70 bg-background/95 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
        <CardHeader className="space-y-4">
          <BrandMark />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{invite.status}</Badge>
            {isExpired ? <Badge variant="secondary">Expired</Badge> : null}
          </div>
          <CardTitle>List invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{invite.sender.name}</span> invited{" "}
              <span className="font-medium text-foreground">{invite.email}</span> to join{" "}
              <span className="font-medium text-foreground">{invite.list.name}</span>.
            </p>
            <p>
              Current members:{" "}
              <span className="font-medium text-foreground">{invite.list.members.length}</span>
            </p>
          </div>

          {!session ? (
            <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
              Continue with <span className="font-medium text-foreground">{invite.email}</span> to
              sign in or create an account, then accept or decline this invite.
              <div className="mt-4">
                <Link
                  href={`/login?email=${encodeURIComponent(invite.email)}`}
                >
                  <Button type="button">Continue</Button>
                </Link>
              </div>
            </div>
          ) : canRespond && isPending && !isExpired ? (
            <div className="flex flex-wrap gap-3">
              <form action={respondToListInviteAction}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="action" value="accept" />
                <Button type="submit">Accept invite</Button>
              </form>
              <form action={respondToListInviteAction}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="action" value="decline" />
                <Button type="submit" variant="outline">
                  Decline
                </Button>
              </form>
            </div>
          ) : canRespond ? (
            <div className="rounded-3xl border border-border/70 bg-background p-6 text-sm text-muted-foreground">
              {isExpired
                ? "This invite expired before it was accepted."
                : "This invite has already been processed."}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
              You are signed in as{" "}
              <span className="font-medium text-foreground">{session.user.email}</span>, but this
              invite belongs to <span className="font-medium text-foreground">{invite.email}</span>.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
