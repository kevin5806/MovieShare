import "dotenv/config";

import { UserRole } from "../generated/prisma/client";
import { db } from "../server/db";

async function main() {
  const email = process.argv[2];

  if (!email) {
    throw new Error("Usage: npm run user:promote-admin -- user@example.com");
  }

  const result = await db.user.updateMany({
    where: {
      email,
    },
    data: {
      role: UserRole.ADMIN,
    },
  });

  if (!result.count) {
    throw new Error(`No user found for email ${email}`);
  }

  console.log(`User ${email} promoted to admin.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
