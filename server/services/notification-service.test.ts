import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    friendshipInvite: {
      findMany: vi.fn(),
    },
    movieListInvite: {
      findMany: vi.fn(),
    },
    activityLog: {
      findMany: vi.fn(),
    },
    watchSession: {
      findMany: vi.fn(),
    },
    notificationState: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/db", () => ({
  db: mocks.db,
}));

import {
  getNotificationsOverview,
  getNotificationSummary,
  markNotificationsRead,
} from "@/server/services/notification-service";

describe("notification-service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.db.friendshipInvite.findMany.mockResolvedValue([
      {
        id: "friend-1",
        createdAt: new Date("2026-03-09T10:00:00.000Z"),
        message: "Join my circle",
        sender: {
          name: "Alice",
          profile: {
            displayName: "Alice A.",
          },
        },
      },
    ]);
    mocks.db.movieListInvite.findMany.mockResolvedValue([
      {
        id: "list-1",
        token: "token-1",
        updatedAt: new Date("2026-03-09T11:00:00.000Z"),
        list: {
          name: "Friday Night",
        },
        sender: {
          name: "Bob",
          profile: null,
        },
      },
    ]);
    mocks.db.activityLog.findMany.mockResolvedValue([
      {
        id: "activity-1",
        event: "list.item.added",
        createdAt: new Date("2026-03-09T09:00:00.000Z"),
        list: {
          name: "Friday Night",
          slug: "friday-night",
        },
        actorUser: {
          name: "Cara",
          profile: null,
        },
      },
    ]);
    mocks.db.watchSession.findMany.mockResolvedValue([
      {
        id: "session-1",
        updatedAt: new Date("2026-03-09T12:00:00.000Z"),
        list: {
          name: "Friday Night",
        },
        listItem: {
          movie: {
            title: "Arrival",
          },
        },
        members: [{ id: "member-1" }, { id: "member-2" }],
      },
    ]);
    mocks.db.notificationState.findMany.mockResolvedValue([
      {
        notificationKey: "activity:activity-1",
        readAt: new Date("2026-03-09T09:30:00.000Z"),
      },
    ]);
    mocks.db.$transaction.mockResolvedValue([]);
  });

  it("builds an inbox with persistent read state merged into derived notifications", async () => {
    const overview = await getNotificationsOverview({
      userId: "user-1",
      email: "user@example.com",
    });

    expect(overview.notifications).toHaveLength(4);
    expect(overview.notifications[0]).toMatchObject({
      key: "live_session:session-1",
      read: false,
    });
    expect(
      overview.notifications.find((notification) => notification.key === "activity:activity-1"),
    ).toMatchObject({
      read: true,
      href: "/lists/friday-night",
    });
    expect(overview.counts).toMatchObject({
      total: 4,
      unread: 3,
      read: 1,
      actionRequired: 3,
    });
  });

  it("reports the unread total used by the shell badge", async () => {
    const summary = await getNotificationSummary({
      userId: "user-1",
      email: "user@example.com",
    });

    expect(summary.total).toBe(3);
    expect(summary.liveSessions).toBe(1);
    expect(summary.friendInvites).toBe(1);
    expect(summary.listInvites).toBe(1);
  });

  it("marks a batch of notifications as read", async () => {
    const now = new Date("2026-03-09T15:00:00.000Z");
    vi.setSystemTime(now);

    await markNotificationsRead("user-1", ["friend_invite:friend-1", "list_invite:list-1"]);

    expect(mocks.db.notificationState.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.db.$transaction).toHaveBeenCalled();
  });
});
