import { PresenceState, WatchSessionType } from "@/generated/prisma/client";
import { realtimeBroker } from "@/server/realtime/broker";
import { db } from "@/server/db";
import { logActivity } from "@/server/services/activity-log";
import {
  getActiveStreamingProviderConfig,
  resolvePlaybackSource,
} from "@/server/services/streaming";

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

  const session = await db.watchSession.create({
    data: {
      listId: listItem.listId,
      listItemId: listItem.id,
      movieId: listItem.movieId,
      startedById: input.userId,
      type: input.type,
      status: "PENDING",
      streamingProvider: activeProvider?.provider,
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

    await db.watchSession.update({
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
  const session = await db.watchSession.findFirst({
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
    include: {
      list: true,
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
    },
  });

  if (!session) {
    throw new Error("Watch session not found.");
  }

  return session;
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
