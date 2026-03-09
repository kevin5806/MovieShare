import { StreamingProviderKey } from "@/generated/prisma/client";
import { formBoolean } from "@/lib/schema-utils";
import { z } from "zod";

export const updateStreamingProviderSchema = z.object({
  provider: z.nativeEnum(StreamingProviderKey),
  isEnabled: formBoolean,
  isActive: formBoolean,
});

export const updateTmdbSettingsSchema = z.object({
  tmdbApiToken: z.string().max(4096).default(""),
  tmdbApiKey: z.string().max(512).default(""),
  tmdbLanguage: z.string().min(2).max(20).default("en-US"),
});

export const updateEmailSettingsSchema = z.object({
  smtpHost: z.string().max(255).default(""),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpSecure: formBoolean,
  smtpUser: z.string().max(255).default(""),
  smtpPassword: z.string().max(1024).default(""),
  smtpFrom: z.string().max(255).default(""),
});

export const updateAccessMethodSettingsSchema = z.object({
  authEmailCodeEnabled: formBoolean,
  authMagicLinkEnabled: formBoolean,
  authPasskeyEnabled: formBoolean,
  authTwoFactorEnabled: formBoolean,
});
