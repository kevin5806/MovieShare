"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

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
