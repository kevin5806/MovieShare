"use server";

import { revalidatePath } from "next/cache";

import { updateStreamingProviderSchema } from "@/features/system/schemas";
import { requireAdminSession } from "@/server/session";
import { updateStreamingProviderConfig } from "@/server/services/streaming";

export async function updateStreamingProviderAction(formData: FormData) {
  await requireAdminSession();

  const parsed = updateStreamingProviderSchema.parse({
    provider: formData.get("provider"),
    isEnabled: formData.get("isEnabled") === "on",
    isActive: formData.get("isActive") === "on",
  });

  await updateStreamingProviderConfig(parsed);

  revalidatePath("/admin/streaming");
}
