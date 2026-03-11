import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/server/auth";
import {
  deactivatePushSubscription,
  savePushSubscription,
} from "@/server/services/push-notification-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const parsed = pushSubscriptionSchema.parse(await request.json());

    await savePushSubscription({
      userId: session.user.id,
      endpoint: parsed.endpoint,
      keys: parsed.keys,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save the push subscription.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const parsed = unsubscribeSchema.parse(await request.json());

    await deactivatePushSubscription({
      userId: session.user.id,
      endpoint: parsed.endpoint,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to remove the push subscription.",
      },
      { status: 400 },
    );
  }
}
