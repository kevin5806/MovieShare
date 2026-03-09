import { StreamingProviderKey } from "@/generated/prisma/client";
import { z } from "zod";

export const updateStreamingProviderSchema = z.object({
  provider: z.nativeEnum(StreamingProviderKey),
  isEnabled: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(false),
});
