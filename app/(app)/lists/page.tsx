import { FolderKanban, PlusCircle, Radio } from "lucide-react";

import { CreateListForm } from "@/components/lists/create-list-form";
import { ListMembershipCard } from "@/components/lists/list-membership-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/server/session";
import { getListsOverview } from "@/server/services/list-service";

export default async function ListsIndexPage() {
  const session = await requireSession();
  const overview = await getListsOverview(session.user.id);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Badge variant="secondary">Workspace</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Lists</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          One place for all your collaborative movie rooms, whether you own them or just
          joined the discussion.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
              <FolderKanban className="size-4" />
            </div>
            <div>
              <CardTitle>List overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Total lists</p>
              <p className="mt-2 text-3xl font-semibold">{overview.counts.total}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Owned by you</p>
              <p className="mt-2 text-3xl font-semibold">{overview.counts.owned}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Shared with you</p>
              <p className="mt-2 text-3xl font-semibold">{overview.counts.memberOnly}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">Lists with live watch</p>
              <p className="mt-2 text-3xl font-semibold">{overview.counts.liveSessions}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
              <PlusCircle className="size-4" />
            </div>
            <div>
              <CardTitle>Create another list</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CreateListForm />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overview.memberships.length ? (
          overview.memberships.map((membership) => {
            const ownerLabel =
              membership.list.owner.profile?.displayName || membership.list.owner.name;

            return (
              <ListMembershipCard
                key={membership.id}
                membership={membership}
                showOwner
                ownerLabel={ownerLabel}
                highlightLive={membership.list.watchSessions.length > 0}
              />
            );
          })
        ) : (
          <Card className="border-dashed border-border bg-card/85 md:col-span-2 xl:col-span-3">
            <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
                <Radio className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No lists yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first room to start collecting titles, feedback and watch
                  sessions.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
