import {
  FeedbackInterest,
  FeedbackSeenState,
  ListInviteKind,
  ListInviteStatus,
  ListMemberRole,
  WatchProgressState,
  type Prisma,
} from "@/generated/prisma/client";
import { notFound } from "next/navigation";
import { realtimeBroker } from "@/server/realtime/broker";
import { db } from "@/server/db";
import {
  deleteManagedImageByUrl,
  uploadPublicImage,
} from "@/server/services/media-storage";
import { logActivity } from "@/server/services/activity-log";
import { sendListInviteEmail } from "@/server/services/email-service";
import { sendPushNotificationToUser } from "@/server/services/push-notification-service";
import {
  cacheMovieFromTmdb,
  syncMovieArtwork,
  syncMovieArtworkBatch,
} from "@/server/services/tmdb-service";
import { slugify } from "@/lib/utils";

export const listSortOptions = [
  "RECENT",
  "TITLE",
  "TMDB_RATING",
  "INTEREST",
  "COMMENTS",
] as const;

export type ListSortOption = (typeof listSortOptions)[number];

type ListViewPreferences = {
  sortBy: ListSortOption;
  proposerId: string | null;
};

function parseListViewPreferences(input: Prisma.JsonValue | null | undefined): ListViewPreferences {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      sortBy: "RECENT",
      proposerId: null,
    };
  }

  const candidate = input as {
    sortBy?: unknown;
    proposerId?: unknown;
  };
  const sortBy =
    typeof candidate.sortBy === "string" &&
    listSortOptions.includes(candidate.sortBy as ListSortOption)
      ? (candidate.sortBy as ListSortOption)
      : "RECENT";
  const proposerId =
    typeof candidate.proposerId === "string" && candidate.proposerId.trim()
      ? candidate.proposerId
      : null;

  return {
    sortBy,
    proposerId,
  };
}

function sortListItems<T extends {
  addedAt: Date;
  movie: {
    title: string;
    tmdbVoteAverage?: number | null;
  };
  feedbacks: Array<{
    interest: FeedbackInterest;
    comment?: string | null;
  }>;
}>(items: T[], sortBy: ListSortOption) {
  const copy = [...items];

  copy.sort((left, right) => {
    if (sortBy === "TITLE") {
      return left.movie.title.localeCompare(right.movie.title, undefined, {
        sensitivity: "base",
      });
    }

    if (sortBy === "TMDB_RATING") {
      return (right.movie.tmdbVoteAverage ?? 0) - (left.movie.tmdbVoteAverage ?? 0);
    }

    if (sortBy === "INTEREST") {
      return (
        right.feedbacks.filter((feedback) => feedback.interest === FeedbackInterest.INTERESTED)
          .length -
        left.feedbacks.filter((feedback) => feedback.interest === FeedbackInterest.INTERESTED)
          .length
      );
    }

    if (sortBy === "COMMENTS") {
      return (
        right.feedbacks.filter((feedback) => feedback.comment?.trim()).length -
        left.feedbacks.filter((feedback) => feedback.comment?.trim()).length
      );
    }

    return right.addedAt.getTime() - left.addedAt.getTime();
  });

  return copy;
}

