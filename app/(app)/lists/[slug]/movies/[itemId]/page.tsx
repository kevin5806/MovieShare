import {
  FeedbackInterest,
  FeedbackSeenState,
  WatchSessionType,
} from "@/generated/prisma/client";
import {
  saveMovieFeedbackAction,
  startWatchSessionAction,
} from "@/features/lists/actions";
import { MediaImage } from "@/components/media/media-image";
import { RemoveMovieButton } from "@/components/movies/remove-movie-button";
import { CheckboxListField } from "@/components/forms/checkbox-list-field";
import { ChoicePillField } from "@/components/forms/choice-pill-field";
import { RealtimeRefresh } from "@/components/realtime/realtime-refresh";
import { formatTmdbScore } from "@/lib/formatters";
import { getMoviePosterUrl } from "@/lib/movie-images";
import { formatReleaseDate, formatRuntime, formatSeconds } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DateTimeText } from "@/components/time/date-time";
import { requireSession } from "@/server/session";
import { getListItemDetail } from "@/server/services/list-service";

const seenStateOptions = [
  [FeedbackSeenState.UNSEEN, "Need to watch", "I have not seen this yet"],
  [FeedbackSeenState.SEEN, "Already seen", "I already know this movie"],
] as const;

const interestOptions = [
  [FeedbackInterest.NOT_SET, "Not sure", "No clear opinion yet"],
  [FeedbackInterest.INTERESTED, "Interested", "I would watch this soon"],
  [FeedbackInterest.NOT_INTERESTED, "Pass", "Not for me right now"],
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
  const viewerMembership = item.list.members.find((member) => member.userId === session.user.id);
  const canRemoveMovie =
    viewerMembership?.role === "OWNER" ||
    viewerMembership?.role === "MANAGER" ||
    item.addedById === session.user.id;
  const memberOptions = item.list.members
    .filter((member) => member.userId !== session.user.id)
    .map((member) => ({
      id: `member-${member.id}`,
      value: member.userId,
      label: member.user.profile?.displayName || member.user.name,
      description: member.user.email,
    }));

  return (
    <div className="space-y-8">
      <RealtimeRefresh channels={[`list:${item.listId}`]} />
      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="overflow-hidden border-border/70 bg-card/85">
          <div
            data-testid="movie-detail-poster-frame"
            className="relative isolate aspect-[2/3] overflow-hidden bg-muted"
          >
            {getMoviePosterUrl(item.movie, "w780") ? (
              <MediaImage
                src={getMoviePosterUrl(item.movie, "w780") ?? ""}
                alt={item.movie.title}
                fill
                sizes="(min-width: 1280px) 32rem, 100vw"
                data-testid="movie-detail-poster-image"
                className="absolute inset-0 !h-full !w-full object-cover object-center"
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
            {canRemoveMovie ? (
              <div className="pt-2">
                <RemoveMovieButton listItemId={item.id} listSlug={slug} />
              </div>
            ) : null}
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
                  <ChoicePillField
                    name="seenState"
                    label="Have you seen it?"
                    defaultValue={yourFeedback?.seenState ?? FeedbackSeenState.UNSEEN}
                    options={seenStateOptions.map(([value, label, hint]) => ({
                      value,
                      label,
                      hint,
                    }))}
                  />
                  <ChoicePillField
                    name="interest"
                    label="What is your mood?"
                    defaultValue={yourFeedback?.interest ?? FeedbackInterest.NOT_SET}
                    options={interestOptions.map(([value, label, hint]) => ({
                      value,
                      label,
                      hint,
                    }))}
                  />
                  <ChoicePillField
                    name="wouldRewatch"
                    label="Would you watch it again?"
                    defaultValue={(yourFeedback?.wouldRewatch ?? false) ? "true" : "false"}
                    options={[
                      {
                        value: "true",
                        label: "Watch again",
                        hint: "Worth repeating with the group",
                      },
                      {
                        value: "false",
                        label: "One time is enough",
                        hint: "Good once, not eager to repeat",
                      },
                    ]}
                  />
                  <Textarea
                    name="comment"
                    defaultValue={yourFeedback?.comment ?? ""}
                    placeholder="Add a short note for everyone"
                  />
                  <Button type="submit" className="w-full">
                    Save feedback
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/85">
              <CardHeader>
                <CardTitle>Create watch tracking session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  Start a viewing entry for yourself or the people in the room. This keeps
                  track of who started the movie together and how much of the movie each
                  person has actually covered over time.
                </p>
                <form action={startWatchSessionAction} className="space-y-4">
                  <input type="hidden" name="listItemId" value={item.id} />
                  <input type="hidden" name="listSlug" value={slug} />
                  <ChoicePillField
                    name="type"
                    label="Who is watching now?"
                    defaultValue={WatchSessionType.SOLO}
                    options={[
                      {
                        value: WatchSessionType.SOLO,
                        label: "Just me",
                        hint: "Personal catch-up or solo watch",
                      },
                      {
                        value: WatchSessionType.GROUP,
                        label: "A group",
                        hint: "Shared room, each person keeps their own progress",
                      },
                    ]}
                    description="This is progress tracking, not synced screen sharing."
                  />
                  {memberOptions.length ? (
                    <CheckboxListField
                      name="memberIds"
                      label="Who is in the room with you?"
                      description="Selected members are added immediately to this watch entry. No extra confirmation is required."
                      options={memberOptions}
                    />
                  ) : null}
                  <Button type="submit" className="w-full">
                    Start watching
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Card className="border-border/70 bg-card/85">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Watching progress</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{item.watchSummary.startedCount} started</Badge>
            <Badge variant="secondary">{item.watchSummary.completedCount} finished</Badge>
            <Badge variant="secondary">{item.watchSummary.inProgressCount} catching up</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {item.watchProgress.length ? (
              item.watchProgress.map((progress) => (
                <div
                  key={progress.id}
                  className="rounded-3xl border border-border/70 bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">
                      {progress.user.profile?.displayName || progress.user.name}
                    </p>
                    <Badge variant={progress.completionState === "COMPLETED" ? "default" : "secondary"}>
                      {progress.completionState === "COMPLETED"
                        ? "Finished"
                        : progress.completionState === "IN_PROGRESS"
                          ? "In progress"
                          : "Not started"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Last known point {formatSeconds(progress.lastPositionSeconds)}
                  </p>
                  {progress.lastWatchedAt ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Updated <DateTimeText value={progress.lastWatchedAt.toISOString()} />
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                Nobody has started this title from movieshare yet.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Recent watch entries</p>
              <Badge variant="secondary">{item.watchSessions.length}</Badge>
            </div>
            {item.watchSessions.length ? (
              item.watchSessions.slice(0, 6).map((watchSession) => (
                <div
                  key={watchSession.id}
                  className="rounded-3xl border border-border/70 bg-background p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {watchSession.type === "GROUP" ? "Group watch" : "Solo watch"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Started by{" "}
                        {watchSession.startedBy.profile?.displayName || watchSession.startedBy.name}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {watchSession.members.filter((member) => member.presence !== "INVITED").length} people
                      </Badge>
                      <Badge variant="secondary">
                        Start from {formatSeconds(watchSession.resumeFromSeconds)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-3xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                No watch history yet for this title.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/85">
        <CardHeader>
          <CardTitle>Group feedback</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {item.feedbacks.length ? (
            item.feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-3xl border border-border/70 bg-background p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">
                    {feedback.user.profile?.displayName || feedback.user.name}
                  </p>
                  <Badge variant="secondary">
                    {feedback.interest === FeedbackInterest.INTERESTED
                      ? "Interested"
                      : feedback.interest === FeedbackInterest.NOT_INTERESTED
                        ? "Pass"
                        : "Not sure"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feedback.seenState === FeedbackSeenState.SEEN
                    ? "Already seen"
                    : "Needs to watch"}{" "}
                  | {feedback.wouldRewatch ? "Would watch again" : "No rewatch signal"}
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
