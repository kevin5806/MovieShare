import {
  PlaybackCheckpointSource,
  PresenceState,
  WatchProgressState,
  WatchSessionStatus,
  WatchSessionType,
  type Prisma,
} from "@/generated/prisma/client";
import { realtimeBroker } from "@/server/realtime/broker";
import { db } from "@/server/db";
import { logActivity } from "@/server/services/activity-log";
import {
  getActiveStreamingProviderConfig,
  resolvePlaybackSource,
} from "@/server/services/streaming";

const watchSessionInclude = {
  list: true,
  startedBy: {
    include: {
      profile: true,
    },
  },
  listItem: {
    include: {
      movie: true,
      addedBy: true,
    },
  },
  members: {
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  },
  checkpoints: {
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: {
      savedAt: "desc",
    },
    take: 10,
  },
} satisfies Prisma.WatchSessionInclude;

const AUTO_TRACKING_CHECKPOINT_MIN_DELTA_SECONDS = 30;
const AUTO_TRACKING_PAUSE_DELTA_SECONDS = 15;
const WATCH_COMPLETION_HEAD_TOLERANCE_SECONDS = 90;
const WATCH_COMPLETION_TAIL_TOLERANCE_SECONDS = 120;
const WATCH_COMPLETION_TOTAL_TOLERANCE_SECONDS = 180;
const WATCH_RANGE_MERGE_TOLERANCE_SECONDS = 5;

export type PlaybackTrackingEventName =
  | "play"
  | "pause"
  | "seeked"
  | "ended"
  | "timeupdate";

function clampTrackedSeconds(currentTime: number, duration = 0) {
  const safeCurrentTime = Number.isFinite(currentTime) ? Math.max(0, Math.floor(currentTime)) : 0;
  const safeDuration = Number.isFinite(duration) ? Math.max(0, Math.floor(duration)) : 0;

  if (!safeDuration) {
    return safeCurrentTime;
  }

  return Math.min(safeCurrentTime, safeDuration);
}

function getGroupStateRecord(groupState: Prisma.JsonValue | null) {
  if (groupState && typeof groupState === "object" && !Array.isArray(groupState)) {
    return groupState as Prisma.JsonObject;
  }

  return {} as Prisma.JsonObject;
}

type CoveredRange = {
  fromSeconds: number;
  toSeconds: number;
};

function normalizeCoveredRange(input: CoveredRange) {
  const fromSeconds = Math.max(0, Math.floor(input.fromSeconds));
  const toSeconds = Math.max(fromSeconds, Math.floor(input.toSeconds));

  return {
    fromSeconds,
    toSeconds,
  };
}

function parseCoveredRanges(input: Prisma.JsonValue | null) {
  if (!Array.isArray(input)) {
    return [] as CoveredRange[];
  }

  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const candidate = entry as { fromSeconds?: unknown; toSeconds?: unknown };
      const fromSeconds = Number(candidate.fromSeconds);
      const toSeconds = Number(candidate.toSeconds);

      if (!Number.isFinite(fromSeconds) || !Number.isFinite(toSeconds)) {
        return null;
      }

      return normalizeCoveredRange({
        fromSeconds,
        toSeconds,
      });
    })
    .filter((entry): entry is CoveredRange => Boolean(entry))
    .sort((left, right) => left.fromSeconds - right.fromSeconds);
}

function mergeCoveredRanges(existing: CoveredRange[], nextRange: CoveredRange | null) {
  const normalizedExisting = existing.map(normalizeCoveredRange);
  const ranges = nextRange ? [...normalizedExisting, normalizeCoveredRange(nextRange)] : normalizedExisting;

  if (!ranges.length) {
    return [] as CoveredRange[];
  }

  const sorted = ranges.sort((left, right) => left.fromSeconds - right.fromSeconds);
  const merged: CoveredRange[] = [sorted[0]];

  for (const range of sorted.slice(1)) {
    const previous = merged[merged.length - 1];

    if (range.fromSeconds <= previous.toSeconds + WATCH_RANGE_MERGE_TOLERANCE_SECONDS) {
      previous.toSeconds = Math.max(previous.toSeconds, range.toSeconds);
      continue;
    }

    merged.push(range);
  }

  return merged;
}