async function requireListMember(listId: string, userId: string) {
  const membership = await db.movieListMember.findUnique({
    where: {
      listId_userId: {
        listId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new Error("You are not a member of this list.");
  }

  return membership;
}

function canManageListRole(role: ListMemberRole) {
  return role === ListMemberRole.OWNER || role === ListMemberRole.MANAGER;
}

async function requireListManager(listId: string, userId: string) {
  const membership = await requireListMember(listId, userId);

  if (!canManageListRole(membership.role)) {
    throw new Error("You do not have permission to manage this list.");
  }

  return membership;
}

async function requireListAccessBySlug(slug: string, userId: string) {
  const list = await db.movieList.findFirst({
    where: {
      slug,
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      owner: true,
      members: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
      invites: {
        include: {
          sender: true,
          invitedUser: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      items: {
        include: {
          movie: true,
          addedBy: true,
          feedbacks: true,
          watchProgress: {
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          },
          watchSessions: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
        orderBy: [{ sortOrder: "asc" }, { addedAt: "desc" }],
      },
      selectionRuns: {
        include: {
          results: {
            include: {
              listItem: {
                include: {
                  movie: true,
                },
              },
            },
            orderBy: {
              rank: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      watchSessions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      },
    },
  });

  if (!list) {
    notFound();
  }

  return list;
}

async function requireListOwner(listId: string, userId: string) {
  const list = await db.movieList.findFirst({
    where: {
      id: listId,
      ownerId: userId,
    },
  });

  if (!list) {
    throw new Error("Only the list owner can update this list.");
  }

  return list;
}

async function generateUniqueSlug(name: string) {
  const base = slugify(name) || "movie-list";
  let slug = base;
  let suffix = 1;

  while (await db.movieList.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}

export async function getDashboardData(userId: string) {
  const [lists, recentActivity] = await Promise.all([
    db.movieListMember.findMany({
      where: {
        userId,
      },
      include: {
        list: {
          include: {
            owner: true,
            _count: {
              select: {
                items: true,
                members: true,
              },
            },
            selectionRuns: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    }),
    db.activityLog.findMany({
      where: {
        OR: [
          {
            actorId: userId,
          },
          {
            list: {
              members: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },
      include: {
        list: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
  ]);

  return {
    lists,
    recentActivity,
  };
}

export async function getListsOverview(userId: string) {
  const memberships = await db.movieListMember.findMany({
    where: {
      userId,
    },
    include: {
      list: {
        include: {
          owner: {
            include: {
              profile: true,
            },
          },
          _count: {
            select: {
              items: true,
              members: true,
            },
          },
          selectionRuns: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
          watchSessions: {
            where: {
              status: "LIVE",
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
    orderBy: [
      {
        role: "asc",
      },
      {
        joinedAt: "desc",
      },
    ],
  });

  return {
    memberships,
    counts: {
      total: memberships.length,
      owned: memberships.filter((membership) => membership.role === ListMemberRole.OWNER).length,
      memberOnly: memberships.filter((membership) => membership.role !== ListMemberRole.OWNER)
        .length,
      liveSessions: memberships.filter((membership) => membership.list.watchSessions.length > 0)
        .length,
    },
  };
}

export async function createList(
  userId: string,
  input: { name: string; description?: string },
  options?: { coverImageFile?: File | null },
) {
  const slug = await generateUniqueSlug(input.name);
  const coverImageUpload = options?.coverImageFile
    ? await uploadPublicImage({
        file: options.coverImageFile,
        folder: "lists",
        ownerId: userId,
        slug,
      })
    : null;

  const list = await db.$transaction(async (tx) => {
    const created = await tx.movieList.create({
      data: {
        name: input.name,
        description: input.description || null,
        slug,
        coverColor: "stone",
        coverImageUrl: coverImageUpload?.url ?? null,
        ownerId: userId,
      },
    });

    await tx.movieListMember.create({
      data: {
        listId: created.id,
        userId,
        role: ListMemberRole.OWNER,
      },
    });

    await tx.activityLog.create({
      data: {
        listId: created.id,
        actorId: userId,
        event: "list.created",
        payload: {
          slug,
        },
      },
    });

    return created;
  });

  return list;
}

export async function updateListPresentation(
  userId: string,
  input: {
    listId: string;
    name: string;
    description?: string;
    removeCoverImage: boolean;
    coverImageFile?: File | null;
  },
) {
  await requireListManager(input.listId, userId);
  const list = await db.movieList.findUnique({
    where: {
      id: input.listId,
    },
  });

  if (!list) {
    throw new Error("List not found.");
  }
  let coverImageUrl: string | null | undefined;

  if (input.coverImageFile) {
    const upload = await uploadPublicImage({
      file: input.coverImageFile,
      folder: "lists",
      ownerId: userId,
      slug: list.slug,
      previousUrl: list.coverImageUrl,
    });

    coverImageUrl = upload.url;
  } else if (input.removeCoverImage) {
    coverImageUrl = null;
  }

  const updatedList = await db.movieList.update({
    where: {
      id: list.id,
    },
    data: {
      name: input.name,
      description: input.description || null,
      ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
    },
  });

  if (coverImageUrl === null && list.coverImageUrl) {
    await deleteManagedImageByUrl(list.coverImageUrl).catch((error) => {
      console.error("deleteManagedImageByUrl failed", error);
    });
  }

  await logActivity({
    listId: list.id,
    actorId: userId,
    event: "list.presentation.updated",
    payload: {
      hasCoverImage: Boolean(updatedList.coverImageUrl),
    },
  });

  await realtimeBroker.publish({
    channel: `list:${list.id}`,
    event: "list.presentation.updated",
    payload: {
      listId: list.id,
      hasCoverImage: Boolean(updatedList.coverImageUrl),
    },
    occurredAt: new Date().toISOString(),
  });

  return updatedList;
}

export async function deleteList(
  userId: string,
  input: {
    listId: string;
    listSlug: string;
  },
) {
  const list = await requireListOwner(input.listId, userId);

  await db.movieList.delete({
    where: {
      id: list.id,
    },
  });

  if (list.coverImageUrl) {
    await deleteManagedImageByUrl(list.coverImageUrl).catch((error) => {
      console.error("deleteManagedImageByUrl failed", error);
    });
  }

  return {
    listName: list.name,
    listSlug: input.listSlug,
  };
}

export async function getListDetails(slug: string, userId: string) {
  const list = await requireListAccessBySlug(slug, userId);
  const syncedMovies = await syncMovieArtworkBatch(list.items.map((item) => item.movie));
  const viewerMembership = list.members.find((member) => member.userId === userId);
  const viewPreferences = parseListViewPreferences(viewerMembership?.viewPreferences);
  const normalizedItems = list.items.map((item) => {
    const syncedMovie = syncedMovies.get(item.movie.id) ?? item.movie;
    const startedCount = item.watchProgress.filter(
      (progress) => progress.completionState !== WatchProgressState.NOT_STARTED,
    ).length;
    const completedCount = item.watchProgress.filter(
      (progress) => progress.completionState === WatchProgressState.COMPLETED,
    ).length;
    const inProgressCount = item.watchProgress.filter(
      (progress) => progress.completionState === WatchProgressState.IN_PROGRESS,
    ).length;

    return {
      ...item,
      movie: syncedMovie,
      watchSummary: {
        startedCount,
        completedCount,
        inProgressCount,
      },
    };
  });
  const filteredItems = viewPreferences.proposerId
    ? normalizedItems.filter((item) => item.addedById === viewPreferences.proposerId)
    : normalizedItems;

  return {
    ...list,
    viewPreferences,
    items: sortListItems(filteredItems, viewPreferences.sortBy),
  };
}

export async function updateListViewPreferences(
  userId: string,
  input: {
    listId: string;
    sortBy: ListSortOption;
    proposerId?: string | null;
  },
) {
  const membership = await requireListMember(input.listId, userId);

  await db.movieListMember.update({
    where: {
      id: membership.id,
    },
    data: {
      viewPreferences: {
        sortBy: input.sortBy,
        proposerId: input.proposerId?.trim() || null,
      } satisfies Prisma.InputJsonValue,
    },
  });
}

export async function createListInvite(
  userId: string,
  input: {
    listId: string;
    email?: string;
    kind: "email" | "public";
    targetRole?: ListMemberRole;
    maxUses?: number | null;
    note?: string;
  },
) {
  const membership = await requireListManager(input.listId, userId);
  const list = await db.movieList.findUnique({
    where: {
      id: input.listId,
    },
    include: {
      owner: true,
      members: true,
    },
  });

  if (!list) {
    throw new Error("List not found.");
  }

  const targetRole = input.targetRole ?? ListMemberRole.MEMBER;
  const safeNote = input.note?.trim() || null;

  if (membership.role !== ListMemberRole.OWNER && targetRole !== ListMemberRole.MEMBER) {
    throw new Error("Only the list owner can grant manager access.");
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  let normalizedEmail: string | null = null;
  let inviteKind: ListInviteKind = ListInviteKind.PUBLIC_LINK;
  let invitedUserId: string | null = null;
  let invite;
  let delivery: Awaited<ReturnType<typeof sendListInviteEmail>> = {
    status: "skipped" as const,
  };

  if (input.kind === "email") {
    normalizedEmail = input.email?.trim().toLowerCase() ?? "";

    if (!normalizedEmail) {
      throw new Error("Invite email is required.");
    }

    const invitedUser = await db.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (invitedUser && list.members.some((member) => member.userId === invitedUser.id)) {
      throw new Error("That user is already a member of this list.");
    }

    inviteKind = invitedUser ? ListInviteKind.APP_USER : ListInviteKind.EMAIL_LINK;
    invitedUserId = invitedUser?.id ?? null;

    const existingInvite = await db.movieListInvite.findFirst({
      where: {
        listId: input.listId,
        email: normalizedEmail,
        status: ListInviteStatus.PENDING,
        kind: {
          in: [ListInviteKind.APP_USER, ListInviteKind.EMAIL_LINK],
        },
      },
    });

    invite = existingInvite
      ? await db.movieListInvite.update({
          where: {
            id: existingInvite.id,
          },
          data: {
            senderId: userId,
            kind: inviteKind,
            token,
            expiresAt,
            invitedUserId,
            email: normalizedEmail,
            targetRole,
            maxUses: 1,
            note: safeNote,
            status: ListInviteStatus.PENDING,
          },
        })
      : await db.movieListInvite.create({
          data: {
            listId: input.listId,
            senderId: userId,
            kind: inviteKind,
            email: normalizedEmail,
            token,
            expiresAt,
            invitedUserId,
            targetRole,
            maxUses: 1,
            note: safeNote,
          },
        });

    delivery = await sendListInviteEmail({
      to: normalizedEmail,
      senderName: list.owner.name,
      listName: list.name,
      token: invite.token,
      userId: invitedUserId,
    });

    if (invitedUserId) {
      await sendPushNotificationToUser({
        userId: invitedUserId,
        category: "LIST_INVITES",
        title: `${list.owner.name} invited you to ${list.name}`,
        body:
          targetRole === ListMemberRole.MANAGER
            ? "You were invited as a manager for this list."
            : "Open the invite and join the list.",
        url: `/invites/lists/${invite.token}`,
        tag: `list-invite:${invite.id}`,
      });
    }
  } else {
    invite = await db.movieListInvite.create({
      data: {
        listId: input.listId,
        senderId: userId,
        kind: ListInviteKind.PUBLIC_LINK,
        email: null,
        token,
        expiresAt,
        invitedUserId: null,
        targetRole,
        maxUses: input.maxUses ?? null,
        note: safeNote,
      },
    });
  }

  await logActivity({
    listId: input.listId,
    actorId: userId,
    event: "list.invite.created",
    payload: {
      inviteId: invite.id,
      kind: invite.kind,
      email: normalizedEmail,
      targetRole,
      maxUses: invite.maxUses,
    },
  });

  await realtimeBroker.publish({
    channel: `list:${input.listId}`,
    event: "list.invite.created",
    payload: {
      inviteId: invite.id,
      kind: invite.kind,
      invitedUserId: invite.invitedUserId,
    },
    occurredAt: new Date().toISOString(),
  });

  return {
    invite,
    delivery,
  };
}

export async function revokeListInvite(userId: string, inviteId: string) {
  const invite = await db.movieListInvite.findFirst({
    where: {
      id: inviteId,
      list: {
        members: {
          some: {
            userId,
            role: {
              in: [ListMemberRole.OWNER, ListMemberRole.MANAGER],
            },
          },
        },
      },
    },
  });

  if (!invite) {
    throw new Error("Invite not found.");
  }

  await db.movieListInvite.update({
    where: {
      id: invite.id,
    },
    data: {
      status: ListInviteStatus.REVOKED,
    },
  });

  return invite;
}

export async function getListInviteByToken(token: string) {
  return db.movieListInvite.findUnique({
    where: {
      token,
    },
    include: {
      list: {
        include: {
          owner: true,
          members: {
            include: {
              user: true,
            },
          },
        },
      },
      sender: {
        include: {
          profile: true,
        },
      },
      invitedUser: {
        include: {
          profile: true,
        },
      },
    },
  });
}

export async function respondToListInvite(input: {
  token: string;
  userId: string;
  action: "accept" | "decline";
}) {
  const [invite, user] = await Promise.all([
    getListInviteByToken(input.token),
    db.user.findUnique({
      where: {
        id: input.userId,
      },
    }),
  ]);

  if (!invite || !user) {
    throw new Error("Invite not found.");
  }

  if (invite.status !== ListInviteStatus.PENDING) {
    throw new Error("This invite is no longer pending.");
  }

  if (invite.expiresAt < new Date()) {
    throw new Error("This invite has expired.");
  }

  const normalizedUserEmail = user.email.toLowerCase();
  const isPublicInvite = invite.kind === ListInviteKind.PUBLIC_LINK;
  const matchesEmail = invite.email?.toLowerCase() === normalizedUserEmail;
  const matchesUser = invite.invitedUserId === user.id;

  if (invite.kind === ListInviteKind.APP_USER && !matchesUser && !matchesEmail) {
    throw new Error("This invite belongs to a different user.");
  }

  if (invite.kind === ListInviteKind.EMAIL_LINK && !matchesEmail) {
    throw new Error("This invite belongs to a different email address.");
  }

  const isExistingMember = invite.list.members.some((member) => member.userId === user.id);

  if (input.action === "accept" && isExistingMember) {
    return {
      invite,
      listSlug: invite.list.slug,
    };
  }

  if (input.action === "decline" && isPublicInvite) {
    return {
      invite,
      listSlug: invite.list.slug,
    };
  }

  const status =
    input.action === "accept" ? ListInviteStatus.ACCEPTED : ListInviteStatus.DECLINED;

  return db.$transaction(async (tx) => {
    const nextUseCount = invite.useCount + (input.action === "accept" ? 1 : 0);
    const publicInviteReachedLimit =
      invite.kind === ListInviteKind.PUBLIC_LINK &&
      invite.maxUses !== null &&
      nextUseCount >= invite.maxUses;
    const updatedInvite = await tx.movieListInvite.update({
      where: {
        id: invite.id,
      },
      data: {
        status:
          invite.kind === ListInviteKind.PUBLIC_LINK && input.action === "accept"
            ? publicInviteReachedLimit
              ? ListInviteStatus.ACCEPTED
              : ListInviteStatus.PENDING
            : status,
        invitedUserId:
          invite.kind === ListInviteKind.PUBLIC_LINK ? invite.invitedUserId : user.id,
        useCount: input.action === "accept" ? nextUseCount : invite.useCount,
        lastUsedAt: input.action === "accept" ? new Date() : invite.lastUsedAt,
      },
    });

    if (input.action === "accept") {
      await tx.movieListMember.upsert({
        where: {
          listId_userId: {
            listId: invite.listId,
            userId: user.id,
          },
        },
        update: {},
        create: {
          listId: invite.listId,
          userId: user.id,
          role: invite.targetRole,
        },
      });

      await tx.activityLog.create({
        data: {
          listId: invite.listId,
          actorId: user.id,
          event: "list.invite.accepted",
          payload: {
            inviteId: invite.id,
            email: user.email,
            kind: invite.kind,
            role: invite.targetRole,
          },
        },
      });
    }

    if (input.action === "decline") {
      await tx.activityLog.create({
        data: {
          listId: invite.listId,
          actorId: user.id,
          event: "list.invite.declined",
          payload: {
            inviteId: invite.id,
            email: user.email,
            kind: invite.kind,
          },
        },
      });
    }

    if (input.action === "accept") {
      await realtimeBroker.publish({
        channel: `list:${invite.listId}`,
        event: "list.member.joined",
        payload: {
          inviteId: invite.id,
          userId: user.id,
          role: invite.targetRole,
        },
        occurredAt: new Date().toISOString(),
      });
    }

    return {
      invite: updatedInvite,
      listSlug: invite.list.slug,
    };
  });
}

export async function updateListMemberRole(
  userId: string,
  input: {
    listId: string;
    memberId: string;
    role: ListMemberRole;
  },
) {
  await requireListOwner(input.listId, userId);

  const member = await db.movieListMember.findFirst({
    where: {
      id: input.memberId,
      listId: input.listId,
    },
    include: {
      user: true,
      list: true,
    },
  });

  if (!member) {
    throw new Error("Member not found.");
  }

  if (member.role === ListMemberRole.OWNER) {
    throw new Error("The list owner role cannot be changed here.");
  }

  if (member.userId === userId) {
    throw new Error("Use ownership transfer instead of editing your own role.");
  }

  const updatedMember = await db.movieListMember.update({
    where: {
      id: member.id,
    },
    data: {
      role: input.role,
    },
    include: {
      user: true,
    },
  });

  await logActivity({
    listId: input.listId,
    actorId: userId,
    event: "list.member.role.updated",
    payload: {
      memberId: member.id,
      targetUserId: member.userId,
      role: input.role,
    },
  });

  await realtimeBroker.publish({
    channel: `list:${input.listId}`,
    event: "list.member.role.updated",
    payload: {
      memberId: member.id,
      userId: member.userId,
      role: input.role,
    },
    occurredAt: new Date().toISOString(),
  });

  return updatedMember;
}

export async function removeListMember(
  userId: string,
  input: {
    listId: string;
    memberId: string;
  },
) {
  await requireListOwner(input.listId, userId);

  const member = await db.movieListMember.findFirst({
    where: {
      id: input.memberId,
      listId: input.listId,
    },
    include: {
      user: true,
    },
  });

  if (!member) {
    throw new Error("Member not found.");
  }

  if (member.role === ListMemberRole.OWNER) {
    throw new Error("The list owner cannot be removed.");
  }

  if (member.userId === userId) {
    throw new Error("Use a dedicated leave flow instead of removing yourself.");
  }

  await db.movieListMember.delete({
    where: {
      id: member.id,
    },
  });

  await logActivity({
    listId: input.listId,
    actorId: userId,
    event: "list.member.removed",
    payload: {
      memberId: member.id,
      targetUserId: member.userId,
    },
  });

  await realtimeBroker.publish({
    channel: `list:${input.listId}`,
    event: "list.member.removed",
    payload: {
      memberId: member.id,
      userId: member.userId,
    },
    occurredAt: new Date().toISOString(),
  });

  return member;
}

export async function getListItemDetail(
  slug: string,
  listItemId: string,
  userId: string,
) {
  await requireListAccessBySlug(slug, userId);

  const item = await db.movieListItem.findFirst({
    where: {
      id: listItemId,
      list: {
        slug,
      },
    },
    include: {
      list: {
        include: {
          members: {
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
            orderBy: {
              joinedAt: "asc",
            },
          },
        },
      },
      movie: true,
      addedBy: true,
      feedbacks: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
      watchProgress: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          lastWatchedAt: "desc",
        },
      },
      watchSessions: {
        include: {
          startedBy: {
            include: {
              profile: true,
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
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!item) {
    notFound();
  }

  const syncedMovie = await syncMovieArtwork(item.movie);
  const watchSummary = {
    startedCount: item.watchProgress.filter(
      (progress) => progress.completionState !== WatchProgressState.NOT_STARTED,
    ).length,
    completedCount: item.watchProgress.filter(
      (progress) => progress.completionState === WatchProgressState.COMPLETED,
    ).length,
    inProgressCount: item.watchProgress.filter(
      (progress) => progress.completionState === WatchProgressState.IN_PROGRESS,
    ).length,
  };

  return {
    ...item,
    movie: syncedMovie,
    watchSummary,
  };
}

export async function addMovieToList(
  userId: string,
  input: { listId: string; tmdbId: number; note?: string },
) {
  await requireListMember(input.listId, userId);

  const movie = await cacheMovieFromTmdb(input.tmdbId);

  const listItem = await db.movieListItem.upsert({
    where: {
      listId_movieId: {
        listId: input.listId,
        movieId: movie.id,
      },
    },
    update: {
      note: input.note || null,
    },
    create: {
      listId: input.listId,
      movieId: movie.id,
      addedById: userId,
      note: input.note || null,
    },
    include: {
      list: true,
      movie: true,
    },
  });

  await logActivity({
    listId: input.listId,
    actorId: userId,
    event: "list.item.added",
    payload: {
      movieId: movie.id,
      tmdbId: input.tmdbId,
      title: movie.title,
    },
  });

  await realtimeBroker.publish({
    channel: `list:${input.listId}`,
    event: "list.item.added",
    payload: {
      listItemId: listItem.id,
      movieTitle: movie.title,
      addedById: userId,
    },
    occurredAt: new Date().toISOString(),
  });

  return listItem;
}

export async function removeMovieFromList(
  userId: string,
  input: {
    listItemId: string;
  },
) {
  const listItem = await db.movieListItem.findFirst({
    where: {
      id: input.listItemId,
      list: {
        members: {
          some: {
            userId,
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

  const actingMembership = listItem.list.members.find((member) => member.userId === userId);

  if (!actingMembership) {
    throw new Error("You are not a member of this list.");
  }

  const canRemove =
    canManageListRole(actingMembership.role) || listItem.addedById === userId;

  if (!canRemove) {
    throw new Error("Only the proposer or a list manager can remove this movie.");
  }

  await db.movieListItem.delete({
    where: {
      id: listItem.id,
    },
  });

  await logActivity({
    listId: listItem.listId,
    actorId: userId,
    event: "list.item.removed",
    payload: {
      listItemId: listItem.id,
      movieId: listItem.movieId,
      title: listItem.movie.title,
      removedById: userId,
    },
  });

  await realtimeBroker.publish({
    channel: `list:${listItem.listId}`,
    event: "list.item.removed",
    payload: {
      listItemId: listItem.id,
      movieTitle: listItem.movie.title,
      removedById: userId,
    },
    occurredAt: new Date().toISOString(),
  });

  return {
    listSlug: listItem.list.slug,
    movieTitle: listItem.movie.title,
  };
}

export async function saveMovieFeedback(
  userId: string,
  input: {
    listItemId: string;
    seenState: FeedbackSeenState;
    interest: FeedbackInterest;
    wouldRewatch: boolean;
    comment?: string;
  },
) {
  const listItem = await db.movieListItem.findFirst({
    where: {
      id: input.listItemId,
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
      movie: true,
    },
  });

  if (!listItem) {
    throw new Error("Movie item not found.");
  }

  const feedback = await db.movieFeedback.upsert({
    where: {
      listItemId_userId: {
        listItemId: input.listItemId,
        userId,
      },
    },
    update: {
      seenState: input.seenState,
      interest: input.interest,
      wouldRewatch: input.wouldRewatch,
      comment: input.comment || null,
    },
    create: {
      listItemId: input.listItemId,
      userId,
      seenState: input.seenState,
      interest: input.interest,
      wouldRewatch: input.wouldRewatch,
      comment: input.comment || null,
    },
  });

  await logActivity({
    listId: listItem.listId,
    actorId: userId,
    event: "list.feedback.updated",
    payload: {
      listItemId: input.listItemId,
      movieTitle: listItem.movie.title,
      interest: input.interest,
      seenState: input.seenState,
    },
  });

  await realtimeBroker.publish({
    channel: `list:${listItem.listId}`,
    event: "list.feedback.updated",
    payload: {
      listItemId: input.listItemId,
      userId,
      interest: input.interest,
      seenState: input.seenState,
    },
    occurredAt: new Date().toISOString(),
  });

  return feedback;
}

export type SelectionCandidate = Prisma.MovieListItemGetPayload<{
  include: {
    movie: true;
    feedbacks: true;
  };
}>;
