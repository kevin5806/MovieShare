"use client";

import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { RouteStateCard } from "@/components/feedback/route-state-card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-4xl flex-col gap-6">
        <BrandMark />
        <RouteStateCard
          eyebrow="Unexpected error"
          code="500"
          title="Something slipped while loading this page."
          description="movieshare hit an unexpected problem. Try the page again or move back to a stable section of the app."
          actions={
            <>
              <Button type="button" size="lg" onClick={() => reset()}>
                Try again
              </Button>
              <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Back to home
              </Link>
            </>
          }
          notes={
            <div className="rounded-3xl border border-border/70 bg-card/80 p-4 text-sm text-muted-foreground">
              If this keeps happening on the same screen, refresh once and then check your
              latest workflow in the dashboard or lists area.
            </div>
          }
        />
      </div>
    </main>
  );
}
