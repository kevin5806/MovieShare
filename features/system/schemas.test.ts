import { describe, expect, it } from "vitest";

import { StreamingProviderKey } from "@/generated/prisma/client";
import {
  updateEmailSettingsSchema,
  updateStreamingProviderSchema,
} from "@/features/system/schemas";
import { saveFeedbackSchema } from "@/features/lists/schemas";

describe("schema boolean coercion", () => {
  it("parses explicit false-like strings as false", () => {
    expect(
      updateStreamingProviderSchema.parse({
        provider: StreamingProviderKey.VIXSRC,
        isEnabled: "false",
        isActive: "0",
      }),
    ).toMatchObject({
      isEnabled: false,
      isActive: false,
    });
  });

  it("parses true-like checkbox values as true", () => {
    expect(
      updateEmailSettingsSchema.parse({
        smtpHost: "smtp.example.com",
        smtpPort: "465",
        smtpSecure: "on",
        smtpFrom: "movieshare <noreply@example.com>",
      }),
    ).toMatchObject({
      smtpPort: 465,
      smtpSecure: true,
    });
  });

  it("keeps movie feedback rewatch intent false when a false string is submitted", () => {
    expect(
      saveFeedbackSchema.parse({
        listItemId: "item-1",
        listSlug: "movie-night",
        seenState: "UNSEEN",
        interest: "INTERESTED",
        wouldRewatch: "false",
      }),
    ).toMatchObject({
      wouldRewatch: false,
      comment: "",
    });
  });
});
