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
import { CheckboxListField } from "@/components/forms/checkbox-list-field";
import { SelectField } from "@/components/forms/select-field";
import { SwitchField } from "@/components/forms/switch-field";
import { RealtimeRefresh } from "@/components/realtime/realtime-refresh";
import { formatTmdbScore } from "@/lib/formatters";
import { getMoviePosterUrl } from "@/lib/movie-images";
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
          <div className="relative aspect-[2/3] bg-muted">
            {getMoviePosterUrl(item.movie, "w780") ? (
              <MediaImage
                src={getMoviePosterUrl(item.movie, "w780") ?? ""}
                alt={item.movie.title}
                fill
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
                  <SelectField
                    name="seenState"
                    label="Seen state"
                    defaultValue={yourFeedback?.seenState ?? FeedbackSeenState.UNSEEN}
                    options={seenStateOptions.map(([value, label]) => ({ value, label }))}
                  />
                  <SelectField
                    name="interest"
                    label="Interest"
                    defaultValue={yourFeedback?.interest ?? FeedbackInterest.NOT_SET}
                    options={interestOptions.map(([value, label]) => ({ value, label }))}
                  />
                  <SwitchField
                    name="wouldRewatch"
                    label="I would rewatch this title"
                    description="Use this when the movie is a strong repeat candidate for the room."
                    defaultChecked={yourFeedback?.wouldRewatch ?? false}
                  />
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
                <CardTitle>Create watch tracking session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  This creates a shared tracking session, not a synced teleparty. Use it to
                  record who started the movie, who joined the same session and which
                  checkpoints were saved over time.
                </p>
                <form action={startWatchSessionAction} className="space-y-4">
                  <input type="hidden" name="listItemId" value={item.id} />
                  <input type="hidden" name="listSlug" value={slug} />
                  <SelectField
                    name="type"
                    label="Tracking mode"
                    defaultValue={WatchSessionType.SOLO}
                    options={[
                      { value: WatchSessionType.SOLO, label: "Solo tracking" },
                      { value: WatchSessionType.GROUP, label: "Group tracking" },
                    ]}
                    description="Group tracking shares presence and checkpoints, not synced playback."
                  />
                  {memberOptions.length ? (
                    <CheckboxListField
                      name="memberIds"
                      label="Optional members to include"
                      description="Relevant for group tracking. Members join the same session while keeping their own playback setup."
                      options={memberOptions}
                    />
                  ) : null}
                  <Button type="submit" className="w-full">
                    Create tracking session
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
              <div
                key={feedback.id}
                className="rounded-3xl border border-border/70 bg-background p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">
                    {feedback.user.profile?.displayName || feedback.user.name}
                  </p>
                  <Badge variant="secondary">{feedback.interest}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feedback.seenState} | {feedback.wouldRewatch ? "Would rewatch" : "No rewatch"}
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
