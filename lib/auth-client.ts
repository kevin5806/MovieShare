"use client";

import { createAuthClient } from "better-auth/react";
import {
  emailOTPClient,
  inferAdditionalFields,
  magicLinkClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

function getAuthOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return (
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  );
}

export const authClient = createAuthClient({
  baseURL: getAuthOrigin(),
  basePath: "/api/auth",
  plugins: [
    emailOTPClient(),
    magicLinkClient(),
    twoFactorClient(),
    passkeyClient(),
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
          required: false,
          input: false,
        },
        twoFactorEnabled: {
          type: "boolean",
          required: false,
          input: false,
        },
      },
    }),
  ],
});
