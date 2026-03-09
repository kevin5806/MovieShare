"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

const authBaseUrl =
  typeof window === "undefined"
    ? process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
    : "/api/auth";

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
          required: false,
          input: false,
        },
      },
    }),
  ],
});
