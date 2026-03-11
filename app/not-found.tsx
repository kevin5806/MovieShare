import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { RouteStateCard } from "@/components/feedback/route-state-card";
import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";
import { getSession } from "@/server/session";

export default async function NotFound() {
  const session = await getSession();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-4xl flex-col gap-6">
        <BrandMark />
        <RouteStateCard
          eyebrow="Page not found"
          code="404"
          title="This page stepped out of the room."
          description="The link may be old, incomplete or no longer available. Use one of the routes below to get back into movieshare without guessing."
          actions={
            <>
              <Link
                href={session ? "/dashboard" : "/"}
                className={cn(buttonVariants({ size: "lg" }))}
              >
                {session ? "Back to workspace" : "Back to home"}
              </Link>
              <Link
                href={session ? "/lists" : "/login"}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                {session ? "Open lists" : "Open access page"}
              </Link>
            </>
          }
          notes={
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-border/70 bg-card/80 p-4 text-sm text-muted-foreground">
                Try the sidebar or your recent notifications if you were looking for an
                invite, a list or a watch room.
              </div>
              <div className="rounded-3xl border border-border/70 bg-card/80 p-4 text-sm text-muted-foreground">
                If someone sent you a link, ask them to copy it again in case the invite or
                route changed.
              </div>
            </div>
          }
        />
      </div>
    </main>
  );
}