function getCoveredSeconds(ranges: CoveredRange[]) {
  return ranges.reduce((total, range) => total + (range.toSeconds - range.fromSeconds), 0);
}

function getRuntimeSeconds(input: { runtimeMinutes?: number | null }, fallbackDurationSeconds = 0) {
  if (input.runtimeMinutes && input.runtimeMinutes > 0) {
    return input.runtimeMinutes * 60;
  }

  return Math.max(0, Math.floor(fallbackDurationSeconds));
}

function deriveWatchProgressState(input: {
  ranges: CoveredRange[];
  lastPositionSeconds: number;
  runtimeSeconds: number;
}) {
  if (!input.ranges.length && input.lastPositionSeconds <= 0) {
    return WatchProgressState.NOT_STARTED;
  }

  if (!input.runtimeSeconds) {
    return WatchProgressState.IN_PROGRESS;
  }

  const firstRange = input.ranges[0] ?? null;
  const lastRange = input.ranges.at(-1) ?? null;
  const coveredSeconds = getCoveredSeconds(input.ranges);
  const startsNearBeginning =
    firstRange?.fromSeconds != null &&
    firstRange.fromSeconds <= WATCH_COMPLETION_HEAD_TOLERANCE_SECONDS;
  const reachesEnding =
    lastRange?.toSeconds != null &&
    lastRange.toSeconds >= input.runtimeSeconds - WATCH_COMPLETION_TAIL_TOLERANCE_SECONDS;
  const coversAlmostEverything =
    coveredSeconds >= Math.max(input.runtimeSeconds - WATCH_COMPLETION_TOTAL_TOLERANCE_SECONDS, 0);

  if (startsNearBeginning && reachesEnding && coversAlmostEverything) {
    return WatchProgressState.COMPLETED;
  }

  return WatchProgressState.IN_PROGRESS;
}

type SessionMemberSnapshot = {
  userId: string;
  presence: PresenceState;
  joinedAt: Date | null;
  leftAt: Date | null;
  currentPositionSeconds: number;
  activeSegmentStartSeconds: number | null;
};

function getTrackedSessionMembers(
  members: SessionMemberSnapshot[],
  sessionType: WatchSessionType,
  actingUserId: string,
) {
  if (sessionType === WatchSessionType.SOLO) {
    return members.filter((member) => member.userId === actingUserId);
  }

  const activeMembers = members.filter(
    (member) =>
      member.presence !== PresenceState.INVITED && member.presence !== PresenceState.LEFT,
  );

  if (activeMembers.some((member) => member.userId === actingUserId)) {
    return activeMembers;
  }

  const actingMember = members.find((member) => member.userId === actingUserId);

  return actingMember ? [...activeMembers, actingMember] : activeMembers;
}

async function upsertMovieWatchProgress(
  tx: Prisma.TransactionClient,
  input: {
    listItemId: string;
    movieId: string;
    movieRuntimeMinutes?: number | null;
    userId: string;
    watchSessionId: string;
    lastPositionSeconds: number;
    occurredAt: Date;
    durationSeconds?: number;
    nextRange?: CoveredRange | null;
  },
) {
  const existing = await tx.movieWatchProgress.findUnique({
    where: {
      listItemId_userId: {
        listItemId: input.listItemId,
        userId: input.userId,
      },
    },
  });
  const mergedRanges = mergeCoveredRanges(
    parseCoveredRanges(existing?.coveredRanges ?? null),
    input.nextRange ?? null,
  );
  const runtimeSeconds = getRuntimeSeconds(
    {
      runtimeMinutes: input.movieRuntimeMinutes,
    },
    input.durationSeconds ?? 0,
  );
  const completionState = deriveWatchProgressState({
    ranges: mergedRanges,
    lastPositionSeconds: input.lastPositionSeconds,
    runtimeSeconds,
  });

  return tx.movieWatchProgress.upsert({
    where: {
      listItemId_userId: {
        listItemId: input.listItemId,
        userId: input.userId,
      },
    },
    update: {
      completionState,
      lastPositionSeconds: input.lastPositionSeconds,
      coveredRanges: mergedRanges as Prisma.InputJsonValue,
      lastWatchedAt: input.occurredAt,
      lastWatchSessionId: input.watchSessionId,
      startedAt:
        existing?.startedAt ??
        (input.lastPositionSeconds > 0 || mergedRanges.length ? input.occurredAt : null),
      completedAt:
        completionState === WatchProgressState.COMPLETED
          ? existing?.completedAt ?? input.occurredAt
          : null,
    },
    create: {
      listItemId: input.listItemId,
      movieId: input.movieId,
      userId: input.userId,
      completionState,
      lastPositionSeconds: input.lastPositionSeconds,
      coveredRanges: mergedRanges as Prisma.InputJsonValue,
      lastWatchedAt: input.occurredAt,
      lastWatchSessionId: input.watchSessionId,
      startedAt:
        input.lastPositionSeconds > 0 || mergedRanges.length ? input.occurredAt : null,
      completedAt:
        completionState === WatchProgressState.COMPLETED ? input.occurredAt : null,
    },
  });
}

