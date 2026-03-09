"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SelectionMode, WatchSessionType } from "@/generated/prisma/client";
import {
  addMovieToListSchema,
  createListInviteSchema,
  createListSchema,
  respondToListInviteSchema,
  revokeListInviteSchema,
  runSelectionSchema,
  saveFeedbackSchema,
  startWatchSessionSchema,
  updateListPresentationSchema,
} from "@/features/lists/schemas";
import { getOptionalFile } from "@/lib/form-files";
import { requireSession } from "@/server/session";
import {
  addMovieToList,
  createListInvite,
  createList,
  respondToListInvite,
  revokeListInvite,
  saveMovieFeedback,
  updateListPresentation,
} from "@/server/services/list-service";
import { runSelection } from "@/server/services/selection-service";
import { createWatchSession } from "@/server/services/watch-service";

export async function createListAction(formData: FormData) {
  const session = await requireSession();

  const parsed = createListSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  const coverImageFile = getOptionalFile(formData.get("coverImage"));

  const list = await createList(session.user.id, parsed, {
    coverImageFile,
  });

  redirect(`/lists/${list.slug}`);
}

export async function updateListPresentationAction(formData: FormData) {
  const session = await requireSession();

  const parsed = updateListPresentationSchema.parse({
    listId: formData.get("listId"),
    listSlug: formData.get("listSlug"),
    name: formData.get("name"),
    description: formData.get("description"),
    removeCoverImage: formData.get("removeCoverImage") === "on",
  });
  const coverImageFile = getOptionalFile(formData.get("coverImage"));

  await updateListPresentation(session.user.id, {
    ...parsed,
    coverImageFile,
  });

  revalidatePath(`/lists/${parsed.listSlug}`);
  revalidatePath("/dashboard");
}

export async function addMovieToListAction(formData: FormData) {
  try {
    const session = await requireSession();

    const parsed = addMovieToListSchema.parse({
      listId: formData.get("listId"),
      listSlug: formData.get("listSlug"),
      tmdbId: formData.get("tmdbId"),
      note: formData.get("note"),
    });

    await addMovieToList(session.user.id, parsed);

    revalidatePath(`/lists/${parsed.listSlug}`);

    return {
      ok: true as const,
    };
  } catch (error) {
    console.error("addMovieToListAction failed", error);

    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unable to add the movie right now.",
    };
  }
}

export async function createListInviteAction(formData: FormData) {
  try {
    const session = await requireSession();

    const parsed = createListInviteSchema.parse({
      listId: formData.get("listId"),
      listSlug: formData.get("listSlug"),
      email: formData.get("email"),
    });

    const result = await createListInvite(session.user.id, parsed);

    revalidatePath(`/lists/${parsed.listSlug}`);

    return {
      ok: true as const,
      delivery: result.delivery.status,
    };
  } catch (error) {
    console.error("createListInviteAction failed", error);

    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unable to create the invite.",
    };
  }
}

export async function revokeListInviteAction(formData: FormData) {
  try {
    const session = await requireSession();

    const parsed = revokeListInviteSchema.parse({
      inviteId: formData.get("inviteId"),
      listSlug: formData.get("listSlug"),
    });

    await revokeListInvite(session.user.id, parsed.inviteId);

    revalidatePath(`/lists/${parsed.listSlug}`);

    return {
      ok: true as const,
    };
  } catch (error) {
    console.error("revokeListInviteAction failed", error);

    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unable to revoke the invite.",
    };
  }
}

export async function respondToListInviteAction(formData: FormData) {
  const session = await requireSession();

  const parsed = respondToListInviteSchema.parse({
    token: formData.get("token"),
    action: formData.get("action"),
  });

  const result = await respondToListInvite({
    token: parsed.token,
    userId: session.user.id,
    action: parsed.action,
  });

  if (parsed.action === "accept") {
    redirect(`/lists/${result.listSlug}`);
  }

  redirect("/dashboard");
}

export async function saveMovieFeedbackAction(formData: FormData) {
  const session = await requireSession();

  const parsed = saveFeedbackSchema.parse({
    listItemId: formData.get("listItemId"),
    listSlug: formData.get("listSlug"),
    seenState: formData.get("seenState"),
    interest: formData.get("interest"),
    wouldRewatch: formData.get("wouldRewatch") === "on",
    comment: formData.get("comment"),
  });

  await saveMovieFeedback(session.user.id, parsed);

  revalidatePath(`/lists/${parsed.listSlug}`);
}

export async function runSelectionAction(formData: FormData) {
  const session = await requireSession();

  const parsed = runSelectionSchema.parse({
    listId: formData.get("listId"),
    listSlug: formData.get("listSlug"),
    mode: formData.get("mode") ?? SelectionMode.AUTOMATIC,
  });

  await runSelection(session.user.id, parsed.listId, parsed.mode);

  revalidatePath(`/lists/${parsed.listSlug}/select`);
}

export async function startWatchSessionAction(formData: FormData) {
  const session = await requireSession();

  const parsed = startWatchSessionSchema.parse({
    listItemId: formData.get("listItemId"),
    listSlug: formData.get("listSlug"),
    type: formData.get("type") ?? WatchSessionType.SOLO,
    memberIds: formData.getAll("memberIds"),
  });

  const watchSession = await createWatchSession({
    userId: session.user.id,
    listItemId: parsed.listItemId,
    type: parsed.type,
    memberIds: parsed.memberIds,
  });

  redirect(`/watch/${watchSession.id}`);
}
