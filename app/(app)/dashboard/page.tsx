import { Activity, Sparkles } from "lucide-react";
import Link from "next/link";

import { ListMembershipCard } from "@/components/lists/list-membership-card";
import { RelativeTime } from "@/components/time/relative-time";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireSession } from "@/server/session";
import { getDashboardData } from "@/server/services/list-service";

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.user.id);
  const ownedListsCount = data.lists.filter((membership) => membership.role === "OWNER").length;
  const sharedListsCount = data.lists.length - ownedListsCount;

  return (
    <div className="space-y-8">
      <section>
        <Card className="max-w-5xl border-border/70 bg-card/85">
          <CardHeader className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
                <Sparkles className="size-4" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Overview</p>
                <CardTitle className="text-2xl">Your shared movie rooms</CardTitle>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  The dashboard stays focused on status and recent movement. Create and
                  manage lists from the dedicated lists area.
                </p>
              </div>
            </div>
            <Link
              href="/lists"
              className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            >
              Open lists
            </Link>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Lists</p>
              <p className="mt-2 text-3xl font-semibold">{data.lists.length}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Owned by you</p>
              <p className="mt-2 text-3xl font-semibold">{ownedListsCount}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Shared with you</p>
              <p className="mt-2 text-3xl font-semibold">{sharedListsCount}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Recent activity</p>
              <p className="mt-2 text-3xl font-semibold">{data.recentActivity.length}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lists</CardTitle>
            </div>
            <Badge variant="secondary">{data.lists.length} total</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {data.lists.length ? (
              data.lists.map((membership) => (
                <ListMembershipCard
                  key={membership.id}
                  membership={membership}
                />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-background p-8 text-sm text-muted-foreground">
                No lists yet. Create your first collaborative room to get started.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
              <Activity className="size-4" />
            </div>
            <div>
              <CardTitle>Recent activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentActivity.length ? (
              data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-3xl border border-border/70 bg-background p-4"
                >
                  <p className="font-medium">{activity.event.replaceAll(".", " ")}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.list?.name || "System activity"} |{" "}
                    <RelativeTime value={activity.createdAt.toISOString()} />
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-background p-8 text-sm text-muted-foreground">
                Activity will appear here as lists, feedback and sessions evolve.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
