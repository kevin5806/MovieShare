"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

export function RealtimeRefresh({
  channels,
}: {
  channels: string[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!channels.length) {
      return;
    }

    const params = new URLSearchParams();

    for (const channel of channels) {
      params.append("channel", channel);
    }

    const source = new EventSource(`/api/realtime?${params.toString()}`);
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) {
        return;
      }

      refreshTimer = setTimeout(() => {
        startTransition(() => {
          router.refresh();
        });
        refreshTimer = null;
      }, 200);
    };

    source.addEventListener("message", scheduleRefresh);

    return () => {
      source.removeEventListener("message", scheduleRefresh);
      source.close();

      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [channels, router, startTransition]);

  return null;
}
