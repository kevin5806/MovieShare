import { z } from "zod";

export const authModeSchema = z.enum(["sign-in", "sign-up"]);
export const discoverAuthSchema = z.object({
  email: z.email(),
});

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const signUpSchema = signInSchema.extend({
  name: z.string().min(2).max(80),
});

export const requestEmailCodeSchema = z.object({
  email: z.email(),
  name: z.string().trim().max(80).optional().default(""),
});

export const verifyEmailCodeSchema = z.object({
  email: z.email(),
  otp: z.string().trim().min(4).max(12),
  name: z.string().trim().max(80).optional().default(""),
});

export const requestMagicLinkSchema = z.object({
  email: z.email(),
  name: z.string().trim().max(80).optional().default(""),
});

export const verifyTwoFactorSchema = z.object({
  code: z.string().trim().min(6).max(12),
});

export const verifyBackupCodeSchema = z.object({
  code: z.string().trim().min(6).max(32),
});

export type AuthMode = z.infer<typeof authModeSchema>;
