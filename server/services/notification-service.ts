import {
  ListInviteKind,
  ListInviteStatus,
  NotificationCategory,
  WatchSessionStatus,
} from "@/generated/prisma/client";
import { db } from "@/server/db";
import { getEffectiveNotificationPreferences } from "@/server/services/notification-preference-service";

type NotificationKind = "friend_invite" | "list_invite" | "live_session" | "activity";

export type NotificationItem = {
  key: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  occurredAt: string;
  actionable: boolean;
  read: boolean;
  badgeLabel: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildNotificationKey(kind: NotificationKind, id: string) {
  return `${kind}:${id}`;
}

function isRead(readAt: Date | null | undefined, occurredAt: Date) {
  return Boolean(readAt && readAt >= occurredAt);
}

async function getNotificationDataset(input: { userId: string; email: string }) {
  const normalizedEmail = normalizeEmail(input.email);

  const [friendInvites, listInvites, recentActivity, liveSessions] = await Promise.all([
    db.friendshipInvite.findMany({
      where: {
        receiverId: input.userId,
        status: "PENDING",
      },
      include: {
        sender: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
    db.movieListInvite.findMany({
      where: {
        kind: {
          in: [ListInviteKind.APP_USER, ListInviteKind.EMAIL_LINK],
        },
        OR: [
          {
            invitedUserId: input.userId,
          },
          {
            email: normalizedEmail,
          },
        ],
        status: ListInviteStatus.PENDING,
      },
      include: {
        list: true,
        sender: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
    }),
    db.activityLog.findMany({
      where: {
        OR: [
          {
            actorId: input.userId,
          },
          {
            list: {
              members: {
                some: {
                  userId: input.userId,
                },
              },
            },
          },
        ],
      },
      include: {
        list: true,
        actorUser: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
    }),
    db.watchSession.findMany({
      where: {
        status: WatchSessionStatus.LIVE,
        members: {
          some: {
            userId: input.userId,
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
        members: {
          where: {
            presence: "JOINED",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 6,
    }),
  ]);

  return {
    friendInvites,
    listInvites,
    recentActivity,
    liveSessions,
  };
}

function buildNotificationItems(dataset: Awaited<ReturnType<typeof getNotificationDataset>>) {
  return [
    ...dataset.listInvites.map((invite) => ({
      key: buildNotificationKey("list_invite", invite.id),
      kind: "list_invite" as const,
      title: invite.list.name,
      body: `${invite.sender.profile?.displayName || invite.sender.name} invited you to join this list.`,
      href: `/invites/lists/${invite.token}`,
      actionable: true,
      badgeLabel: "List invite",
      occurredAt: invite.updatedAt,
    })),
    ...dataset.friendInvites.map((invite) => ({
      key: buildNotificationKey("friend_invite", invite.id),
      kind: "friend_invite" as const,
      title: invite.sender.profile?.displayName || invite.sender.name,
      body: invite.message
        ? `Sent you a friend invite: ${invite.message}`
        : "Sent you a friend invite.",
      href: "/profile",
      actionable: true,
      badgeLabel: "Friend invite",
      occurredAt: invite.createdAt,
    })),
    ...dataset.liveSessions.map((session) => ({
      key: buildNotificationKey("live_session", session.id),
      kind: "live_session" as const,
      title: session.listItem.movie.title,
      body: `${session.list.name} is live now with ${session.members.length} joined member${session.members.length === 1 ? "" : "s"}.`,
      href: `/watch/${session.id}`,
      actionable: true,
      badgeLabel: "Live session",
      occurredAt: session.updatedAt,
    })),
    ...dataset.recentActivity.map((activity) => {
      const actorName =
        activity.actorUser?.profile?.displayName || activity.actorUser?.name || "System";

      return {
        key: buildNotificationKey("activity", activity.id),
        kind: "activity" as const,
        title: activity.event.replaceAll(".", " "),
        body: `${actorName} in ${activity.list?.name || "system"}.`,
        href: activity.list ? `/lists/${activity.list.slug}` : "/dashboard",
        actionable: false,
        badgeLabel: "Activity",
        occurredAt: activity.createdAt,
      };
    }),
  ].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
}

async function getNotificationStateMap(userId: string, keys: string[]) {
  if (!keys.length) {
    return new Map<string, Date | null>();
  }

  const states = await db.notificationState.findMany({
    where: {
      userId,
      notificationKey: {
        in: keys,
      },
    },
  });

  return new Map(states.map((state) => [state.notificationKey, state.readAt]));
}

function getNotificationCategory(kind: NotificationKind) {
  if (kind === "list_invite") {
    return NotificationCategory.LIST_INVITES;
  }

  if (kind === "friend_invite") {
    return NotificationCategory.FRIEND_INVITES;
  }

  if (kind === "live_session") {
    return NotificationCategory.WATCH_SESSIONS;
  }

  return NotificationCategory.ACTIVITY_DIGEST;
}

async function filterInAppNotificationItems(
  userId: string,
  items: ReturnType<typeof buildNotificationItems>,
) {
  const preferences = await getEffectiveNotificationPreferences(userId);
  const preferenceMap = new Map(
    preferences.map((preference) => [
      preference.category,
      preference.effective.inAppEnabled,
    ] as const),
  );

  return items.filter((item) => preferenceMap.get(getNotificationCategory(item.kind)) !== false);
}

export async function getNotificationSummary(input: { userId: string; email: string }) {
  const dataset = await getNotificationDataset(input);
  const items = await filterInAppNotificationItems(
    input.userId,
    buildNotificationItems(dataset),
  );
  const stateMap = await getNotificationStateMap(
    input.userId,
    items.map((item) => item.key),
  );
  const unreadItems = items.filter((item) => !isRead(stateMap.get(item.key), item.occurredAt));

  return {
    friendInvites: unreadItems.filter((item) => item.kind === "friend_invite").length,
    listInvites: unreadItems.filter((item) => item.kind === "list_invite").length,
    liveSessions: unreadItems.filter((item) => item.kind === "live_session").length,
    total: unreadItems.length,
  };
}

export async function getNotificationsOverview(input: { userId: string; email: string }) {
  const dataset = await getNotificationDataset(input);
  const items = await filterInAppNotificationItems(
    input.userId,
    buildNotificationItems(dataset),
  );
  const stateMap = await getNotificationStateMap(
    input.userId,
    items.map((item) => item.key),
  );

  const notifications: NotificationItem[] = items.map((item) => ({
    ...item,
    occurredAt: item.occurredAt.toISOString(),
    read: isRead(stateMap.get(item.key), item.occurredAt),
  }));

  const unreadCount = notifications.filter((item) => !item.read).length;
  const readCount = notifications.length - unreadCount;

  return {
    notifications,
    counts: {
      total: notifications.length,
      unread: unreadCount,
      read: readCount,
      actionRequired: notifications.filter((item) => item.actionable && !item.read).length,
      liveSessions: notifications.filter((item) => item.kind === "live_session").length,
      friendInvites: notifications.filter((item) => item.kind === "friend_invite").length,
      listInvites: notifications.filter((item) => item.kind === "list_invite").length,
      recentActivity: notifications.filter((item) => item.kind === "activity").length,
    },
  };
}

export async function markNotificationRead(userId: string, notificationKey: string) {
  return db.notificationState.upsert({
    where: {
      userId_notificationKey: {
        userId,
        notificationKey,
      },
    },
    update: {
      readAt: new Date(),
    },
    create: {
      userId,
      notificationKey,
      readAt: new Date(),
    },
  });
}

export async function markNotificationUnread(userId: string, notificationKey: string) {
  return db.notificationState.upsert({
    where: {
      userId_notificationKey: {
        userId,
        notificationKey,
      },
    },
    update: {
      readAt: null,
    },
    create: {
      userId,
      notificationKey,
      readAt: null,
    },
  });
}

export async function markNotificationsRead(userId: string, notificationKeys: string[]) {
  const uniqueKeys = [...new Set(notificationKeys)].filter(Boolean);

  if (!uniqueKeys.length) {
    return;
  }

  const now = new Date();

  await db.$transaction(
    uniqueKeys.map((notificationKey) =>
      db.notificationState.upsert({
        where: {
          userId_notificationKey: {
            userId,
            notificationKey,
          },
        },
        update: {
          readAt: now,
        },
        create: {
          userId,
          notificationKey,
          readAt: now,
        },
      }),
    ),
  );
}
