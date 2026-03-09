import {
  FeedbackInterest,
  FeedbackSeenState,
  WatchSessionType,
} from "@/generated/prisma/client";
import {
  saveMovieFeedbackAction,
  startWatchSessionAction,
} from "@/features/lists/actions";
import { formatTmdbScore } from "@/lib/formatters";
import { tmdbImageUrl } from "@/lib/tmdb";
import { formatReleaseDate, formatRuntime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { requireSession } from "@/server/session";
import { getListItemDetail } from "@/server/services/list-service";

const seenStateOptions = [
  [FeedbackSeenState.UNSEEN, "Not seen"],
  [FeedbackSeenState.SEEN, "Already seen"],
] as const;

const interestOptions = [
  [FeedbackInterest.NOT_SET, "No signal"],
  [FeedbackInterest.INTERESTED, "Interested"],
  [FeedbackInterest.NOT_INTERESTED, "Not interested"],
] as const;

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ slug: string; itemId: string }>;
}) {
  const { slug, itemId } = await params;
  const session = await requireSession();
  const item = await getListItemDetail(slug, itemId, session.user.id);
  const yourFeedback = item.feedbacks.find((feedback) => feedback.userId === session.user.id);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="overflow-hidden border-border/70 bg-card/85">
          <div className="relative aspect-[2/3] bg-muted">
            {item.movie.posterPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tmdbImageUrl(item.movie.posterPath, "w780") ?? undefined}
                alt={item.movie.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No poster available
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{formatTmdbScore(item.movie.tmdbVoteAverage)}</Badge>
              <Badge variant="secondary">{formatReleaseDate(item.movie.releaseDate)}</Badge>
              <Badge variant="secondary">{formatRuntime(item.movie.runtimeMinutes)}</Badge>
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">{item.movie.title}</h1>
              {item.movie.originalTitle && item.movie.originalTitle !== item.movie.title ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Original title: {item.movie.originalTitle}
                </p>
              ) : null}
            </div>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              {item.movie.overview || "No overview available."}
            </p>
            <p className="text-sm text-muted-foreground">
              Proposed by <span className="font-medium text-foreground">{item.addedBy.name}</span>
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/70 bg-card/85">
              <CardHeader>
                <CardTitle>Your feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={saveMovieFeedbackAction} className="space-y-4">
                  <input type="hidden" name="listItemId" value={item.id} />
                  <input type="hidden" name="listSlug" value={slug} />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Seen state</label>
                    <select
                      name="seenState"
                      defaultValue={yourFeedback?.seenState ?? FeedbackSeenState.UNSEEN}
                      className="flex h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
                    >
                      {seenStateOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Interest</label>
                    <select
                      name="interest"
                      defaultValue={yourFeedback?.interest ?? FeedbackInterest.NOT_SET}
                      className="flex h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
                    >
                      {interestOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      name="wouldRewatch"
                      defaultChecked={yourFeedback?.wouldRewatch ?? false}
                    />
                    I would rewatch this title
                  </label>
                  <Textarea
                    name="comment"
                    defaultValue={yourFeedback?.comment ?? ""}
                    placeholder="Add a short comment for the group"
                  />
                  <Button type="submit" className="w-full">
                    Save feedback
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/85">
              <CardHeader>
                <CardTitle>Start watching</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={startWatchSessionAction} className="space-y-4">
                  <input type="hidden" name="listItemId" value={item.id} />
                  <input type="hidden" name="listSlug" value={slug} />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Session type</label>
                    <select
                      name="type"
                      defaultValue={WatchSessionType.SOLO}
                      className="flex h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
                    >
                      <option value={WatchSessionType.SOLO}>Solo</option>
                      <option value={WatchSessionType.GROUP}>Group</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Optional group members</p>
                    <div className="space-y-2">
                      {item.list.members
                        .filter((member) => member.userId !== session.user.id)
                        .map((member) => (
                          <label
                            key={member.id}
                            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm"
                          >
                            <input type="checkbox" name="memberIds" value={member.userId} />
                            {member.user.profile?.displayName || member.user.name}
                          </label>
                        ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Create watch session
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Card className="border-border/70 bg-card/85">
        <CardHeader>
          <CardTitle>Group feedback</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {item.feedbacks.length ? (
            item.feedbacks.map((feedback) => (
              <div key={feedback.id} className="rounded-3xl border border-border/70 bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">
                    {feedback.user.profile?.displayName || feedback.user.name}
                  </p>
                  <Badge variant="secondary">{feedback.interest}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feedback.seenState} · {feedback.wouldRewatch ? "Would rewatch" : "No rewatch"}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {feedback.comment || "No comment added."}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
              No feedback yet. Encourage members to leave quick signals before running
              selection.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
