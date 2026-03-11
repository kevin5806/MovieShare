"use server";

import { revalidatePath } from "next/cache";

import {
  friendInviteSchema,
  profileSchema,
  respondToFriendInviteSchema,
} from "@/features/profile/schemas";
import { updateUserNotificationPreferencesSchema } from "@/features/notifications/preferences-schema";
import { getOptionalFile } from "@/lib/form-files";
import { requireSession } from "@/server/session";
import {
  deleteManagedImageByUrl,
  uploadPublicImage,
} from "@/server/services/media-storage";
import { updateUserNotificationPreferences } from "@/server/services/notification-preference-service";
import {
  respondToFriendInvite,
  sendFriendInvite,
  upsertProfile,
} from "@/server/services/profile-service";

export async function saveProfileAction(formData: FormData) {
  const session = await requireSession();

  const parsed = profileSchema.parse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
    location: formData.get("location"),
    favoriteGenres: formData.get("favoriteGenres"),
    removeAvatar: formData.get("removeAvatar") === "on",
  });
  const avatarImageFile = getOptionalFile(formData.get("avatarImage"));
  let imageUrl: string | null | undefined;

  if (avatarImageFile) {
    const upload = await uploadPublicImage({
      file: avatarImageFile,
      folder: "profiles",
      ownerId: session.user.id,
      slug: session.user.email,
      previousUrl: session.user.image ?? null,
    });

    imageUrl = upload.url;
  } else if (parsed.removeAvatar) {
    imageUrl = null;
    await deleteManagedImageByUrl(session.user.image ?? null).catch((error) => {
      console.error("deleteManagedImageByUrl failed", error);
    });
  }

  await upsertProfile(session.user.id, {
    ...parsed,
    imageUrl,
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function sendFriendInviteAction(formData: FormData) {
  try {
    const session = await requireSession();

    const parsed = friendInviteSchema.parse({
      email: formData.get("email"),
      message: formData.get("message"),
    });

    const result = await sendFriendInvite(session.user.id, parsed);

    revalidatePath("/profile");

    return {
      ok: true as const,
      status: result.status,
      delivery: "delivery" in result ? result.delivery?.status : undefined,
    };
  } catch (error) {
    console.error("sendFriendInviteAction failed", error);

    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unable to send the friend invite.",
    };
  }
}

export async function respondToFriendInviteAction(formData: FormData) {
  try {
    const session = await requireSession();

    const parsed = respondToFriendInviteSchema.parse({
      inviteId: formData.get("inviteId"),
      action: formData.get("action"),
    });

    await respondToFriendInvite({
      inviteId: parsed.inviteId,
      userId: session.user.id,
      action: parsed.action,
    });

    revalidatePath("/profile");

    return {
      ok: true as const,
    };
  } catch (error) {
    console.error("respondToFriendInviteAction failed", error);

    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unable to update the invite.",
    };
  }
}

export async function updateUserNotificationPreferencesAction(formData: FormData) {
  try {
    const session = await requireSession();

    const parsed = updateUserNotificationPreferencesSchema.parse({
      preferences: formData.get("preferences"),
    });

    await updateUserNotificationPreferences({
      userId: session.user.id,
      preferences: parsed.preferences,
    });

    revalidatePath("/profile");
    revalidatePath("/notifications");

    return {
      ok: true as const,
    };
  } catch (error) {
    console.error("updateUserNotificationPreferencesAction failed", error);

    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Unable to update notification preferences.",
    };
  }
}
