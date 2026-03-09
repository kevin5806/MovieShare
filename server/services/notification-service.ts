import { ListInviteStatus, WatchSessionStatus } from "@/generated/prisma/client";
import { db } from "@/server/db";

export async function getNotificationSummary(input: { userId: string; email: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();

  const [friendInvites, listInvites, liveSessions] = await Promise.all([
    db.friendshipInvite.count({
      where: {
        receiverId: input.userId,
        status: "PENDING",
      },
    }),
    db.movieListInvite.count({
      where: {
        email: normalizedEmail,
        status: ListInviteStatus.PENDING,
      },
    }),
    db.watchSession.count({
      where: {
        status: WatchSessionStatus.LIVE,
        members: {
          some: {
            userId: input.userId,
          },
        },
      },
    }),
  ]);

  return {
    friendInvites,
    listInvites,
    liveSessions,
    total: friendInvites + listInvites + liveSessions,
  };
}

export async function getNotificationsOverview(input: { userId: string; email: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();

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
      take: 6,
    }),
    db.movieListInvite.findMany({
      where: {
        email: normalizedEmail,
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
        createdAt: "desc",
      },
      take: 6,
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
      take: 10,
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
      take: 4,
    }),
  ]);

  return {
    friendInvites,
    listInvites,
    recentActivity,
    liveSessions,
    counts: {
      actionRequired: friendInvites.length + listInvites.length,
      friendInvites: friendInvites.length,
      listInvites: listInvites.length,
      liveSessions: liveSessions.length,
      recentActivity: recentActivity.length,
    },
  };
}