export async function createWatchSession(input: {
  userId: string;
  listItemId: string;
  type: WatchSessionType;
  memberIds?: string[];
}) {
  const listItem = await db.movieListItem.findFirst({
    where: {
      id: input.listItemId,
      list: {
        members: {
          some: {
            userId: input.userId,
          },
        },
      },
    },
    include: {
      movie: true,
      list: {
        include: {
          members: true,
        },
      },
    },
  });

  if (!listItem) {
    throw new Error("Movie item not found.");
  }

  const allowedMemberIds = new Set(listItem.list.members.map((member) => member.userId));
  const invitedMemberIds = (input.memberIds ?? []).filter((memberId) =>
    allowedMemberIds.has(memberId),
  );
  const existingProgress = await db.movieWatchProgress.findMany({
    where: {
      listItemId: listItem.id,
      userId: {
        in: [...new Set([input.userId, ...invitedMemberIds])],
      },
    },
    select: {
      lastPositionSeconds: true,
    },
  });
  const suggestedResumeFromSeconds = Math.max(
    0,
    ...existingProgress.map((progress) => progress.lastPositionSeconds),
  );

  const activeProvider = await getActiveStreamingProviderConfig();
  const startedAt = new Date();

  let session = await db.watchSession.create({
    data: {
      listId: listItem.listId,
      listItemId: listItem.id,
      movieId: listItem.movieId,
      startedById: input.userId,
      type: input.type,
      status: "LIVE",
      streamingProvider: activeProvider?.provider,
      resumeFromSeconds: suggestedResumeFromSeconds,
      startedAt,
      lastEventAt: startedAt,
      groupState: {
        kind: "unavailable",
        message:
          "This watch entry tracks who watched together and how far each person got. Playback stays in each member's own player unless a compatible deployment-specific provider adapter is configured.",
      },
      members: {
        create: [
          {
            userId: input.userId,
            isHost: true,
            presence: "JOINED",
            joinedAt: new Date(),
            currentPositionSeconds: suggestedResumeFromSeconds,
            activeSegmentStartSeconds: suggestedResumeFromSeconds,
          },
          ...invitedMemberIds
            .filter((memberId) => memberId !== input.userId)
            .map((memberId) => ({
              userId: memberId,
              presence: PresenceState.JOINED,
              joinedAt: input.type === WatchSessionType.GROUP ? new Date() : undefined,
              currentPositionSeconds: suggestedResumeFromSeconds,
              activeSegmentStartSeconds:
                input.type === WatchSessionType.GROUP ? suggestedResumeFromSeconds : undefined,
            })),
        ],
      },
    },
  });

  if (activeProvider) {
    const playback = await resolvePlaybackSource({
      provider: activeProvider.provider,
      tmdbId: listItem.movie.tmdbId,
      watchSessionId: session.id,
    });

    session = await db.watchSession.update({
      where: {
        id: session.id,
      },
      data: {
        streamingPlaybackUrl: playback.kind === "embed" ? playback.url : null,
        groupState: playback,
      },
    });
  }

  await logActivity({
    listId: listItem.listId,
    actorId: input.userId,
    event: "watch.session.created",
    payload: {
      watchSessionId: session.id,
      type: input.type,
      resumeFromSeconds: suggestedResumeFromSeconds,
      participantCount: 1 + invitedMemberIds.filter((memberId) => memberId !== input.userId).length,
    },
  });

  await realtimeBroker.publish({
    channel: `watch:${session.id}`,
    event: "watch.session.created",
    payload: {
      watchSessionId: session.id,
      type: input.type,
    },
    occurredAt: new Date().toISOString(),
  });

  return session;
}

