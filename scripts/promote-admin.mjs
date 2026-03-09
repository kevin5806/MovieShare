import "dotenv/config";

import pg from "pg";

const { Client } = pg;

async function main() {
  const email = process.argv[2];

  if (!email) {
    throw new Error("Usage: npm run user:promote-admin -- user@example.com");
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const client = new Client({ connectionString });

  await client.connect();

  try {
    const result = await client.query(
      `
        UPDATE "User"
        SET "role" = $1::"UserRole"
        WHERE "email" = $2
      `,
      ["ADMIN", email],
    );

    if (!result.rowCount) {
      throw new Error(`No user found for email ${email}`);
    }

    console.log(`User ${email} promoted to admin.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
