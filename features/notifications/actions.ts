"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/server/session";
import {
  markNotificationRead,
  markNotificationsRead,
  markNotificationUnread,
} from "@/server/services/notification-service";

function revalidateNotificationSurfaces() {
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/watch");
  revalidatePath("/lists");
}

export async function markNotificationReadAction(notificationKey: string) {
  const session = await requireSession();

  await markNotificationRead(session.user.id, notificationKey);
  revalidateNotificationSurfaces();
}

export async function markNotificationUnreadAction(notificationKey: string) {
  const session = await requireSession();

  await markNotificationUnread(session.user.id, notificationKey);
  revalidateNotificationSurfaces();
}

export async function markAllNotificationsReadAction(notificationKeys: string[]) {
  const session = await requireSession();

  await markNotificationsRead(session.user.id, notificationKeys);
  revalidateNotificationSurfaces();
}
