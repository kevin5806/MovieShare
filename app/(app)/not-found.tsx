import Link from "next/link";

import { RouteStateCard } from "@/components/feedback/route-state-card";
import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";

export default function AuthenticatedNotFound() {
  return (
    <div className="flex min-h-full items-center justify-center px-2 py-6">
      <RouteStateCard
        eyebrow="Workspace route missing"
        code="404"
        title="That room or page is not here anymore."
        description="The item may have been removed, renamed or never existed for this account. Jump back to the areas that still matter instead of landing on a stock error page."
        actions={
          <>
            <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }))}>
              Back to dashboard
            </Link>
            <Link href="/lists" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              Open lists
            </Link>
          </>
        }
        notes={
          <div className="rounded-3xl border border-border/70 bg-card/80 p-4 text-sm text-muted-foreground">
            If you expected a specific list or movie here, verify that you still have access
            to it from the main lists area or from the latest notification that mentioned it.
          </div>
        }
      />
    </div>
  );
}
