import { Activity, Sparkles } from "lucide-react";
import Link from "next/link";

import { CreateListForm } from "@/components/lists/create-list-form";
import { MediaImage } from "@/components/media/media-image";
import { RelativeTime } from "@/components/time/relative-time";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/server/session";
import { getDashboardData } from "@/server/services/list-service";

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.user.id);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overview</p>
                <CardTitle className="text-2xl">Your shared movie rooms</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Lists</p>
              <p className="mt-2 text-3xl font-semibold">{data.lists.length}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Recent activity</p>
              <p className="mt-2 text-3xl font-semibold">{data.recentActivity.length}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="mt-2 text-3xl font-semibold">{session.user.role}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Create a new list</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateListForm />
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
                <Link
                  key={membership.id}
                  href={`/lists/${membership.list.slug}`}
                  className="overflow-hidden rounded-3xl border border-border/70 bg-background transition-colors hover:bg-accent/50"
                >
                  <div className="relative min-h-28 border-b border-border/70 bg-muted/30">
                    {membership.list.coverImageUrl ? (
                      <MediaImage
                        src={membership.list.coverImageUrl}
                        alt={membership.list.name}
                        fill
                        sizes="(min-width: 1280px) 24rem, (min-width: 768px) 50vw, 100vw"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06),rgba(248,250,252,0.9))]" />
                    <div className="relative flex h-full items-start justify-end p-4">
                      <Badge>{membership.role}</Badge>
                    </div>
                  </div>
                  <div className="space-y-4 p-5">
                    <div>
                      <p className="font-semibold">{membership.list.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {membership.list.description || "No description yet."}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{membership.list._count.items} movies</span>
                      <span>{membership.list._count.members} members</span>
                    </div>
                  </div>
                </Link>
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
