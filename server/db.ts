import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/server/env";

const globalForDb = globalThis as {
  prisma?: PrismaClient;
  prismaAdapter?: PrismaPg;
};

const adapter =
  globalForDb.prismaAdapter ??
  new PrismaPg({
    connectionString: env.DATABASE_URL,
  });

export const db =
  globalForDb.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.prisma = db;
  globalForDb.prismaAdapter = adapter;
}
