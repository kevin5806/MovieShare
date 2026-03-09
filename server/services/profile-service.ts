import { db } from "@/server/db";

export async function getProfileOverview(userId: string) {
  return db.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      profile: true,
      _count: {
        select: {
          listMemberships: true,
          feedbacks: true,
          watchSessionMembers: true,
        },
      },
    },
  });
}

export async function upsertProfile(
  userId: string,
  input: {
    displayName?: string;
    bio?: string;
    location?: string;
    favoriteGenres?: string;
  },
) {
  const favoriteGenres = (input.favoriteGenres ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return db.profile.upsert({
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
}
