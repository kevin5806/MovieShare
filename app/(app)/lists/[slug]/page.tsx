import { UsersRound, WandSparkles } from "lucide-react";

import { AddMovieDialog } from "@/components/movies/add-movie-dialog";
import { MovieCard } from "@/components/movies/movie-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/server/session";
import { getListDetails } from "@/server/services/list-service";

export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireSession();
  const list = await getListDetails(slug, session.user.id);
  const latestSelection = list.selectionRuns[0];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 rounded-[32px] border border-border/70 bg-card/85 p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{list.items.length} movies</Badge>
            <Badge variant="secondary">{list.members.length} members</Badge>
          </div>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">{list.name}</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
              {list.description || "No description yet for this room."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <UsersRound className="size-4" />
              {list.members.map((member) => member.user.name).join(", ")}
            </span>
          </div>
        </div>
        <AddMovieDialog listId={list.id} listSlug={list.slug} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Movies in this list</CardTitle>
            <Badge variant="secondary">TMDB-backed</Badge>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.items.length ? (
              list.items.map((item) => (
                <MovieCard key={item.id} listSlug={list.slug} item={item} />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-background p-8 text-sm text-muted-foreground">
                No movies yet. Add the first proposal from TMDB to start the conversation.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
              <WandSparkles className="size-4" />
            </div>
            <div>
              <CardTitle>Selection snapshot</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestSelection ? (
              <>
                <p className="text-sm leading-6 text-muted-foreground">{latestSelection.summary}</p>
                {latestSelection.results.slice(0, 3).map((result) => (
                  <div
                    key={result.id}
                    className="rounded-3xl border border-border/70 bg-background p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{result.listItem.movie.title}</p>
                        <p className="text-sm text-muted-foreground">Rank #{result.rank}</p>
                      </div>
                      {result.selected ? <Badge>Selected</Badge> : null}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                No selection run yet. Open the selection page to rank candidates.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
