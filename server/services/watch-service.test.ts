import { beforeEach, describe, expect, it, vi } from "vitest";

import { StreamingProviderKey, WatchSessionType } from "@/generated/prisma/client";

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

import { createWatchSession } from "@/server/services/watch-service";

describe("watch-service", () => {
  beforeEach(() => {
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
});
