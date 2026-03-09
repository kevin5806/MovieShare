import { SelectionMode } from "@/generated/prisma/client";
import { realtimeBroker } from "@/server/realtime/broker";
import { db } from "@/server/db";
import { logActivity } from "@/server/services/activity-log";
import type { SelectionCandidate } from "@/server/services/list-service";

function durationBias(runtimeMinutes?: number | null) {
  if (!runtimeMinutes) {
    return 0;
  }

  if (runtimeMinutes >= 90 && runtimeMinutes <= 130) {
    return 2;
  }

  if (runtimeMinutes < 90) {
    return 1;
  }

  return -0.5;
}

function moodBias(overview?: string | null) {
  const text = overview?.toLowerCase() ?? "";

  if (/(warm|friendship|journey|family|hope|love)/.test(text)) {
    return 2;
  }

  if (/(dark|horror|revenge|murder|war)/.test(text)) {
    return -0.5;
  }

  return 0.75;
}

function scoreCandidate(candidate: SelectionCandidate, mode: SelectionMode) {
  const baseScore =
    candidate.feedbacks.reduce((total, feedback) => {
      if (feedback.interest === "INTERESTED") {
        total += 3;
      }

      if (feedback.interest === "NOT_INTERESTED") {
        total -= 3;
      }

      if (feedback.seenState === "UNSEEN") {
        total += 1.5;
      }

      if (feedback.seenState === "SEEN") {
        total -= 0.5;
      }

      if (feedback.wouldRewatch) {
        total += 0.5;
      }

      return total;
    }, 0) + (candidate.movie.tmdbVoteAverage ?? 0) / 5;

  switch (mode) {
    case SelectionMode.RANDOM:
      return baseScore + Math.random() * 5;
    case SelectionMode.GENRE:
      return baseScore + ((candidate.movie.genres as { name?: string }[] | null)?.length ?? 0);
    case SelectionMode.DURATION:
      return baseScore + durationBias(candidate.movie.runtimeMinutes);
    case SelectionMode.MOOD:
      return baseScore + moodBias(candidate.movie.overview);
    case SelectionMode.MANUAL:
      return baseScore + 0.25;
    case SelectionMode.AUTOMATIC:
    default:
      return baseScore + 1;
  }
}

function selectionSummary(mode: SelectionMode) {
  switch (mode) {
    case SelectionMode.MANUAL:
      return "Manual mode ranked the current candidates so the group can still make the final call.";
    case SelectionMode.RANDOM:
      return "Random mode uses a light weighting on group sentiment to keep the draw fun but not chaotic.";
    case SelectionMode.GENRE:
      return "Genre mode favors titles with richer genre metadata and stronger group sentiment.";
    case SelectionMode.DURATION:
      return "Duration mode leans toward easier-to-start runtimes for group viewing.";
    case SelectionMode.MOOD:
      return "Mood mode currently uses a simple overview-based heuristic and should improve over time.";
    case SelectionMode.AUTOMATIC:
    default:
      return "Automatic mode ranks titles from feedback, unseen status and TMDB score.";
  }
}

export async function runSelection(userId: string, listId: string, mode: SelectionMode) {
  const list = await db.movieList.findFirst({
    where: {
      id: listId,
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      items: {
        include: {
          movie: true,
          feedbacks: true,
        },
      },
    },
  });

  if (!list) {
    throw new Error("List not found.");
  }

  if (!list.items.length) {
    throw new Error("Add at least one movie before running a selection.");
  }

  const ranked = list.items
    .map((item) => ({
      item,
      score: scoreCandidate(item, mode),
    }))
    .sort((left, right) => right.score - left.score);

  const topSelection = ranked[0];

  const run = await db.selectionRun.create({
    data: {
      listId,
      initiatedById: userId,
      mode,
      summary: selectionSummary(mode),
      criteria: {
        version: 1,
        mode,
      },
      results: {
        create: ranked.slice(0, 5).map(({ item, score }, index) => ({
          listItemId: item.id,
          rank: index + 1,
          score,
          selected: item.id === topSelection.item.id,
          rationale: {
            feedbackCount: item.feedbacks.length,
          },
        })),
      },
    },
    include: {
      results: true,
    },
  });

  await logActivity({
    listId,
    actorId: userId,
    event: "selection.run.completed",
    payload: {
      runId: run.id,
      mode,
      selectedListItemId: topSelection.item.id,
    },
  });

  await realtimeBroker.publish({
    channel: `list:${listId}`,
    event: "selection.run.completed",
    payload: {
      runId: run.id,
      selectedListItemId: topSelection.item.id,
      mode,
    },
    occurredAt: new Date().toISOString(),
  });

  return run;
}
