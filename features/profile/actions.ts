"use server";

import { revalidatePath } from "next/cache";

import {
  friendInviteSchema,
  profileSchema,
  respondToFriendInviteSchema,
} from "@/features/profile/schemas";
import { requireSession } from "@/server/session";
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
  });

  await upsertProfile(session.user.id, parsed);

  revalidatePath("/profile");
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
