import { z } from "zod";

export const authModeSchema = z.enum(["sign-in", "sign-up"]);

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const signUpSchema = signInSchema.extend({
  name: z.string().min(2).max(80),
});

export type AuthMode = z.infer<typeof authModeSchema>;
