import { db } from "@/server/db";
import { sendFriendInviteEmail } from "@/server/services/email-service";
import { sendPushNotificationToUser } from "@/server/services/push-notification-service";

export async function getProfileOverview(userId: string) {
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      profile: true,
      sentFriendInvites: {
        where: {
          status: "PENDING",
        },
        include: {
          receiver: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      receivedFriendInvites: {
        where: {
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
      },
      initiatedFriendships: {
        include: {
          acceptedBy: {
            include: {
              profile: true,
            },
          },
        },
      },
      acceptedFriendships: {
        include: {
          initiator: {
            include: {
              profile: true,
            },
          },
        },
      },
      _count: {
        select: {
          listMemberships: true,
          feedbacks: true,
          watchSessionMembers: true,
          sentFriendInvites: true,
          receivedFriendInvites: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const friends = [
    ...user.initiatedFriendships.map((friendship) => friendship.acceptedBy),
    ...user.acceptedFriendships.map((friendship) => friendship.initiator),
  ];

  return {
    ...user,
    friends,
  };
}

export async function upsertProfile(
  userId: string,
  input: {
    displayName?: string;
    bio?: string;
    location?: string;
    favoriteGenres?: string;
    imageUrl?: string | null;
  },
) {
  const favoriteGenres = (input.favoriteGenres ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return db.$transaction(async (tx) => {
    if (input.imageUrl !== undefined) {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          image: input.imageUrl,
        },
      });
    }

    return tx.profile.upsert({
      where: {
        userId,
      },
      update: {
        displayName: input.displayName || null,
        bio: input.bio || null,
        location: input.location || null,
        favoriteGenres,
      },
      create: {
        userId,
        displayName: input.displayName || null,
        bio: input.bio || null,
        location: input.location || null,
        favoriteGenres,
      },
    });
  });
}

export async function sendFriendInvite(
  userId: string,
  input: {
    email: string;
    message?: string;
  },
) {
  const sender = await db.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!sender) {
    throw new Error("User not found.");
  }

  const normalizedEmail = input.email.trim().toLowerCase();

  if (normalizedEmail === sender.email.toLowerCase()) {
    throw new Error("You cannot invite yourself.");
  }

  const receiver = await db.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!receiver) {
    throw new Error("No registered user was found for that email.");
  }

  const existingFriendship = await db.friendship.findFirst({
    where: {
      OR: [
        {
          initiatorId: sender.id,
          acceptedById: receiver.id,
        },
        {
          initiatorId: receiver.id,
          acceptedById: sender.id,
        },
      ],
    },
  });

  if (existingFriendship) {
    throw new Error("You are already connected with this user.");
  }

  const reciprocalInvite = await db.friendshipInvite.findUnique({
    where: {
      senderId_receiverId: {
        senderId: receiver.id,
        receiverId: sender.id,
      },
    },
  });

  if (reciprocalInvite?.status === "PENDING") {
    await db.$transaction(async (tx) => {
      await tx.friendshipInvite.update({
        where: {
          id: reciprocalInvite.id,
        },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date(),
        },
      });

      await tx.friendship.create({
        data: {
          initiatorId: receiver.id,
          acceptedById: sender.id,
        },
      });
    });

    return {
      status: "accepted" as const,
    };
  }

  const invite = await db.friendshipInvite.upsert({
    where: {
      senderId_receiverId: {
        senderId: sender.id,
        receiverId: receiver.id,
      },
    },
    update: {
      status: "PENDING",
      respondedAt: null,
      message: input.message?.trim() || null,
    },
    create: {
      senderId: sender.id,
      receiverId: receiver.id,
      message: input.message?.trim() || null,
    },
  });

  const delivery = await sendFriendInviteEmail({
    to: receiver.email,
    senderName: sender.name,
    message: input.message,
    userId: receiver.id,
  });

  await sendPushNotificationToUser({
    userId: receiver.id,
    category: "FRIEND_INVITES",
    title: `${sender.name} sent you a friend invite`,
    body: input.message?.trim() || "Open your profile to review it.",
    url: "/profile",
    tag: `friend-invite:${invite.id}`,
  });

  return {
    status: "invited" as const,
    invite,
    delivery,
  };
}

export async function respondToFriendInvite(input: {
  inviteId: string;
  userId: string;
  action: "accept" | "decline";
}) {
  const invite = await db.friendshipInvite.findFirst({
    where: {
      id: input.inviteId,
      receiverId: input.userId,
    },
  });

  if (!invite) {
    throw new Error("Invite not found.");
  }

  if (invite.status !== "PENDING") {
    throw new Error("This invite has already been processed.");
  }

  return db.$transaction(async (tx) => {
    const updatedInvite = await tx.friendshipInvite.update({
      where: {
        id: invite.id,
      },
      data: {
        status: input.action === "accept" ? "ACCEPTED" : "DECLINED",
        respondedAt: new Date(),
      },
    });

    if (input.action === "accept") {
      const existingFriendship = await tx.friendship.findFirst({
        where: {
          OR: [
            {
              initiatorId: invite.senderId,
              acceptedById: invite.receiverId,
            },
            {
              initiatorId: invite.receiverId,
              acceptedById: invite.senderId,
            },
          ],
        },
      });

      if (!existingFriendship) {
        await tx.friendship.create({
          data: {
            initiatorId: invite.senderId,
            acceptedById: invite.receiverId,
          },
        });
      }
    }

    return updatedInvite;
  });
}
