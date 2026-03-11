import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

type RouteStateCardProps = {
  eyebrow: string;
  code: string;
  title: string;
  description: string;
  actions?: ReactNode;
  notes?: ReactNode;
};

export function RouteStateCard({
  eyebrow,
  code,
  title,
  description,
  actions,
  notes,
}: RouteStateCardProps) {
  return (
    <Card className="w-full max-w-3xl border-border/70 bg-background/95 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
      <CardHeader className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
            {eyebrow}
          </p>
          <div className="rounded-full border border-border/70 bg-card px-4 py-1 text-sm font-medium text-muted-foreground">
            {code}
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        {notes}
      </CardContent>
    </Card>
  );
}
