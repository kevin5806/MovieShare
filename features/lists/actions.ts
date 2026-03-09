"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SelectionMode, WatchSessionType } from "@/generated/prisma/client";
import {
  addMovieToListSchema,
  createListSchema,
  runSelectionSchema,
  saveFeedbackSchema,
  startWatchSessionSchema,
} from "@/features/lists/schemas";
import { requireSession } from "@/server/session";
import {
  addMovieToList,
  createList,
  saveMovieFeedback,
} from "@/server/services/list-service";
import { runSelection } from "@/server/services/selection-service";
import { createWatchSession } from "@/server/services/watch-service";

export async function createListAction(formData: FormData) {
  const session = await requireSession();

  const parsed = createListSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  const list = await createList(session.user.id, parsed);

  redirect(`/lists/${list.slug}`);
}

export async function addMovieToListAction(formData: FormData) {
  const session = await requireSession();

  const parsed = addMovieToListSchema.parse({
    listId: formData.get("listId"),
    listSlug: formData.get("listSlug"),
    tmdbId: formData.get("tmdbId"),
    note: formData.get("note"),
  });

  await addMovieToList(session.user.id, parsed);

  revalidatePath(`/lists/${parsed.listSlug}`);
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
