"use server";

import { revalidatePath } from "next/cache";

import { profileSchema } from "@/features/profile/schemas";
import { requireSession } from "@/server/session";
import { upsertProfile } from "@/server/services/profile-service";

export async function saveProfileAction(formData: FormData) {
  const session = await requireSession();

  const parsed = profileSchema.parse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
    location: formData.get("location"),
    favoriteGenres: formData.get("favoriteGenres"),
  });

  await upsertProfile(session.user.id, parsed);

  revalidatePath("/profile");
}
