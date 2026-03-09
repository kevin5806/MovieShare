import Link from "next/link";
import { WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(226,232,240,0.45),_transparent_32%),linear-gradient(180deg,_rgba(248,250,252,0.92),_rgba(248,250,252,1))] px-4 py-8">
      <Card className="w-full max-w-xl border-border/70 bg-card/90 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
        <CardHeader className="space-y-3">
          <Badge variant="secondary">Offline</Badge>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
              <WifiOff className="size-4" />
            </div>
            <CardTitle>You are offline</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
          <p>
            movieshare could not reach the network right now. Reconnect and reload to resume
            collaborative updates, invites and watch-session activity.
          </p>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Try again
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