export async function getWatchSession(sessionId: string, userId: string) {
  let session = await db.watchSession.findFirst({
    where: {
      id: sessionId,
      list: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    include: watchSessionInclude,
  });

  if (!session) {
    throw new Error("Watch session not found.");
  }

  if (!session.streamingPlaybackUrl && session.streamingProvider) {
    const playback = await resolvePlaybackSource({
      provider: session.streamingProvider,
      tmdbId: session.listItem.movie.tmdbId,
      watchSessionId: session.id,
    });

    const currentGroupState = JSON.stringify(session.groupState ?? null);
    const nextGroupState = JSON.stringify(playback);

    if (playback.kind === "embed" || currentGroupState !== nextGroupState) {
      session = await db.watchSession.update({
        where: {
          id: session.id,
        },
        data: {
          streamingPlaybackUrl: playback.kind === "embed" ? playback.url : null,
          groupState: playback,
        },
        include: watchSessionInclude,
      });
    }
  }

  const [progressRows, historyRows] = await Promise.all([
    db.movieWatchProgress.findMany({
      where: {
        listItemId: session.listItemId,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: [
        {
          completionState: "desc",
        },
        {
          lastWatchedAt: "desc",
        },
      ],
    }),
    db.watchSession.findMany({
      where: {
        listItemId: session.listItemId,
      },
      include: {
        startedBy: {
          include: {
            profile: true,
          },
        },
        members: {
          where: {
            presence: PresenceState.JOINED,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
  ]);

  const progressBoard = progressRows.map((progress) => ({
    id: progress.id,
    userId: progress.userId,
    userName: progress.user.profile?.displayName || progress.user.name,
    completionState: progress.completionState,
    lastPositionSeconds: progress.lastPositionSeconds,
    lastWatchedAt: progress.lastWatchedAt,
    startedAt: progress.startedAt,
    completedAt: progress.completedAt,
  }));
  const aggregateProgress = {
    startedCount: progressBoard.filter((row) => row.completionState !== WatchProgressState.NOT_STARTED).length,
    completedCount: progressBoard.filter((row) => row.completionState === WatchProgressState.COMPLETED).length,
    inProgressCount: progressBoard.filter((row) => row.completionState === WatchProgressState.IN_PROGRESS).length,
    notStartedCount: Math.max(
      0,
      session.members.length -
        progressBoard.filter((row) => row.completionState !== WatchProgressState.NOT_STARTED).length,
    ),
  };

  const history = historyRows.map((entry) => ({
    id: entry.id,
    type: entry.type,
    status: entry.status,
    resumeFromSeconds: entry.resumeFromSeconds,
    startedAt: entry.startedAt ?? entry.createdAt,
    endedAt: entry.endedAt,
    participantCount: entry.members.length,
    startedByName: entry.startedBy.profile?.displayName || entry.startedBy.name,
  }));

  return {
    ...session,
    progressBoard,
    aggregateProgress,
    history,
  };
}

export async function getWatchSessionsOverview(userId: string) {
  const sessions = await db.watchSession.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      list: true,
      listItem: {
        include: {
          movie: true,
        },
      },
      startedBy: {
        include: {
          profile: true,
        },
      },
      members: {
        where: {
          presence: "JOINED",
        },
      },
      checkpoints: {
        where: {
          userId,
        },
        orderBy: {
          savedAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 12,
  });

  const liveSessions = sessions.filter((session) => session.status === "LIVE");
  const recentSessions = sessions.filter((session) => session.status !== "LIVE");

  return {
    liveSessions,
    recentSessions,
    counts: {
      total: sessions.length,
      live: liveSessions.length,
      history: recentSessions.length,
      withEmbeds: sessions.filter((session) => Boolean(session.streamingPlaybackUrl)).length,
    },
  };
}

export async function savePlaybackCheckpoint(input: {
  sessionId: string;
  userId: string;
  positionSeconds: number;
}) {
  const session = await db.watchSession.findFirst({
    where: {
      id: input.sessionId,
      members: {
        some: {
          userId: input.userId,
        },
      },
    },
    include: {
      listItem: {
        include: {
          movie: true,
        },
      },
      members: true,
    },
  });

  if (!session) {
    throw new Error("Watch session not found.");
  }

  const checkpoint = await db.$transaction(async (tx) => {
    const now = new Date();
    const trackedMembers = getTrackedSessionMembers(
      session.members,
      session.type,
      input.userId,
    );
    const created = await tx.playbackCheckpoint.create({
      data: {
        watchSessionId: session.id,
        listItemId: session.listItemId,
        movieId: session.movieId,
        userId: input.userId,
        positionSeconds: input.positionSeconds,
        source: "MANUAL",
      },
    });

    await tx.watchSession.update({
      where: {
        id: session.id,
      },
      data: {
        resumeFromSeconds: input.positionSeconds,
        lastEventAt: now,
        status: "LIVE",
      },
    });

    for (const trackedMember of trackedMembers) {
      await tx.watchSessionMember.update({
        where: {
          watchSessionId_userId: {
            watchSessionId: session.id,
            userId: trackedMember.userId,
          },
        },
        data: {
          presence: "JOINED",
          activeSegmentStartSeconds: input.positionSeconds,
          currentPositionSeconds: input.positionSeconds,
          joinedAt: trackedMember.joinedAt ?? now,
          leftAt: null,
          lastHeartbeatAt: now,
        },
      });

      await upsertMovieWatchProgress(tx, {
        listItemId: session.listItemId,
        movieId: session.movieId,
        movieRuntimeMinutes: session.listItem.movie.runtimeMinutes,
        userId: trackedMember.userId,
        watchSessionId: session.id,
        lastPositionSeconds: input.positionSeconds,
        occurredAt: now,
      });
    }

    return created;
  });

  await realtimeBroker.publish({
    channel: `watch:${session.id}`,
    event: "watch.session.checkpoint.saved",
    payload: {
      positionSeconds: input.positionSeconds,
      userId: input.userId,
    },
    occurredAt: new Date().toISOString(),
  });

  return checkpoint;
}

export async function recordPlaybackEvent(input: {
  sessionId: string;
  userId: string;
  event: PlaybackTrackingEventName;
  currentTime: number;
  duration?: number;
  videoId: number;
}) {
  const [session, lastCheckpoint] = await Promise.all([
    db.watchSession.findFirst({
      where: {
        id: input.sessionId,
        members: {
          some: {
            userId: input.userId,
          },
        },
      },
      include: {
        listItem: {
          include: {
            movie: true,
          },
        },
        members: true,
      },
    }),
    db.playbackCheckpoint.findFirst({
      where: {
        watchSessionId: input.sessionId,
        userId: input.userId,
      },
      orderBy: {
        savedAt: "desc",
      },
    }),
  ]);

  if (!session) {
    throw new Error("Watch session not found.");
  }

  if (session.listItem.movie.tmdbId !== input.videoId) {
    throw new Error("Playback event does not match the current movie.");
  }

  const member = session.members.find((candidate) => candidate.userId === input.userId);

  if (!member) {
    throw new Error("Watch session member not found.");
  }

  const now = new Date();
  const positionSeconds = clampTrackedSeconds(input.currentTime, input.duration ?? 0);
  const durationSeconds = clampTrackedSeconds(input.duration ?? 0);
  const trackedMembers = getTrackedSessionMembers(session.members, session.type, input.userId);
  const statePayload = {
    event: input.event,
    currentTime: positionSeconds,
    duration: durationSeconds,
    videoId: input.videoId,
    occurredAt: now.toISOString(),
  };
  const groupState = {
    ...getGroupStateRecord(session.groupState),
    lastPlayerEvent: statePayload,
  } satisfies Prisma.JsonObject;

  let nextStatus = session.status;
  let endedAt = session.endedAt;
  if (input.event === "play" || input.event === "seeked" || input.event === "timeupdate") {
    nextStatus = WatchSessionStatus.LIVE;
    endedAt = null;
  }

  if (input.event === "pause" && session.type === WatchSessionType.SOLO) {
    nextStatus = WatchSessionStatus.PAUSED;
  }

  if (input.event === "ended") {
    if (session.type === WatchSessionType.SOLO) {
      nextStatus = WatchSessionStatus.ENDED;
      endedAt = now;
    } else {
      nextStatus = WatchSessionStatus.ENDED;
      endedAt = now;
    }
  }

  const checkpointDelta = Math.abs((lastCheckpoint?.positionSeconds ?? 0) - positionSeconds);
  const shouldCreateAutoCheckpoint =
    (input.event === "timeupdate" &&
      (!lastCheckpoint || checkpointDelta >= AUTO_TRACKING_CHECKPOINT_MIN_DELTA_SECONDS)) ||
    ((input.event === "pause" || input.event === "seeked") &&
      (!lastCheckpoint || checkpointDelta >= AUTO_TRACKING_PAUSE_DELTA_SECONDS));
  const checkpointSource =
    input.event === "ended"
      ? PlaybackCheckpointSource.SESSION_END
      : shouldCreateAutoCheckpoint
        ? PlaybackCheckpointSource.AUTO_HEARTBEAT
        : null;

  const result = await db.$transaction(async (tx) => {
    await tx.watchSession.update({
      where: {
        id: session.id,
      },
      data: {
        resumeFromSeconds: positionSeconds,
        lastEventAt: now,
        status: nextStatus,
        startedAt: session.startedAt ?? now,
        endedAt,
        groupState,
      },
    });

    for (const trackedMember of trackedMembers) {
      const previousPositionSeconds = trackedMember.currentPositionSeconds;
      const activeSegmentStartSeconds =
        trackedMember.activeSegmentStartSeconds ??
        (input.event === "play" || input.event === "timeupdate"
          ? previousPositionSeconds
          : null);
      let nextPresence = trackedMember.presence;
      let leftAt = trackedMember.leftAt;
      let nextActiveSegmentStartSeconds = trackedMember.activeSegmentStartSeconds;
      let nextCoveredRange: CoveredRange | null = null;

      if (activeSegmentStartSeconds != null) {
        const segmentEndSeconds =
          input.event === "seeked" ? previousPositionSeconds : positionSeconds;

        if (
          (input.event === "pause" ||
            input.event === "seeked" ||
            input.event === "ended" ||
            input.event === "timeupdate") &&
          segmentEndSeconds > activeSegmentStartSeconds
        ) {
          nextCoveredRange = {
            fromSeconds: activeSegmentStartSeconds,
            toSeconds: segmentEndSeconds,
          };
        }
      }

      if (input.event === "play" || input.event === "seeked" || input.event === "timeupdate") {
        nextPresence = PresenceState.JOINED;
        leftAt = null;
        nextActiveSegmentStartSeconds =
          input.event === "seeked"
            ? positionSeconds
            : activeSegmentStartSeconds ?? positionSeconds;
      }

      if (input.event === "pause") {
        nextActiveSegmentStartSeconds = null;
      }

      if (input.event === "ended") {
        nextPresence = PresenceState.LEFT;
        leftAt = now;
        nextActiveSegmentStartSeconds = null;
      }

      await tx.watchSessionMember.update({
        where: {
          watchSessionId_userId: {
            watchSessionId: session.id,
            userId: trackedMember.userId,
          },
        },
        data: {
          presence: nextPresence,
          activeSegmentStartSeconds: nextActiveSegmentStartSeconds,
          currentPositionSeconds: positionSeconds,
          joinedAt: trackedMember.joinedAt ?? now,
          leftAt,
          lastHeartbeatAt: now,
        },
      });

      await upsertMovieWatchProgress(tx, {
        listItemId: session.listItemId,
        movieId: session.movieId,
        movieRuntimeMinutes: session.listItem.movie.runtimeMinutes,
        userId: trackedMember.userId,
        watchSessionId: session.id,
        lastPositionSeconds: positionSeconds,
        occurredAt: now,
        durationSeconds,
        nextRange: nextCoveredRange,
      });
    }

    if (checkpointSource) {
      await tx.playbackCheckpoint.create({
        data: {
          watchSessionId: session.id,
          listItemId: session.listItemId,
          movieId: session.movieId,
          userId: input.userId,
          positionSeconds,
          source: checkpointSource,
        },
      });
    }

    return {
      status: nextStatus,
      resumeFromSeconds: positionSeconds,
      currentPositionSeconds: positionSeconds,
      checkpointSaved: Boolean(checkpointSource),
    };
  });

  return result;
}
