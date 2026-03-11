import { env } from "@/server/env";

export const siteConfig = {
  name: "movieshare",
  shortName: "movieshare",
  description: "Collaborative, self-hosted movie rooms for friends.",
  marketingTitle: "Shared movie lists that stay organized before the night even starts.",
  marketingDescription:
    "Collect ideas, compare reactions and keep watch progress in one calm workspace built for real friend groups.",
  url: env.BETTER_AUTH_URL,
} as const;

export function buildAbsoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
