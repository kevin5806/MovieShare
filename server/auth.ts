import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/server/db";
import { env } from "@/server/env";

const authOrigin = new URL(env.BETTER_AUTH_URL).origin;
const trustedOrigins = new Set([authOrigin]);

if (authOrigin === "http://localhost:3000") {
  trustedOrigins.add("http://127.0.0.1:3000");
}

if (authOrigin === "http://127.0.0.1:3000") {
  trustedOrigins.add("http://localhost:3000");
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [...trustedOrigins],
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    cookieCache: {
      enabled: true,
    },
  },
  rateLimit: {
    customRules: {
      "/sign-in/email": {
        window: 10,
        max: 12,
      },
      "/sign-up/email": {
        window: 10,
        max: 12,
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "USER",
      },
    },
  },
  plugins: [nextCookies()],
});
