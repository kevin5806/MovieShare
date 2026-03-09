import { NextResponse } from "next/server";

import { discoverAuthSchema } from "@/features/auth/schemas";
import { db } from "@/server/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = discoverAuthSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Enter a valid email address.",
      },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await db.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  return NextResponse.json({
    mode: user ? "sign-in" : "sign-up",
  });
}
