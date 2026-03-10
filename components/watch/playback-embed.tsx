"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { formatSeconds } from "@/lib/utils";

type PlayerEventName = "play" | "pause" | "seeked" | "ended" | "timeupdate";

type PlayerEventEnvelope = {
  type: "PLAYER_EVENT";
  data: {
    event: PlayerEventName;
    currentTime: number;
    duration: number;
    video_id: number;
  };
};

type QueuedPlaybackEvent = {
  event: PlayerEventName;
  currentTime: number;
  duration: number;
  videoId: number;
};

type PlaybackEmbedProps = {
  sessionId: string;
  playbackUrl: string;
  title: string;
  providerLabel: string;
  expectedVideoId: number;
  initialCurrentPositionSeconds: number;
  initialResumeFromSeconds: number;
};

const TIMEUPDATE_MIN_SECONDS = 15;
const TIMEUPDATE_MIN_INTERVAL_MS = 12_000;

function coerceNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeNumber(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}

function parsePlayerEnvelope(data: unknown): PlayerEventEnvelope | null {
  const payload =
    typeof data === "string"
      ? (() => {
          try {
            return JSON.parse(data) as unknown;
          } catch {
            return null;
          }
        })()
      : data;

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Partial<PlayerEventEnvelope>;

  if (candidate.type !== "PLAYER_EVENT" || !candidate.data) {
    return null;
  }

  const playerData = candidate.data as Partial<PlayerEventEnvelope["data"]>;
  const currentTime = coerceNumber(playerData.currentTime);
  const duration = coerceNumber(playerData.duration);
  const videoId = coerceNumber(playerData.video_id);

  if (
    (playerData.event !== "play" &&
      playerData.event !== "pause" &&
      playerData.event !== "seeked" &&
      playerData.event !== "ended" &&
      playerData.event !== "timeupdate") ||
    currentTime === null ||
    duration === null ||
    videoId === null
  ) {
    return null;
  }

  return {
    type: "PLAYER_EVENT",
    data: {
      event: playerData.event,
      currentTime,
      duration,
      video_id: videoId,
    },
  };
}

