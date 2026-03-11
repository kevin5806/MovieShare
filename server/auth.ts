import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, magicLink, twoFactor } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";

import { db } from "@/server/db";
import { env } from "@/server/env";
import { sendMagicLinkEmail, sendSignInCodeEmail } from "@/server/services/email-service";
import { getPublicAuthState } from "@/server/services/system-config";

const authOrigin = new URL(env.BETTER_AUTH_URL).origin;
const trustedOrigins = new Set([authOrigin]);

if (authOrigin === "http://localhost:3000") {
  trustedOrigins.add("http://127.0.0.1:3000");
}

if (authOrigin === "http://127.0.0.1:3000") {
  trustedOrigins.add("http://localhost:3000");
}

async function requireAuthMethodAvailability(key: "EMAIL_CODE" | "MAGIC_LINK") {
  const state = await getPublicAuthState();
  const method = state.methods.find((candidate) => candidate.key === key);

  if (!method?.isEnabled || method.availability !== "live") {
    throw new Error(`${method?.label ?? key} is not available in this deployment.`);
  }
}

export const auth = betterAuth({
  appName: "movieshare",
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
      "/email-otp/send-verification-otp": {
        window: 60,
        max: 6,
      },
      "/sign-in/magic-link": {
        window: 60,
        max: 6,
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
      twoFactorEnabled: {
        type: "boolean",
        required: false,
        input: false,
        defaultValue: false,
      },
    },
  },
  plugins: [
    nextCookies(),
    emailOTP({
      expiresIn: 300,
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type === "sign-in") {
          await requireAuthMethodAvailability("EMAIL_CODE");
        }

        await sendSignInCodeEmail({
          to: email,
          code: otp,
          type,
        });
      },
    }),
    magicLink({
      expiresIn: 900,
      sendMagicLink: async ({ email, url }) => {
        await requireAuthMethodAvailability("MAGIC_LINK");

        await sendMagicLinkEmail({
          to: email,
          url,
        });
      },
    }),
    twoFactor({
      issuer: "movieshare",
    }),
    passkey({
      rpID: new URL(env.BETTER_AUTH_URL).hostname,
      rpName: "movieshare",
    }),
  ],
});
