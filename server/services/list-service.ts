import {
  FeedbackInterest,
  FeedbackSeenState,
  ListMemberRole,
  type Prisma,
} from "@/generated/prisma/client";
import { realtimeBroker } from "@/server/realtime/broker";
import { db } from "@/server/db";
import { logActivity } from "@/server/services/activity-log";
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

export async function createList(userId: string, input: { name: string; description?: string }) {
  const slug = await generateUniqueSlug(input.name);

  const list = await db.$transaction(async (tx) => {
    const created = await tx.movieList.create({
      data: {
        name: input.name,
        description: input.description || null,
        slug,
        coverColor: "stone",
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

export async function getListDetails(slug: string, userId: string) {
  return requireListAccessBySlug(slug, userId);
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
