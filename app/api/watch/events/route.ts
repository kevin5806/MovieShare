import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/server/auth";
import { recordPlaybackEventSchema } from "@/features/watch/schemas";
import { recordPlaybackEvent } from "@/server/services/watch-service";

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
    const parsed = recordPlaybackEventSchema.parse(await request.json());

    const result = await recordPlaybackEvent({
      sessionId: parsed.sessionId,
      userId: session.user.id,
      event: parsed.event,
      currentTime: parsed.currentTime,
      duration: parsed.duration,
      videoId: parsed.videoId,
    });

    return NextResponse.json({
      ok: true,
      status: result.status,
      resumeFromSeconds: result.resumeFromSeconds,
      currentPositionSeconds: result.currentPositionSeconds,
      checkpointSaved: result.checkpointSaved,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid playback event payload.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to track the playback event.",
      },
      { status: 500 },
    );
  }
}
