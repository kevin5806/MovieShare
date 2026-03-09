import { SelectionMode } from "@/generated/prisma/client";
import { runSelectionAction } from "@/features/lists/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/server/session";
import { getListDetails } from "@/server/services/list-service";

const selectionModes = [
  [SelectionMode.MANUAL, "Manual", "Rank the room and let the group decide."],
  [SelectionMode.RANDOM, "Random", "Weighted randomness with light sentiment bias."],
  [SelectionMode.AUTOMATIC, "Automatic", "Use current feedback and metadata as the baseline."],
  [SelectionMode.GENRE, "Genre", "Favor richer genre overlap for the group."],
  [SelectionMode.DURATION, "Duration", "Prefer runtimes that are easier to start tonight."],
  [SelectionMode.MOOD, "Mood", "Simple mood heuristic, ready for future upgrades."],
] as const;

export default async function SelectionPage({
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
      <section className="space-y-3">
        <Badge variant="secondary">Selection</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Pick the next movie</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          The current implementation keeps the logic simple but stores domain data for
          future mode-specific heuristics and realtime collaboration.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {selectionModes.map(([mode, title, description]) => (
          <Card key={mode} className="border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">{description}</p>
              <form action={runSelectionAction}>
                <input type="hidden" name="listId" value={list.id} />
                <input type="hidden" name="listSlug" value={list.slug} />
                <input type="hidden" name="mode" value={mode} />
                <Button type="submit" className="w-full">
                  Run {title} mode
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-border/70 bg-card/85">
        <CardHeader>
          <CardTitle>Latest result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestSelection ? (
            <>
              <p className="text-sm leading-6 text-muted-foreground">{latestSelection.summary}</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {latestSelection.results.map((result) => (
                  <div
                    key={result.id}
                    className="rounded-3xl border border-border/70 bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{result.listItem.movie.title}</p>
                        <p className="text-sm text-muted-foreground">Rank #{result.rank}</p>
                      </div>
                      {result.selected ? <Badge>Selected</Badge> : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
              No selection run available yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
