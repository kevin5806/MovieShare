import {
  FeedbackInterest,
  FeedbackSeenState,
  ListMemberRole,
  ListInviteStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { realtimeBroker } from "@/server/realtime/broker";
import { db } from "@/server/db";
import {
  deleteManagedImageByUrl,
  uploadPublicImage,
} from "@/server/services/media-storage";
import { logActivity } from "@/server/services/activity-log";
import { sendListInviteEmail } from "@/server/services/email-service";
import { cacheMovieFromTmdb } from "@/server/services/tmdb-service";
import { slugify } from "@/lib/utils";

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
    throw new Error("List not found.");
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
  const list = await requireListOwner(input.listId, userId);
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

export async function getListDetails(slug: string, userId: string) {
  return requireListAccessBySlug(slug, userId);
}

export async function createListInvite(
  userId: string,
  input: {
    listId: string;
    email: string;
  },
) {
  const list = await db.movieList.findFirst({
    where: {
      id: input.listId,
      members: {
        some: {
          userId,
          role: ListMemberRole.OWNER,
        },
      },
    },
    include: {
      owner: true,
      members: true,
    },
  });

  if (!list) {
    throw new Error("Only the list owner can send invites.");
  }

  const normalizedEmail = input.email.trim().toLowerCase();

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

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const existingInvite = await db.movieListInvite.findFirst({
    where: {
      listId: input.listId,
      email: normalizedEmail,
      status: ListInviteStatus.PENDING,
    },
  });

  const invite = existingInvite
    ? await db.movieListInvite.update({
        where: {
          id: existingInvite.id,
        },
        data: {
          senderId: userId,
          token,
          expiresAt,
          invitedUserId: invitedUser?.id,
          status: ListInviteStatus.PENDING,
        },
      })
    : await db.movieListInvite.create({
        data: {
          listId: input.listId,
          senderId: userId,
          email: normalizedEmail,
          token,
          expiresAt,
          invitedUserId: invitedUser?.id,
        },
      });

  await logActivity({
    listId: input.listId,
    actorId: userId,
    event: "list.invite.created",
    payload: {
      inviteId: invite.id,
      email: normalizedEmail,
    },
  });

  const delivery = await sendListInviteEmail({
    to: normalizedEmail,
    senderName: list.owner.name,
    listName: list.name,
    token: invite.token,
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
            role: ListMemberRole.OWNER,
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
      sender: true,
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

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("This invite belongs to a different email address.");
  }

  const status =
    input.action === "accept" ? ListInviteStatus.ACCEPTED : ListInviteStatus.DECLINED;

  return db.$transaction(async (tx) => {
    const updatedInvite = await tx.movieListInvite.update({
      where: {
        id: invite.id,
      },
      data: {
        status,
        invitedUserId: user.id,
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
          role: ListMemberRole.MEMBER,
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
          },
        },
      });
    }

    return {
      invite: updatedInvite,
      listSlug: invite.list.slug,
    };
  });
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
      watchSessions: {
        include: {
          members: {
            include: {
              user: true,
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
    throw new Error("Movie not found in this list.");
  }

  return item;
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
