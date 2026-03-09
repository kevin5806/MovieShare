"use server";

import { revalidatePath } from "next/cache";

import {
  updateAccessMethodSettingsSchema,
  updateEmailSettingsSchema,
  updateStreamingProviderSchema,
  updateTmdbSettingsSchema,
} from "@/features/system/schemas";
import { requireAdminSession } from "@/server/session";
import {
  updateAccessMethodSettings,
  updateEmailSettings,
  updateTmdbSettings,
} from "@/server/services/system-config";
import { updateStreamingProviderConfig } from "@/server/services/streaming";

export async function updateStreamingProviderAction(formData: FormData) {
  await requireAdminSession();

  const parsed = updateStreamingProviderSchema.parse({
    provider: formData.get("provider"),
    isEnabled: formData.get("isEnabled") === "on",
    isActive: formData.get("isActive") === "on",
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
    smtpSecure: formData.get("smtpSecure") === "on",
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
    authEmailCodeEnabled: formData.get("authEmailCodeEnabled") === "on",
    authMagicLinkEnabled: formData.get("authMagicLinkEnabled") === "on",
    authPasskeyEnabled: formData.get("authPasskeyEnabled") === "on",
    authTwoFactorEnabled: formData.get("authTwoFactorEnabled") === "on",
  });

  await updateAccessMethodSettings(parsed);

  revalidatePath("/admin");
  revalidatePath("/login");
}
