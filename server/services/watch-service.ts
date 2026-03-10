import {
  PlaybackCheckpointSource,
  PresenceState,
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
      startedAt,
      lastEventAt: startedAt,
      groupState: {
        kind: "unavailable",
        message:
          "This session is active for watch tracking. Playback stays in each member's own player unless a compliant deployment-specific provider adapter is configured.",
      },
      members: {
        create: [
          {
            userId: input.userId,
            isHost: true,
            presence: "JOINED",
            joinedAt: new Date(),
          },
          ...invitedMemberIds
            .filter((memberId) => memberId !== input.userId)
            .map((memberId) => ({
              userId: memberId,
              presence:
                input.type === WatchSessionType.GROUP
                  ? PresenceState.INVITED
                  : PresenceState.JOINED,
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

  return session;
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
  });

  if (!session) {
    throw new Error("Watch session not found.");
  }

  const checkpoint = await db.$transaction(async (tx) => {
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
        lastEventAt: new Date(),
        status: "LIVE",
      },
    });

    await tx.watchSessionMember.update({
      where: {
        watchSessionId_userId: {
          watchSessionId: session.id,
          userId: input.userId,
        },
      },
      data: {
        presence: "JOINED",
        currentPositionSeconds: input.positionSeconds,
        lastHeartbeatAt: new Date(),
      },
    });

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
  let nextPresence = member.presence;
  let leftAt = member.leftAt;

  if (input.event === "play" || input.event === "seeked" || input.event === "timeupdate") {
    nextStatus = WatchSessionStatus.LIVE;
    endedAt = null;
    nextPresence = PresenceState.JOINED;
    leftAt = null;
  }

  if (input.event === "pause" && session.type === WatchSessionType.SOLO) {
    nextStatus = WatchSessionStatus.PAUSED;
  }

  if (input.event === "ended") {
    nextPresence = PresenceState.LEFT;
    leftAt = now;

    if (session.type === WatchSessionType.SOLO) {
      nextStatus = WatchSessionStatus.ENDED;
      endedAt = now;
    } else {
      const otherActiveMembers = session.members.filter(
        (candidate) =>
          candidate.userId !== input.userId &&
          candidate.presence !== PresenceState.INVITED &&
          candidate.presence !== PresenceState.LEFT,
      );

      if (!otherActiveMembers.length) {
        nextStatus = WatchSessionStatus.ENDED;
        endedAt = now;
      }
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

    await tx.watchSessionMember.update({
      where: {
        watchSessionId_userId: {
          watchSessionId: session.id,
          userId: input.userId,
        },
      },
      data: {
        presence: nextPresence,
        currentPositionSeconds: positionSeconds,
        joinedAt: member.joinedAt ?? now,
        leftAt,
        lastHeartbeatAt: now,
      },
    });

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