export function PlaybackEmbed({
  sessionId,
  playbackUrl,
  title,
  providerLabel,
  expectedVideoId,
  initialCurrentPositionSeconds,
  initialResumeFromSeconds,
}: PlaybackEmbedProps) {
  const [trackedTimeSeconds, setTrackedTimeSeconds] = useState(
    initialCurrentPositionSeconds || initialResumeFromSeconds || 0,
  );
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [lastEvent, setLastEvent] = useState<PlayerEventName | null>(null);
  const [syncState, setSyncState] = useState<"idle" | "synced" | "error">("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [iframeState, setIframeState] = useState<"loading" | "ready">("loading");
  const [messageCount, setMessageCount] = useState(0);
  const [acceptedOrigin, setAcceptedOrigin] = useState<string | null>(null);
  const [configuredOrigin, setConfiguredOrigin] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const allowedOriginRef = useRef<string | null>(null);
  const trustedOriginRef = useRef<string | null>(null);
  const queueRef = useRef<QueuedPlaybackEvent | null>(null);
  const isSendingRef = useRef(false);
  const lastSentPositionRef = useRef(
    initialCurrentPositionSeconds || initialResumeFromSeconds || 0,
  );
  const lastTimeupdateSentAtRef = useRef(0);

  useEffect(() => {
    try {
      allowedOriginRef.current = new URL(playbackUrl).origin;
      setConfiguredOrigin(allowedOriginRef.current);
    } catch {
      allowedOriginRef.current = null;
      setConfiguredOrigin(null);
    }

    trustedOriginRef.current = null;
    setAcceptedOrigin(null);
    setMessageCount(0);
    setLastEvent(null);
    setIframeState("loading");
  }, [playbackUrl]);

  const flushQueue = useEffectEvent(async () => {
    if (isSendingRef.current) {
      return;
    }

    isSendingRef.current = true;

    while (queueRef.current) {
      const payload = queueRef.current;
      queueRef.current = null;

      try {
        const response = await fetch("/api/watch/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            event: payload.event,
            currentTime: payload.currentTime,
            duration: payload.duration,
            videoId: payload.videoId,
          }),
          keepalive: payload.event === "ended",
        });

        if (!response.ok) {
          setSyncState("error");
          continue;
        }

        lastSentPositionRef.current = payload.currentTime;

        if (payload.event === "timeupdate") {
          lastTimeupdateSentAtRef.current = Date.now();
        }

        setSyncState("synced");
        setLastSyncedAt(new Date().toISOString());
      } catch {
        setSyncState("error");
      }
    }

    isSendingRef.current = false;
  });

  const queueEvent = useEffectEvent((payload: QueuedPlaybackEvent) => {
    queueRef.current = payload;
    void flushQueue();
  });

  const handleWindowMessage = useEffectEvent((event: MessageEvent) => {
    const envelope = parsePlayerEnvelope(event.data);

    if (!envelope || envelope.data.video_id !== expectedVideoId) {
      return;
    }

    const configuredOrigin = allowedOriginRef.current;
    const trustedOrigin = trustedOriginRef.current;
    const iframeWindow = iframeRef.current?.contentWindow;
    const isDirectIframeMessage = Boolean(iframeWindow && event.source === iframeWindow);
    const isConfiguredOrigin = Boolean(configuredOrigin && event.origin === configuredOrigin);
    const isTrustedOrigin = Boolean(trustedOrigin && event.origin === trustedOrigin);
    const canTrustNewOrigin =
      !trustedOrigin &&
      Boolean(event.origin) &&
      event.origin !== "null" &&
      event.origin !== window.location.origin;

    if (!isDirectIframeMessage && !isConfiguredOrigin && !isTrustedOrigin && !canTrustNewOrigin) {
      return;
    }

    if (!isTrustedOrigin && event.origin && event.origin !== "null") {
      trustedOriginRef.current = event.origin;
      setAcceptedOrigin(event.origin);
    }

    const currentTime = normalizeNumber(envelope.data.currentTime);
    const duration = normalizeNumber(envelope.data.duration);
    const eventName = envelope.data.event;

    setMessageCount((count) => count + 1);
    setTrackedTimeSeconds(currentTime);
    setDurationSeconds(duration);
    setLastEvent(eventName);

    const shouldSendTimeupdate =
      eventName !== "timeupdate" ||
      Math.abs(currentTime - lastSentPositionRef.current) >= TIMEUPDATE_MIN_SECONDS ||
      Date.now() - lastTimeupdateSentAtRef.current >= TIMEUPDATE_MIN_INTERVAL_MS;

    if (!shouldSendTimeupdate) {
      return;
    }

    queueEvent({
      event: eventName,
      currentTime,
      duration,
      videoId: envelope.data.video_id,
    });
  });

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      handleWindowMessage(event);
    };

    window.addEventListener("message", listener);

    return () => {
      window.removeEventListener("message", listener);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[28px] border border-border/70 bg-black">
        <iframe
          ref={iframeRef}
          src={playbackUrl}
          title={title}
          className="aspect-video w-full"
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          onLoad={() => setIframeState("ready")}
        />
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span>Provider: {providerLabel}</span>
        <span>Tracked time: {formatSeconds(trackedTimeSeconds)}</span>
        <span>Resume point: {formatSeconds(initialResumeFromSeconds)}</span>
        {durationSeconds ? <span>Duration: {formatSeconds(durationSeconds)}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
        <Badge variant={syncState === "error" ? "destructive" : "secondary"}>
          {syncState === "error" ? "Tracking sync error" : "Automatic tracking active"}
        </Badge>
        <span>
          Iframe: {iframeState === "ready" ? "loaded" : "loading"}
        </span>
        <span>
          Last player event: {lastEvent ? lastEvent : "waiting for iframe events"}
        </span>
        <span>Events received: {messageCount}</span>
        <span>
          Source: {acceptedOrigin ?? configuredOrigin ?? "awaiting first valid event"}
        </span>
        {lastSyncedAt ? <span>Last sync: {new Date(lastSyncedAt).toLocaleTimeString()}</span> : null}
      </div>
    </div>
  );
}
