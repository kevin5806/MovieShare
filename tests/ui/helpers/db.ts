import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });

declare global {
  var __playwrightPgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the Playwright UI suite.");
}

const pool =
  globalThis.__playwrightPgPool ??
  new Pool({
    connectionString,
  });

globalThis.__playwrightPgPool = pool;

export async function promoteUserToAdmin(email: string) {
  await pool.query(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [email]);
}

export async function getInviteToken(input: {
  listName: string;
  kind: "APP_USER" | "EMAIL_LINK" | "PUBLIC_LINK";
  email?: string;
}) {
  const result = await pool.query<{ token: string }>(
    `
      SELECT invite.token
      FROM "MovieListInvite" AS invite
      INNER JOIN "MovieList" AS list ON list.id = invite."listId"
      WHERE list.name = $1
        AND invite.kind = $2
        AND invite.status = 'PENDING'
        AND ($3::text IS NULL OR invite.email = $3)
      ORDER BY invite."createdAt" DESC
      LIMIT 1
    `,
    [input.listName, input.kind, input.email ?? null],
  );

  const token = result.rows[0]?.token;

  if (!token) {
    throw new Error(`Pending ${input.kind} invite not found for ${input.listName}.`);
  }

  return token;
}

export async function waitForInviteToken(
  input: {
    listName: string;
    kind: "APP_USER" | "EMAIL_LINK" | "PUBLIC_LINK";
    email?: string;
  },
  options?: {
    timeoutMs?: number;
    intervalMs?: number;
  },
) {
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const intervalMs = options?.intervalMs ?? 300;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      return await getInviteToken(input);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(`Pending ${input.kind} invite not found for ${input.listName}.`);
}

export async function getListMembershipRole(input: { listName: string; email: string }) {
  const result = await pool.query<{ role: string }>(
    `
      SELECT member.role
      FROM "MovieListMember" AS member
      INNER JOIN "MovieList" AS list ON list.id = member."listId"
      INNER JOIN "User" AS app_user ON app_user.id = member."userId"
      WHERE list.name = $1
        AND app_user.email = $2
      LIMIT 1
    `,
    [input.listName, input.email],
  );

  return result.rows[0]?.role ?? null;
}

export async function cleanupUsersByEmails(emails: string[]) {
  if (!emails.length) {
    return;
  }

  await pool.query(`DELETE FROM "User" WHERE email = ANY($1::text[])`, [emails]);
}
