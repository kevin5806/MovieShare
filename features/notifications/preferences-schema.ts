import { NotificationCategory } from "@/generated/prisma/client";
import { formBoolean } from "@/lib/schema-utils";
import { z } from "zod";

export const notificationPreferenceEntrySchema = z.object({
  category: z.nativeEnum(NotificationCategory),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
});

function parsePreferencesJson(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return JSON.parse(value);
}

export const updateSystemNotificationPreferencesSchema = z.object({
  pushNotificationsEnabled: formBoolean,
  preferences: z.preprocess(
    parsePreferencesJson,
    z.array(notificationPreferenceEntrySchema).min(1),
  ),
});

export const updateUserNotificationPreferencesSchema = z.object({
  preferences: z.preprocess(
    parsePreferencesJson,
    z.array(notificationPreferenceEntrySchema).min(1),
  ),
});
