import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PlaybackCheckpointSource,
  PresenceState,
  StreamingProviderKey,
  WatchSessionStatus,
  WatchSessionType,
} from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  db: {
    movieListItem: {
      findFirst: vi.fn(),
    },
    watchSession: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    watchSessionMember: {
      update: vi.fn(),
    },
    playbackCheckpoint: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  realtimeBroker: {
    publish: vi.fn(),
  },
  logActivity: vi.fn(),
  getActiveStreamingProviderConfig: vi.fn(),
  resolvePlaybackSource: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: mocks.db,
}));

vi.mock("@/server/realtime/broker", () => ({
  realtimeBroker: mocks.realtimeBroker,
}));

vi.mock("@/server/services/activity-log", () => ({
  logActivity: mocks.logActivity,
}));

vi.mock("@/server/services/streaming", () => ({
  getActiveStreamingProviderConfig: mocks.getActiveStreamingProviderConfig,
  resolvePlaybackSource: mocks.resolvePlaybackSource,
}));

import { createWatchSession, recordPlaybackEvent } from "@/server/services/watch-service";

describe("watch-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.db.movieListItem.findFirst.mockResolvedValue({
      id: "list-item-1",
      listId: "list-1",
      movieId: "movie-1",
      movie: {
        id: "movie-1",
        tmdbId: 42,
      },
      list: {
        members: [{ userId: "user-1" }, { userId: "user-2" }],
      },
    });

    mocks.getActiveStreamingProviderConfig.mockResolvedValue({
      provider: StreamingProviderKey.VIXSRC,
    });

    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback({
        watchSession: mocks.db.watchSession,
        watchSessionMember: mocks.db.watchSessionMember,
        playbackCheckpoint: mocks.db.playbackCheckpoint,
      }),
    );
  });

  it("filters invited members and returns the updated session after playback resolution", async () => {
    const createdSession = {
      id: "session-1",
      streamingPlaybackUrl: null,
      groupState: { kind: "unavailable" },
    };
    const updatedSession = {
      ...createdSession,
      streamingPlaybackUrl: "https://player.example.com/embed/42",
      groupState: {
        kind: "embed",
        url: "https://player.example.com/embed/42",
      },
    };

    mocks.db.watchSession.create.mockResolvedValue(createdSession);
    mocks.resolvePlaybackSource.mockResolvedValue(updatedSession.groupState);
    mocks.db.watchSession.update.mockResolvedValue(updatedSession);

    const result = await createWatchSession({
      userId: "user-1",
      listItemId: "list-item-1",
      type: WatchSessionType.GROUP,
      memberIds: ["user-1", "user-2", "intruder"],
    });

    const [{ data }] = mocks.db.watchSession.create.mock.calls[0];
    expect(data.members.create).toEqual([
      {
        userId: "user-1",
        isHost: true,
        presence: "JOINED",
        joinedAt: expect.any(Date),
      },
      {
        userId: "user-2",
        presence: "INVITED",
      },
    ]);

    expect(mocks.db.watchSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "session-1",
        },
        data: expect.objectContaining({
          streamingPlaybackUrl: "https://player.example.com/embed/42",
        }),
      }),
    );

    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        listId: "list-1",
        event: "watch.session.created",
      }),
    );

    expect(mocks.realtimeBroker.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "watch:session-1",
        event: "watch.session.created",
      }),
    );

    expect(result).toMatchObject(updatedSession);
  });

  it("records automatic heartbeat progress from iframe timeupdate events", async () => {
    const startedAt = new Date("2026-03-10T12:00:00.000Z");
    const joinedAt = new Date("2026-03-10T12:01:00.000Z");

    mocks.db.watchSession.findFirst.mockResolvedValue({
      id: "session-1",
      listId: "list-1",
      listItemId: "list-item-1",
      movieId: "movie-1",
      type: WatchSessionType.SOLO,
      status: WatchSessionStatus.LIVE,
      startedAt,
      endedAt: null,
      groupState: {
        kind: "embed",
        url: "https://player.example.com/embed/42",
      },
      listItem: {
        movie: {
          tmdbId: 42,
        },
      },
      members: [
        {
          userId: "user-1",
          presence: PresenceState.JOINED,
          joinedAt,
          leftAt: null,
        },
      ],
    });
    mocks.db.playbackCheckpoint.findFirst.mockResolvedValue({
      positionSeconds: 40,
    });

    const result = await recordPlaybackEvent({
      sessionId: "session-1",
      userId: "user-1",
      event: "timeupdate",
      currentTime: 95.2,
      duration: 128.9,
      videoId: 42,
    });

    expect(mocks.db.watchSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session-1" },
        data: expect.objectContaining({
          resumeFromSeconds: 95,
          status: WatchSessionStatus.LIVE,
          endedAt: null,
          groupState: expect.objectContaining({
            kind: "embed",
            lastPlayerEvent: expect.objectContaining({
              event: "timeupdate",
              currentTime: 95,
              duration: 128,
              videoId: 42,
            }),
          }),
        }),
      }),
    );

    expect(mocks.db.watchSessionMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          watchSessionId_userId: {
            watchSessionId: "session-1",
            userId: "user-1",
          },
        },
        data: expect.objectContaining({
          presence: PresenceState.JOINED,
          currentPositionSeconds: 95,
          joinedAt,
          leftAt: null,
        }),
      }),
    );

    expect(mocks.db.playbackCheckpoint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          watchSessionId: "session-1",
          userId: "user-1",
          positionSeconds: 95,
          source: PlaybackCheckpointSource.AUTO_HEARTBEAT,
        }),
      }),
    );

    expect(result).toEqual({
      status: WatchSessionStatus.LIVE,
      resumeFromSeconds: 95,
      currentPositionSeconds: 95,
      checkpointSaved: true,
    });
  });

  it("marks a solo watch session as ended when the iframe reports ended", async () => {
    const startedAt = new Date("2026-03-10T12:00:00.000Z");
    const joinedAt = new Date("2026-03-10T12:01:00.000Z");

    mocks.db.watchSession.findFirst.mockResolvedValue({
      id: "session-2",
      listId: "list-1",
      listItemId: "list-item-1",
      movieId: "movie-1",
      type: WatchSessionType.SOLO,
      status: WatchSessionStatus.LIVE,
      startedAt,
      endedAt: null,
      groupState: {
        kind: "embed",
        url: "https://player.example.com/embed/42",
      },
      listItem: {
        movie: {
          tmdbId: 42,
        },
      },
      members: [
        {
          userId: "user-1",
          presence: PresenceState.JOINED,
          joinedAt,
          leftAt: null,
        },
      ],
    });
    mocks.db.playbackCheckpoint.findFirst.mockResolvedValue({
      positionSeconds: 118,
    });

    const result = await recordPlaybackEvent({
      sessionId: "session-2",
      userId: "user-1",
      event: "ended",
      currentTime: 126,
      duration: 126,
      videoId: 42,
    });

    expect(mocks.db.watchSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session-2" },
        data: expect.objectContaining({
          resumeFromSeconds: 126,
          status: WatchSessionStatus.ENDED,
          endedAt: expect.any(Date),
          groupState: expect.objectContaining({
            kind: "embed",
            lastPlayerEvent: expect.objectContaining({
              event: "ended",
              currentTime: 126,
            }),
          }),
        }),
      }),
    );

    expect(mocks.db.watchSessionMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          watchSessionId_userId: {
            watchSessionId: "session-2",
            userId: "user-1",
          },
        },
        data: expect.objectContaining({
          presence: PresenceState.LEFT,
          currentPositionSeconds: 126,
          joinedAt,
          leftAt: expect.any(Date),
        }),
      }),
    );

    expect(mocks.db.playbackCheckpoint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          watchSessionId: "session-2",
          userId: "user-1",
          positionSeconds: 126,
          source: PlaybackCheckpointSource.SESSION_END,
        }),
      }),
    );

    expect(result).toEqual({
      status: WatchSessionStatus.ENDED,
      resumeFromSeconds: 126,
      currentPositionSeconds: 126,
      checkpointSaved: true,
    });
  });
});
