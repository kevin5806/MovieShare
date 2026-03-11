"use server";

import { revalidatePath } from "next/cache";

import {
  updateAccessMethodSettingsSchema,
  updateEmailSettingsSchema,
  updatePushDeliverySettingsSchema,
  updateStreamingProviderSchema,
  updateTmdbSettingsSchema,
} from "@/features/system/schemas";
import { updateSystemNotificationPreferencesSchema } from "@/features/notifications/preferences-schema";
import { requireAdminSession } from "@/server/session";
import {
  updateAccessMethodSettings,
  updateEmailSettings,
  updatePushDeliverySettings,
  updateTmdbSettings,
} from "@/server/services/system-config";
import { updateSystemNotificationPreferences } from "@/server/services/notification-preference-service";
import { updateStreamingProviderConfig } from "@/server/services/streaming";

export async function updateStreamingProviderAction(formData: FormData) {
  await requireAdminSession();

  const parsed = updateStreamingProviderSchema.parse({
    provider: formData.get("provider"),
    isEnabled: formData.get("isEnabled"),
    isActive: formData.get("isActive"),
  });

  await updateStreamingProviderConfig(parsed);

  revalidatePath("/admin");
  revalidatePath("/admin/streaming");
}

export async function updateTmdbSettingsAction(formData: FormData) {
  await requireAdminSession();

  const parsed = updateTmdbSettingsSchema.parse({
    tmdbApiToken: formData.get("tmdbApiToken")?.toString() ?? "",
    tmdbApiKey: formData.get("tmdbApiKey")?.toString() ?? "",
    tmdbLanguage: formData.get("tmdbLanguage")?.toString() ?? "en-US",
  });

  await updateTmdbSettings(parsed);

  revalidatePath("/admin");
  revalidatePath("/admin/streaming");
}

export async function updateEmailSettingsAction(formData: FormData) {
  await requireAdminSession();

  const parsed = updateEmailSettingsSchema.parse({
    smtpHost: formData.get("smtpHost")?.toString() ?? "",
    smtpPort: formData.get("smtpPort")?.toString() ?? "587",
    smtpSecure: formData.get("smtpSecure"),
    smtpUser: formData.get("smtpUser")?.toString() ?? "",
    smtpPassword: formData.get("smtpPassword")?.toString() ?? "",
    smtpFrom: formData.get("smtpFrom")?.toString() ?? "",
  });

  await updateEmailSettings(parsed);

  revalidatePath("/admin");
  revalidatePath("/admin/streaming");
}

export async function updateAccessMethodSettingsAction(formData: FormData) {
  await requireAdminSession();

  const parsed = updateAccessMethodSettingsSchema.parse({
    authEmailCodeEnabled: formData.get("authEmailCodeEnabled"),
    authMagicLinkEnabled: formData.get("authMagicLinkEnabled"),
    authPasskeyEnabled: formData.get("authPasskeyEnabled"),
    authTwoFactorEnabled: formData.get("authTwoFactorEnabled"),
  });

  await updateAccessMethodSettings(parsed);

  revalidatePath("/admin");
  revalidatePath("/login");
}

export async function updatePushDeliverySettingsAction(formData: FormData) {
  await requireAdminSession();

  const parsed = updatePushDeliverySettingsSchema.parse({
    vapidPublicKey: formData.get("vapidPublicKey")?.toString() ?? "",
    vapidPrivateKey: formData.get("vapidPrivateKey")?.toString() ?? "",
    vapidSubject: formData.get("vapidSubject")?.toString() ?? "",
  });

  await updatePushDeliverySettings(parsed);

  revalidatePath("/admin");
  revalidatePath("/profile");
}

export async function updateSystemNotificationPreferencesAction(formData: FormData) {
  try {
    await requireAdminSession();

    const parsed = updateSystemNotificationPreferencesSchema.parse({
      pushNotificationsEnabled: formData.get("pushNotificationsEnabled"),
      preferences: formData.get("preferences"),
    });

    await updateSystemNotificationPreferences(parsed);

    revalidatePath("/admin");
    revalidatePath("/notifications");

    return {
      ok: true as const,
    };
  } catch (error) {
    console.error("updateSystemNotificationPreferencesAction failed", error);

    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Unable to update notification defaults.",
    };
  }
}
