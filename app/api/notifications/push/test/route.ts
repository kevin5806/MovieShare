import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { sendTestPushNotification } from "@/server/services/push-notification-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await sendTestPushNotification(session.user.id);

    return NextResponse.json({
      ok: true,
      delivered: result.delivered,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to deliver the push test.",
      },
      { status: 400 },
    );
  }
}
