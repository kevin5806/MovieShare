import { auth } from "@/server/auth";
import { db } from "@/server/db";
import {
  subscribeToChannels,
  type RealtimeEnvelope,
} from "@/server/realtime/broker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();

function encodeEvent(name: string, payload: unknown) {
  return encoder.encode(`event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`);
}

async function userCanAccessChannel(channel: string, userId: string) {
  if (channel.startsWith("list:")) {
    const listId = channel.slice("list:".length);

    return Boolean(
      await db.movieListMember.findUnique({
        where: {
          listId_userId: {
            listId,
            userId,
          },
        },
      }),
    );
  }

  if (channel.startsWith("watch:")) {
    const watchSessionId = channel.slice("watch:".length);

    return Boolean(
      await db.watchSession.findFirst({
        where: {
          id: watchSessionId,
          list: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
        select: {
          id: true,
        },
      }),
    );
  }

  return false;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const channels = Array.from(
    new Set(
      url.searchParams
        .getAll("channel")
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  if (!channels.length) {
    return new Response("At least one channel is required.", { status: 400 });
  }

  for (const channel of channels) {
    const authorized = await userCanAccessChannel(channel, session.user.id);

    if (!authorized) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closeStream: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendMessage = (message: RealtimeEnvelope) => {
        controller.enqueue(encodeEvent("message", message));
      };

      unsubscribe = subscribeToChannels(channels, sendMessage);
      heartbeat = setInterval(() => {
        controller.enqueue(encodeEvent("keepalive", { at: new Date().toISOString() }));
      }, 25_000);

      closeStream = () => {
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = undefined;
        }

        unsubscribe?.();
        unsubscribe = undefined;

        try {
          controller.close();
        } catch {
          // The stream may already be closed during shutdown.
        }
      };

      controller.enqueue(
        encodeEvent("ready", {
          channels,
          connectedAt: new Date().toISOString(),
        }),
      );
    },
    cancel() {
      closeStream?.();
    },
  });

  request.signal.addEventListener("abort", () => {
    closeStream?.();
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
